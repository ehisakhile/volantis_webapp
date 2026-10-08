"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Play, Pause, X, Volume2, VolumeX, Wifi, Users, Activity, Signal, Video,
  Eye, Share2, ArrowLeft, ChevronDown, ChevronUp
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
  onStop, onPlay, onRetry, onVolumeChange, viewerCount, peakViewers, isVideoStream,
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
  peakViewers?: number;
  isVideoStream?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);

  // Check for video track in remote stream
  useEffect(() => {
    if (remoteStream) {
      const videoTracks = remoteStream.getVideoTracks();
      setHasVideoTrack(videoTracks.length > 0);
    } else {
      setHasVideoTrack(false);
    }
  }, [remoteStream]);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    onVolumeChange?.(v);
  };


  const isConnected = connectionState === 'connected' || (!!remoteStream && connectionState !== 'failed');
  const isConnecting = (connectionState === 'connecting' || connectionState === 'new') && !remoteStream;
  const statusColor = isConnected ? '#22d3ee' : isConnecting ? '#f59e0b' : '#ef4444';
  const statusLabel = isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Disconnected';
  const liveViewers = viewerCount !== undefined ? viewerCount : stream.viewer_count;
  const artworkUrl = stream.thumbnail_url || company?.logo_url;
  const showVideo = isVideoStream === true && hasVideoTrack;

  // Auto-play video when stream has video track
  useEffect(() => {
    if (showVideo && videoRef.current && remoteStream && isPlaying) {
      videoRef.current.srcObject = remoteStream;
      videoRef.current.play().then(() => {
        console.log('[StreamPlayer] Video playback started');
        setIsVideoLoaded(true);
      }).catch(err => {
        console.error('[StreamPlayer] Video playback failed:', err);
      });
    }
  }, [showVideo, remoteStream, isPlaying]);


  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:rounded-3xl"
    >
      {/* Accent bar */}
      <div className="h-[2px] w-full bg-sky-600" />

      <div className="p-3 sm:p-7">
        {/* Top row: status + close */}
        <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-4">
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
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><Users className="h-3.5 w-3.5" />{liveViewers.toLocaleString()} listening</span>
        </div>

        {/* Channel info */}
        <div className="mb-3 text-center sm:mb-6">
          <h1 className="text-xl font-bold leading-tight text-slate-950 sm:text-3xl">{stream.title}</h1>
          <Link href={`/${company?.slug || ''}`} className="mt-1 inline-block text-sm font-medium text-slate-600 hover:text-sky-700 hover:underline">
            {company?.name || 'Channel'}
          </Link>
          {stream.description && <p className="mx-auto mt-2 hidden max-w-xl text-sm text-slate-500 sm:block">{stream.description}</p>}
        </div>

        {/* Video or Audio Visualizer */}
        <div
          className={`relative mb-3 overflow-hidden rounded-xl border border-slate-300 bg-slate-200 sm:mb-4 ${showVideo ? 'aspect-video max-h-80' : 'h-36 sm:h-[300px]'}`}
        >
          {showVideo ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain bg-black"
            />
          ) : (
            <>
              <div className="flex h-full items-center justify-center bg-slate-200">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`relative flex h-28 w-28 items-center justify-center rounded-full border-8 border-slate-900 bg-slate-900 shadow-lg sm:h-60 sm:w-60 sm:border-[10px] ${isPlaying ? 'animate-[spin_8s_linear_infinite]' : ''}`}>
                    {artworkUrl ? (
                      <img src={artworkUrl} alt={stream.title} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <Radio className="h-14 w-14 text-white" />
                    )}
                    <span className="absolute h-10 w-10 rounded-full border-4 border-slate-900 bg-white" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Volume */}
        <div className="mb-3 flex items-center gap-3 sm:mb-4">
          <button onClick={() => setMuted(m => !m)} className="flex-shrink-0 text-slate-500 transition-colors hover:text-slate-900">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-sky-600" style={{ width: `${volume * 100}%` }} />
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
          {(!isConnected && isPlaying) ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onRetry}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white hover:bg-sky-500"
            >
              <Activity className="w-4 h-4" />
              Reconnect
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={isPlaying ? onStop : onPlay}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-sky-500 active:opacity-80"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
              {isPlaying ? 'Pause' : 'Listen live'}
            </motion.button>
          )}

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
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-sky-700"
          >
            <Share2 className="w-4 h-4" />
          </motion.button>
        </div>

      </div>
    </motion.div>
  );
}

/* ─────────────────── Mobile Chat Drawer ─────────────────── */
function MobileChatSection({ streamSlug, companyName }: { streamSlug: string; companyName?: string }) {
  return (
    <section className="mt-2 flex min-h-0 flex-1 flex-col pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="min-h-0 flex-1 overflow-hidden">
        <LiveChat slug={streamSlug} companyName={companyName} />
      </div>
    </section>
  );
}

