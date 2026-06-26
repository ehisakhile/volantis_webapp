"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConnectionStatus } from '@/types/livestream';

interface UseWebRTCOptions {
  onConnectionStateChange?: (state: ConnectionStatus) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  onError?: (error: Error) => void;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

// ICE servers for WebRTC connection - optimized for low latency
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

// ICE config optimized for low latency
const ICE_CONFIG: RTCConfiguration = {
  iceServers: DEFAULT_ICE_SERVERS,
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: ConnectionStatus;
  isPublishing: boolean;
  isPlaying: boolean;
  error: string | null;
  reconnectAttempts: number;
  startPublishing: (stream: MediaStream, publishUrl: string) => Promise<void>;
  startPlayback: (playbackUrl: string) => Promise<void>;
  stop: () => void;
  retryConnection: () => Promise<void>;
  // Stats for monitoring
  audioStats: {
    bitrate?: number;
    videoBitrate?: number;
    jitter?: number;
    codec?: string;
  };
}

// Map ICE connection state to our connection status
function mapIceConnectionState(state: RTCIceConnectionState): ConnectionStatus {
  switch (state) {
    case 'connected':
    case 'completed':
      return 'connected';
    case 'checking':
      return 'connecting';
    case 'disconnected':
      return 'reconnecting';
    case 'failed':
      return 'failed';
    case 'closed':
      return 'disconnected';
    default:
      return 'idle';
  }
}

// Wait for ICE gathering to complete or timeout
function waitForIce(pc: RTCPeerConnection, maxMs: number = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const timeout = setTimeout(resolve, maxMs);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve();
      }
    };
    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        clearTimeout(timeout);
        resolve();
      }
    };
  });
}

