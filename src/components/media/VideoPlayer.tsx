"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, PictureInPicture2,
  SkipBack, SkipForward, Download, CheckCircle2, Loader2, RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  autoPlay?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: unknown) => void;
  onReady?: (duration: number) => void;
  className?: string;
}

const CACHE_NAME = 'volantis-media-v1';
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return `v${hash.toString(36)}`;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const MSE_MIME_CANDIDATES = [
  'video/mp4; codecs="avc1.640028, mp4a.40.2"',
  'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
  'video/mp4; codecs="hvc1.1.6.L120.90, mp4a.40.2"',
  'video/mp4; codecs="hev1.1.6.L120.90, mp4a.40.2"',
  'video/webm; codecs="vp9, opus"',
  'video/webm; codecs="vp8, opus"',
  'video/webm; codecs="av1, opus"',
  'video/webm',
  'video/ogg; codecs="theora, vorbis"',
  'video/ogg',
];

function detectMseMimeType(src: string): string | null {
  if (typeof MediaSource === 'undefined') return null;
  if (/\.m3u8(\?|$)/i.test(src)) return null;
  const ext =
    /\.(mp4|m4v|mov)(\?|$)/i.test(src) ? 'mp4' :
    /\.webm(\?|$)/i.test(src) ? 'webm' :
    /\.(ogv|ogg)(\?|$)/i.test(src) ? 'ogg' : null;
  const families = ext ? [ext] : ['mp4', 'webm', 'ogg'];
  for (const family of families) {
    for (const mime of MSE_MIME_CANDIDATES) {
      if (!mime.includes(family)) continue;
      try {
        if (MediaSource.isTypeSupported(mime)) return mime;
      } catch {
        // unsupported mime - keep probing
      }
    }
  }
  return null;
}