/* ───────────────────────── Video Player Layout ───────────────────────── */
function VideoPlayerLayout({ 
  stream, company, remoteStream, isPlaying, connectionState, onPlay, onRetry, viewerCount, peakViewers 
}: {
  stream: VolLivestreamOut;
  company: VolCompanyResponse | null;
  remoteStream: MediaStream | null;
  isPlaying: boolean;
  connectionState: string;
  onPlay: () => void;
  onRetry: () => void;
  viewerCount?: number;
  peakViewers?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [volume, setVolume] = useState(0.8);
  const [hasVideoTracks, setHasVideoTracks] = useState(false);

  // Detect video tracks and assign srcObject immediately when they arrive
  useEffect(() => {
    if (!remoteStream) { setHasVideoTracks(false); return; }
    const videoTracks = remoteStream.getVideoTracks();
    const audioTracks = remoteStream.getAudioTracks();
    const has = videoTracks.length > 0;
    console.log('[VideoPlayerLayout] Tracks updated - video:', videoTracks.length, 'audio:', audioTracks.length, 'hasVideo:', has);
    setHasVideoTracks(has);

    // Assign srcObject immediately when video track arrives — don't gate on connectionState
    if (has && videoRef.current && videoRef.current.srcObject !== remoteStream) {
      console.log('[VideoPlayerLayout] Assigning srcObject immediately for video track');
      videoRef.current.srcObject = remoteStream;
      videoRef.current.muted = true; // start muted for autoplay policy
      const playPromise = videoRef.current.play();
      playPromise.then(() => console.log('[VideoPlayerLayout] Immediate play succeeded'))
        .catch(err => {
          console.error('[VideoPlayerLayout] Immediate play failed:', err);
          videoRef.current!.muted = true;
          videoRef.current!.play().then(() => console.log('[VideoPlayerLayout] Muted play succeeded'))
            .catch(e => console.error('[VideoPlayerLayout] Muted play also failed:', e));
        });
    }
  }, [remoteStream]);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Video Output */}
      <div className="relative aspect-video bg-black max-h-[70vh]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          controls
          muted={isMuted}
          className="w-full h-full object-contain"
        />
        {(!remoteStream || (remoteStream && !hasVideoTracks)) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                <Video className="w-8 h-8" />
              </div>
              <p className="text-slate-400">Waiting for video...</p>
            </div>
          </div>
        )}
        {isConnecting && !hasVideoTracks && remoteStream && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-white text-xs">Connecting...</span>
          </div>
        )}
        {(isConnected || hasVideoTracks) && (
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-white text-xs">Live</span>
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href={`/${company?.slug || ''}`} className="text-xs font-bold uppercase tracking-widest text-sky-700 hover:underline">
              {company?.name || 'Channel'}
            </Link>
            <h2 className="font-bold text-slate-950">{stream.title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-slate-400">
              <Eye className="w-4 h-4" />
              <span className="font-semibold text-slate-900">{viewerCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
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
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const autoPlayAttemptedRef = useRef(false);

  const { remoteStream, connectionState, startPlayback, stop: stopPlayback, retryConnection, audioStats } = useWebRTC();

  // Detect if remote stream has video tracks
  useEffect(() => {
    if (remoteStream) {
      const videoTracks = remoteStream.getVideoTracks();
      setHasVideoTrack(videoTracks.length > 0);
      console.log('[StreamPage] Remote stream video tracks:', videoTracks.length, videoTracks.map(t => t.label));
    } else {
      setHasVideoTrack(false);
    }
  }, [remoteStream]);
  const { viewerCount: realtimeViewerCount, totalViews, peakViewers } = useViewerCount({
    slug: streamSlug || '',
    companyId: company?.id || 0,
    enabled: !!streamSlug && !!company?.id,
    pollingInterval: 10000,
  });

  console.log('fetched peak viewers', peakViewers);
  console.log('fetched total views', totalViews);
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

  // Initialize audio when remote stream becomes available - for audio streams only
  useEffect(() => {
    if (remoteStream && !audioIsInitialized && stream?.stream_type !== 'video') {
      console.log('[StreamPage] Auto-connecting audio stream');
      initializeAudio(remoteStream);
      play().then(() => {
        setIsPlaying(true);
      }).catch(console.error);
    }
  }, [remoteStream, initializeAudio, play, audioIsInitialized, stream?.stream_type]);

  // For video streams, auto-trigger handlePlay when stream data loads with playback URL
  // But only if not already playing/connecting
  useEffect(() => {
    console.log('[StreamPage] Video stream check:', {
      hasRemoteStream: !!remoteStream,
      streamType: stream?.stream_type,
      isPlaying,
      isAlreadyConnecting: connectionState === 'connecting',
      hasPlaybackUrl: !!stream?.cf_webrtc_playback_url,
      connectionState,
      autoPlayAttempted: autoPlayAttemptedRef.current
    });

    // Auto-play for video streams when we have the playback URL but no connection yet
    if (stream?.stream_type === 'video' && stream?.cf_webrtc_playback_url && !autoPlayAttemptedRef.current && connectionState !== 'connected' && connectionState !== 'connecting') {
      console.log('[StreamPage] Auto-starting video playback...');
      autoPlayAttemptedRef.current = true;
      setIsPlaying(true); // mark playing BEFORE connection completes so UI reflects intent
      if (stream?.cf_webrtc_playback_url) {
        startPlayback(stream.cf_webrtc_playback_url).then(() => {
          console.log('[StreamPage] startPlayback resolved');
        }).catch((err) => {
          console.error('[StreamPage] Auto-play failed:', err);
          setIsPlaying(false); // rollback if it failed
        });
      }
    }
  }, [stream?.stream_type, stream?.cf_webrtc_playback_url, stream, connectionState, startPlayback]);

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
      // Mark as video stream for display purposes
      if (streamData.stream_type === 'video') {
        // Video stream detected
      }
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

  function handlePausePlayback() {
    stop();
    setIsPlaying(false);
    setIsAudioInitialized(false);
    stopPlayback();
  }

  const handlePlay = useCallback(async () => {
    console.log('[StreamPage] handlePlay called, stream type:', stream?.stream_type);
    console.log('[StreamPage] playback URL:', stream?.cf_webrtc_playback_url);
    if (!stream?.cf_webrtc_playback_url) {
      console.log('[StreamPage] No playback URL available');
      setIsPlaying(true);
      return;
    }
    setIsPlaying(true);
    try {
      console.log('[StreamPage] Calling startPlayback...');
      await startPlayback(stream.cf_webrtc_playback_url);
      console.log('[StreamPage] startPlayback succeeded');
    } catch (err) {
      console.error('[StreamPage] startPlayback failed:', err);
      setIsPlaying(false);
      const error = err as { status?: number; message?: string };
      if (error.status === 409) {
        setCreatorNotStreamingInfo({ creatorName: company?.name || 'The Creator', streamTitle: stream.title });
        setShowCreatorNotStreaming(true);
      }
    }
  }, [stream, startPlayback, company]);

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

      <div className="min-h-screen bg-slate-50">
        {/* Navbar */}
        <div
          className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white/95"
        >
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-center justify-between h-13 py-2.5">
              <Link href={`/${companySlug}`} className="group flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-950">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 transition-colors group-hover:bg-slate-200">
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium">{company?.name || 'Channel'}</span>
              </Link>
              <LiveBadge />
            </div>
          </div>
        </div>

        {/* Main content */}
        <main className="pb-0 pt-16 lg:pb-8">
          <div className="container mx-auto max-w-6xl px-2 sm:px-4">

            {/* ── Desktop: player + sidebar chat side by side ── */}
            <div className="hidden lg:flex gap-6 items-start">
              <div className="flex-1 min-w-0">
                {stream?.stream_type === 'video' ? (
                  <VideoPlayerLayout
                    stream={stream} company={company}
                    remoteStream={remoteStream} isPlaying={isPlaying}
                    connectionState={connectionState}
                    onPlay={handlePlay} onRetry={handleRetry}
                    viewerCount={totalViews} peakViewers={peakViewers}
                  />
                ) : (
                  <StreamPlayer
                    stream={stream} company={company} isPlaying={isPlaying}
                    connectionState={connectionState} remoteStream={remoteStream}
                    audioStats={audioStats} onStop={handlePausePlayback} onPlay={handlePlay}
                    onRetry={handleRetry} onVolumeChange={updateVolume}
                    viewerCount={totalViews}
                    peakViewers={peakViewers}
                    isVideoStream={false}
                  />
                )}
              </div>

              {/* Desktop chat — sticky with a fixed height so it never collapses */}
              <div className="w-80 flex-shrink-0 sticky top-20" style={{ height: 'calc(100vh - 88px)' }}>
                <div className="h-full">
                  <LiveChat slug={streamSlug} companyName={company?.name} />
                </div>
              </div>
            </div>

            {/* ── Mobile: player stacked above collapsible chat ── */}
            <div className="flex h-[calc(100dvh-64px)] min-h-0 flex-col overflow-hidden py-2 lg:hidden">
              {stream?.stream_type === 'video' ? (
                <VideoPlayerLayout
                  stream={stream} company={company}
                  remoteStream={remoteStream} isPlaying={isPlaying}
                  connectionState={connectionState}
                  onPlay={handlePlay} onRetry={handleRetry}
                  viewerCount={totalViews} peakViewers={peakViewers}
                />
              ) : (
                <StreamPlayer
                  stream={stream} company={company} isPlaying={isPlaying}
                  connectionState={connectionState} remoteStream={remoteStream}
                  audioStats={audioStats} onStop={handlePausePlayback} onPlay={handlePlay}
                  onRetry={handleRetry} onVolumeChange={updateVolume}
                  viewerCount={totalViews}
                  peakViewers={peakViewers}
                  isVideoStream={false}
                />
              )}
              <MobileChatSection streamSlug={streamSlug} companyName={company?.name} />
            </div>

          </div>
        </main>
      </div>
    </>
  );
}
