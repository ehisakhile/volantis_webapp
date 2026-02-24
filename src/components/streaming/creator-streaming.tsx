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
  Volume2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { livestreamApi } from '@/lib/api/livestream';
import {
  ICE_CONFIG,
  captureMicrophone,
  captureSystemAudio,
  mixAudioStreams,
  startVisualizer,
  waitForIce,
  preferOpus,
  detectAudioCodec,
  getAudioInputDevices,
} from '@/lib/webrtc-utils';
import type { VolLivestreamOut } from '@/types/livestream';

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
  
  // Stats
  const [codec, setCodec] = useState<string>('—');
  const [bitrate, setBitrate] = useState<string>('—');
  const [iceState, setIceState] = useState<string>('—');
  
  // Refs for WebRTC and streams
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pubStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const systemStreamRef = useRef<MediaStream | null>(null);
  const stopVizRef = useRef<(() => void) | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Visualizer canvas ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
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

  // Handle start streaming - exactly like test_webrtc.html
  const handleStartStream = useCallback(async () => {
    if (!streamTitle.trim()) {
      setError('Please enter a stream title');
      return;
    }

    // Validate audio source selection
    if (!useMic && !useSystemAudio) {
      setError('Select at least one audio source');
      return;
    }

    if (mixAudio && (!useMic || !useSystemAudio)) {
      setError('Mix requires both Microphone and System Audio');
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
      });
      
      setCurrentStream(streamData);

      if (!streamData.cf_webrtc_publish_url) {
        throw new Error('No publish URL returned from API');
      }

      // Step 2: Capture audio based on selection (exactly like test_webrtc.html)
      let pubStream: MediaStream;
      
      if (useMic && !useSystemAudio) {
        // Microphone only
        console.log('Requesting microphone with device:', selectedMicDevice || 'default');
        pubStream = await captureMicrophone(selectedMicDevice || undefined);
        console.log('Microphone acquired');
      } else if (useSystemAudio && !useMic) {
        // System audio only
        console.log('Requesting system audio...');
        pubStream = await captureSystemAudio();
      } else if (useMic && useSystemAudio && mixAudio) {
        // Mixed audio
        console.log('Requesting microphone and system audio...');
        const [mic, system] = await Promise.all([
          captureMicrophone(selectedMicDevice || undefined),
          captureSystemAudio()
        ]);
        micStreamRef.current = mic;
        systemStreamRef.current = system;
        
        // Mix them together
        pubStream = mixAudioStreams([micStreamRef.current, systemStreamRef.current]);
        console.log('Audio streams mixed');
      } else if (useMic && useSystemAudio && !mixAudio) {
        // Both but not mixed - use system audio
        console.log('Requesting system audio (both selected)...');
        pubStream = await captureSystemAudio();
      } else {
        throw new Error('Invalid audio source configuration');
      }

      pubStreamRef.current = pubStream;

      // Step 3: Start visualizer (like test_webrtc.html)
      if (canvasRef.current) {
        stopVizRef.current = startVisualizer(pubStream, canvasRef.current, '#00e5a0');
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

      // Add audio track
      pubStream.getAudioTracks().forEach(t => pc.addTrack(t, pubStream));

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

      setIsStreaming(true);
      onStreamStarted?.(streamData);

    } catch (err) {
      console.error('Publish error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to start stream';
      setError(errorMsg);
      setConnectionState('failed');
      teardownPublish();
    } finally {
      setIsStarting(false);
    }
  }, [streamTitle, streamDescription, useMic, useSystemAudio, mixAudio, onStreamStarted]);

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

  // Teardown function (exactly like test_webrtc.html)
  const teardownPublish = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (pubStreamRef.current) {
      pubStreamRef.current.getTracks().forEach(t => t.stop());
      pubStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (systemStreamRef.current) {
      systemStreamRef.current.getTracks().forEach(t => t.stop());
      systemStreamRef.current = null;
    }
    if (stopVizRef.current) {
      stopVizRef.current();
      stopVizRef.current = null;
    }
    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }
    setBitrate('—');
    setIceState('—');
  }, []);

  // Handle stop streaming
  const handleStopStream = useCallback(async () => {
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
    
    onStreamStopped?.();
  }, [currentStream, teardownPublish, onStreamStopped]);

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
                      if (!e.target.checked) setMixAudio(false);
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
                      if (!e.target.checked) setMixAudio(false);
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
                    onChange={(e) => setMixAudio(e.target.checked)}
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
              
              {/* Start/Stop buttons */}
              <div className="flex gap-3">
                {!isStreaming ? (
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