export default function VideoPlayer({
  src,
  poster,
  title,
  autoPlay = false,
  onPlay,
  onPause,
  onEnded,
  onError,
  onReady,
  className,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // MediaSource (MSE) streaming state - feeds the 206 partial-content
  // response into a SourceBuffer instead of letting the browser enforce
  // CORS on each range request against the raw src.
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const chunkQueueRef = useRef<ArrayBuffer[]>([]);
  const isAppendingRef = useRef(false);
  const streamAbortRef = useRef<AbortController | null>(null);
  const triedFallbackRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  // Offline cache state
  const [isCached, setIsCached] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);

  const cacheKey = hashString(src);

  // Cleanup object URLs and rAF
  const cleanupMSE = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    sourceBufferRef.current = null;
    chunkQueueRef.current = [];
    isAppendingRef.current = false;
    const ms = mediaSourceRef.current;
    mediaSourceRef.current = null;
    if (ms) {
      try {
        if (ms.readyState === 'open') {
          ms.endOfStream();
        }
      } catch {
        // source already closed
      }
    }
  }, []);

  const releasePlayback = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    cleanupMSE();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, [cleanupMSE]);

  const checkCache = useCallback(async (): Promise<Blob | null> => {
    if (typeof caches === 'undefined') return null;
    try {
      const cache = await caches.open(CACHE_NAME);
      const response = await cache.match(`/volantis-media/${cacheKey}`);
      if (response && response.ok) {
        const blob = await response.blob();
        return blob;
      }
    } catch {
      // cache unavailable - fall back to network
    }
    return null;
  }, [cacheKey]);

  const fallbackToDirect = useCallback((video: HTMLVideoElement) => {
    cleanupMSE();
    video.removeAttribute('crossorigin');
    video.src = src;
    video.load();
  }, [cleanupMSE, src]);

  const flushQueue = useCallback(() => {
    const sb = sourceBufferRef.current;
    const video = videoRef.current;
    if (!sb || !video || sb.updating || isAppendingRef.current) return;
    if (mediaSourceRef.current?.readyState === 'ended') return;
    const chunk = chunkQueueRef.current.shift();
    if (!chunk) return;
    isAppendingRef.current = true;
    try {
      sb.appendBuffer(chunk);
    } catch (err) {
      console.error('Failed to append media chunk:', err);
      isAppendingRef.current = false;
      fallbackToDirect(video);
    }
  }, [fallbackToDirect]);

  const startMSEStream = useCallback(async (video: HTMLVideoElement): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.MediaSource || typeof MediaSource === 'undefined') {
      return false;
    }
    const mimeType = detectMseMimeType(src);
    if (!mimeType) return false;

    const ms = new MediaSource();
    mediaSourceRef.current = ms;
    const objectUrl = URL.createObjectURL(ms);
    objectUrlRef.current = objectUrl;
    video.src = objectUrl;

    const opened = await new Promise<boolean>((resolve) => {
      const timer = window.setTimeout(() => resolve(false), 8000);
      ms.addEventListener('sourceopen', () => {
        window.clearTimeout(timer);
        resolve(true);
      }, { once: true });
    });
    if (!opened) {
      cleanupMSE();
      return false;
    }

    let sb: SourceBuffer;
    try {
      sb = ms.addSourceBuffer(mimeType);
    } catch (err) {
      console.error('addSourceBuffer failed:', err);
      cleanupMSE();
      return false;
    }
    sourceBufferRef.current = sb;

    sb.addEventListener('updateend', () => {
      isAppendingRef.current = false;
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
      flushQueue();
    });

    sb.addEventListener('error', () => {
      fallbackToDirect(video);
    });

    const controller = new AbortController();
    streamAbortRef.current = controller;

    try {
      const response = await fetch(src, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
        headers: { Range: 'bytes=0-' },
      });

      if (!response.ok && response.status !== 206) {
        throw new Error(`Failed to fetch video (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported in this browser');
      }

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = (value.byteOffset === 0 && value.byteLength === value.buffer.byteLength)
          ? value.buffer as ArrayBuffer
          : (value.buffer as ArrayBuffer).slice(value.byteOffset, value.byteOffset + value.byteLength);
        chunkQueueRef.current.push(chunk);
        flushQueue();
      }

      if (mediaSourceRef.current?.readyState === 'open') {
        mediaSourceRef.current.endOfStream();
      }
      return true;
    } catch (err) {
      if (!controller.signal.aborted) {
        console.error('MSE streaming failed, falling back to direct source:', err);
      }
      cleanupMSE();
      return false;
    }
  }, [src, cleanupMSE, fallbackToDirect, flushQueue]);

  const loadSource = useCallback(async (forceNetwork = false) => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setIsLoading(true);
    setIsBuffering(false);
    triedFallbackRef.current = false;

    releasePlayback();

    // Prefer cached copy for instant start + offline support.
    if (!forceNetwork) {
      const blob = await checkCache();
      if (blob) {
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setIsCached(true);
        video.src = url;
        video.load();
        return;
      }
    }

    setIsCached(false);

    // Stream the 206 partial-content response via MSE to avoid CORS errors
    // on the video element's range requests. Falls back to direct src.
    const usedMSE = await startMSEStream(video);
    if (!usedMSE) {
      fallbackToDirect(video);
    }
  }, [checkCache, releasePlayback, startMSEStream, fallbackToDirect]);

  const cacheForOffline = useCallback(async () => {
    const video = videoRef.current;
    if (!video || isCaching || isCached) return;
    if (typeof caches === 'undefined') return;

    setIsCaching(true);
    setCacheProgress(0);
    try {
      const response = await fetch(src, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache',
        headers: { Range: 'bytes=0-' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch media (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Streaming not supported in this browser');
      }

      const contentLength = Number(response.headers.get('Content-Length') || 0);
      const chunks: BlobPart[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.byteLength;
        if (contentLength > 0) {
          setCacheProgress(Math.min(100, Math.round((received / contentLength) * 100)));
        }
      }

      const isHls = /\.m3u8(\?|$)/i.test(src);
      const mimeType = isHls ? 'application/vnd.apple.mpegurl' : 'video/mp4';
      const blob = new Blob(chunks, { type: mimeType });
      const cache = await caches.open(CACHE_NAME);
      await cache.put(`/volantis-media/${cacheKey}`, new Response(blob));
      setCacheProgress(100);
      setIsCached(true);

      cleanupMSE();

      // Switch playback to the cached blob for offline-ready streaming.
      const url = URL.createObjectURL(blob);
      const wasPlaying = !video.paused;
      const seekTo = video.currentTime;
      releasePlayback();
      objectUrlRef.current = url;
      video.src = url;
      video.load();
      video.currentTime = seekTo;
      if (wasPlaying) {
        video.play().catch(() => setIsLoading(false));
      }
    } catch (err) {
      console.error('Failed to cache media:', err);
      setError('Could not save video for offline playback');
    } finally {
      setIsCaching(false);
    }
  }, [src, cacheKey, isCaching, isCached, releasePlayback, cleanupMSE]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Format support detection (native). HLS plays natively on Safari/Edge.
    const isHls = /\.m3u8(\?|$)/i.test(src);
    const mime = video.canPlayType('video/mp4') ||
      video.canPlayType('video/webm') ||
      video.canPlayType('video/ogg');
    if (isHls && !mime && video.canPlayType('application/vnd.apple.mpegurl') === '') {
      setIsSupported(false);
      setError('This video format (HLS) is not supported on this browser yet.');
      setIsLoading(false);
      return;
    }

    loadSource();

    const handleTimeUpdate = () => {
      if (rafRef.current !== null) return;
      const tick = () => {
        if (!video) return;
        setCurrentTime(video.currentTime);
        if (video.buffered.length > 0) {
          setBuffered(video.buffered.end(video.buffered.length - 1));
        }
        rafRef.current = null;
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      cleanupMSE();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [src, loadSource, cleanupMSE]);

  // Auto-pause when scrolled out of view (performance)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Fullscreen change tracking
  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => releasePlayback();
  }, [releasePlayback]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {
        setError('Playback blocked. Tap play to start.');
        setIsLoading(false);
      });
    } else {
      video.pause();
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.duration || duration, video.currentTime + seconds));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await container.requestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen failed:', err);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Picture-in-Picture failed:', err);
    }
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={cn('group relative overflow-hidden rounded-2xl bg-black select-none', className)}
      onMouseEnter={() => setShowControls(true)}
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className="w-full aspect-video bg-black"
        playsInline
        preload="metadata"
        onPlay={() => { setIsPlaying(true); setIsLoading(false); onPlay?.(); }}
        onPause={() => { setIsPlaying(false); onPause?.(); }}
        onEnded={() => { setIsPlaying(false); onEnded?.(); }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onCanPlay={() => setIsBuffering(false)}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          setDuration(el.duration || 0);
          setIsLoading(false);
          onReady?.(el.duration || 0);
          if (autoPlay) {
            el.play().catch(() => setIsLoading(false));
          }
        }}
        onError={(e) => {
          if (mediaSourceRef.current && !triedFallbackRef.current) {
            triedFallbackRef.current = true;
            fallbackToDirect(e.currentTarget);
            return;
          }
          const message = e.currentTarget.error?.message || 'Failed to load video';
          setError(message);
          setIsLoading(false);
          onError?.(new Error(message));
        }}
        onClick={togglePlayPause}
      />

      {/* Title label */}
      {title && showControls && !isLoading && !error && (
        <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent px-4 pt-3 pb-6 transition-opacity duration-300">
          <p className="text-sm text-white font-medium truncate">{title}</p>
        </div>
      )}

      {/* Buffering spinner */}
      {isBuffering && isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <Loader2 className="w-12 h-12 text-white/80 animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-slate-200">{error}</p>
          {isSupported && (
            <button
              onClick={() => loadSource(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300',
          showControls && !isLoading && !error ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="relative h-1.5 bg-white/20 rounded-full overflow-hidden mb-3 cursor-pointer group/seek">
          <div className="absolute h-full bg-white/30" style={{ width: `${bufferedPercent}%` }} />
          <div className="absolute h-full bg-sky-500" style={{ width: `${progressPercent}%` }} />
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Seek"
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={togglePlayPause} className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={() => skip(-10)} className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Back 10 seconds">
            <SkipBack className="w-4 h-4" />
          </button>
          <button onClick={() => skip(10)} className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Forward 10 seconds">
            <SkipForward className="w-4 h-4" />
          </button>

          <button onClick={() => { const v = videoRef.current; if (v) { v.muted = !v.muted; setIsMuted(v.muted); } }} className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Mute">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              setVolume(value);
              const v = videoRef.current;
              if (v) { v.volume = value; v.muted = value === 0; }
              setIsMuted(value === 0);
            }}
            className="w-16 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
            aria-label="Volume"
          />

          <span className="ml-1 text-[11px] text-slate-200 mono flex-shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Playback speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(s => !s)}
              className="p-1.5 text-white hover:bg-white/10 rounded-lg text-xs font-semibold transition-colors"
              aria-label="Playback speed"
            >
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <div className="absolute bottom-full right-0 mb-2 rounded-xl bg-slate-900/95 backdrop-blur border border-white/10 overflow-hidden shadow-xl">
                {SPEED_OPTIONS.map(rate => (
                  <button
                    key={rate}
                    onClick={() => {
                      setPlaybackRate(rate);
                      if (videoRef.current) videoRef.current.playbackRate = rate;
                      setShowSpeedMenu(false);
                    }}
                    className={cn(
                      'block w-full px-4 py-1.5 text-xs text-left hover:bg-white/10 transition-colors',
                      rate === playbackRate ? 'text-sky-400 font-bold' : 'text-slate-300'
                    )}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Offline cache */}
          <button
            onClick={cacheForOffline}
            disabled={isCaching || !!error || typeof caches === 'undefined'}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isCached ? 'text-emerald-400 hover:bg-white/10' : 'text-white hover:bg-white/10',
              (isCaching || typeof caches === 'undefined') && 'opacity-50 cursor-not-allowed'
            )}
            title={isCached ? 'Saved offline' : 'Save for offline'}
            aria-label="Save for offline"
          >
            {isCaching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isCached ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>
          {isCaching && cacheProgress > 0 && (
            <span className="text-[11px] text-emerald-300 mono">{cacheProgress}%</span>
          )}

          {typeof document !== 'undefined' && document.pictureInPictureEnabled && (
            <button onClick={togglePiP} className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Picture in picture">
              <PictureInPicture2 className="w-4 h-4" />
            </button>
          )}

          <button onClick={toggleFullscreen} className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Fullscreen">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Big center play button */}
      {!isPlaying && !isLoading && !error && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Play"
        >
          <div className="w-16 h-16 rounded-full bg-sky-500/90 hover:bg-sky-500 flex items-center justify-center shadow-xl shadow-sky-500/30">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </button>
      )}
    </div>
  );
}