// Prefer Opus codec in SDP — sets maxaveragebitrate and enables cbr for lower latency
function preferOpus(sdp: string): string {
  // Find Opus payload type
  const match = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i);
  if (!match) return sdp;
  const pt = match[1];

  // Inject or replace fmtp for Opus - optimized for low latency
  const opusFmtp = `a=fmtp:${pt} minptime=10;useinbandfec=1;stereo=0;maxaveragebitrate=96000`;

  if (sdp.includes(`a=fmtp:${pt} `)) {
    return sdp.replace(new RegExp(`a=fmtp:${pt} [^\r\n]+`), opusFmtp);
  } else {
    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt} opus[^\r\n]+\r?\n)`),
      `$1${opusFmtp}\r\n`
    );
  }
}

// Pull codec name from SDP
function detectAudioCodec(sdp: string): string {
  const m = sdp.match(/a=rtpmap:\d+ ([A-Za-z0-9]+)\/\d+/);
  return m ? m[1].toUpperCase() : 'unknown';
}

// Storage key for publish URL persistence
const PUBLISH_URL_KEY = 'volantis_publish_url';
const PUBLISH_STREAM_KEY = 'volantis_publish_stream';

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const {
    onConnectionStateChange,
    onReconnecting,
    onReconnected,
    onError,
    maxReconnectAttempts = 5,
    reconnectInterval = 2000,
  } = options;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionStatus>('idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [audioStats, setAudioStats] = useState<{ bitrate?: number; jitter?: number; codec?: string }>({});

  // Store URLs for reconnection
  const publishUrlRef = useRef<string>('');
  const playbackUrlRef = useRef<string>('');
  // Store stream for reconnection
  const localStreamRef = useRef<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isManuallyStoppedRef = useRef(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save publish URL to sessionStorage for persistence
  const savePublishUrl = useCallback((url: string, streamData?: MediaStream) => {
    try {
      sessionStorage.setItem(PUBLISH_URL_KEY, url);
      if (streamData) {
        // Store stream reference for reconnection
        localStreamRef.current = streamData;
      }
    } catch (e) {
      console.warn('Failed to save publish URL to storage:', e);
    }
  }, []);

  // Load publish URL from sessionStorage
  const loadPublishUrl = useCallback((): string | null => {
    try {
      return sessionStorage.getItem(PUBLISH_URL_KEY);
    } catch (e) {
      console.warn('Failed to load publish URL from storage:', e);
      return null;
    }
  }, []);

  // Clear publish URL from storage
  const clearPublishUrl = useCallback(() => {
    try {
      sessionStorage.removeItem(PUBLISH_URL_KEY);
      localStreamRef.current = null;
    } catch (e) {
      console.warn('Failed to clear publish URL from storage:', e);
    }
  }, []);

  // Start audio/video stats monitoring
  const startStatsMonitoring = useCallback((pc: RTCPeerConnection, isOutbound: boolean) => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
    }

    let lastAudioBytes = 0;
    let lastVideoBytes = 0;
    let lastTs = 0;

    statsTimerRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') return;

      try {
        const stats = await pc.getStats();
        stats.forEach((r) => {
          if (isOutbound && r.type === 'outbound-rtp') {
            if (r.kind === 'audio' && r.timestamp) {
              const bytes = Number(r.bytesSent);
              if (lastTs) {
                const dt = (Number(r.timestamp) - lastTs) / 1000;
                if (dt > 0) {
                  const kbps = Math.round(((bytes - lastAudioBytes) * 8) / dt / 1000);
                  setAudioStats((prev) => ({ ...prev, bitrate: kbps }));
                }
              }
              lastAudioBytes = bytes;
            } else if (r.kind === 'video' && r.timestamp) {
              const bytes = Number(r.bytesSent);
              if (lastTs) {
                const dt = (Number(r.timestamp) - lastTs) / 1000;
                if (dt > 0) {
                  const kbps = Math.round(((bytes - lastVideoBytes) * 8) / dt / 1000);
                  setAudioStats((prev) => ({ ...prev, videoBitrate: kbps }));
                }
              }
              lastVideoBytes = bytes;
            }
          } else if (!isOutbound && r.type === 'inbound-rtp') {
            if (r.kind === 'audio' && r.jitter != null) {
              const jitter = Number(r.jitter) * 1000;
              setAudioStats((prev) => ({ ...prev, jitter: jitter }));
            } else if (r.kind === 'video') {
              console.log('[useWebRTC] Video RTP being received, bytes:', r.bytesReceived);
            }
          }
        });
        const firstRtp = Array.from(stats.values()).find(r => r.type === 'outbound-rtp' || r.type === 'inbound-rtp');
        if (firstRtp?.timestamp) {
          lastTs = Number(firstRtp.timestamp);
        }
      } catch (e) {
        console.warn('Failed to get stats:', e);
      }
    }, 1500);
  }, []);

  // Stop stats monitoring
  const stopStatsMonitoring = useCallback(() => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
  }, []);

  // Clean up function
  const cleanup = useCallback(() => {
    stopStatsMonitoring();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setIsPublishing(false);
    setIsPlaying(false);
    setReconnectAttempts(0);
    setAudioStats({});
  }, [stopStatsMonitoring]);

  // Handle connection state changes
  const handleIceConnectionStateChange = useCallback((state: RTCIceConnectionState) => {
    const newStatus = mapIceConnectionState(state);
    setConnectionState(newStatus);
    if (onConnectionStateChange) onConnectionStateChange(newStatus);

    if (newStatus === 'connected' && reconnectAttempts > 0) {
      setReconnectAttempts(0);
      if (onReconnected) onReconnected();
    }
  }, [onConnectionStateChange, onReconnected, reconnectAttempts]);

  // Internal publishing function - WHIP protocol
  const startPublishingInternal = async (stream: MediaStream, url: string) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      handleIceConnectionStateChange(pc.iceConnectionState);
    };

    pc.onicegatheringstatechange = () => {
      console.log('Publish ICE gathering →', pc.iceGatheringState);
    };

    // Add audio track
    stream.getAudioTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Create offer - WHIP requires not receiving
    const offer = await pc.createOffer({
      offerToReceiveAudio: false,
      offerToReceiveVideo: false,
    });

    // Prefer Opus with low-latency settings in SDP
    const sdpWithOpus = preferOpus(offer.sdp || '');
    await pc.setLocalDescription({ type: offer.type, sdp: sdpWithOpus });

    // Wait for ICE gathering
    await waitForIce(pc, 2000);

    const localDescription = pc.localDescription;
    if (!localDescription) {
      throw new Error('Failed to get local description');
    }

    // Send SDP to server (WHIP protocol)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Accept': 'application/sdp',
      },
      body: localDescription.sdp,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    const answerSDP = await response.text();

    // Detect codec from answer
    const codec = detectAudioCodec(answerSDP);
    setAudioStats((prev) => ({ ...prev, codec }));

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSDP,
    });

    // Start stats monitoring
    startStatsMonitoring(pc, true);
  };

  // Internal playback function - WHEP protocol
  const startPlaybackInternal = async (url: string) => {
    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      handleIceConnectionStateChange(pc.iceConnectionState);
    };

    // Stable MediaStream — never replaced, tracks are added/removed in-place
    const incomingStream = new MediaStream();
    setRemoteStream(incomingStream);

    // Debounce React state updates so both audio+video tracks are batched in one render
    let updatePending = false;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const flushRemoteStream = () => {
      updatePending = false;
      if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
      setRemoteStream(new MediaStream(incomingStream.getTracks()));
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const mid = event.transceiver?.mid;
      console.log('[useWebRTC] ontrack - kind:', event.track.kind, 'mid:', mid, 'label:', event.track.label);
      const existing = incomingStream.getTracks().find(t => t.id === event.track.id);
      if (!existing) {
        incomingStream.addTrack(event.track);
      }
      console.log('[useWebRTC] incomingStream tracks:', incomingStream.getTracks().map(t => `${t.kind}[${t.id.slice(0,8)}]`));

      // Debounce: schedule React state update, cancel previous if new track arrives soon
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(flushRemoteStream, 0);
    };

    pc.onconnectionstatechange = () => {
      console.log('[useWebRTC] Connection state:', pc.connectionState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[useWebRTC] ICE connection state:', pc.iceConnectionState);
    };

    // WHEP: add recvonly transceivers for both audio and video
    pc.addTransceiver('video', { direction: 'recvonly' });
    pc.addTransceiver('audio', { direction: 'recvonly' });

    // Create offer
    const offer = await pc.createOffer();
    console.log('[useWebRTC] Created offer, SDP preview:', offer.sdp?.substring(0, 500));
    console.log('[useWebRTC] Offer contains video:', offer.sdp?.includes('m=video'));
    console.log('[useWebRTC] Offer video codecs:', offer.sdp?.match(/a=rtpmap:\d+ ([A-Za-z0-9]+)/g));

    // Use preferOpus only for audio — avoid aggressive SDP munging that can break Cloudflare's video answer
    const sdpWithAudio = preferOpus(offer.sdp || '');
    await pc.setLocalDescription({ type: offer.type, sdp: sdpWithAudio });

    // Wait for ICE gathering
    await waitForIce(pc, 2000);

    const localDescription = pc.localDescription;
    if (!localDescription) {
      throw new Error('Failed to get local description');
    }

    // Send SDP to server (WHEP protocol)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Accept': 'application/sdp',
      },
      body: localDescription.sdp,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Create a custom error with status code for 409 handling
      const error = new Error(`Server error: ${response.status} - ${errorText.slice(0, 200)}`) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const answerSDP = await response.text();
    console.log('[useWebRTC] Answer SDP preview:', answerSDP.substring(0, 300));
    console.log('[useWebRTC] Answer contains video:', answerSDP.includes('video'));
    console.log('[useWebRTC] Answer video codec:', answerSDP.match(/a=rtpmap:\d+ ([A-Za-z0-9]+)/));

    // Detect codec
    const codec = detectAudioCodec(answerSDP);
    setAudioStats((prev) => ({ ...prev, codec }));

    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSDP,
    });

    // Start stats monitoring
    startStatsMonitoring(pc, false);
  };

  // Start publishing - URL is passed directly as parameter
  const startPublishing = useCallback(async (stream: MediaStream, publishUrl: string) => {
    if (!publishUrl) {
      setError('Publish URL is required');
      throw new Error('Publish URL is required');
    }

    isManuallyStoppedRef.current = false;
    setError(null);
    setLocalStream(stream);
    localStreamRef.current = stream;
    setConnectionState('connecting');

    // Store URL for reconnection and persist to sessionStorage
    publishUrlRef.current = publishUrl;
    savePublishUrl(publishUrl, stream);

    try {
      await startPublishingInternal(stream, publishUrl);
      setIsPublishing(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start publishing');
      setError(error.message);
      setConnectionState('failed');
      if (onError) onError(error);
      throw error;
    }
  }, [onError, savePublishUrl, startStatsMonitoring]);

  // Start playback - URL is passed directly as parameter
  const startPlayback = useCallback(async (playbackUrl: string) => {
    if (!playbackUrl) {
      setError('Playback URL is required');
      throw new Error('Playback URL is required');
    }

    isManuallyStoppedRef.current = false;
    setError(null);
    setConnectionState('connecting');

    // Store URL for reconnection
    playbackUrlRef.current = playbackUrl;

    try {
      await startPlaybackInternal(playbackUrl);
      setIsPlaying(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start playback');
      setError(error.message);
      setConnectionState('failed');
      if (onError) onError(error);
      throw error;
    }
  }, [onError, startStatsMonitoring]);

  // Retry connection - uses stored URLs
  const retryConnection = useCallback(async () => {
    if (isManuallyStoppedRef.current) return;

    setReconnectAttempts((prev) => {
      const newAttempts = prev + 1;
      if (newAttempts > maxReconnectAttempts) {
        console.log('Max reconnect attempts reached');
        return prev;
      }
      if (onReconnecting) onReconnecting(newAttempts);
      return newAttempts;
    });

    setError(null);

    const pubUrl = publishUrlRef.current;
    const playUrl = playbackUrlRef.current;
    const stream = localStreamRef.current;

    // Schedule retry with exponential backoff
    const delay = reconnectInterval * Math.pow(2, reconnectAttempts);

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (isPublishing && pubUrl && stream) {
          // Reconnect publishing with stored stream
          await startPublishing(stream, pubUrl);
        } else if (isPlaying && playUrl) {
          // Reconnect playback
          await startPlayback(playUrl);
        }
      } catch (err) {
        console.error('Reconnection failed:', err);
        // Will auto-retry again if attempts remain
      }
    }, delay);
  }, [isPublishing, isPlaying, maxReconnectAttempts, reconnectInterval, startPublishing, startPlayback, onReconnecting, reconnectAttempts]);

  // Stop everything
  const stop = useCallback(() => {
    isManuallyStoppedRef.current = true;
    cleanup();
    setConnectionState('idle');
    setLocalStream(null);
    setRemoteStream(null);
    publishUrlRef.current = '';
    playbackUrlRef.current = '';
    clearPublishUrl();
  }, [cleanup, clearPublishUrl]);

  // Listen for network reconnection and auto-reconnect
  useEffect(() => {
    const handleOnline = () => {
      if ((connectionState === 'reconnecting' || connectionState === 'failed') && !isManuallyStoppedRef.current) {
        // Small delay to ensure network is stable
        setTimeout(() => {
          retryConnection();
        }, 1000);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [connectionState, retryConnection]);

  // Handle ICE connection state changes for auto-reconnect
  useEffect(() => {
    if (connectionState === 'reconnecting' && !isManuallyStoppedRef.current) {
      // Auto-reconnect on disconnect
      const timer = setTimeout(() => {
        retryConnection();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [connectionState, retryConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Check for persisted publish URL on mount (for recovery after page refresh)
  useEffect(() => {
    const persistedUrl = loadPublishUrl();
    if (persistedUrl && !isPublishing && !isPlaying) {
      console.log('Found persisted publish URL:', persistedUrl);
      // Don't auto-reconnect, just notify user
    }
  }, [loadPublishUrl, isPublishing, isPlaying]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isPublishing,
    isPlaying,
    error,
    reconnectAttempts,
    startPublishing,
    startPlayback,
    stop,
    retryConnection,
    audioStats,
  };
}

export default useWebRTC;
