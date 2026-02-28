"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Mic,
  Radio,
  Square,
  Settings,
  Headphones,
  Signal,
  SignalLow,
  SignalHigh,
  Clock,
  Users,
  Loader2,
  Monitor,
  AlertCircle,
  Volume2,
  Wifi,
  WifiOff,
  Play,
  Image,
  X,
  Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { livestreamApi } from '@/lib/api/livestream';
import {
  ICE_CONFIG,
  startVisualizer,
  waitForIce,
  preferOpus,
  detectAudioCodec,
  getAudioInputDevices,
} from '@/lib/webrtc-utils';
import {
  AudioSourceManager,
  createAudioSourceManager,
  type AudioSourceState,
} from '@/lib/audio-sources';
import { MixerEngine, createMixerEngine, captureMicSource, captureSystemSource, type ChannelType } from '@/lib/mixer-engine';
import { CreatorMixer } from './creator-mixer';
import type { VolLivestreamOut } from '@/types/livestream';
import { useStreamRecorder } from '@/hooks/useStreamRecorder';
import { RecordingPrompt, RecordingStatus } from './recording-prompt';
import { CreatorNotStreamingModal } from './creator-not-streaming-modal';

// Audio visualizer component using canvas (like test_webrtc.html)
interface AudioVisualizerProps {
  isActive: boolean;
  level: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  accentColor?: string;
}

function AudioVisualizer({ isActive, level, canvasRef, accentColor = '#00e5a0' }: AudioVisualizerProps) {
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={128}
      className="w-full h-32"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  );
}

interface CreatorStreamingProps {
  onStreamStarted?: (stream: VolLivestreamOut) => void;
  onStreamStopped?: () => void;
}

