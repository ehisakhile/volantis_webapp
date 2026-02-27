"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Clock, X, SkipBack, SkipForward } from 'lucide-react';
import type { VolRecordingOut } from '@/types/livestream';
import { recordingsApi } from '@/lib/api/recordings';

const API_BASE_URL = 'https://api-dev.volantislive.com';

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
  const [isSourceReady, setIsSourceReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration_seconds || 0);
  const [buffered, setBuffered] = useState(0);

  const stopPositionUpdates = useCallback(() => {
    if (positionUpdateRef.current) {
      clearInterval(positionUpdateRef.current);
      positionUpdateRef.current = null;
    }
  }, []);

  const startPositionUpdates = useCallback(() => {
    stopPositionUpdates();
    positionUpdateRef.current = setInterval(async () => {
      if (audioRef.current && !audioRef.current.paused) {
        const position = Math.floor(audioRef.current.currentTime);
        try {
          await recordingsApi.updateWatchPosition(recording.id, position);
          onPositionUpdate?.(position);
        } catch (err) {
          console.error('[RecordingPlayer] Failed to update position:', err);
        }
      }
    }, 10000);
  }, [recording.id, onPositionUpdate, stopPositionUpdates]);

  // ─── Initialize & auto-play on mount ────────────────────────────────────────
  // This effect runs once per mount. Because the parent passes `key={recording.id}`,
  // swapping recordings causes a full unmount/remount which is the correct behaviour.
  useEffect(() => {
    let isMounted = true;

    const initPlayback = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log('[RecordingPlayer] Initialising for recording:', recording.id);

        const playbackData = await recordingsApi.getRecordingForPlayback(recording.id);
        if (!isMounted) return;

        let fullUrl = playbackData.streaming_url;
        if (fullUrl && !fullUrl.startsWith('http')) {
          fullUrl = `${API_BASE_URL}${fullUrl}`;
        }
        console.log('[RecordingPlayer] Resolved URL:', fullUrl);

        const audio = new Audio();
        audioRef.current = audio;
        audio.crossOrigin = 'anonymous';
        audio.src = fullUrl;
        audio.volume = volume;

        // Resume from last position
        if (playbackData.watch_status?.last_position && playbackData.watch_status.last_position > 0) {
          audio.currentTime = playbackData.watch_status.last_position;
          setCurrentTime(playbackData.watch_status.last_position);
        }

        if (recording.duration_seconds) setDuration(recording.duration_seconds);

        // ── Event handlers ────────────────────────────────────────────────────
        audio.onloadedmetadata = () => {
          if (!isMounted) return;
          setDuration(audio.duration || recording.duration_seconds || 0);
          setIsSourceReady(true);
          setIsLoading(false);
        };

        audio.oncanplay = () => { if (isMounted) setIsBuffering(false); };
        audio.oncanplaythrough = () => { if (isMounted) setIsBuffering(false); };
        audio.onwaiting = () => { if (isMounted) setIsBuffering(true); };

        audio.onplay = () => {
          if (isMounted) { setIsPlaying(true); startPositionUpdates(); }
        };
        audio.onpause = () => {
          if (isMounted) { setIsPlaying(false); stopPositionUpdates(); }
        };
        audio.onended = async () => {
          if (!isMounted) return;
          setIsPlaying(false);
          stopPositionUpdates();
          try {
            await recordingsApi.markRecordingCompleted(recording.id);
            onCompleted?.();
          } catch (err) {
            console.error('[RecordingPlayer] Failed to mark completed:', err);
          }
        };

        audio.ontimeupdate = () => {
          if (!isMounted || !audio) return;
          setCurrentTime(audio.currentTime);
          if (audio.buffered.length > 0) {
            setBuffered(audio.buffered.end(audio.buffered.length - 1));
          }
        };

        audio.onerror = () => {
          if (!isMounted) return;
          console.error('[RecordingPlayer] Audio error code:', audio.error?.code);
          setError('Failed to load audio');
          setIsLoading(false);
        };

        // ── Auto-play once metadata is ready ──────────────────────────────────
        // We use `oncanplay` to trigger the first play so the browser has enough
        // data buffered and won't throw a NotAllowedError / NotSupportedError.
        const handleFirstCanPlay = () => {
          audio.removeEventListener('canplay', handleFirstCanPlay);
          if (!isMounted) return;
          audio.play().catch((err) => {
            console.error('[RecordingPlayer] Auto-play blocked:', err);
            // Auto-play was blocked by the browser — show the play button instead.
            setIsLoading(false);
          });
        };
        audio.addEventListener('canplay', handleFirstCanPlay);

      } catch (err) {
        if (isMounted) {
          console.error('[RecordingPlayer] Init failed:', err);
          setError('Failed to load recording');
          setIsLoading(false);
        }
      }
    };

    initPlayback();

    return () => {
      console.log('[RecordingPlayer] Unmounting recording:', recording.id);
      isMounted = false;
      stopPositionUpdates();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs once on mount; parent controls identity via `key`

  // ─── Controls ────────────────────────────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(console.error);
  }, [isPlaying]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = newTime; setCurrentTime(newTime); }
  }, []);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          {/* Thumbnail with fallback chain: thumbnail_url > company_logo_url > gradient icon */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
            {recording.thumbnail_url ? (
              <img
                src={recording.thumbnail_url}
                alt={recording.title}
                className="w-full h-full object-cover"
              />
            ) : recording.company_logo_url ? (
              <img
                src={recording.company_logo_url}
                alt={recording.company_name || 'Company'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-white font-semibold truncate">{recording.title}</h4>
            <p className="text-sm text-slate-400 truncate">{recording.description || 'Recording'}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="absolute h-full bg-slate-600 transition-all" style={{ width: `${bufferedPercent}%` }} />
            <div className="absolute h-full bg-amber-500 transition-all" style={{ width: `${progressPercent}%` }} />
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              disabled={isLoading || !isSourceReady}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Status hints */}
        {isLoading && (
          <div className="text-center text-sm text-slate-400 mb-2">Loading recording…</div>
        )}
        {!isLoading && !isSourceReady && !error && (
          <div className="text-center text-xs text-slate-500 mb-2">Preparing audio…</div>
        )}

        {/* Playback controls */}
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => skip(-10)} disabled={!isSourceReady} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlayPause}
            disabled={isLoading || !isSourceReady || !!error}
            className="w-14 h-14 bg-amber-500 hover:bg-amber-600 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isBuffering
              ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : error
              ? <span className="text-xs">Error</span>
              : isPlaying
              ? <Pause className="w-6 h-6" />
              : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <button onClick={() => skip(10)} disabled={!isSourceReady} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={toggleMute} disabled={!isSourceReady} className="w-8 h-8 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range" min="0" max="1" step="0.1"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            disabled={!isSourceReady}
            className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {error && <div className="text-center text-red-400 text-sm mt-2">{error}</div>}
      </div>
    </motion.div>
  );
}

export default RecordingPlayer;