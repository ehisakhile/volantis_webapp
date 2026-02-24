"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConnectionStatus } from '@/types/livestream';
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer';

interface AudioPlayerProps {
  stream: MediaStream | null;
  playbackUrl?: string;
  title?: string;
  connectionState: ConnectionStatus;
  onPlay?: () => void;
  onPause?: () => void;
  onRetry?: () => void;
  isPlaying?: boolean;
  audioStats?: {
    bitrate?: number;
    jitter?: number;
    codec?: string;
  };
}

export function AudioPlayer({
  stream,
  title,
  connectionState,
  onPlay,
  onPause,
  onRetry,
  isPlaying = false,
  audioStats,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isReady, setIsReady] = useState(false);
  
  const { isActive: isAnalyzing, currentLevel, start: startAnalyzer, stop: stopAnalyzer } = useAudioAnalyzer();

  // Set up audio element when stream changes
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
      setIsReady(true);
    }
  }, [stream]);

  // Handle play/pause
  const handlePlayPause = useCallback(async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      await audioRef.current.pause();
      onPause?.();
      stopAnalyzer();
    } else {
      await audioRef.current.play();
      onPlay?.();
      if (stream) {
        startAnalyzer(stream);
      }
    }
  }, [isPlaying, onPlay, onPause, stream, startAnalyzer, stopAnalyzer]);

  // Handle volume change
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 0.5;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [isMuted, volume]);

  // Get status color
  const getStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'failed':
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'failed':
        return 'Connection Failed';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Ready';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Hidden audio element */}
      <audio 
        ref={audioRef} 
        autoPlay 
        playsInline 
        className="hidden"
      />
      
      {/* Main player container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative bg-slate-900 rounded-2xl overflow-hidden",
          "border border-slate-800 shadow-2xl"
        )}
      >
        {/* Background gradient based on connection state */}
        <div 
          className={cn(
            "absolute inset-0 opacity-20 transition-colors duration-500",
            connectionState === 'connected' && "bg-gradient-to-r from-sky-500/20 to-emerald-500/20",
            connectionState === 'reconnecting' && "bg-gradient-to-r from-yellow-500/20 to-orange-500/20",
            connectionState === 'failed' && "bg-gradient-to-r from-red-500/20 to-pink-500/20"
          )}
        />
        
        {/* Content */}
        <div className="relative p-6 md:p-8">
          {/* Status indicator */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
              <span className="text-sm text-slate-400">{getStatusText()}</span>
            </div>
            
            {/* Connection icon */}
            {connectionState === 'connected' ? (
              <Wifi className="w-5 h-5 text-emerald-500" />
            ) : (
              <WifiOff className={cn(
                "w-5 h-5",
                connectionState === 'reconnecting' ? "text-yellow-500 animate-pulse" : "text-red-500"
              )} />
            )}
          </div>
          
          {/* Title */}
          {title && (
            <h3 className="text-xl font-semibold text-white mb-6 truncate">
              {title}
            </h3>
          )}
          
          {/* Audio visualizer */}
          <div className="flex items-center justify-center h-24 mb-6">
            <AudioVisualizer 
              isActive={isPlaying && connectionState === 'connected'} 
              level={currentLevel}
            />
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {/* Play/Pause button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePlayPause}
              disabled={connectionState === 'connecting'}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center",
                "bg-sky-500 hover:bg-sky-600 disabled:bg-slate-700",
                "transition-colors duration-200",
                isPlaying && "bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7 text-white" />
              ) : (
                <Play className="w-7 h-7 text-white ml-1" />
              )}
            </motion.button>
            
            {/* Volume control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
            
            {/* Retry button */}
            <AnimatePresence>
              {connectionState === 'failed' && onRetry && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={onRetry}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          
          {/* Audio Stats */}
          {audioStats && connectionState === 'connected' && (
            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
              {audioStats.codec && (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Codec: {audioStats.codec}
                </span>
              )}
              {audioStats.jitter !== undefined && (
                <span>
                  Jitter: {audioStats.jitter.toFixed(1)} ms
                </span>
              )}
              {audioStats.bitrate !== undefined && (
                <span>
                  {audioStats.bitrate} kbps
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Reconnecting overlay */}
        <AnimatePresence>
          {connectionState === 'reconnecting' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-yellow-500/10 border-t border-yellow-500/20 px-6 py-3"
            >
              <p className="text-yellow-400 text-sm text-center">
                Connection lost. Attempting to reconnect...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// Audio visualizer component
interface AudioVisualizerProps {
  isActive: boolean;
  level: number;
}

function AudioVisualizer({ isActive, level }: AudioVisualizerProps) {
  const barCount = 32;
  
  return (
    <div className="flex items-center justify-center gap-1 h-full">
      {Array.from({ length: barCount }).map((_, i) => {
        // Create wave pattern
        const offset = Math.sin(i * 0.3) * 0.3 + 0.5;
        const height = isActive 
          ? Math.max(10, (level * offset * 100)) 
          : 10;
        
        return (
          <motion.div
            key={i}
            animate={{
              height: `${height}%`,
            }}
            transition={{
              duration: 0.1,
              ease: "easeOut"
            }}
            className={cn(
              "w-1.5 rounded-full",
              isActive 
                ? "bg-gradient-to-t from-sky-500 to-sky-400" 
                : "bg-slate-700"
            )}
            style={{
              opacity: isActive ? 0.5 + (i / barCount) * 0.5 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

export default AudioPlayer;
