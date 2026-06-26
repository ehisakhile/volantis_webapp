

## Prompt: Implement WebRTC Live VIDEO Streaming in Next.js (Cloudflare Stream)

You are implementing a WebRTC live streaming feature in a Next.js app. The backend is already built — it returns a **publish URL** (for broadcasters) and a **playback/WebRTC URL** (for viewers) per stream slug. Both URLs are Cloudflare Stream WebRTC endpoints that accept raw SDP via HTTP POST.

The signaling mechanism is simple: there is no WebSocket. You POST an SDP offer body directly to Cloudflare's URL, receive an SDP answer in the response body, and apply it. That's the entire handshake.

---

### Architecture overview

- `useWebRTCPublisher` hook — broadcaster side, manages local camera/mic and pushes to Cloudflare
- `useWebRTCViewer` hook — viewer side, receives the stream from Cloudflare
- `Creator/video Page` component — UI for broadcaster: camera preview, controls, go live button
- `StreamvideoPage` component — UI for viewer: full-screen video, floating chat panel
- All WebRTC logic lives in custom hooks using the browser's native `RTCPeerConnection` API. No external WebRTC libraries needed.

---

### Hook 1: `useWebRTCPublisher`

```ts
// hooks/useWebRTCPublisher.ts
import { useRef, useState, useCallback } from 'react'

export function useWebRTCPublisher() {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isFrontCamera, setIsFrontCamera] = useState(true)

  // Call this first to show the camera preview before going live
  const initCamera = useCallback(async (facingMode: 'user' | 'environment' = 'user') => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 }, facingMode },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      localStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError(`Camera access failed: ${err}`)
      throw err
    }
  }, [])

  // Call this with the Cloudflare publish URL from your backend
  const startStream = useCallback(async (publishUrl: string) => {
    if (!localStreamRef.current) throw new Error('Camera not initialized')
    setIsConnecting(true)
    setError(null)

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        sdpSemantics: 'unified-plan' as any,
      })
      pcRef.current = pc

      // Attach local tracks — this tells Cloudflare we are sending, not receiving
      for (const track of localStreamRef.current.getTracks()) {
        pc.addTrack(track, localStreamRef.current)
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setIsConnected(true)
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          setIsConnected(false)
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Cloudflare's entire signaling is a single HTTP POST with the raw SDP body
      const res = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Cloudflare rejected SDP: ${res.status} ${body}`)
      }

      const answerSdp = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch (err: any) {
      setError(err.message)
      setIsConnecting(false)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }, [])

  const stopStream = useCallback(async () => {
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    setIsConnected(false)
  }, [])

  const flipCamera = useCallback(async () => {
    const next = isFrontCamera ? 'environment' : 'user'
    setIsFrontCamera(!isFrontCamera)
    await initCamera(next)
    // If already streaming, restart the peer connection with new tracks
    // (optional: can also use pc.getSenders()[n].replaceTrack() for seamless flip)
  }, [isFrontCamera, initCamera])

  const toggleMic = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTrack = localStreamRef.current.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      setIsMicEnabled(audioTrack.enabled)
    }
  }, [])

  return { videoRef, isConnected, isConnecting, error, isMicEnabled, isFrontCamera, initCamera, startStream, stopStream, flipCamera, toggleMic }
}
```

---

### Hook 2: `useWebRTCViewer`

```ts
// hooks/useWebRTCViewer.ts
import { useRef, useState, useCallback, useEffect } from 'react'

