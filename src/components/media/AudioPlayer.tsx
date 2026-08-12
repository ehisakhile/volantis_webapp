"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AudioPlayerProps {
  src: string;
  title?: string;
  thumbnailUrl?: string | null;
  autoPlay?: boolean;
  accent?: 'amber' | 'violet';
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
  onReady?: (duration: number) => void;
  className?: string;
}

function AudioVisualizer({ isActive, isMuted, accent }: { isActive: boolean; isMuted: boolean; accent: 'amber' | 'violet' }) {
  const bars = 48;
  const seed = useMemo(() => Array.from({ length: bars }, (_, i) => ({
    scale: 0.15 + 0.75 * Math.abs(Math.sin(i * 12.9898)),
    dur: 0.6 + 0.4 * Math.abs(Math.sin(i * 78.233)),
    delay: i * 0.02,
  })), [bars]);
  const color = accent === 'violet' ? '#8b5cf6' : '#f59e0b';
  const colorEnd = accent === 'violet' ? '#c026d3' : '#f97316';
  return (
    <div className="flex items-end justify-center gap-[2px] h-16 w-full px-4">
      {seed.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 max-w-2 rounded-full origin-bottom"
          style={{
            background: isMuted
              ? `${color}4d`
              : `linear-gradient(to top, ${color}, ${colorEnd})`,
            opacity: isActive && !isMuted ? 1 : 0.2,
          }}
          animate={isActive && !isMuted ? {
            scaleY: [0.1, v.scale, v.scale * 0.75, 0.1],
          } : { scaleY: 0.08 }}
          transition={isActive && !isMuted ? {
            duration: v.dur,
            repeat: Infinity,
            delay: v.delay,
            ease: 'easeInOut',
          } : { duration: 0.4 }}
        />
      ))}
    </div>
  );
}

function PulseRings({ isActive, accent }: { isActive: boolean; accent: 'amber' | 'violet' }) {
  const ringColor = accent === 'violet' ? 'rgba(139,92,246,0.35)' : 'rgba(245,158,11,0.3)';
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{ borderColor: ringColor }}
          animate={isActive ? {
            scale: [1, 2.5 + i * 0.5],
            opacity: [0.6, 0],
          } : { scale: 1, opacity: 0 }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  src,
  title,
  thumbnailUrl,
  autoPlay = false,
  accent = 'amber',
  onPlay,
  onPause,
  onEnded,
  onError,
  onReady,
  className,
}: AudioPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!src) return;

    let isMounted = true;
    setError(null);
    setIsLoading(true);
    setIsBuffering(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);

    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = 'anonymous';
    audio.src = src;
    audio.volume = volume;
    audio.preload = 'metadata';

    audio.onloadedmetadata = () => {
      if (!isMounted) return;
      setDuration(audio.duration || 0);
      setIsLoading(false);
      onReady?.(audio.duration || 0);
    };

    audio.oncanplay = () => { if (isMounted) setIsBuffering(false); };
    audio.onwaiting = () => { if (isMounted) setIsBuffering(true); };
    audio.onplay = () => { if (isMounted) { setIsPlaying(true); onPlay?.(); } };
    audio.onpause = () => { if (isMounted) { setIsPlaying(false); onPause?.(); } };

    audio.ontimeupdate = () => {
      if (!isMounted) return;
      setCurrentTime(audio.currentTime);
      if (audio.buffered.length > 0) {
        setBuffered(audio.buffered.end(audio.buffered.length - 1));
      }
    };

    audio.onended = () => {
      if (!isMounted) return;
      setIsPlaying(false);
      onEnded?.();
    };

    audio.onerror = () => {
      if (!isMounted) return;
      setError('Failed to load audio');
      setIsLoading(false);
      onError?.(new Error('Audio failed to load'));
    };

    const handleCanPlay = () => {
      audio.removeEventListener('canplay', handleCanPlay);
      if (!isMounted) return;
      if (autoPlay) {
        audio.play().catch(() => setIsLoading(false));
      }
    };
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      isMounted = false;
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      audio.src = '';
      audio.load();
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {
        setError('Playback blocked. Please tap play again.');
        setIsLoading(false);
      });
    } else {
      audio.pause();
    }
  }, []);

  const handleVolumeChange = useCallback((value: number) => {
    setVolume(value);
    if (audioRef.current) audioRef.current.volume = value;
    setIsMuted(value === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setIsMuted(audio.muted);
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Math.max(0, Math.min(audio.duration || duration, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  const gradient = accent === 'violet'
    ? 'from-violet-500 to-fuchsia-600'
    : 'from-amber-500 to-orange-600';

  return (
    <div className={cn('rounded-2xl overflow-hidden', className)} style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.95) 0%, rgba(8,14,28,0.98) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className={cn('h-1 w-full bg-gradient-to-r', accent === 'violet' ? 'from-violet-400 via-fuchsia-500 to-violet-400' : 'from-amber-400 via-orange-500 to-amber-400')} />

      <div className="p-4 sm:p-5">
        {title && (
          <div className="flex items-center gap-3 mb-4">
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0', gradient)}>
                <Clock className="w-5 h-5 text-white" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{title}</p>
            </div>
          </div>
        )}

        <div className="relative rounded-2xl overflow-hidden mb-4" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.04) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

          <div className="relative py-6 flex flex-col items-center justify-center">
            <div className="relative mb-3">
              <PulseRings isActive={isPlaying && !isMuted} accent={accent} />
              <motion.button
                onClick={togglePlayPause}
                className={cn('w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white shadow-2xl', gradient)}
                animate={isPlaying ? { scale: [1, 1.05, 1], boxShadow: [accent === 'violet' ? '0 0 20px rgba(139,92,246,0.3)' : '0 0 20px rgba(245,158,11,0.3)', accent === 'violet' ? '0 0 40px rgba(139,92,246,0.6)' : '0 0 40px rgba(245,158,11,0.6)', accent === 'violet' ? '0 0 20px rgba(139,92,246,0.3)' : '0 0 20px rgba(245,158,11,0.3)'] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isLoading ? (
                  <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-7 h-7 text-white" />
                ) : (
                  <Play className="w-7 h-7 text-white ml-1" />
                )}
              </motion.button>
            </div>

            <AudioVisualizer isActive={isPlaying} isMuted={isMuted} accent={accent} />

            {isLoading && !error && (
              <p className="text-slate-500 text-sm mt-1">Loading audio...</p>
            )}
            {error && (
              <p className="text-red-400 text-sm mt-1">{error}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <button onClick={toggleMute} disabled={isLoading || !!error} className="text-slate-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-50">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="relative flex-1 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer">
            <div className="absolute h-full bg-white/20 transition-all" style={{ width: `${bufferedPercent}%` }} />
            <div className={cn('absolute h-full bg-gradient-to-r transition-all', accent === 'violet' ? 'from-violet-500 to-fuchsia-500' : 'from-amber-500 to-orange-500')} style={{ width: `${progressPercent}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={isLoading || !!error}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>
          <span className="text-slate-500 text-xs mono w-20 text-right flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 mt-4">
          <button onClick={() => skip(-10)} disabled={isLoading || !!error} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !!error}
            className={cn('w-14 h-14 bg-gradient-to-r rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg', gradient)}
          >
            {isLoading || isBuffering ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>
          <button onClick={() => skip(10)} disabled={isLoading || !!error} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-slate-500 text-xs">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            disabled={isLoading || !!error}
            className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
