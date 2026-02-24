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
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';
import { livestreamApi } from '@/lib/api/livestream';
import type { AudioSource, VolLivestreamOut } from '@/types/livestream';

// Audio visualizer component - defined first
interface AudioVisualizerProps {
  isActive: boolean;
  level: number;
}

function AudioVisualizer({ isActive, level }: AudioVisualizerProps) {
  const barCount = 40;
  
  return (
    <div className="flex items-center justify-center gap-0.5 h-full w-full px-8">
      {Array.from({ length: barCount }).map((_, i) => {
        const offset = Math.sin(i * 0.4) * 0.4 + 0.3;
        const baseHeight = isActive 
          ? Math.max(4, (level * offset * 100)) 
          : 4;
        
        return (
          <motion.div
            key={i}
            animate={{
              height: `${baseHeight}%`,
            }}
            transition={{
              duration: 0.08,
              ease: "easeOut"
            }}
            className={cn(
              "w-1.5 rounded-full",
              isActive 
                ? "bg-gradient-to-t from-sky-500 via-sky-400 to-sky-300" 
                : "bg-slate-700"
            )}
            style={{
              opacity: isActive ? 0.4 + (i / barCount) * 0.6 : 0.2,
            }}
          />
        );
      })}
    </div>
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
  
  // Audio sources
  const [audioSources, setAudioSources] = useState<AudioSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  
  // Stream duration
  const [streamDuration, setStreamDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Audio analyzer
  const { currentLevel, start: startAnalyzer, stop: stopAnalyzer, isActive: isAnalyzing } = useAudioAnalyzer();
  
  // WebRTC connection
  const { 
    connectionState, 
    startPublishing, 
    stop: stopWebRTC,
    error: webrtcError,
  } = useWebRTC({
    onConnectionStateChange: (state) => {
      if (state === 'connected') {
        console.log('WebRTC connected successfully');
      }
    },
  });

  // Enumerate audio devices
  const enumerateAudioSources = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 4)}`,
          kind: 'audioinput' as const,
        }));
      setAudioSources(audioInputs);
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
    }
  }, []);

  // Request microphone permission
  const requestMicrophoneAccess = useCallback(async () => {
    try {
      setPermissionError(null);
      
      // First enumerate to get labels
      await enumerateAudioSources();
      
      // Then get the stream with selected device
      const constraints: MediaStreamConstraints = {
        audio: selectedSource 
          ? { deviceId: { exact: selectedSource } }
          : true,
        video: false, // Audio only
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setHasPermission(true);
      
      // Start audio analyzer
      startAnalyzer(stream);
      
      // Refresh device list after permission granted
      await enumerateAudioSources();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to access microphone');
      setPermissionError(error.message);
      setHasPermission(false);
    }
  }, [selectedSource, enumerateAudioSources, startAnalyzer]);

  // Start streaming - calls API first, then connects WebRTC
  const handleStartStream = useCallback(async () => {
    if (!localStream || !streamTitle.trim()) return;
    
    setIsStarting(true);
    
    try {
      // Step 1: Call API to start audio stream
      const streamData = await livestreamApi.startAudioStream({
        title: streamTitle,
        description: streamDescription || undefined,
      });
      
      setCurrentStream(streamData);
      
      // Step 2: Get the publish URL from API response
      if (streamData.cf_webrtc_publish_url) {
        // Step 3: Connect via WebRTC with the publish URL
        await startPublishing(localStream, streamData.cf_webrtc_publish_url);
        
        setIsStreaming(true);
        
        // Start duration counter
        durationIntervalRef.current = setInterval(() => {
          setStreamDuration(prev => prev + 1);
        }, 1000);
        
        onStreamStarted?.(streamData);
      } else {
        throw new Error('No publish URL returned from API');
      }
    } catch (err) {
      console.error('Failed to start stream:', err);
      const error = err instanceof Error ? err : new Error('Failed to start stream');
      setPermissionError(error.message);
    } finally {
      setIsStarting(false);
    }
  }, [localStream, streamTitle, streamDescription, startPublishing, onStreamStarted]);

  // Stop streaming
  const handleStopStream = useCallback(async () => {
    // Stop WebRTC connection
    stopWebRTC();
    stopAnalyzer();
    
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
    
    onStreamStopped?.();
  }, [currentStream, stopWebRTC, stopAnalyzer, onStreamStopped]);

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
        return { icon: SignalHigh, color: 'text-green-500', label: 'Excellent' };
      case 'connecting':
        return { icon: Signal, color: 'text-yellow-500', label: 'Connecting' };
      case 'reconnecting':
        return { icon: SignalLow, color: 'text-yellow-500', label: 'Reconnecting' };
      default:
        return { icon: Signal, color: 'text-slate-400', label: 'Not connected' };
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [localStream]);

  const connectionQuality = getConnectionQuality();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Creator Studio</h1>
            <p className="text-slate-400">Audio Broadcasting</p>
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
            {/* Audio Source Selector */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-sky-500" />
                Audio Source
              </h2>
              
              {/* Source dropdown */}
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                disabled={isStreaming || isStarting}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
              >
                <option value="">Default Microphone</option>
                {audioSources.map((source) => (
                  <option key={source.deviceId} value={source.deviceId}>
                    {source.label}
                  </option>
                ))}
              </select>
              
              {/* Request permission button */}
              {!hasPermission && (
                <Button
                  onClick={requestMicrophoneAccess}
                  className="w-full"
                  disabled={isStarting}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Allow Microphone Access
                </Button>
              )}
              
              {/* Permission error */}
              {permissionError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{permissionError}</p>
                </div>
              )}
              
              {/* Audio level meter */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
                  <span>Input Level</span>
                  <span>{Math.round(currentLevel * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      currentLevel > 0.8 ? "bg-red-500" : currentLevel > 0.5 ? "bg-yellow-500" : "bg-sky-500"
                    )}
                    style={{ width: `${currentLevel * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Stream Settings */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-500" />
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
                    disabled={!hasPermission || !streamTitle.trim() || isStarting}
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
              
              {/* WebRTC error */}
              {webrtcError && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm">{webrtcError}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Right Panel - Preview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Live Preview */}
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
              
              {/* Audio visualizer */}
              <div className="bg-slate-950 rounded-xl h-48 flex items-center justify-center mb-4">
                <AudioVisualizer 
                  isActive={isStreaming && isAnalyzing} 
                  level={currentLevel}
                />
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
                
                {/* Audio Level */}
                <div className="bg-slate-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                    <Headphones className="w-4 h-4" />
                    <span className="text-xs">Audio</span>
                  </div>
                  <span className={cn(
                    "font-semibold",
                    hasPermission ? "text-emerald-500" : "text-slate-500"
                  )}>
                    {hasPermission ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Stream Title Display */}
            {isStreaming && streamTitle && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-5"
              >
                <h3 className="text-sm text-sky-400 mb-1">Now Streaming</h3>
                <p className="text-xl font-semibold">{streamTitle}</p>
                {currentStream && (
                  <p className="text-slate-400 text-sm mt-1">
                    Slug: {currentStream.slug}
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatorStreaming;
