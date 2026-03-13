"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Play, X, Volume2, VolumeX,
  Wifi, Users, Activity, Signal, Eye, Share2, ArrowLeft, Disc3,
  ChevronRight
} from 'lucide-react';
import { LiveChat } from '@/components/streaming/live-chat';
import { livestreamApi } from '@/lib/api/livestream';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { VolLivestreamOut } from '@/types/livestream';
import { CreatorNotStreamingModal } from '@/components/streaming/creator-not-streaming-modal';
import type { VolCompanyResponse } from '@/types/company';
import { useViewerCount } from '@/lib/api/useViewerCount';
import { useMobileBackgroundAudio } from '@/hooks/useMobileBackgroundAudio';

/* ─────────────────────── Waveform Visualizer ─────────────────────── */
function AudioVisualizer({ isActive, color = '#38bdf8' }: { isActive: boolean; color?: string }) {
  const bars = 32;
  return (
    <div className="flex items-end gap-[2px] h-10 w-full">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-full origin-bottom"
          style={{ backgroundColor: color, opacity: isActive ? 1 : 0.2 }}
          animate={isActive ? {
            scaleY: [0.1, Math.random() * 0.9 + 0.1, Math.random() * 0.7 + 0.3, 0.1],
          } : { scaleY: 0.08 }}
          transition={isActive ? {
            duration: 0.8 + Math.random() * 0.6,
            repeat: Infinity,
            delay: i * 0.03,
            ease: 'easeInOut',
          } : { duration: 0.4 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────── Circular Pulse Rings ─────────────────── */
function PulseRings({ isActive }: { isActive: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-sky-400/30"
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
          style={{ width: 60, height: 60 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────── Live Badge ─────────────────── */
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[11px] font-bold uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      Live
    </span>
  );
}

/* ─────────────────── Grain Overlay ─────────────────── */
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[999] opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '160px',
      }}
    />
  );
}

/* ─────────────────── Stream Player ─────────────────── */
function StreamPlayer({
  stream,
  company,
  isPlaying,
  connectionState,
  remoteStream,
  audioStats,
  onStop,
  onPlay,
  onRetry,
  onVolumeChange,
  viewerCount,
}: {
  stream: VolLivestreamOut;
  company: VolCompanyResponse | null;
  isPlaying: boolean;
  connectionState: string;
  remoteStream: MediaStream | null;
  audioStats: unknown;
  onStop: () => void;
  onPlay?: () => void;
  onRetry: () => void;
  onVolumeChange?: (volume: number) => void;
  viewerCount?: number;
}) {
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showStats, setShowStats] = useState(false);

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    onVolumeChange?.(newVolume);
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'new';

  const statusColor = isConnected ? '#22d3ee' : isConnecting ? '#f59e0b' : '#ef4444';
  const statusLabel = isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Disconnected';

  return (
    <div className="flex-1 min-w-0">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
            style={{ borderColor: `${statusColor}40`, background: `${statusColor}10` }}>
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: statusColor }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-xs font-semibold" style={{ color: statusColor }}>{statusLabel}</span>
          </div>
          <LiveBadge />
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowStats(s => !s)}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-colors"
          >
            <Activity className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onStop}
            className="w-9 h-9 rounded-full bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Main player card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.95) 0%, rgba(8,14,28,0.98) 100%)' }}
      >
        <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-violet-500 to-sky-400 bg-[size:200%_100%]" />

        <div className="p-6">
          {/* Channel info */}
          <div className="flex items-center gap-4 mb-6">
            <motion.div
              className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-lg font-black text-white flex-shrink-0"
              animate={{ boxShadow: isPlaying ? ['0 0 0px rgba(56,189,248,0.4)', '0 0 20px rgba(56,189,248,0.6)', '0 0 0px rgba(56,189,248,0.4)'] : '0 0 0px rgba(0,0,0,0)' }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {company?.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                company?.name?.[0]?.toUpperCase() || '?'
              )}
            </motion.div>
            <div className="flex-1 min-w-0">
              <Link
                href={`/${stream.company_slug || company?.slug || ''}`}
                className="text-sky-400 text-xs font-semibold uppercase tracking-widest hover:underline"
              >
                {company?.name || 'Channel'}
              </Link>
              <h2 className="text-white text-lg font-bold leading-tight truncate">{stream.title}</h2>
              {stream.description && (
                <p className="text-slate-500 text-sm mt-1 line-clamp-1">{stream.description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-white font-semibold">{(viewerCount !== undefined ? viewerCount : stream.viewer_count).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Signal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">HD</span>
              </div>
            </div>
          </div>

          {/* Visualizer stage */}
          <div className="relative rounded-xl overflow-hidden mb-4 h-24"
            style={{ background: 'linear-gradient(180deg, rgba(56,189,248,0.04) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <PulseRings isActive={isPlaying} />
                <motion.div
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg z-10 relative"
                  animate={isPlaying ? {
                    scale: [1, 1.06, 1],
                    boxShadow: ['0 0 15px rgba(56,189,248,0.3)', '0 0 40px rgba(56,189,248,0.6)', '0 0 15px rgba(56,189,248,0.3)'],
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Radio className="w-5 h-5 text-white" />
                </motion.div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 h-10">
              <AudioVisualizer isActive={isPlaying} color="#38bdf8" />
            </div>
          </div>

          {/* Volume control */}
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => setMuted(m => !m)} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="relative flex-1 h-1.5 rounded-full bg-white/10 cursor-pointer group">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-violet-500"
                style={{ width: `${volume * 100}%` }}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${volume * 100}% - 6px)` }}
              />
            </div>
            <span className="text-slate-500 text-xs w-7 text-right">{Math.round(volume * 100)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {!isPlaying ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onPlay}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
              >
                <Play className="w-4 h-4" />
                Play Stream
              </motion.button>
            ) : !isConnected && isPlaying ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRetry}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
              >
                <Activity className="w-4 h-4" />
                Reconnect
              </motion.button>
            ) : null}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://volantislive.com'}/${company?.slug}/${stream.slug}`;
                const shareData = { title: stream.title, text: `Listen to "${stream.title}" live on Volantis`, url: shareUrl };
                if (navigator.share && navigator.canShare?.(shareData)) {
                  navigator.share(shareData).catch(err => { if (err.name !== 'AbortError') console.error('Share failed:', err); });
                } else {
                  navigator.clipboard.writeText(shareUrl).catch(err => console.error('Failed to copy:', err));
                }
              }}
              className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Stats panel */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Connection', value: connectionState, icon: Wifi },
                    { label: 'Viewers', value: (viewerCount !== undefined ? viewerCount : stream.viewer_count).toLocaleString(), icon: Users },
                    { label: 'Peak', value: (stream.peak_viewers ?? 0).toLocaleString(), icon: Activity },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-lg p-2 text-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Icon className="w-3.5 h-3.5 text-sky-400 mx-auto mb-1" />
                      <p className="text-white text-xs font-bold capitalize">{value}</p>
                      <p className="text-slate-500 text-[9px] uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────── PAGE ─────────────────────────────── */
export default function StreamPage() {
  const params = useParams();
  const router = useRouter();
  const companySlug = params?.companySlug as string;
  const streamSlug = params?.streamSlug as string;

  const [stream, setStream] = useState<VolLivestreamOut | null>(null);
  const [company, setCompany] = useState<VolCompanyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const [showCreatorNotStreaming, setShowCreatorNotStreaming] = useState(false);
  const [creatorNotStreamingInfo, setCreatorNotStreamingInfo] = useState<{
    creatorName: string;
    streamTitle?: string;
  } | null>(null);

  const {
    remoteStream,
    connectionState,
    startPlayback,
    stop: stopPlayback,
    audioStats,
  } = useWebRTC();

  const { viewerCount: realtimeViewerCount } = useViewerCount({
    slug: streamSlug || '',
    companyId: company?.id ?? 0,
    enabled: !!streamSlug && !!company?.id,
    pollingInterval: 10000,
  });

  // ─── Audio refs ───────────────────────────────────────────────────
  /**
   * Points at the persistent <audio id="volantis-bg-audio"> rendered in JSX.
   *
   * WHY a DOM element instead of `new Audio()`?
   * Chrome on Android and desktop only keeps audio alive in the background
   * when the element is attached to the document. A detached JS Audio object
   * gets suspended as soon as the tab loses focus. The DOM element stays
   * active, letting the OS media session and the browser audio pipeline
   * treat it like a real media player.
   */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.8);
  /** ID of the MediaStream currently assigned to the audio element */
  const wiredStreamIdRef = useRef<string | null>(null);
  /** Stored so every reconnect path can restart without prop-drilling */
  const playbackUrlRef = useRef<string | null>(null);
  const isReconnectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Grab the DOM element once on mount
  useEffect(() => {
    const el = document.getElementById('volantis-bg-audio') as HTMLAudioElement | null;
    if (el) audioRef.current = el;
  }, []);

  // ─── Mobile Background Audio ─────────────────────────────────────────
  // Handle background playback on iOS Safari and Android Chrome
  const { updateMediaSessionState } = useMobileBackgroundAudio({
    audioRef,
    isPlaying,
    title: stream?.title || 'Live Stream',
    artist: company?.name || 'Volantislive',
    artwork: stream?.thumbnail_url ?? company?.logo_url ?? undefined,
    onRemotePlay: () => {
      if (!isPlaying && playbackUrlRef.current) {
        startPlayback(playbackUrlRef.current);
      }
    },
    onRemotePause: () => {
      if (isPlaying) {
        handleStopPlayback();
      }
    },
  });

  // ─── Media Session API ────────────────────────────────────────────
  /**
   * Registers the stream with the OS so it appears in:
   *  • Chrome's mini-player bar when the tab is backgrounded
   *  • Android lock-screen / notification shade media controls
   *  • macOS Control Center
   *
   * The play/pause/stop handlers delegate back to our own stop function
   * so the UI state stays in sync.
   */
  const registerMediaSession = useCallback((
    streamData: VolLivestreamOut,
    companyData: VolCompanyResponse | null,
    onStop: () => void,
  ) => {
    if (!('mediaSession' in navigator)) return;

    const artworkSrc = streamData.thumbnail_url ?? companyData?.logo_url;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: streamData.title,
      artist: companyData?.name ?? 'Volantislive',
      album: '🔴 Live Stream',
      ...(artworkSrc && {
        artwork: [
          { src: artworkSrc, sizes: '96x96',   type: 'image/jpeg' },
          { src: artworkSrc, sizes: '256x256',  type: 'image/jpeg' },
          { src: artworkSrc, sizes: '512x512',  type: 'image/jpeg' },
        ],
      }),
    });

    navigator.mediaSession.playbackState = 'playing';

    // "Play" from the OS notification resumes the audio element directly
    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => {});
      navigator.mediaSession.playbackState = 'playing';
    });

    // "Pause" on a live stream means stop — there is nothing to resume to
    navigator.mediaSession.setActionHandler('pause', () => {
      onStop();
      navigator.mediaSession.playbackState = 'paused';
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      onStop();
      navigator.mediaSession.playbackState = 'none';
    });

    // Disable seek / track controls — meaningless on a live feed
    navigator.mediaSession.setActionHandler('seekbackward',  null);
    navigator.mediaSession.setActionHandler('seekforward',   null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('nexttrack',     null);
  }, []);

  // ─── Core audio wiring ────────────────────────────────────────────
  /**
   * Swaps the srcObject on the persistent DOM element without ever
   * destroying it. Keeping the same element alive is what lets Chrome's
   * background-audio pipeline stay active across tab switches.
   */
  const wireAudio = useCallback((mediaStream: MediaStream) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.srcObject = mediaStream;
    audio.volume = volumeRef.current;

    // Stall/buffer healing — re-assign and re-play if the browser drops the stream
    const healAudio = () => {
      if (!audioRef.current) return;
      if (audioRef.current.srcObject !== mediaStream) {
        audioRef.current.srcObject = mediaStream;
      }
      audioRef.current.play().catch(() => {});
    };

    audio.onstalled  = healAudio;
    audio.onwaiting  = healAudio;
    // "emptied" fires on iOS when an audio session is interrupted
    audio.onemptied  = healAudio;

    // Handle iOS Safari audio interruptions
    audio.onpause = () => {
      // Only update media session if we didn't intentionally pause
      if (isPlaying) {
        updateMediaSessionState(false);
      }
    };

    audio.onplay = () => {
      updateMediaSessionState(true);
    };

    audio.play().catch(err => {
      console.warn('[Audio] play() blocked:', err);
    });

    wiredStreamIdRef.current = mediaStream.id;
    updateMediaSessionState(true);
  }, [isPlaying, updateMediaSessionState]);

  // Wire audio whenever useWebRTC delivers a new stream
  useEffect(() => {
    if (!remoteStream) return;
    if (remoteStream.id === wiredStreamIdRef.current && audioRef.current?.srcObject) return;
    wireAudio(remoteStream);
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;
    // Keep the OS notification bar in sync after an auto-reconnect
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'playing';
    }
  }, [remoteStream, wireAudio]);

  // ─── Volume control ───────────────────────────────────────────────
  const updateVolume = useCallback((vol: number) => {
    volumeRef.current = vol;
    if (audioRef.current) audioRef.current.volume = vol;
  }, []);

  // ─── Reconnection logic ───────────────────────────────────────────
  const triggerReconnect = useCallback(async () => {
    if (isReconnectingRef.current) return;
    if (!playbackUrlRef.current) return;

    isReconnectingRef.current = true;
    reconnectAttemptsRef.current += 1;

    try {
      await startPlayback(playbackUrlRef.current);
      setIsPlaying(true);
    } catch (err) {
      const error = err as { status?: number };
      isReconnectingRef.current = false;

      if (error.status === 409) {
        setIsPlaying(false);
        setShowCreatorNotStreaming(true);
        return;
      }

      // Exponential backoff: 2s → 4s → 8s … capped at 30s
      const delay = Math.min(2000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30_000);
      reconnectTimerRef.current = setTimeout(triggerReconnect, delay);
    }
  }, [startPlayback]);

  // ─── Network online recovery ──────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      if (isPlaying) setTimeout(() => triggerReconnect(), 500);
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isPlaying, triggerReconnect]);

  // ─── Tab visibility / background healing ─────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        // Page is hidden - update media session to show it's still playing
        updateMediaSessionState(isPlaying);
        return;
      }
      
      if (!isPlaying) return;

      const audio = audioRef.current;
      if (!audio) { triggerReconnect(); return; }

      if (audio.paused || audio.ended || !audio.srcObject) {
        if (remoteStream?.active) {
          audio.srcObject = remoteStream;
          audio.play().catch(() => triggerReconnect());
        } else {
          triggerReconnect();
        }
      }
      
      // Update media session state when coming back to foreground
      updateMediaSessionState(isPlaying);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPlaying, remoteStream, triggerReconnect]);

  // ─── WebRTC state monitoring ──────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    if (connectionState === 'failed' || connectionState === 'disconnected') {
      reconnectTimerRef.current = setTimeout(() => triggerReconnect(), 1500);
    }
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [connectionState, isPlaying, triggerReconnect]);

  // ─── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }
      stopPlayback();
    };
  }, [stopPlayback]);

  // ─── Fetch stream + company data ──────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!companySlug || !streamSlug) return;

    setIsLoading(true);
    setStreamError(null);

    try {
      let streamData: VolLivestreamOut;
      try {
        streamData = await livestreamApi.getLivestream(streamSlug);
      } catch {
        const companyStreams = await livestreamApi.getCompanyStreams(companySlug, 50, 0, true);
        const foundStream = companyStreams.find(s => s.slug === streamSlug);
        if (!foundStream) throw new Error('Stream not found');
        streamData = foundStream;
      }

      setStream(streamData);

      if (!streamData.is_active) {
        router.push(`/${companySlug}`);
        return;
      }

      if (streamData.cf_webrtc_playback_url) {
        playbackUrlRef.current = streamData.cf_webrtc_playback_url;
      }

      try {
        const companyPageData = await livestreamApi.getCompanyPage(companySlug);
        setCompany({
          id: companyPageData.company.id,
          name: companyPageData.company.name,
          slug: companyPageData.company.slug,
          description: companyPageData.company.description,
          email: '',
          logo_url: companyPageData.company.logo_url,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      } catch {
        if (streamData.company_id) {
          setCompany({
            id: streamData.company_id,
            name: streamData.company_name || companySlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            slug: streamData.company_slug || companySlug,
            description: null,
            email: '',
            logo_url: streamData.company_logo_url || null,
            is_active: true,
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err: unknown) {
      const error = err as { status?: number; detail?: string; message?: string };

      if (error.message?.includes('Stream not found')) {
        router.push(`/${companySlug}`);
        return;
      }

      if (error.status === 404) {
        try {
          await livestreamApi.getCompanyPage(companySlug);
          router.push(`/${companySlug}`);
        } catch {
          router.push('/listen');
        }
        return;
      }

      if (error.status === 409) {
        setStreamError(error.detail || 'Stream has not started yet.');
      } else {
        setStreamError(error.message || 'Failed to load stream');
      }
    } finally {
      setIsLoading(false);
    }
  }, [companySlug, streamSlug, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── SEO meta tags ────────────────────────────────────────────────
  useEffect(() => {
    if (!stream || !company) return;

    const title = `🔴 LIVE: ${stream.title} | ${company.name}`;
    const description = stream.description
      ? `${stream.description} - Listen live on Volantis.`
      : `Listen to ${stream.title} by ${company.name} live on Volantis.`;
    const imageUrl = stream.thumbnail_url || company.logo_url;
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://volantislive.com';

    document.title = title;

    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) meta.setAttribute('property', name);
        else meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('description', description);
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', 'video.other', true);
    updateMetaTag('og:url', `${siteUrl}/${companySlug}/${streamSlug}`, true);
    if (imageUrl) updateMetaTag('og:image', imageUrl, true);
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (imageUrl) updateMetaTag('twitter:image', imageUrl);
  }, [stream, company, companySlug, streamSlug]);

  // ─── Play / Stop handlers ─────────────────────────────────────────
  const handleStopPlayback = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject  = null;
      audioRef.current.onstalled  = null;
      audioRef.current.onwaiting  = null;
      audioRef.current.onemptied  = null;
      // Do NOT null out audioRef — the DOM element stays mounted
    }
    wiredStreamIdRef.current     = null;
    isReconnectingRef.current    = false;
    reconnectAttemptsRef.current = 0;

    // Clear OS media controls
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
      navigator.mediaSession.metadata      = null;
      navigator.mediaSession.setActionHandler('play',  null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('stop',  null);
    }

    stopPlayback();
    setIsPlaying(false);
    router.push(`/${companySlug}`);
  }, [stopPlayback, companySlug, router]);

  const handlePlay = async () => {
    if (!stream?.cf_webrtc_playback_url) {
      console.warn('[StreamPage] No playback URL available, cannot start stream');
      setStreamError('Stream playback is not available at this time.');
      return;
    }
    try {
      playbackUrlRef.current = stream.cf_webrtc_playback_url;
      await startPlayback(stream.cf_webrtc_playback_url);
      setIsPlaying(true);
      // Register with OS — this is what makes the Chrome mini-player appear
      registerMediaSession(stream, company, handleStopPlayback);
    } catch (err) {
      const error = err as { status?: number; message?: string };
      if (error.status === 409) {
        setCreatorNotStreamingInfo({
          creatorName: company?.name || 'The Creator',
          streamTitle: stream.title,
        });
        setShowCreatorNotStreaming(true);
      } else {
        console.error('[StreamPage] Playback failed:', error.message);
        setStreamError(error.message || 'Failed to start playback');
      }
    }
  };

  const handleRetry = async () => {
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current    = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    await triggerReconnect();
  };

  // ─── Render ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-sky-500/30 border-t-sky-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-slate-500 text-sm tracking-widest uppercase">Loading Stream</p>
        </div>
      </div>
    );
  }

  if (streamError || !stream) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Stream Unavailable</h2>
          <p className="text-slate-400 mb-6">{streamError || 'This stream could not be found'}</p>
          <Link
            href={`/${companySlug}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Channel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <CreatorNotStreamingModal
        isOpen={showCreatorNotStreaming}
        onClose={() => setShowCreatorNotStreaming(false)}
        creatorName={creatorNotStreamingInfo?.creatorName || 'The Creator'}
        streamTitle={creatorNotStreamingInfo?.streamTitle}
      />

      {/*
        ┌─────────────────────────────────────────────────────┐
        │  BACKGROUND AUDIO ELEMENT                           │
        │                                                     │
        │  Must be in the DOM (not `new Audio()`) for Chrome  │
        │  to keep audio alive when the tab is backgrounded   │
        │  or the screen is locked on Android/desktop.        │
        │                                                     │
        │  autoPlay is intentionally absent — wireAudio()     │
        │  calls .play() after setting srcObject.             │
        │                                                     │
        │  Hidden with CSS, not conditional rendering, so     │
        │  the element is never unmounted mid-stream.         │
        └─────────────────────────────────────────────────────┘
      */}
      <audio
        id="volantis-bg-audio"
        playsInline
        webkit-playsinline="true"
        preload="none"
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
      />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Space+Mono:wght@400;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.3); border-radius: 2px; }
      `}</style>

      <GrainOverlay />

      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #030712 0%, #060c1e 50%, #03060f 100%)' }}>
        <div className="fixed top-0 left-0 right-0 z-40 border-b border-white/5" style={{ background: 'rgba(2,6,20,0.9)', backdropFilter: 'blur(20px)' }}>
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center justify-between h-14">
              <Link
                href={`/${companySlug}`}
                className="flex items-center gap-2 text-white hover:text-sky-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{company?.name || 'Channel'}</span>
              </Link>
              <div className="flex items-center gap-2">
                <LiveBadge />
              </div>
            </div>
          </div>
        </div>

        <main className="pt-20 pb-6">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <StreamPlayer
                  stream={stream}
                  company={company}
                  isPlaying={isPlaying}
                  connectionState={connectionState}
                  remoteStream={remoteStream}
                  audioStats={audioStats}
                  onStop={handleStopPlayback}
                  onPlay={handlePlay}
                  onRetry={handleRetry}
                  onVolumeChange={updateVolume}
                  viewerCount={realtimeViewerCount}
                />
              </div>

              <div className="hidden lg:block w-80 flex-shrink-0">
                <LiveChat slug={streamSlug} companyName={company?.name} />
              </div>
            </div>

            <div className="lg:hidden mt-4">
              <details className="group">
                <summary className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white font-medium cursor-pointer">
                  <Disc3 className="w-4 h-4" />
                  {streamSlug && <span>Live Chat</span>}
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-2">
                  {streamSlug && <LiveChat slug={streamSlug} companyName={company?.name} />}
                </div>
              </details>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}