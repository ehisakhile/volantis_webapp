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
  // Audio stats
  audioStats: {
    bitrate?: number;
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

  // Start audio stats monitoring
  const startStatsMonitoring = useCallback((pc: RTCPeerConnection, isOutbound: boolean) => {
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
    }

    let lastBytes = 0;
    let lastTs = 0;

    statsTimerRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') return;

      try {
        const stats = await pc.getStats();
        stats.forEach((r) => {
          if (isOutbound && r.type === 'outbound-rtp' && r.kind === 'audio') {
            const now = r.timestamp;
            const bytes = r.bytesSent;
            if (lastTs && now > lastTs) {
              const dt = (Number(now) - lastTs) / 1000;
              const kbps = Math.round(((bytes - lastBytes) * 8) / dt / 1000);
              setAudioStats((prev) => ({ ...prev, bitrate: kbps }));
            }
            lastBytes = bytes;
            lastTs = Number(now);
          } else if (!isOutbound && r.type === 'inbound-rtp' && r.kind === 'audio') {
            const jitter = r.jitter != null ? Number(r.jitter) * 1000 : null;
            setAudioStats((prev) => ({ ...prev, jitter: jitter ?? prev.jitter }));
          }
        });
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

    // Handle incoming tracks
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    // WHEP: add recvonly transceiver
    pc.addTransceiver('audio', { direction: 'recvonly' });

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

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