export function useWebRTCViewer(webRTCUrl: string) {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    if (!webRTCUrl || isConnecting) return
    setIsConnecting(true)
    setError(null)

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      })
      pcRef.current = pc

      // RecvOnly transceivers tell Cloudflare we want to receive, not send
      pc.addTransceiver('audio', { direction: 'recvonly' })
      pc.addTransceiver('video', { direction: 'recvonly' })

      // When Cloudflare starts sending media, attach it to the <video> element
      pc.ontrack = (event) => {
        if (event.streams[0] && videoRef.current) {
          videoRef.current.srcObject = event.streams[0]
          setIsConnected(true)
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
          setIsConnected(false)
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const res = await fetch(webRTCUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp', Accept: 'application/sdp' },
        body: offer.sdp,
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Stream not available: ${res.status} ${body}`)
      }

      const answerSdp = await res.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsConnecting(false)
    }
  }, [webRTCUrl, isConnecting])

  const disconnect = useCallback(() => {
    pcRef.current?.close()
    pcRef.current = null
    setIsConnected(false)
  }, [])

  // Auto-connect when URL is available
  useEffect(() => {
    if (webRTCUrl) connect()
    return () => { pcRef.current?.close() }
  }, [webRTCUrl]) // eslint-disable-line

  return { videoRef, isConnected, isConnecting, error, connect, disconnect }
}
```

---

### Component: `Creator/video Page`

```tsx
// app/go-live/page.tsx
'use client'
import { useEffect, useRef } from 'react'
import { useWebRTCPublisher } from '@/hooks/useWebRTCPublisher'

export default function Creator/video Page() {
  const { videoRef, isConnected, isConnecting, error, isMicEnabled, initCamera, startStream, stopStream, toggleMic } = useWebRTCPublisher()

  useEffect(() => { initCamera() }, [])

  async function handleGoLive() {
    // 1. Call your backend to create the stream, get back the Cloudflare publish URL
    const res = await fetch('/api/livestream/start', {
      method: 'POST',
      body: JSON.stringify({ title: 'My Stream', location: 'Lagos' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const { webrtcPublishUrl } = await res.json()

    // 2. Connect WebRTC to Cloudflare using that URL
    await startStream(webrtcPublishUrl)
  }

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Camera preview - muted because it's local */}
      <div className="relative flex-1">
        <video
          ref={videoRef}
          autoPlay
          muted          // IMPORTANT: always mute local preview to avoid echo
          playsInline
          className="w-full h-full object-cover"
        />
        {isConnected && (
          <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
            ● LIVE
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-zinc-900 flex gap-3">
        <button onClick={toggleMic} className="px-4 py-2 bg-zinc-700 text-white rounded-lg">
          {isMicEnabled ? 'Mute' : 'Unmute'}
        </button>
        {!isConnected ? (
          <button onClick={handleGoLive} disabled={isConnecting} className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg">
            {isConnecting ? 'Connecting...' : 'Go Live'}
          </button>
        ) : (
          <button onClick={stopStream} className="flex-1 py-2 bg-red-600 text-white font-bold rounded-lg">
            Stop Stream
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-sm p-2">{error}</p>}
    </div>
  )
}
```

---

### Component: `StreamvideoPage`

```tsx
// app/stream/[slug]/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useWebRTCViewer } from '@/hooks/useWebRTCViewer'

export default function StreamvideoPage({ params }: { params: { slug: string } }) {
  const [webRTCUrl, setWebRTCUrl] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { videoRef, isConnected, isConnecting, error, connect } = useWebRTCViewer(webRTCUrl)

  useEffect(() => {
    // Fetch the playback/WebRTC URL from your backend using the slug
    fetch(`/api/livestream/${params.slug}/playback`)
      .then(r => r.json())
      .then(({ webrtcUrl }) => setWebRTCUrl(webrtcUrl))
  }, [params.slug])

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Full-screen video — DO NOT mute remote streams (viewers need to hear) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Live badge */}
      {isConnected && (
        <div className="absolute top-4 left-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          ● LIVE
        </div>
      )}

      {/* Loading state */}
      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <p className="text-white">Connecting to stream...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
          <p className="text-white">{error}</p>
          <button onClick={connect} className="px-6 py-2 bg-green-600 text-white rounded-lg">
            Retry
          </button>
        </div>
      )}

      {/* Sliding chat panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[65vh] bg-zinc-900/95 rounded-t-3xl transition-transform duration-400 ${
          isChatOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex justify-center py-3">
          <div className="w-10 h-1 bg-zinc-600 rounded-full" />
        </div>
        {/* Mount your <ChatPanel slug={params.slug} /> here */}
      </div>

      {/* Chat FAB */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="absolute bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full shadow-lg flex items-center justify-center"
        >
          💬
        </button>
      )}
    </div>
  )
}
```

---

### Critical implementation notes


**`muted` on local preview**: The broadcaster's `<video>` must always have the `muted` attribute. Remote viewer videos must never be muted programmatically — browsers will autoplay unmuted if `autoPlay` and `playsInline` are set and the stream comes from a peer connection (not a user gesture source).

**`videoRef` as a callback ref**: If you mount/unmount the video element (e.g. chat panel hides it), use `useCallback` for the ref so the hook can reattach `srcObject` when the element remounts.



**No ICE trickling needed**: Cloudflare's endpoint is a one-shot HTTP exchange. You don't need to wait for ICE gathering to complete before POSTing — Cloudflare handles ICE internally on their side. The `await pc.setLocalDescription(offer)` is enough.

**Camera flip while streaming**: Use `sender.replaceTrack()` for a seamless mid-stream camera switch instead of reconnecting the peer connection:
```ts
const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
const sender = pc.getSenders().find(s => s.track?.kind === 'video')
await sender?.replaceTrack(newStream.getVideoTracks()[0])
```