export function CreatorStreaming({
  onStreamStarted,
  onStreamStopped,
}: CreatorStreamingProps) {
  // Stream state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);
  
  // Audio source selection (like test_webrtc.html)
  const [useMic, setUseMic] = useState(true);
  const [useSystemAudio, setUseSystemAudio] = useState(false);
  const [mixAudio, setMixAudio] = useState(false);
  
  // Microphone device selection
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>('');
  const [showMicPicker, setShowMicPicker] = useState(false);
  
  // Stream duration
  const [streamDuration, setStreamDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Connection state
  const [connectionState, setConnectionState] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Active stream detection state
  const [existingActiveStream, setExistingActiveStream] = useState<VolLivestreamOut | null>(null);
  const [isCheckingActiveStream, setIsCheckingActiveStream] = useState(false);
  const [showReconnectPrompt, setShowReconnectPrompt] = useState(false);
  
  // Derived state - true when there's an existing active stream that can be resumed
  const hasActiveStream = !!existingActiveStream && !isStreaming;
  
  // Network status
  const [isOnline, setIsOnline] = useState(true);
  const [networkRecovered, setNetworkRecovered] = useState(false);
  
  // Stats
  const [codec, setCodec] = useState<string>('—');
  const [bitrate, setBitrate] = useState<string>('—');
  const [iceState, setIceState] = useState<string>('—');
  
  // Refs for WebRTC and streams
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pubStreamRef = useRef<MediaStream | null>(null);
  const stopVizRef = useRef<(() => void) | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Audio Source Manager - handles audio source selection and lifecycle
  const audioSourceManagerRef = useRef<AudioSourceManager | null>(null);
  
  // Mixer Engine - handles audio mixing and channel management
  const mixerEngineRef = useRef<MixerEngine | null>(null);
  
  // Initialize audio source manager on mount
  useEffect(() => {
    audioSourceManagerRef.current = createAudioSourceManager();
    return () => {
      // Cleanup on unmount
      if (audioSourceManagerRef.current) {
        audioSourceManagerRef.current.stopAll();
      }
    };
  }, []);
   
  // Visualizer canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stream recorder hook
  const recorder = useStreamRecorder({
    onRecordingReady: (blob, filename) => {
      console.log('Recording ready:', filename, blob.size, 'bytes');
    },
    onUploadComplete: (recordingUrl) => {
      console.log('Recording uploaded:', recordingUrl);
    },
    onUploadError: (error) => {
      console.error('Upload error:', error);
    },
  });
  
  // Load microphone devices on mount and when showing picker
  useEffect(() => {
    if (showMicPicker) {
      loadMicDevices();
    }
  }, [showMicPicker]);

  const loadMicDevices = useCallback(async () => {
    try {
      // Request permission first
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const devices = await getAudioInputDevices();
      setMicDevices(devices);
      if (devices.length > 0 && !selectedMicDevice) {
        setSelectedMicDevice(devices[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to load mic devices:', err);
    }
  }, [selectedMicDevice]);

  // Check for existing active streams on mount and auto-reconnect
  const checkForActiveStream = useCallback(async () => {
    setIsCheckingActiveStream(true);
    try {
      const activeStreams = await livestreamApi.getActiveStreams(50, 0);
      if (activeStreams.length > 0) {
        // Found an existing active stream - automatically reconnect
        console.log('Found existing active stream:', activeStreams[0]);
        setExistingActiveStream(activeStreams[0]);
        // Pre-fill the title and description from the existing stream
        setStreamTitle(activeStreams[0].title);
        setStreamDescription(activeStreams[0].description || '');
        // Don't show the modal, just update the UI to show resume button
        setShowReconnectPrompt(false);
      }
    } catch (err) {
      console.error('Failed to check for active streams:', err);
    } finally {
      setIsCheckingActiveStream(false);
    }
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: Online');
      setIsOnline(true);
      if (isStreaming && connectionState === 'failed') {
        // Network recovered while streaming - check for active stream
        setNetworkRecovered(true);
      }
    };

    const handleOffline = () => {
      console.log('Network: Offline');
      setIsOnline(false);
      setNetworkRecovered(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isStreaming, connectionState]);

  // Handle network recovery - check for active stream
  useEffect(() => {
    if (networkRecovered && isStreaming) {
      const handleNetworkRecovery = async () => {
        console.log('Network recovered, checking for active stream...');
        try {
          const activeStreams = await livestreamApi.getActiveStreams(50, 0);
          const myStream = activeStreams.find(s => s.id === currentStream?.id);
          
          if (myStream) {
            // Our stream is still active - update existing stream
            console.log('Our stream is still active');
            setExistingActiveStream(myStream);
            setNetworkRecovered(false);
          } else {
            // Stream may have ended while offline
            console.log('Stream may have ended while offline');
            setIsStreaming(false);
            setCurrentStream(null);
            setConnectionState('idle');
          }
        } catch (err) {
          console.error('Failed to check active stream after network recovery:', err);
        }
      };

      handleNetworkRecovery();
    }
  }, [networkRecovered, isStreaming, currentStream]);

  // Check for active streams on mount
  useEffect(() => {
    checkForActiveStream();
  }, [checkForActiveStream]);

  // Handle start streaming - exactly like test_webrtc.html
  const handleStartStream = useCallback(async () => {
    if (!streamTitle.trim()) {
      setError('Please enter a stream title');
      return;
    }

    // Validate audio source selection using AudioSourceManager
    if (!audioSourceManagerRef.current) {
      audioSourceManagerRef.current = createAudioSourceManager();
    }
    
    const audioValidationError = audioSourceManagerRef.current.validate();
    if (audioValidationError) {
      setError(audioValidationError);
      return;
    }

    // Show recording prompt if user hasn't decided yet
    if (recorder.shouldPromptRecording) {
      recorder.promptRecording();
      return;
    }

    setIsStarting(true);
    setError(null);
    setConnectionState('connecting');

    try {
      // Step 1: Call API to start audio stream
      const streamData = await livestreamApi.startAudioStream({
        title: streamTitle,
        description: streamDescription || undefined,
        thumbnail: thumbnail || undefined,
      });
      
      setCurrentStream(streamData);
      // Clear any existing stream reference since we started a new one
      setExistingActiveStream(null);

      if (!streamData.cf_webrtc_publish_url) {
        throw new Error('No publish URL returned from API');
      }

      // Step 2: Capture audio using AudioSourceManager (modular approach)
      if (!audioSourceManagerRef.current) {
        throw new Error('Audio source manager not initialized');
      }
      
      // Validate configuration using the manager
      const validationError = audioSourceManagerRef.current.validate();
      if (validationError) {
        setError(validationError);
        setIsStarting(false);
        return;
      }
      
      // Step 2b: Initialize Mixer Engine and route audio through it
      const engine = createMixerEngine();
      mixerEngineRef.current = engine;
      
      // Capture audio based on user selection and add to mixer
      let micStream: MediaStream | null = null;
      
      if (useMic) {
        // Capture microphone
        micStream = await captureMicSource(selectedMicDevice || undefined);
        engine.addChannel('mic', 'MIC', 'mic', micStream, selectedMicDevice || undefined);
      }
      
      if (useSystemAudio) {
        // Capture system audio
        const systemStream = await captureSystemSource();
        engine.addChannel('system', 'ANY INPUT', 'system', systemStream);
      }
      
      // Get the mixed output stream for WebRTC
      const outputStream = engine.outputStream;
      
      // Store reference for cleanup
      pubStreamRef.current = outputStream;

      // Step 3: Start visualizer with the mixed output
      if (canvasRef.current) {
        stopVizRef.current = startVisualizer(outputStream, canvasRef.current, '#00e5a0');
      }

      // Step 4: Create WebRTC connection (exactly like test_webrtc.html)
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        setIceState(s);
        console.log(`Publish ICE → ${s}`);
        
        if (s === 'connected') {
          setConnectionState('connected');
          startPubStats();
        } else if (s === 'failed' || s === 'disconnected') {
          setConnectionState('failed');
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`Publish ICE gathering → ${pc.iceGatheringState}`);
      };

      // Add audio track from mixer output
      outputStream.getAudioTracks().forEach(t => pc.addTrack(t, outputStream));

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });

      // Prefer Opus with low-latency settings (exactly like test_webrtc.html)
      const sdpWithOpus = preferOpus(offer.sdp || '');
      await pc.setLocalDescription({ type: offer.type, sdp: sdpWithOpus });

      console.log('Waiting for ICE gathering...');
      
      // Wait for ICE
      await waitForIce(pc, 2000);

      console.log(`Sending offer to: ${streamData.cf_webrtc_publish_url}`);
      
      // Send to server (WHIP protocol)
      const res = await fetch(streamData.cf_webrtc_publish_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'Accept': 'application/sdp'
        },
        body: pc.localDescription!.sdp
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server ${res.status}: ${txt.slice(0, 200)}`);
      }

      const answerSdp = await res.text();
      console.log(`Answer received (${answerSdp.length} bytes)`);

      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // Detect codec
      const detectedCodec = detectAudioCodec(answerSdp);
      setCodec(detectedCodec);
      console.log(`Negotiated codec: ${detectedCodec}`);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);

      // Start recording if user opted in
      if (recorder.state.wantsToRecord && pubStreamRef.current) {
        recorder.startRecording(pubStreamRef.current, streamData.slug, streamTitle);
      }

      setIsStreaming(true);
      onStreamStarted?.(streamData);

    } catch (err) {
      console.error('Publish error:', err);
      console.log('', err instanceof Error ? err.stack : '');
      const errorMsg = err instanceof Error ? err.message : 'Failed to start stream';
      setError(errorMsg);
      setConnectionState('failed');
      teardownPublish();
    } finally {
      setIsStarting(false);
    }
  }, [streamTitle, streamDescription, thumbnail, selectedMicDevice, onStreamStarted, recorder]);

  // Stats tracking (like test_webrtc.html)
  const startPubStats = useCallback(() => {
    let lastBytes = 0;
    let lastTs = 0;
    
    statsTimerRef.current = setInterval(async () => {
      if (!pcRef.current) return;
      const stats = await pcRef.current.getStats();
      stats.forEach(r => {
        if (r.type === 'outbound-rtp' && r.kind === 'audio') {
          const now = r.timestamp;
          const bytes = r.bytesSent;
          if (lastTs) {
            const dt = (Number(now) - lastTs) / 1000;
            const kbps = Math.round(((bytes - lastBytes) * 8) / dt / 1000);
            setBitrate(kbps + ' kbps');
          }
          lastBytes = Number(bytes);
          lastTs = Number(now);
        }
      });
    }, 1500);
  }, []);

  // Teardown function - now uses AudioSourceManager for cleanup
  const teardownPublish = useCallback(() => {
    // Close WebRTC peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    
    // Stop the main publish stream
    if (pubStreamRef.current) {
      pubStreamRef.current.getTracks().forEach(t => t.stop());
      pubStreamRef.current = null;
    }
    
    // Use AudioSourceManager to stop all audio sources (handles mic, system, mixed)
    if (audioSourceManagerRef.current) {
      audioSourceManagerRef.current.stopAll();
    }
    
    // Destroy MixerEngine and release all audio resources
    if (mixerEngineRef.current) {
      mixerEngineRef.current.destroy();
      mixerEngineRef.current = null;
    }
    
    // Stop visualizer
    if (stopVizRef.current) {
      stopVizRef.current();
      stopVizRef.current = null;
    }
    
    // Clear stats timer
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    
    // Reset stats displays
    setBitrate('—');
    setIceState('—');
  }, []);

  // Handle reconnect to existing stream
  const handleReconnectToStream = useCallback(async () => {
    if (!existingActiveStream) return;

    setShowReconnectPrompt(false);
    setIsStarting(true);
    setError(null);
    setConnectionState('connecting');

    try {
      // Get the existing stream data
      const streamData = existingActiveStream;

      if (!streamData.cf_webrtc_publish_url) {
        throw new Error('No publish URL available for reconnection');
      }

      setCurrentStream(streamData);

      // Initialize Mixer Engine and route audio through it
      const engine = createMixerEngine();
      mixerEngineRef.current = engine;
      
      // Capture audio based on user selection and add to mixer
      if (useMic) {
        const micStream = await captureMicSource(selectedMicDevice || undefined);
        engine.addChannel('mic', 'MIC', 'mic', micStream, selectedMicDevice || undefined);
      }
      
      if (useSystemAudio) {
        const systemStream = await captureSystemSource();
        engine.addChannel('system', 'ANY INPUT', 'system', systemStream);
      }
      
      // Get the mixed output stream for WebRTC
      const outputStream = engine.outputStream;
      pubStreamRef.current = outputStream;

      // Start visualizer with the mixed output
      if (canvasRef.current) {
        stopVizRef.current = startVisualizer(outputStream, canvasRef.current, '#00e5a0');
      }

      // Create WebRTC connection
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        setIceState(s);
        console.log(`Publish ICE → ${s}`);
        
        if (s === 'connected') {
          setConnectionState('connected');
          startPubStats();
        } else if (s === 'failed' || s === 'disconnected') {
          setConnectionState('failed');
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`Publish ICE gathering → ${pc.iceGatheringState}`);
      };

      // Add audio track from mixer output
      outputStream.getAudioTracks().forEach((t: MediaStreamTrack) => pc.addTrack(t, outputStream));

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });

      const sdpWithOpus = preferOpus(offer.sdp || '');
      await pc.setLocalDescription({ type: offer.type, sdp: sdpWithOpus });

      console.log('Waiting for ICE gathering...');
      await waitForIce(pc, 2000);

      console.log(`Reconnecting to: ${streamData.cf_webrtc_publish_url}`);
      
      // Send to server (WHIP protocol)
      const res = await fetch(streamData.cf_webrtc_publish_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'Accept': 'application/sdp'
        },
        body: pc.localDescription!.sdp
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server ${res.status}: ${txt.slice(0, 200)}`);
      }

      const answerSdp = await res.text();
      console.log(`Answer received (${answerSdp.length} bytes)`);

      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // Detect codec
      const detectedCodec = detectAudioCodec(answerSdp);
      setCodec(detectedCodec);
      console.log(`Negotiated codec: ${detectedCodec}`);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);

      setIsStreaming(true);
      onStreamStarted?.(streamData);

    } catch (err) {
      console.error('Reconnect error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to reconnect to stream';
      setError(errorMsg);
      setConnectionState('failed');
      teardownPublish();
    } finally {
      setIsStarting(false);
    }
  }, [existingActiveStream, selectedMicDevice, onStreamStarted, teardownPublish, startPubStats]);

  // Handle starting a new stream (dismiss reconnect prompt)
  const handleStartNewStream = useCallback(() => {
    setShowReconnectPrompt(false);
    setExistingActiveStream(null);
    setStreamTitle('');
    setStreamDescription('');
    setThumbnail(null);
    setThumbnailPreview(null);
  }, []);

  // Handle stop streaming
  const handleStopStream = useCallback(async () => {
    // Stop recording if it's running (this will auto-download)
    if (recorder.state.isRecording) {
      recorder.stopRecording();
    }

    teardownPublish();
    
    // Stop duration counter
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    
    // Call API to stop stream
    if (currentStream?.slug) {
      try {
        await livestreamApi.stopStream(currentStream.slug);
      } catch (err) {
        console.error('Failed to stop stream via API:', err);
      }
    }
    
    setIsStreaming(false);
    setStreamDuration(0);
    setCurrentStream(null);
    setCodec('—');
    setConnectionState('idle');
    
    // Check for any remaining active streams after stopping
    checkForActiveStream();
    
    onStreamStopped?.();
  }, [currentStream, teardownPublish, onStreamStopped, recorder, checkForActiveStream]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get connection quality
  const getConnectionQuality = () => {
    switch (connectionState) {
      case 'connected':
        return { icon: SignalHigh, color: 'text-green-500', label: 'Live' };
      case 'connecting':
        return { icon: Signal, color: 'text-yellow-500', label: 'Connecting' };
      case 'failed':
        return { icon: SignalLow, color: 'text-red-500', label: 'Failed' };
      default:
        return { icon: Signal, color: 'text-slate-400', label: 'Offline' };
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      teardownPublish();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [teardownPublish]);

  const connectionQuality = getConnectionQuality();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Creator Studio</h1>
            <p className="text-slate-400">WHIP Audio Streaming</p>
          </div>
          
          {/* Connection status */}
          <div className="flex items-center gap-2">
            {isStreaming && (
              <>
                <connectionQuality.icon className={cn("w-5 h-5", connectionQuality.color)} />
                <span className={cn("text-sm", connectionQuality.color)}>
                  {connectionQuality.label}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Recording Prompt Modal */}
        <RecordingPrompt
          isOpen={recorder.shouldPromptRecording && !isStreaming}
          onAccept={recorder.acceptRecording}
          onDecline={recorder.declineRecording}
        />

        {/* Network Status Banner */}
        {!isOnline && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Network connection lost</span>
          </div>
        )}

        {/* Recording Status - show after stream ends or during recording */}
        {(recorder.state.isRecording || recorder.state.recordedBlob) && (
          <div className="mb-6">
            <RecordingStatus
              isRecording={recorder.state.isRecording}
              recordingDuration={recorder.state.recordingDuration}
              recordedBlob={recorder.state.recordedBlob}
              recordedFilename={recorder.state.recordedFilename}
              isUploading={recorder.state.isUploading}
              uploadProgress={recorder.state.uploadProgress}
              onDownload={recorder.downloadRecording}
              onUpload={recorder.uploadRecording}
              error={recorder.state.error}
            />
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Audio Source Selection (exactly like test_webrtc.html) */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-500" />
                Audio Sources
              </h2>
              
              {/* Audio Source Checkboxes */}
              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMic}
                    onChange={(e) => {
                      setUseMic(e.target.checked);
                      audioSourceManagerRef.current?.setUseMic(e.target.checked);
                      if (!e.target.checked) {
                        setMixAudio(false);
                        audioSourceManagerRef.current?.setMixAudio(false);
                      }
                    }}
                    disabled={isStreaming || isStarting}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <Mic className="w-4 h-4 text-sky-400" />
                  <span className="text-sm">Microphone</span>
                </label>
                
                {/* Microphone Picker - show when mic is enabled */}
                {useMic && (
                  <div className="ml-7 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowMicPicker(!showMicPicker)}
                      disabled={isStreaming || isStarting}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      {selectedMicDevice
                        ? (micDevices.find(d => d.deviceId === selectedMicDevice)?.label || 'Select microphone')
                        : 'Select microphone'}
                    </button>
                    
                    {showMicPicker && (
                      <div className="mt-2 bg-slate-800 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {micDevices.length === 0 ? (
                          <span className="text-xs text-slate-500">No devices found</span>
                        ) : (
                          micDevices.map(device => (
                            <button
                              key={device.deviceId}
                              type="button"
                              onClick={() => {
                                setSelectedMicDevice(device.deviceId);
                                audioSourceManagerRef.current?.setSelectedMicDevice(device.deviceId);
                                setShowMicPicker(false);
                              }}
                              className={cn(
                                "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-700",
                                selectedMicDevice === device.deviceId && "bg-sky-500/20 text-sky-400"
                              )}
                            >
                              {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useSystemAudio}
                    onChange={(e) => {
                      setUseSystemAudio(e.target.checked);
                      audioSourceManagerRef.current?.setUseSystemAudio(e.target.checked);
                      if (!e.target.checked) {
                        setMixAudio(false);
                        audioSourceManagerRef.current?.setMixAudio(false);
                      }
                    }}
                    disabled={isStreaming || isStarting}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <Monitor className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">System Audio</span>
                </label>
                
                <label 
                  className={cn(
                    "flex items-center gap-3 cursor-pointer",
                    (!useMic || !useSystemAudio) && "opacity-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={mixAudio}
                    onChange={(e) => {
                      setMixAudio(e.target.checked);
                      audioSourceManagerRef.current?.setMixAudio(e.target.checked);
                    }}
                    disabled={!useMic || !useSystemAudio || isStreaming || isStarting}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <Volume2 className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Mix (Mic + System)</span>
                </label>
              </div>
              
              {/* Error display */}
              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}
            </div>
            
            {/* Stream Settings */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-sky-500" />
                Stream Settings
              </h2>
               
              {/* Show existing stream info when resuming, otherwise show input fields */}
              {!isStreaming && hasActiveStream ? (
                /* Resume Broadcast Mode - Show existing stream info */
                <div className="mb-4 p-4 bg-sky-500/10 border border-sky-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Radio className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-medium text-sky-400">Active Stream Detected</span>
                  </div>
                  <p className="text-white font-semibold">{existingActiveStream?.title}</p>
                  {existingActiveStream?.description && (
                    <p className="text-slate-400 text-sm mt-1">{existingActiveStream.description}</p>
                  )}
                  <p className="text-slate-500 text-xs mt-2">
                    Started: {new Date(existingActiveStream?.created_at || '').toLocaleString()}
                  </p>
                </div>
              ) : (
                !isStreaming && (
                  <>
                    {/* Stream title */}
                    <div className="mb-4">
                      <label className="block text-sm text-slate-400 mb-2">Stream Title</label>
                      <input
                        type="text"
                        value={streamTitle}
                        onChange={(e) => setStreamTitle(e.target.value)}
                        placeholder="Enter stream title..."
                        disabled={isStreaming || isStarting}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                      />
                    </div>
                    
                    {/* Stream description */}
                    <div className="mb-4">
                      <label className="block text-sm text-slate-400 mb-2">Description (optional)</label>
                      <textarea
                        value={streamDescription}
                        onChange={(e) => setStreamDescription(e.target.value)}
                        placeholder="What's your stream about?"
                        disabled={isStreaming || isStarting}
                        rows={2}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 resize-none"
                      />
                    </div>

                    {/* Thumbnail upload */}
                    <div className="mb-4">
                      <label className="block text-sm text-slate-400 mb-2">Cover Image (optional)</label>
                      {thumbnailPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={thumbnailPreview}
                            alt="Thumbnail preview"
                            className="w-32 h-32 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setThumbnail(null);
                              setThumbnailPreview(null);
                            }}
                            disabled={isStreaming || isStarting}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 text-white disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label
                          className={cn(
                            "flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-sky-500 transition-colors",
                            (isStreaming || isStarting) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <Upload className="w-8 h-8 text-slate-400 mb-2" />
                          <span className="text-xs text-slate-400">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setThumbnail(file);
                                setThumbnailPreview(URL.createObjectURL(file));
                              }
                            }}
                            disabled={isStreaming || isStarting}
                            className="hidden"
                          />
                        </label>
                      )}
                      <p className="text-xs text-slate-500 mt-2">Recommended: 1900x1900px</p>
                    </div>
                  </>
                )
              )}
               
              {/* Start/Stop buttons */}
              <div className="flex gap-3">
                {!isStreaming ? (
                  hasActiveStream ? (
                    /* Resume Broadcast button - shows existing stream title */
                    <Button
                      onClick={handleReconnectToStream}
                      disabled={isStarting || isCheckingActiveStream}
                      className="flex-1 bg-sky-500 hover:bg-sky-600"
                      title={`Resume: ${existingActiveStream?.title}`}
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resuming...
                        </>
                      ) : isCheckingActiveStream ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Resume: {existingActiveStream?.title?.length > 20 
                            ? existingActiveStream?.title.substring(0, 20) + '...' 
                            : existingActiveStream?.title}
                        </>
                      )}
                    </Button>
                  ) : (
                    /* Start New Stream button */
                    <Button
                      onClick={handleStartStream}
                      disabled={!streamTitle.trim() || isStarting}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                    >
                      {isStarting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4 mr-2" />
                          Go Live
                        </>
                      )}
                    </Button>
                  )
                ) : (
                  <Button
                    onClick={handleStopStream}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    End Stream
                  </Button>
                )}
              </div>

              {/* Option to start fresh if there's an existing stream */}
              {!isStreaming && hasActiveStream && (
                <div className="mt-3 text-center">
                  <button
                    onClick={handleStartNewStream}
                    className="text-xs text-slate-500 hover:text-slate-400 underline"
                  >
                    Start a new stream instead
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Preview */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
              
              {/* Canvas Visualizer (like test_webrtc.html) */}
              <div className="bg-slate-950 rounded-xl h-32 mb-4 overflow-hidden border border-slate-800 relative">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={128}
                  className={cn(
                    "w-full h-32",
                    isStreaming ? "block" : "hidden"
                  )}
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-slate-500 text-sm">Visualizer will appear here when streaming</span>
                  </div>
                )}
                {/* Label like in test_webrtc.html */}
                {isStreaming && (
                  <span className="absolute top-2 right-3 text-xs text-slate-500 uppercase tracking-wider">
                    MIC INPUT
                  </span>
                )}
              </div>
              
              {/* Stats Row (exactly like test_webrtc.html) */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">State</div>
                  <div className="text-sm font-semibold">{iceState || '—'}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Codec</div>
                  <div className="text-sm font-semibold">{codec}</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-400 mb-1">Bitrate</div>
                  <div className="text-sm font-semibold">{bitrate}</div>
                </div>
              </div>
              
              {/* Stream info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Status */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Signal className="w-4 h-4" />
                    <span className="text-xs">Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isStreaming ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-semibold text-emerald-500">LIVE</span>
                      </>
                    ) : (
                      <span className="text-slate-500">Offline</span>
                    )}
                  </div>
                </div>
                
                {/* Duration */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs">Duration</span>
                  </div>
                  <span className="font-mono font-semibold">
                    {formatDuration(streamDuration)}
                  </span>
                </div>
                
                {/* Viewers */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Users className="w-4 h-4" />
                    <span className="text-xs">Viewers</span>
                  </div>
                  <span className="font-semibold">
                    {currentStream?.viewer_count || 0}
                  </span>
                </div>
                
                {/* Audio Status */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Headphones className="w-4 h-4" />
                    <span className="text-xs">Audio</span>
                  </div>
                  <span className={cn(
                    "font-semibold",
                    isStreaming ? "text-emerald-500" : "text-slate-500"
                  )}>
                    {isStreaming ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Audio Mixer - Show when streaming */}
            {isStreaming && mixerEngineRef.current && (
              <CreatorMixer
                mixerEngine={mixerEngineRef.current}
                isStreaming={isStreaming}
                onAddChannel={async (type: ChannelType) => {
                  if (!mixerEngineRef.current) return;
                  
                  try {
                    if (type === 'mic') {
                      const stream = await captureMicSource();
                      mixerEngineRef.current.addChannel(`mic-${Date.now()}`, 'MIC', 'mic', stream);
                    } else if (type === 'system') {
                      const stream = await captureSystemSource();
                      mixerEngineRef.current.addChannel(`system-${Date.now()}`, 'ANY INPUT', 'system', stream);
                    }
                  } catch (err) {
                    console.error('Failed to add channel:', err);
                  }
                }}
                onRemoveChannel={(id: string) => {
                  if (mixerEngineRef.current) {
                    mixerEngineRef.current.removeChannel(id);
                  }
                }}
              />
            )}
            
            {/* Stream Title Display */}
            {isStreaming && streamTitle && (
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h3 className="text-lg font-semibold mb-2">{streamTitle}</h3>
                {streamDescription && (
                  <p className="text-slate-400 text-sm">{streamDescription}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatorStreaming;