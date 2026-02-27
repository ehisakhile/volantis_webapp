"use client";

/**
 * RecordingPlayer - Improved audio player with chunked loading for large WebM files
 *
 * Key improvements:
 * 1. MediaSource Extensions (MSE) for chunked streaming of large WebM files
 * 2. Graceful fallback to standard <audio> for small files or unsupported browsers
 * 3. Beautiful full-player + mini-player UI consistent with FullPlayer/MiniPlayer design
 * 4. Progress-aware buffering indicator
 * 5. Resume from last position, mark-complete, watch-position sync
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Clock,
  ChevronUp,
  ChevronDown,
  SkipBack,
  SkipForward,
  Loader2,
  CheckCircle2,
  Radio,
  Waves,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecordingInfo {
  id: number;
  title: string;
  description?: string | null;
  duration_seconds: number | null;
  company_name?: string;
  company_logo_url?: string | null;
}

export interface WatchStatusInfo {
  last_position?: number | null;
  is_completed?: boolean;
}

export interface RecordingPlayerProps {
  /** The recording metadata */
  recording: RecordingInfo;
  /** Direct S3/CDN URL for the WebM file */
  src: string;
  /** Saved watch position to resume from */
  watchStatus?: WatchStatusInfo | null;
  /** Called every 10 s with current position */
  onPositionUpdate?: (recordingId: number, position: number) => void;
  /** Called when playback reaches the end */
  onCompleted?: (recordingId: number) => void;
  /** Called when the player is closed */
  onClose?: () => void;
  /** Chunk size in bytes for MSE streaming (default: 2 MB) */
  chunkSize?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(secs: number | null): string {
  if (!secs || secs <= 0) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Mini waveform bars ───────────────────────────────────────────────────────

function WaveformBars({ isActive }: { isActive: boolean }) {
  const bars = [3, 5, 8, 6, 4, 7, 5, 3, 6, 8, 5, 4];
  return (
    <div className="flex items-end gap-[2px] h-5">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-amber-400"
          style={{ height: isActive ? undefined : `${h * 2}px`, minHeight: 2 }}
          animate={
            isActive
              ? {
                  height: [
                    `${h * 2}px`,
                    `${h * 4}px`,
                    `${h * 2}px`,
                  ],
                }
              : { height: `${h * 2}px` }
          }
          transition={
            isActive
              ? {
                  duration: 0.5 + i * 0.07,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }
              : {}
          }
        />
      ))}
    </div>
  );
}

// ─── Buffered progress bar ────────────────────────────────────────────────────

