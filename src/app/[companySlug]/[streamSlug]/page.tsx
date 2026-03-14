"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Play, X, Volume2, VolumeX, Wifi, Users, Activity, Signal,
  Eye, Share2, ArrowLeft, MessageCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { LiveChat } from '@/components/streaming/live-chat';
import { livestreamApi, type CompanyLivePageResponse } from '@/lib/api/livestream';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { VolLivestreamOut } from '@/types/livestream';
import { CreatorNotStreamingModal } from '@/components/streaming/creator-not-streaming-modal';
import type { VolCompanyResponse } from '@/types/company';
import { useViewerCount } from '@/lib/api/useViewerCount';
import { useMediaSession } from '@/hooks/useMediaSession';
import { useVisibilityChange } from '@/hooks/useVisibilityChange';
import { useAudioProvider } from '@/components/audio/audio-provider';

/* ─────────────────────── Waveform Visualizer ─────────────────────── */
function AudioVisualizer({ isActive, color = '#22d3ee' }: { isActive: boolean; color?: string }) {
  const bars = 28;
  return (
    <div className="flex items-end gap-[2px] h-8 w-full">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-full origin-bottom"
          style={{ backgroundColor: color, opacity: isActive ? 1 : 0.15 }}
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

function PulseRings({ isActive }: { isActive: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-cyan-400/30"
          animate={isActive ? { scale: [1, 2.5 + i * 0.5], opacity: [0.6, 0] } : { scale: 1, opacity: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
          style={{ width: 56, height: 56 }}
        />
      ))}
    </div>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      Live
    </span>
  );
}

function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[999] opacity-[0.022]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '160px',
      }}
    />
  );
}

