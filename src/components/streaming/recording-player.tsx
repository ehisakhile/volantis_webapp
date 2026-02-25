"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, X, SkipBack, SkipForward } from 'lucide-react';
import type { VolRecordingOut } from '@/types/livestream';
import { recordingsApi } from '@/lib/api/recordings';

interface RecordingPlayerProps {
  recording: VolRecordingOut;
  onClose: () => void;
  onCompleted?: () => void;
  onPositionUpdate?: (position: number) => void;
}

export function RecordingPlayer({ 
  recording, 
  onClose, 
  onCompleted,
  onPositionUpdate 
}: RecordingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration_seconds || 0);
  const [buffered, setBuffered] = useState(0);
  
  // Fetch the playback URL and start playing
  useEffect(() => {
    let isMounted = true;
    
    const initPlayback = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get the recording with playback URL (this records a replay view)
        const playbackData = await recordingsApi.getRecordingForPlayback(recording.id);
        
        if (!isMounted) return;
        
        // Create audio element
        const audio = new Audio();
        
        // Enable CORS for cross-origin S3 URL
        audio.crossOrigin = 'anonymous';
        
        // Set the source
        audio.src = playbackData.s3_url;
        
        // Resume from last position if available
        if (playbackData.watch_status?.last_position && playbackData.watch_status.last_position > 0) {
          audio.currentTime = playbackData.watch_status.last_position;
        }
        
        // Set duration if available
        if (recording.duration_seconds) {
          setDuration(recording.duration_seconds);
        }
        
        // Audio event handlers
        audio.onloadedmetadata = () => {
          if (!isMounted) return;
          setDuration(audio.duration || recording.duration_seconds || 0);
          setIsLoading(false);
        };
        
        audio.oncanplay = () => {
          if (!isMounted) return;
          setIsBuffering(false);
          // Don't auto-play - wait for user interaction
          // This fixes issues with browser autoplay policies
        };
        
        audio.oncanplaythrough = () => {
          if (!isMounted) return;
          setIsBuffering(false);
        };
        
        audio.onplay = () => {
          if (isMounted) {
            setIsPlaying(true);
            startPositionUpdates();
          }
        };
        
        audio.onpause = () => {
          if (isMounted) {
            setIsPlaying(false);
            stopPositionUpdates();
          }
        };
        
        audio.onended = async () => {
          if (!isMounted) return;
          setIsPlaying(false);
          stopPositionUpdates();
          
          // Mark as completed
          try {
            await recordingsApi.markRecordingCompleted(recording.id);
            onCompleted?.();
          } catch (err) {
            console.error('Failed to mark completed:', err);
          }
        };
        
        audio.onerror = () => {
          if (!isMounted) return;
          const error = audio.error;
          console.error('Audio error:', error?.message, error?.code);
          if (error?.code === 4) {
            // MEDIA_ERR_SRC_NOT_SUPPORTED - format issue
            setError('Audio format not supported');
          } else {
            setError('Failed to load audio');
          }
          setIsLoading(false);
        };
        
        audio.onwaiting = () => {
          if (isMounted) setIsBuffering(true);
        };
        
        audio.ontimeupdate = () => {
          if (!isMounted) return;
          setCurrentTime(audio.currentTime);
          
          // Update buffered amount
          if (audio.buffered.length > 0) {
            const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
            setBuffered(bufferedEnd);
          }
        };
        
        audioRef.current = audio;
        
      } catch (err) {
        if (isMounted) {
          console.error('Failed to init playback:', err);
          setError('Failed to load recording');
          setIsLoading(false);
        }
      }
    };
    
    initPlayback();
    
    return () => {
      isMounted = false;
      stopPositionUpdates();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [recording.id, recording.duration_seconds]);
  
  const startPositionUpdates = useCallback(() => {
    // Update position every 10 seconds
    positionUpdateRef.current = setInterval(async () => {
      if (audioRef.current && !audioRef.current.paused) {
        const position = Math.floor(audioRef.current.currentTime);
        try {
          await recordingsApi.updateWatchPosition(recording.id, position);
          onPositionUpdate?.(position);
        } catch (err) {
          console.error('Failed to update position:', err);
        }
      }
    }, 10000);
  }, [recording.id, onPositionUpdate]);
  
  const stopPositionUpdates = useCallback(() => {
    if (positionUpdateRef.current) {
      clearInterval(positionUpdateRef.current);
      positionUpdateRef.current = null;
    }
  }, []);
  
  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [isPlaying]);
  
  // Handle volume
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  }, []);
  
  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  }, [isMuted]);
  
  // Handle seek
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);
  
  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (audioRef.current) {
      const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);
  
  // Format time
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50"
    >
      <div className="container-custom py-4">
        {/* Recording Info */}
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-white font-semibold truncate">{recording.title}</h4>
            <p className="text-sm text-slate-400 truncate">
              {recording.description || 'Recording'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            {/* Buffered */}
            <div 
              className="absolute h-full bg-slate-600 transition-all"
              style={{ width: `${bufferedPercent}%` }}
            />
            {/* Progress */}
            <div 
              className="absolute h-full bg-amber-500 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Slider */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Skip Back */}
          <button
            onClick={() => skip(-10)}
            disabled={isLoading}
            className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className="w-14 h-14 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isBuffering ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : error ? (
              <span className="text-xs">Error</span>
            ) : isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>
          
          {/* Skip Forward */}
          <button
            onClick={() => skip(10)}
            disabled={isLoading}
            className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
        
        {/* Volume */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={toggleMute}
            className="w-8 h-8 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="text-center text-red-400 text-sm mt-2">
            {error}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default RecordingPlayer;