function BufferedBar({
  buffered,
  duration,
}: {
  buffered: TimeRanges | null;
  duration: number;
}) {
  if (!buffered || duration <= 0) return null;
  const ranges: { start: number; end: number }[] = [];
  for (let i = 0; i < buffered.length; i++) {
    ranges.push({ start: buffered.start(i), end: buffered.end(i) });
  }
  return (
    <>
      {ranges.map((r, i) => (
        <div
          key={i}
          className="absolute top-0 h-full bg-white/20 rounded-full"
          style={{
            left: `${(r.start / duration) * 100}%`,
            width: `${((r.end - r.start) / duration) * 100}%`,
          }}
        />
      ))}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RecordingPlayer({
  recording,
  src,
  watchStatus,
  onPositionUpdate,
  onCompleted,
  onClose,
  chunkSize = 2 * 1024 * 1024, // 2 MB default
}: RecordingPlayerProps) {
  // UI state
  const [expanded, setExpanded] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(recording.duration_seconds ?? 0);
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(
    watchStatus?.is_completed ?? false
  );
  const [loadProgress, setLoadProgress] = useState(0); // 0-100

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunkQueueRef = useRef<ArrayBuffer[]>([]);
  const isAppendingRef = useRef(false);
  const totalBytesRef = useRef(0);
  const loadedBytesRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const positionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const seekOnReadyRef = useRef<number | null>(
    watchStatus?.last_position && watchStatus.last_position > 0
      ? watchStatus.last_position
      : null
  );

  // ── Chunk appending queue ──────────────────────────────────────────────────

  const flushQueue = useCallback(() => {
    const sb = sourceBufferRef.current;
    if (!sb || isAppendingRef.current || chunkQueueRef.current.length === 0) return;
    if (sb.updating) return;

    isAppendingRef.current = true;
    const chunk = chunkQueueRef.current.shift()!;
    try {
      sb.appendBuffer(chunk);
    } catch (e) {
      console.error("appendBuffer error", e);
      isAppendingRef.current = false;
    }
  }, []);

  // ── MSE streaming ──────────────────────────────────────────────────────────

  const startMSEStream = useCallback(async () => {
    if (!window.MediaSource) {
      // Fallback: just use <audio src>
      return false;
    }

    // Detect MIME – WebM with Opus is common for browser recordings
    const mimeType = 'audio/webm; codecs="opus"';
    if (!MediaSource.isTypeSupported(mimeType)) {
      return false;
    }

    try {
      // Get content-length first
      const headResp = await fetch(src, { method: "HEAD" });
      totalBytesRef.current = parseInt(
        headResp.headers.get("content-length") ?? "0",
        10
      );
    } catch {
      // Content-length may not be available (CORS, etc.)
      totalBytesRef.current = 0;
    }

    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    const objectUrl = URL.createObjectURL(ms);

    const audio = audioRef.current!;
    audio.src = objectUrl;

    await new Promise<void>((resolve) => {
      ms.addEventListener("sourceopen", () => resolve(), { once: true });
    });

    URL.revokeObjectURL(objectUrl);

    const sb = ms.addSourceBuffer(mimeType);
    sourceBufferRef.current = sb;

    sb.addEventListener("updateend", () => {
      isAppendingRef.current = false;
      setBuffered(audio.buffered);
      flushQueue();
    });

    // Stream in chunks using Range requests
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    let offset = 0;
    const total = totalBytesRef.current;

    const fetchNextChunk = async () => {
      if (signal.aborted) return;

      const end =
        total > 0
          ? Math.min(offset + chunkSize - 1, total - 1)
          : offset + chunkSize - 1;

      const headers: Record<string, string> = {
        Range: `bytes=${offset}-${end}`,
      };

      let resp: Response;
      try {
        resp = await fetch(src, { headers, signal });
      } catch (e) {
        if (!signal.aborted) setLoadError("Network error while loading.");
        return;
      }

      if (!resp.ok && resp.status !== 206) {
        setLoadError(`Failed to load chunk: HTTP ${resp.status}`);
        return;
      }

      const data = await resp.arrayBuffer();
      loadedBytesRef.current += data.byteLength;

      if (total > 0) {
        setLoadProgress(
          Math.round((loadedBytesRef.current / total) * 100)
        );
      }

      chunkQueueRef.current.push(data);
      flushQueue();

      // Check if this was the last chunk
      const contentRange = resp.headers.get("content-range");
      if (contentRange) {
        const match = contentRange.match(/bytes \d+-(\d+)\/(\d+)/);
        if (match) {
          const fileSize = parseInt(match[2], 10);
          totalBytesRef.current = fileSize;
          if (loadedBytesRef.current >= fileSize) {
            // All bytes received
            ms.endOfStream();
            return;
          }
        }
      }

      // If server doesn't return 206 (no range support), we received all data
      if (resp.status === 200) {
        ms.endOfStream();
        return;
      }

      offset += data.byteLength;

      if (total > 0 && offset >= total) {
        ms.endOfStream();
        return;
      }

      // Small delay to avoid hammering the server
      setTimeout(fetchNextChunk, 10);
    };

    fetchNextChunk();
    return true;
  }, [src, chunkSize, flushQueue]);

  // ── Audio element setup ────────────────────────────────────────────────────

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = "anonymous"; // Enable CORS for S3 URLs
    audio.volume = volume;
    audio.preload = "metadata";

    const onCanPlay = () => {
      setIsLoading(false);
      if (seekOnReadyRef.current !== null) {
        audio.currentTime = seekOnReadyRef.current;
        seekOnReadyRef.current = null;
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setBuffered(audio.buffered);
    };

    const onDurationChange = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
    };

    const onEnded = async () => {
      setIsPlaying(false);
      setIsCompleted(true);
      onCompleted?.(recording.id);
    };

    const onError = () => {
      setLoadError("Failed to load audio. Please try again.");
      setIsLoading(false);
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);

    // Try MSE first, fall back to direct src
    startMSEStream().then((usedMSE) => {
      if (!usedMSE) {
        // Fallback: standard src
        audio.src = src;
        if (seekOnReadyRef.current !== null) {
          audio.addEventListener(
            "loadedmetadata",
            () => {
              audio.currentTime = seekOnReadyRef.current!;
              seekOnReadyRef.current = null;
            },
            { once: true }
          );
        }
      }
    });

    return () => {
      audio.pause();
      audio.src = "";
      abortControllerRef.current?.abort();
      if (mediaSourceRef.current?.readyState === "open") {
        try { mediaSourceRef.current.endOfStream(); } catch {}
      }
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // ── Position update interval ───────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying) {
      positionIntervalRef.current = setInterval(() => {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          onPositionUpdate?.(recording.id, Math.floor(audio.currentTime));
        }
      }, 10_000);
    } else {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
    }
    return () => {
      if (positionIntervalRef.current) clearInterval(positionIntervalRef.current);
    };
  }, [isPlaying, recording.id, onPositionUpdate]);

  // ── Volume sync ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // ── Controls ───────────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(console.error);
    else audio.pause();
  }, []);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * duration;
  }, [duration]);

  const skip = useCallback((secs: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + secs));
  }, [duration]);

  const handleClose = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) {
      onPositionUpdate?.(recording.id, Math.floor(audio.currentTime));
      audio.pause();
    }
    abortControllerRef.current?.abort();
    onClose?.();
  }, [recording.id, onPositionUpdate, onClose]);

  const progress = duration > 0 ? currentTime / duration : 0;

  // ── Mini-player ────────────────────────────────────────────────────────────

  if (!expanded) {
    return (
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(520px,calc(100vw-2rem))]"
      >
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)]"
          style={{
            background: "rgba(8,14,28,0.95)",
            backdropFilter: "blur(40px)",
          }}
        >
          {/* Animated top border */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

          {/* Thin progress */}
          <div className="absolute top-[2px] left-0 h-[2px] bg-amber-400/40 transition-all duration-300"
            style={{ width: `${progress * 100}%` }} />

          <div className="flex items-center gap-4 px-5 py-4">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              {isCompleted && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900" />
              )}
            </div>

            {/* Title + waveform */}
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{recording.title}</p>
              <div className="h-5 mt-1">
                <WaveformBars isActive={isPlaying} />
              </div>
            </div>

            {/* Time */}
            <span className="text-slate-500 text-xs tabular-nums flex-shrink-0">
              {fmt(currentTime)} / {fmt(duration)}
            </span>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                disabled={isLoading && loadProgress < 5}
                className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-white transition-colors disabled:opacity-40"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setExpanded(true)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Full-player ────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: "spring", stiffness: 250, damping: 28 }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Backdrop blur strip */}
      <div
        className="relative border-t border-white/10 shadow-[0_-30px_80px_rgba(0,0,0,0.8)]"
        style={{ background: "rgba(8,14,28,0.97)", backdropFilter: "blur(48px)" }}
      >
        {/* Top animated gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 via-orange-500 via-rose-500 to-amber-400 bg-[size:200%_100%]" />

        {/* Loading/buffer progress bar */}
        {loadProgress > 0 && loadProgress < 100 && (
          <div className="absolute top-[2px] left-0 h-[2px] bg-amber-300/30 transition-all duration-500"
            style={{ width: `${loadProgress}%` }} />
        )}

        <div className="max-w-6xl mx-auto px-4 py-5">
          {/* ── Seek bar ── */}
          <div
            className="relative h-2 rounded-full bg-white/10 cursor-pointer group mb-5 overflow-visible"
            onClick={seek}
          >
            {/* Buffered ranges */}
            <BufferedBar buffered={buffered} duration={duration} />

            {/* Playback fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />

            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${progress * 100}% - 7px)` }}
            />
          </div>

          {/* ── Main row ── */}
          <div className="flex items-center gap-4">
            {/* Recording info */}
            <div className="flex items-center gap-3 w-64 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  {recording.company_logo_url ? (
                    <img
                      src={recording.company_logo_url}
                      alt={recording.company_name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Clock className="w-5 h-5 text-white" />
                  )}
                </div>
                {isCompleted && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border border-slate-900">
                    <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
                {isPlaying && !isCompleted && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border border-slate-900">
                    <span className="block w-full h-full rounded-full bg-amber-400 animate-ping opacity-75" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate leading-snug">
                  {recording.title}
                </p>
                {recording.company_name && (
                  <p className="text-slate-500 text-xs truncate mt-0.5">
                    {recording.company_name}
                  </p>
                )}
                {/* Mini waveform */}
                <div className="mt-1">
                  <WaveformBars isActive={isPlaying} />
                </div>
              </div>
            </div>

            {/* Centre: transport controls */}
            <div className="flex-1 flex items-center justify-center gap-4">
              {/* Skip back */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => skip(-30)}
                className="group flex flex-col items-center gap-0.5 text-slate-400 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
                <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">30s</span>
              </motion.button>

              {/* Play/Pause */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={togglePlay}
                disabled={isLoading && loadProgress < 5 && !audioRef.current?.readyState}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 disabled:opacity-50 transition-all"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                }}
              >
                {isLoading && !isPlaying ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-0.5" />
                )}
              </motion.button>

              {/* Skip forward */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => skip(30)}
                className="group flex flex-col items-center gap-0.5 text-slate-400 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
                <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">30s</span>
              </motion.button>
            </div>

            {/* Right: time + volume + actions */}
            <div className="flex items-center gap-4 w-64 justify-end">
              {/* Time display */}
              <div className="text-slate-400 text-xs tabular-nums hidden sm:block">
                <span className="text-white">{fmt(currentTime)}</span>
                <span className="mx-1">/</span>
                {fmt(duration)}
              </div>

              {/* Buffer indicator */}
              {loadProgress > 0 && loadProgress < 100 && (
                <div className="hidden md:flex items-center gap-1.5 text-xs text-amber-400/70">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{loadProgress}%</span>
                </div>
              )}

              {/* Volume */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <div className="relative w-20 h-1.5 bg-white/10 rounded-full cursor-pointer group">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ left: `calc(${(isMuted ? 0 : volume) * 100}% - 6px)` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (v > 0) setIsMuted(false);
                    }}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Minimize */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setExpanded(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </motion.button>

              {/* Close */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Error */}
          {loadError && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-red-400 text-xs mt-3"
            >
              {loadError}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}