/* ─────────────────── Stream Player ─────────────────── */
function StreamPlayer({
  stream, company, isPlaying, connectionState, remoteStream, audioStats,
  onStop, onPlay, onRetry, onVolumeChange, viewerCount,
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

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    onVolumeChange?.(v);
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'new';
  const statusColor = isConnected ? '#22d3ee' : isConnecting ? '#f59e0b' : '#ef4444';
  const statusLabel = isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Disconnected';
  const liveViewers = viewerCount !== undefined ? viewerCount : stream.viewer_count;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="rounded-2xl border border-white/8 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, rgba(13,18,32,0.97) 0%, rgba(6,10,22,0.99) 100%)' }}
    >
      {/* Accent bar */}
      <div className="h-[2px] w-full bg-gradient-to-r from-cyan-400 via-violet-500 to-cyan-400" />

      <div className="p-4 sm:p-5">
        {/* Top row: status + close */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold"
              style={{ borderColor: `${statusColor}35`, background: `${statusColor}0d`, color: statusColor }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: statusColor }}
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {statusLabel}
            </div>
            <LiveBadge />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowStats(s => !s)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:scale-90 flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onStop}
              className="w-8 h-8 rounded-xl bg-red-500/15 hover:bg-red-500/25 active:scale-90 flex items-center justify-center text-red-400 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Channel info */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-base font-black text-white flex-shrink-0 overflow-hidden"
            animate={{
              boxShadow: isPlaying
                ? ['0 0 0px rgba(34,211,238,0.3)', '0 0 18px rgba(34,211,238,0.55)', '0 0 0px rgba(34,211,238,0.3)']
                : '0 0 0px rgba(0,0,0,0)',
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {company?.logo_url
              ? <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
              : company?.name?.[0]?.toUpperCase() || '?'
            }
          </motion.div>
          <div className="flex-1 min-w-0">
            <Link href={`/${stream.company_slug || ''}`} className="text-cyan-400 text-[11px] font-bold uppercase tracking-widest hover:underline">
              {company?.name || 'Channel'}
            </Link>
            <h2 className="text-white text-base sm:text-lg font-bold leading-tight truncate">{stream.title}</h2>
            {stream.description && (
              <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{stream.description}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0 text-xs">
            <div className="flex items-center gap-1 text-slate-400">
              <Eye className="w-3 h-3 text-cyan-400" />
              <span className="text-white font-semibold tabular-nums">{liveViewers.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Signal className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">HD</span>
            </div>
          </div>
        </div>

        {/* Visualizer */}
        <div
          className="relative rounded-xl overflow-hidden mb-4 h-20"
          style={{
            background: 'linear-gradient(180deg, rgba(34,211,238,0.04) 0%, rgba(139,92,246,0.04) 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: 'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <PulseRings isActive={isPlaying} />
              <motion.div
                className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg z-10 relative"
                animate={isPlaying ? {
                  scale: [1, 1.07, 1],
                  boxShadow: ['0 0 12px rgba(34,211,238,0.25)', '0 0 32px rgba(34,211,238,0.55)', '0 0 12px rgba(34,211,238,0.25)'],
                } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Radio className="w-4.5 h-4.5 text-white" />
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 h-9">
            <AudioVisualizer isActive={isPlaying} color="#22d3ee" />
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setMuted(m => !m)} className="text-slate-500 hover:text-white transition-colors flex-shrink-0">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="relative flex-1 h-1.5 rounded-full bg-white/8 cursor-pointer group">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500" style={{ width: `${volume * 100}%` }} />
            <input
              type="range" min={0} max={1} step={0.01} value={volume}
              onChange={e => handleVolumeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${volume * 100}% - 6px)` }}
            />
          </div>
          <span className="text-slate-600 text-[11px] w-6 text-right tabular-nums">{Math.round(volume * 100)}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {!isPlaying ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onPlay}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:opacity-80"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
            >
              <Play className="w-4 h-4" />
              Play Stream
            </motion.button>
          ) : !isConnected && isPlaying ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onRetry}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
            >
              <Activity className="w-4 h-4" />
              Reconnect
            </motion.button>
          ) : null}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const shareUrl = `${window.location.origin}/${company?.slug}/${stream.slug}`;
              const shareData = { title: stream.title, text: `Listen to "${stream.title}" live`, url: shareUrl };
              if (navigator.share && navigator.canShare?.(shareData)) {
                navigator.share(shareData).catch(() => {});
              } else {
                navigator.clipboard.writeText(shareUrl).catch(() => {});
              }
            }}
            className="w-10 h-10 rounded-xl border border-white/8 bg-white/4 flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-colors flex-shrink-0"
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
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
                {[
                  { label: 'State', value: connectionState, icon: Wifi },
                  { label: 'Viewers', value: liveViewers.toLocaleString(), icon: Users },
                  { label: 'Peak', value: (stream.peak_viewers ?? 0).toLocaleString(), icon: Activity },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Icon className="w-3 h-3 text-cyan-400 mx-auto mb-1.5" />
                    <p className="text-white text-xs font-bold capitalize truncate">{value}</p>
                    <p className="text-slate-600 text-[9px] uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─────────────────── Mobile Chat Drawer ─────────────────── */
function MobileChatSection({ streamSlug, companyName }: { streamSlug: string; companyName?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden mt-4">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-white/8 bg-white/3 text-white font-semibold text-sm active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
            {/* live dot */}
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#060a16]" />
          </div>
          <span>Live Chat</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </motion.div>
      </button>

      {/* Chat panel — fixed height so messages are always visible */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 420 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-2 overflow-hidden rounded-2xl"
            style={{ minHeight: 0 }}
          >
            {/* This wrapper gives LiveChat a concrete pixel height to fill */}
            <div className="h-[420px]">
              <LiveChat slug={streamSlug} companyName={companyName} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [showCreatorNotStreaming, setShowCreatorNotStreaming] = useState(false);
  const [creatorNotStreamingInfo, setCreatorNotStreamingInfo] = useState<{ creatorName: string; streamTitle?: string } | null>(null);

  const { remoteStream, connectionState, startPlayback, stop: stopPlayback, retryConnection, audioStats } = useWebRTC();
  const { viewerCount: realtimeViewerCount } = useViewerCount({
    slug: streamSlug || '',
    companyId: company?.id || 0,
    enabled: !!streamSlug && !!company?.id,
    pollingInterval: 10000,
  });
  
  // Use the global AudioProvider for background audio playback
  // This creates a persistent audio element at the app root level
  // which helps mobile browsers continue playback when minimized
  const { initializeAudio, setVolume, play, pause, stop, isInitialized: audioIsInitialized } = useAudioProvider();
  
  useMediaSession({
    title: stream?.title || 'Live Stream',
    artist: company?.name || 'Channel',
    artwork: stream?.thumbnail_url || company?.logo_url || undefined,
    isPlaying,
    onPlay: play,
    onPause: pause,
    onStop: handleStopPlayback,
  });
  useVisibilityChange();

  // Initialize audio when remote stream becomes available
  useEffect(() => {
    if (remoteStream && !audioIsInitialized) {
      initializeAudio(remoteStream);
      // After initialization, start playback to actually hear the audio
      // This is critical for mobile browsers to recognize audio playback
      play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [remoteStream, initializeAudio, play, audioIsInitialized]);

  const updateVolume = useCallback((vol: number) => setVolume(vol), [setVolume]);

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
        const found = companyStreams.find(s => s.slug === streamSlug);
        if (!found) throw new Error('Stream not found');
        streamData = found;
      }
      setStream(streamData);
      if (!streamData.is_active) { router.push(`/${companySlug}`); return; }
      try {
        const pageData = await livestreamApi.getCompanyPage(companySlug);
        setCompany({
          id: pageData.company.id, name: pageData.company.name, slug: pageData.company.slug,
          description: pageData.company.description, email: '',
          logo_url: pageData.company.logo_url, is_active: true, created_at: new Date().toISOString(),
        });
      } catch {
        if (streamData.company_id) {
          setCompany({
            id: streamData.company_id,
            name: streamData.company_name || companySlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            slug: streamData.company_slug || companySlug,
            description: null, email: '',
            logo_url: streamData.company_logo_url || null, is_active: true, created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err: unknown) {
      const error = err as { status?: number; detail?: string; message?: string };
      if (error.message?.includes('Stream not found')) { router.push(`/${companySlug}`); return; }
      if (error.status === 404) {
        try { await livestreamApi.getCompanyPage(companySlug); router.push(`/${companySlug}`); }
        catch { router.push('/listen'); }
        return;
      }
      setStreamError(error.status === 409 ? (error.detail || 'Stream has not started yet.') : (error.message || 'Failed to load stream'));
    } finally {
      setIsLoading(false);
    }
  }, [companySlug, streamSlug, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // SEO meta
  useEffect(() => {
    if (!stream || !company) return;
    const title = `🔴 LIVE: ${stream.title} | ${company.name}`;
    document.title = title;
  }, [stream, company]);

  useEffect(() => {
    const handler = () => stop();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stop]);

  function handleStopPlayback() {
    stop(); setIsPlaying(false); setIsAudioInitialized(false); stopPlayback();
    router.push(`/${companySlug}`);
  }

  const handlePlay = async () => {
    if (!stream?.cf_webrtc_playback_url) { setIsPlaying(true); return; }
    try {
      await startPlayback(stream.cf_webrtc_playback_url);
    } catch (err) {
      const error = err as { status?: number };
      if (error.status === 409) {
        setCreatorNotStreamingInfo({ creatorName: company?.name || 'The Creator', streamTitle: stream.title });
        setShowCreatorNotStreaming(true);
      }
    }
  };

  const handleRetry = async () => {
    if (!stream?.cf_webrtc_playback_url) return;
    try {
      await startPlayback(stream.cf_webrtc_playback_url);
    } catch (err) {
      const error = err as { status?: number };
      if (error.status === 409) {
        setCreatorNotStreamingInfo({ creatorName: company?.name || 'The Creator', streamTitle: stream.title });
        setShowCreatorNotStreaming(true);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060a16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-10 h-10 rounded-full border-2 border-cyan-500/25 border-t-cyan-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-slate-600 text-xs tracking-widest uppercase">Loading Stream</p>
        </div>
      </div>
    );
  }

  if (streamError || !stream) {
    return (
      <div className="min-h-screen bg-[#060a16] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/15 flex items-center justify-center">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Stream Unavailable</h2>
          <p className="text-slate-500 text-sm mb-6">{streamError || 'This stream could not be found'}</p>
          <Link
            href={`/${companySlug}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
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

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(34,211,238,0.25); border-radius: 2px; }
      `}</style>

      <GrainOverlay />

      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #040810 0%, #060c1e 50%, #030610 100%)' }}>
        {/* Navbar */}
        <div
          className="fixed top-0 left-0 right-0 z-40 border-b border-white/5"
          style={{ background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(24px)' }}
        >
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center justify-between h-13 py-2.5">
              <Link href={`/${companySlug}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium">{company?.name || 'Channel'}</span>
              </Link>
              <LiveBadge />
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="pt-16 pb-8">
          <div className="container mx-auto px-4 max-w-6xl">

            {/* ── Desktop: player + sidebar chat side by side ── */}
            <div className="hidden lg:flex gap-6 items-start">
              <div className="flex-1 min-w-0">
                <StreamPlayer
                  stream={stream} company={company} isPlaying={isPlaying}
                  connectionState={connectionState} remoteStream={remoteStream}
                  audioStats={audioStats} onStop={handleStopPlayback} onPlay={handlePlay}
                  onRetry={handleRetry} onVolumeChange={updateVolume}
                  viewerCount={realtimeViewerCount}
                />
              </div>

              {/* Desktop chat — sticky with a fixed height so it never collapses */}
              <div className="w-80 flex-shrink-0 sticky top-20" style={{ height: 'calc(100vh - 88px)' }}>
                <div className="h-full">
                  <LiveChat slug={streamSlug} companyName={company?.name} />
                </div>
              </div>
            </div>

            {/* ── Mobile: player stacked above collapsible chat ── */}
            <div className="lg:hidden">
              <StreamPlayer
                stream={stream} company={company} isPlaying={isPlaying}
                connectionState={connectionState} remoteStream={remoteStream}
                audioStats={audioStats} onStop={handleStopPlayback} onPlay={handlePlay}
                onRetry={handleRetry} onVolumeChange={updateVolume}
                viewerCount={realtimeViewerCount}
              />
              <MobileChatSection streamSlug={streamSlug} companyName={company?.name} />
            </div>

          </div>
        </main>
      </div>
    </>
  );
}