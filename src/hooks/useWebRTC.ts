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
  iceServers?: RTCIceServer[];
}

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
  retryConnection: (publishUrl?: string, playbackUrl?: string) => Promise<void>;
}

// ICE servers for WebRTC connection
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

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

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const {
    onConnectionStateChange,
    onReconnecting,
    onReconnected,
    onError,
    maxReconnectAttempts = 5,
    reconnectInterval = 2000,
    iceServers = DEFAULT_ICE_SERVERS,
  } = options;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionStatus>('idle');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Store URLs for reconnection
  const publishUrlRef = useRef<string>('');
  const playbackUrlRef = useRef<string>('');

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManuallyStoppedRef = useRef(false);

  // Clean up function
  const cleanup = useCallback(() => {
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
  }, []);

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

  // Internal publishing function
  const startPublishingInternal = async (stream: MediaStream, url: string) => {
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      handleIceConnectionStateChange(pc.iceConnectionState);
    };

    // Add tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise<void>(resolve => setTimeout(resolve, 1000));

    const localDescription = pc.localDescription;
    if (!localDescription) {
      throw new Error('Failed to get local description');
    }

    // Send SDP to server (Cloudflare Stream)
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
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const answerSDP = await response.text();
    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSDP,
    });
  };

  // Internal playback function
  const startPlaybackInternal = async (url: string) => {
    const pc = new RTCPeerConnection({ iceServers });
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

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE gathering
    await new Promise<void>(resolve => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
      } else {
        pc.onicecandidate = (event) => {
          if (!event.candidate) {
            resolve();
          }
        };
      }
    });

    const localDescription = pc.localDescription;
    if (!localDescription) {
      throw new Error('Failed to get local description');
    }

    // Send SDP to server
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
      },
      body: localDescription.sdp,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const answerSDP = await response.text();
    await pc.setRemoteDescription({
      type: 'answer',
      sdp: answerSDP,
    });
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
    setConnectionState('connecting');
    
    // Store URL for reconnection
    publishUrlRef.current = publishUrl;

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
  }, [onError]);

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
  }, [onError]);

  // Retry connection
  const retryConnection = useCallback(async (publishUrl?: string, playbackUrl?: string) => {
    setReconnectAttempts(0);
    setError(null);
    
    const pubUrl = publishUrl || publishUrlRef.current;
    const playUrl = playbackUrl || playbackUrlRef.current;
    
    if (isPublishing && pubUrl && localStream) {
      await startPublishing(localStream, pubUrl);
    } else if (isPlaying && playUrl) {
      await startPlayback(playUrl);
    }
  }, [isPublishing, isPlaying, localStream, startPublishing, startPlayback]);

  // Stop everything
  const stop = useCallback(() => {
    isManuallyStoppedRef.current = true;
    cleanup();
    setConnectionState('idle');
    setLocalStream(null);
    setRemoteStream(null);
    publishUrlRef.current = '';
    playbackUrlRef.current = '';
  }, [cleanup]);

  // Listen for network reconnection
  useEffect(() => {
    const handleOnline = () => {
      if (connectionState === 'reconnecting' || connectionState === 'failed') {
        retryConnection();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [connectionState, retryConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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
  };
}

export default useWebRTC;
