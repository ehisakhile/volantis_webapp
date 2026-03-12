"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  Radio, Users, Play, X, ChevronRight, Headphones, Eye, History, EyeIcon,
  Pause, Volume2, VolumeX, Minimize2, Maximize2, Wifi, WifiOff,
  Activity, Zap, ChevronDown, ChevronUp, Clock, BarChart2, Signal,
  ArrowLeft, Share2, Heart, Bell, BellPlus, Disc3, UserCheck
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { StreamCard } from '@/components/streaming/stream-card';
import { AudioPlayer } from '@/components/streaming/audio-player';
import { LiveChat } from '@/components/streaming/live-chat';
import { livestreamApi, type CompanyLivePageResponse, type CompanyPageResponse } from '@/lib/api/livestream';
import { recordingsApi, type RecordingStatsResponse } from '@/lib/api/recordings';
import { subscriptionsApi } from '@/lib/api/subscriptions';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { VolLivestreamOut, VolRecordingOut } from '@/types/livestream';
import { CreatorNotStreamingModal } from '@/components/streaming/creator-not-streaming-modal';
import type { VolCompanyResponse } from '@/types/company';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useViewerCount } from '@/lib/api/useViewerCount';

/* ─────────────────────── Waveform Visualizer ─────────────────────── */
function AudioVisualizer({ isActive, color = '#38bdf8' }: { isActive: boolean; color?: string }) {
  const bars = 48;
  return (
    <div className="flex items-end gap-[2px] h-16 w-full">
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
          style={{ width: 80, height: 80 }}
        />
      ))}
    </div>
  );
}

/* ─────────────────── Noise/Grain Overlay ─────────────────── */
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

/* ─────────────────── Live Badge ─────────────────── */
function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[11px] font-bold uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      Live
    </span>
  );
}

/* ─────────────────── Stream Card (Redesigned) ─────────────────── */
function StreamTile({
  stream,
  variant,
  onClick,
  isActive,
  companyLogoUrl,
}: {
  stream: VolLivestreamOut;
  variant: 'live' | 'recording';
  onClick?: () => void;
  isActive?: boolean;
  companyLogoUrl?: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = ['from-sky-600 to-indigo-700', 'from-violet-600 to-fuchsia-700', 'from-emerald-600 to-cyan-700', 'from-orange-600 to-rose-700'];
  const grad = colors[stream.id % colors.length];
  
  const imageUrl = stream.thumbnail_url || companyLogoUrl || undefined;

  const handleClick = () => {
    if (onClick) onClick();
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={handleClick}
      className={`relative cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 ${
        isActive
          ? 'border-sky-400/60 shadow-[0_0_30px_rgba(56,189,248,0.25)]'
          : 'border-white/5 hover:border-white/15'
      }`}
      style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)' }}
    >
      {/* Top gradient bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${grad}`} />

{/* Thumbnail area - priority: thumbnail_url > company_logo_url > gradient */}
      <div
        className={`relative h-36 bg-cover bg-center`}
        style={{
          backgroundImage: imageUrl
            ? `url(${imageUrl})`
            : undefined,
          backgroundColor: imageUrl ? 'rgba(15,23,42,0.8)' : undefined,
          opacity: imageUrl ? 0.6 : undefined,
        }}
      >
        {/* Gradient overlay when using thumbnail or logo */}
        {imageUrl && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        )}
        {!imageUrl && (
          <div className={`absolute inset-0 bg-gradient-to-br ${grad} opacity-20`} />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <PulseRings isActive={variant === 'live' && hovered} />
<motion.div
              className={`w-14 h-14 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shadow-2xl`}
              animate={variant === 'live' ? { boxShadow: ['0 0 0px rgba(56,189,248,0.3)', '0 0 30px rgba(56,189,248,0.5)', '0 0 0px rgba(56,189,248,0.3)'] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {imageUrl ? (
                <img src={imageUrl} alt={stream.company_name || 'Company'} className="w-full h-full object-cover rounded-full" />
              ) : variant === 'live' ? <Radio className="w-6 h-6 text-white" /> : <History className="w-6 h-6 text-white" />}
            </motion.div>
          </div>
        </div>

        {/* Mini waveform */}
        {variant === 'live' && (
          <div className="absolute bottom-3 left-4 right-4 h-8">
            <AudioVisualizer isActive={hovered} color="#38bdf8" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3">
          {variant === 'live' ? <LiveBadge /> : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/80 border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-widest">
              <History className="w-3 h-3" /> Replay
            </span>
          )}
        </div>

        {isActive && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/30 border border-sky-400/50 text-sky-300 text-[10px] font-bold">
              <Activity className="w-2.5 h-2.5" /> NOW PLAYING
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-white font-semibold text-sm leading-tight line-clamp-1">{stream.title}</p>
        {stream.description && (
          <p className="text-slate-500 text-xs mt-1 line-clamp-2">{stream.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {variant === 'live' && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-sky-500" />
                {stream.viewer_count.toLocaleString()}
              </span>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isActive ? 'bg-sky-500 text-white' : 'bg-white/10 text-white hover:bg-sky-500/40'
            }`}
          >
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────── Mini Player (Minimized) ─────────────────── */
function MiniPlayer({
  stream,
  isPlaying,
  onExpand,
  onStop,
  connectionState,
}: {
  stream: VolLivestreamOut;
  isPlaying: boolean;
  onExpand: () => void;
  onStop: () => void;
  connectionState: string;
}) {
  const [muted, setMuted] = useState(false);

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[min(520px,calc(100vw-2rem))]"
    >
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.8)]"
        style={{ background: 'rgba(8,14,28,0.95)', backdropFilter: 'blur(40px)' }}
      >
        {/* Animated top border */}
        <motion.div
          className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-sky-400 via-violet-500 to-sky-400"
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{ width: '100%', backgroundSize: '200% 100%' }}
        />

        <div className="flex items-center gap-4 px-5 py-4">
          {/* Status dot */}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
              <Radio className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900 animate-pulse" />
          </div>

          {/* Info + mini waveform */}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{stream.title}</p>
            <div className="h-5 mt-1">
              <AudioVisualizer isActive={isPlaying} color="#38bdf8" />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMuted(m => !m)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onExpand}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onStop}
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

/* ─────────────────── Full Player Modal ─────────────────── */
function FullPlayer({
  stream,
  company,
  isPlaying,
  connectionState,
  remoteStream,
  audioStats,
  onMinimize,
  onStop,
  onRetry,
  onVolumeChange,
  streamSlug,
  viewerCount,
}: {
  stream: VolLivestreamOut;
  company: VolCompanyResponse | null;
  isPlaying: boolean;
  connectionState: string;
  remoteStream: MediaStream | null;
  audioStats: unknown;
  onMinimize: () => void;
  onStop: () => void;
  onRetry: () => void;
  onVolumeChange?: (volume: number) => void;
  streamSlug?: string;
  viewerCount?: number;
}) {
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [volume, setVolume] = useState(0.8);
  
  // Call onVolumeChange when volume changes
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };
  const [showStats, setShowStats] = useState(false);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting' || connectionState === 'new';

  const statusColor = isConnected ? '#22d3ee' : isConnecting ? '#f59e0b' : '#ef4444';
  const statusLabel = isConnected ? 'Connected' : isConnecting ? 'Connecting…' : 'Disconnected';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: 'rgba(2,6,20,0.97)', backdropFilter: 'blur(60px)' }}
    >
      {/* Ambient glow background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-2/3 left-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="flex gap-6">
          {/* Player column */}
          <div className="flex-1">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
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
          </motion.div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowStats(s => !s)}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onMinimize}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
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
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          className="rounded-3xl border border-white/10 overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
          style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.95) 0%, rgba(8,14,28,0.98) 100%)', backdropFilter: 'blur(40px)' }}
        >
          {/* Gradient header strip */}
          <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-violet-500 via-fuchsia-500 to-sky-400 bg-[size:200%_100%] animate-[shift_4s_linear_infinite]" />

          <div className="p-8">
            {/* Channel info */}
            <div className="flex items-center gap-4 mb-8">
              <motion.div
                className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center text-xl font-black text-white shadow-lg flex-shrink-0"
                animate={{ boxShadow: isPlaying ? ['0 0 0px rgba(56,189,248,0.4)', '0 0 25px rgba(56,189,248,0.6)', '0 0 0px rgba(56,189,248,0.4)'] : '0 0 0px rgba(0,0,0,0)' }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {company?.name?.[0]?.toUpperCase() || '?'}
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-1">{company?.name}</p>
                <h2 className="text-white text-xl font-bold leading-tight truncate">{stream.title}</h2>
                {stream.description && (
                  <p className="text-slate-500 text-sm mt-1 line-clamp-1">{stream.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
            <div className="relative rounded-2xl overflow-hidden mb-6 h-40"
              style={{ background: 'linear-gradient(180deg, rgba(56,189,248,0.04) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Grid lines */}
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(rgba(56,189,248,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.3) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                }} />

              {/* Center glow */}
              <div className="absolute inset-x-0 bottom-0 h-20"
                style={{ background: 'linear-gradient(to top, rgba(56,189,248,0.07), transparent)' }} />

              {/* Pulse rings around center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <PulseRings isActive={isPlaying} />
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-2xl z-10 relative"
                    animate={isPlaying ? {
                      scale: [1, 1.06, 1],
                      boxShadow: ['0 0 20px rgba(56,189,248,0.3)', '0 0 50px rgba(56,189,248,0.7)', '0 0 20px rgba(56,189,248,0.3)'],
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Headphones className="w-7 h-7 text-white" />
                  </motion.div>
                </div>
              </div>

              {/* Waveform at bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-2 h-12">
                <AudioVisualizer isActive={isPlaying} color="#38bdf8" />
              </div>
            </div>

            {/* Volume control */}
            <div className="flex items-center gap-3 mb-6">
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
              {!isConnected && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onRetry}
                  className="flex-1 py-3.5 rounded-2xl text-white text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}
                >
                  <Zap className="w-4 h-4" />
                  Reconnect
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setLiked(l => !l)}
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${
                  liked
                    ? 'bg-rose-500/30 border-rose-500/50 text-rose-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                className="w-12 h-12 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-colors"
              >
                <Share2 className="w-5 h-5" />
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
                  <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Connection', value: connectionState, icon: Wifi },
                      { label: 'Viewers', value: (viewerCount !== undefined ? viewerCount : stream.viewer_count).toLocaleString(), icon: Users },
                      { label: 'Peak', value: (stream.peak_viewers ?? 0).toLocaleString(), icon: Activity },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-xl p-3 text-center"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Icon className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                        <p className="text-white text-sm font-bold capitalize">{value}</p>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Bottom hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-slate-600 text-xs mt-4"
    >
      Press <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px] text-slate-400">ESC</kbd> or minimize to continue browsing
    </motion.p>
      </div>
      {/* End of player column */}
          
          {/* Chat column */}
          {streamSlug && (
            <div className="w-80 flex-shrink-0">
              <LiveChat slug={streamSlug} companyName={company?.name || streamSlug} />
            </div>
          )}
        </div>
        </div>
    </motion.div>
  );
}

/* ─────────────────────────────── PAGE ─────────────────────────────── */
export default function CompanyPage() {
  const params = useParams();
  const slug = params?.companySlug as string;

  const [company, setCompany] = useState<VolCompanyResponse | null>(null);
  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);
  const [previousStreams, setPreviousStreams] = useState<VolLivestreamOut[]>([]);
  const [allLiveStreams, setAllLiveStreams] = useState<VolLivestreamOut[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [showAllPast, setShowAllPast] = useState(false);
  
  // Recordings state
  const [recordings, setRecordings] = useState<VolRecordingOut[]>([]);
  const [isRecordingsLoading, setIsRecordingsLoading] = useState(false);
  const [showAllRecordings, setShowAllRecordings] = useState(false);
   
  // Creator not streaming modal
  const [showCreatorNotStreaming, setShowCreatorNotStreaming] = useState(false);
  const [creatorNotStreamingInfo, setCreatorNotStreamingInfo] = useState<{
    creatorName: string;
    streamTitle?: string;
  } | null>(null);

  // Subscriber state
  const [subscriberCount, setSubscriberCount] = useState<number>(0);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null);

  // Auth and login modal state
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [showLoginModal, setShowLoginModal] = useState(false);

  const {
    remoteStream,
    connectionState,
    startPlayback,
    stop: stopPlayback,
    retryConnection,
    audioStats,
  } = useWebRTC();

  // Real-time viewer count (only enabled when there's a current stream)
  const { viewerCount: realtimeViewerCount, isConnected: isViewerWsConnected } = useViewerCount({
    slug: currentStream?.slug || '',
    companyId: company?.id || 0,
    enabled: !!currentStream?.slug && !!company?.id,
    pollingInterval: 10000,
  });
  
  // Audio element ref for playback
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.8);
  
  // Handle remote stream - play audio when available
  useEffect(() => {
    if (remoteStream && !audioRef.current) {
      // Create audio element and play
      const audio = new Audio();
      audio.srcObject = remoteStream;
      audio.volume = volumeRef.current;
      audio.play().catch(err => console.error('Audio playback error:', err));
      audioRef.current = audio;
    }
  }, [remoteStream]);
  
  // Update volume
  const updateVolume = useCallback((vol: number) => {
    volumeRef.current = vol;
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setStreamError(null);
    try {
      // Fetch company page data from the new endpoint
      const companyPageData = await livestreamApi.getCompanyPage(slug) as CompanyPageResponse;
      
      // Set subscriber count and company logo from the new endpoint
      setSubscriberCount(companyPageData.subscriber_count);
      setCompanyLogoUrl(companyPageData.company.logo_url);
      
      // Set company data
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
      
// Try to check subscription status (may fail if not authenticated)
      try {
        const isSubscribed = await subscriptionsApi.checkSubscriptionBySlug(slug);
        setIsSubscribed(isSubscribed);
      } catch (subErr) {
        // User not authenticated, ignore
        setIsSubscribed(false);
      }

      // Fetch live page data for stream details
      const livePageData = await livestreamApi.getCompanyLivePage(slug) as CompanyLivePageResponse;
      setIsLoadingStreams(true);
      try {
        const allStreams = await livestreamApi.getCompanyStreams(slug, 50, 0, true);
        const activeStreams = allStreams.filter(s => s.is_active);
        const inactiveStreamList = allStreams.filter(s => !s.is_active);
        if (livePageData.livestream) {
          const liveStream: VolLivestreamOut = {
            id: livePageData.livestream.id,
            company_id: livePageData.company.id,
            title: livePageData.livestream.title,
            slug: livePageData.livestream.slug,
            description: livePageData.livestream.description,
            stream_type: 'audio',
            is_active: true,
            start_time: livePageData.livestream.started_at,
            end_time: null,
            cf_live_input_uid: null,
            cf_rtmps_url: null,
            cf_stream_key: null,
            cf_webrtc_publish_url: null,
            cf_webrtc_playback_url: livePageData.livestream.webrtc_playback_url,
            recording_url: null,
            viewer_count: livePageData.livestream.viewer_count,
            peak_viewers: livePageData.livestream.peak_viewers,
            created_by_username: livePageData.company.name,
            created_at: livePageData.livestream.started_at,
          };
          if (!activeStreams.find(s => s.id === liveStream.id)) activeStreams.unshift(liveStream);
        }
        setAllLiveStreams(activeStreams);
        setCurrentStream(activeStreams.length > 0 ? activeStreams[0] : null);
        setPreviousStreams(inactiveStreamList);
      } catch (e) {
        console.error(e);
        setPreviousStreams([]);
      } finally {
        setIsLoadingStreams(false);
      }
    } catch (err: unknown) {
      const error = err as { status?: number; detail?: string };
      
      // If company not found (404), redirect to /listen
      if (error.status === 404) {
        router.push('/listen');
        return;
      }
      
      if (error.status === 409) setStreamError(error.detail || 'Stream has not started yet.');
      try {
        const companyStreams = await livestreamApi.getCompanyStreams(slug, 50, 0, true);
        const liveStreams = companyStreams.filter(s => s.is_active);
        const prevStreams = companyStreams.filter(s => !s.is_active);
        setAllLiveStreams(liveStreams);
        setCurrentStream(liveStreams.length > 0 ? liveStreams[0] : null);
        setPreviousStreams(prevStreams);
        setCompany({
          id: 1,
          name: slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          slug,
          description: 'Live audio streaming',
          email: '',
          logo_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      } catch {
        // Company validation failed - redirect to /listen
        router.push('/listen');
        return;
      } finally {
        setIsLoadingStreams(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  // Fetch recordings for this company
  const fetchRecordings = useCallback(async () => {
    if (!slug) return;
    setIsRecordingsLoading(true);
    try {
      const recs = await recordingsApi.getRecordingsByCompany(slug, 50, 0);
      
      // Fetch replay count stats for each recording
      const recordingsWithStats = await Promise.all(
        recs.map(async (recording) => {
          try {
            const stats: RecordingStatsResponse = await recordingsApi.getRecordingStats(recording.id);
            return { ...recording, replay_count: stats.replay_count };
          } catch (err) {
            console.error(`Failed to fetch stats for recording ${recording.id}:`, err);
            return { ...recording, replay_count: 0 };
          }
        })
      );
      
      setRecordings(recordingsWithStats);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
      setRecordings([]);
    } finally {
      setIsRecordingsLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  // SEO: Update metadata when company data loads
  useEffect(() => {
    if (!company) return;
    
    const liveStatus = allLiveStreams.length > 0 ? '🔴 LIVE' : '';
    const title = `${company.name}${liveStatus ? ' ' + liveStatus : ''} | Volantis`;
    const description = company.description 
      ? `${company.description} - Listen to live streams and replays on Volantis.`
      : `Listen to ${company.name}'s live audio streams and replays on Volantis.`;
    const imageUrl = companyLogoUrl || company.logo_url;
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://volantislive.com';
    
    // Update document title
    document.title = title;
    
    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, isProperty = false) => {
      const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement('meta');
        if (isProperty) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    // Description
    updateMetaTag('description', description);
    
    // Open Graph
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:url', `${siteUrl}/${slug}`, true);
    if (imageUrl) {
      updateMetaTag('og:image', imageUrl, true);
    }
    
    // Twitter Card
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (imageUrl) {
      updateMetaTag('twitter:image', imageUrl);
    }
  }, [company, companyLogoUrl, allLiveStreams, slug]);
  
  useEffect(() => {
    if (slug) fetchRecordings();
  }, [slug, fetchRecordings]);

  // ESC to minimize
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlaying && !isMinimized) setIsMinimized(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPlaying, isMinimized]);

  const handlePlayStream = async (stream: VolLivestreamOut) => {
    if (!stream.cf_webrtc_playback_url) {
      setCurrentStream(stream);
      setIsPlaying(true);
      setIsMinimized(false);
      return;
    }
    setCurrentStream(stream);
    
    try {
      await startPlayback(stream.cf_webrtc_playback_url);
      setIsPlaying(true);
      setIsMinimized(false);
    } catch (err) {
      // Check for 409 Conflict - creator not streaming
      const error = err as { status?: number; message?: string };
      if (error.status === 409) {
        // Show creator not streaming modal
        setCreatorNotStreamingInfo({
          creatorName: company?.name || 'The Creator',
          streamTitle: stream.title,
        });
        setShowCreatorNotStreaming(true);
        return;
      }
      
      // Re-throw other errors
      throw err;
    }
  };

  const handleStopPlayback = () => {
    // Clean up audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    stopPlayback();
    setIsPlaying(false);
    setIsMinimized(false);
    setCurrentStream(null);
  };

  // Handle subscribe/unsubscribe
  const handleSubscribe = useCallback(async () => {
    if (!slug) return;
    
    // If not authenticated, show login modal
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    
    // If already subscribed, unsubscribe; otherwise subscribe
    if (isSubscribed) {
      try {
        await subscriptionsApi.unsubscribe(slug);
        setIsSubscribed(false);
        setSubscriberCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to unsubscribe:', err);
      }
    } else {
      try {
        setIsSubscribing(true);
        await subscriptionsApi.subscribe(slug);
        setIsSubscribed(true);
        setSubscriberCount(prev => prev + 1);
      } catch (err) {
        console.error('Failed to subscribe:', err);
      } finally {
        setIsSubscribing(false);
      }
    }
  }, [slug, isSubscribed, isAuthenticated]);

  // Navigate to login/signup pages
  const handleLoginClick = () => {
    router.push('/login');
  };

  const handleSignupClick = () => {
    router.push('/signup/user');
  };

  const visiblePast = showAllPast ? previousStreams : previousStreams.slice(0, 6);
  const visibleRecordings = showAllRecordings ? recordings : recordings.slice(0, 6);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-sky-500/30 border-t-sky-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-slate-500 text-sm tracking-widest uppercase">Loading Channel</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Creator Not Streaming Modal */}
      <CreatorNotStreamingModal
        isOpen={showCreatorNotStreaming}
        onClose={() => setShowCreatorNotStreaming(false)}
        creatorName={creatorNotStreamingInfo?.creatorName || 'The Creator'}
        streamTitle={creatorNotStreamingInfo?.streamTitle}
      />

      {/* Login/Signup Modal for Subscriptions */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(2,6,20,0.9)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-md rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
              style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.98) 0%, rgba(8,14,28,0.98) 100%)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient header */}
              <div className="h-1 w-full bg-gradient-to-r from-sky-400 via-violet-500 to-sky-400" />

              <div className="p-8 text-center">
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-sky-500/20 flex items-center justify-center">
                  <UserCheck className="w-8 h-8 text-sky-400" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Subscribe to {company?.name || 'this channel'}</h2>
                <p className="text-slate-400 mb-8">Create an account to subscribe and get notified when they go live</p>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSignupClick}
                    className="w-full py-3.5 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
                  >
                    <BellPlus className="w-4 h-4" />
                    Sign Up Free
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLoginClick}
                    className="w-full py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    Log In
                  </motion.button>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Space+Mono:wght@400;700&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .mono { font-family: 'Space Mono', monospace; }
        @keyframes shift { 0%,100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.3); border-radius: 2px; }
      `}</style>

      <GrainOverlay />

      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #030712 0%, #060c1e 50%, #03060f 100%)' }}>
        <Navbar />

        <main className="pt-24 pb-32">
          <div className="container mx-auto px-4 max-w-6xl">

            {/* ── Channel Header ── */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative mb-16"
            >
              {/* Background glow */}
              <div className="absolute -inset-8 rounded-3xl opacity-30 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(56,189,248,0.1) 0%, transparent 60%)' }} />

              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Logo */}
                <motion.div
                  className="relative flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-2xl overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)' }}
                  >
                    {companyLogoUrl ? (
                      <img src={companyLogoUrl} alt={company?.name || 'Company'} className="w-full h-full object-cover" />
                    ) : (
                      company?.name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  {allLiveStreams.length > 0 && (
                    <motion.div
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-slate-950 flex items-center justify-center"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Text info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1 className="text-4xl font-black text-white tracking-tight">{company?.name || slug}</h1>
                    {allLiveStreams.length > 0 && <LiveBadge />}
                  </div>
                  {company?.description && (
                    <p className="text-slate-400 text-base max-w-lg">{company.description}</p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-4 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Radio className="w-3 h-3 text-red-400" />
                      </div>
                      <span className="text-slate-400">{allLiveStreams.length} <span className="text-white font-semibold">Live</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center">
                        <Eye className="w-3 h-3 text-sky-400" />
                      </div>
                      <span className="text-slate-400"><span className="text-white font-semibold">{allLiveStreams.reduce((s, st) => s + st.viewer_count, 0).toLocaleString()}</span> watching</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                        <History className="w-3 h-3 text-violet-400" />
                      </div>
                      <span className="text-slate-400"><span className="text-white font-semibold">{previousStreams.length}</span> replays</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <UserCheck className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-slate-400"><span className="text-white font-semibold">{subscriberCount.toLocaleString()}</span> subscribers</span>
                    </div>
                  </div>
                </div>

                {/* Subscribe Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubscribe}
                  disabled={isSubscribing}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all self-start sm:self-center ${
                    isSubscribed
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                      : 'border border-sky-500/30 bg-gradient-to-r from-sky-500 to-violet-500 text-white hover:shadow-lg hover:shadow-sky-500/25'
                  }`}
                >
                  {isSubscribing ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isSubscribed ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Subscribed</span>
                    </>
                  ) : (
                    <>
                      <BellPlus className="w-4 h-4" />
                      <span>Subscribe</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* ── Stream Error ── */}
            <AnimatePresence>
              {streamError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-8 px-5 py-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3"
                >
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-300 text-sm">{streamError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Live Now ── */}
            <AnimatePresence>
              {allLiveStreams.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="mb-16"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <motion.span
                      className="w-2.5 h-2.5 rounded-full bg-red-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <h2 className="text-lg font-bold text-white uppercase tracking-widest">Live Now</h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-red-500/30 to-transparent" />
                    <span className="mono text-xs text-red-400/70 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                      {allLiveStreams.length} streams
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {allLiveStreams.map((stream, i) => (
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.07 }}
                      >
                        <Link
                          href={`/${company?.slug || slug}/${stream.slug}`}
                          className="block"
                        >
<StreamTile
                            stream={stream}
                            variant="live"
                            // No onClick - the Link handles navigation
                            isActive={isPlaying && currentStream?.id === stream.id}
                            companyLogoUrl={companyLogoUrl}
                          />
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

{/* ── Past Broadcasts ── */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <History className="w-4 h-4 text-slate-500" />
                <h2 className="text-lg font-bold text-white uppercase tracking-widest">Past Broadcasts</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                {previousStreams.length > 0 && (
                  <span className="mono text-xs text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                    {previousStreams.length} replays
                  </span>
                )}
              </div>

              {isLoadingStreams ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl border border-white/5 overflow-hidden animate-pulse" style={{ height: 220, background: 'rgba(15,23,42,0.6)' }} />
                  ))}
                </div>
              ) : previousStreams.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visiblePast.map((stream, i) => (
                      <motion.div
                        key={stream.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
<StreamTile
                          stream={stream}
                          variant="recording"
                          onClick={() => handlePlayStream(stream)}
                          isActive={isPlaying && currentStream?.id === stream.id}
                          companyLogoUrl={companyLogoUrl}
                        />
                      </motion.div>
                    ))}
                  </div>

                  {previousStreams.length > 6 && (
                    <div className="flex justify-center mt-8">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowAllPast(s => !s)}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 text-slate-400 hover:text-white text-sm font-semibold transition-all"
                      >
                        {showAllPast ? (
                          <><ChevronUp className="w-4 h-4" /> Show Less</>
                        ) : (
                          <><ChevronDown className="w-4 h-4" /> Show {previousStreams.length - 6} More</>
                        )}
                      </motion.button>
                    </div>
                  )}
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Radio className="w-8 h-8 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-semibold">No past broadcasts yet</p>
                  {allLiveStreams.length === 0 && (
                    <p className="text-slate-600 text-sm mt-2">This channel is currently offline</p>
                  )}
                </motion.div>
              )}
            </motion.section>

{/* ── Previous Recordings ── */}
            {recordings.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-16"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h2 className="text-lg font-bold text-white uppercase tracking-widest">Previous Recordings</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
                  <span className="mono text-xs text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    {recordings.length} recordings
                  </span>
                </div>

                {isRecordingsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="rounded-2xl border border-white/5 overflow-hidden animate-pulse" style={{ height: 220, background: 'rgba(15,23,42,0.6)' }} />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {visibleRecordings.map((recording, i) => (
                        <motion.div
                          key={recording.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <Link
                            href={`/${company?.slug || slug}/recording/${recording.id}`}
                            className="block group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/20"
                          >
                            {recording.thumbnail_url ? (
                              <div
                                className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-90 transition-opacity"
                                style={{ backgroundImage: `url(${recording.thumbnail_url})` }}
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-500 to-rose-600 opacity-20 group-hover:opacity-30 transition-opacity" />
                            )}
                            <div className="relative p-5 pt-20">
                              <div className="absolute top-4 right-4">
                                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center overflow-hidden">
                                  {recording.thumbnail_url ? (
                                    <img src={recording.thumbnail_url} alt={recording.title} className="w-full h-full object-cover" />
                                  ) : recording.company_logo_url ? (
                                    <img src={recording.company_logo_url} alt={recording.company_name || 'Company'} className="w-full h-full object-cover" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-amber-400" />
                                  )}
                                </div>
                              </div>
                              <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1 group-hover:text-amber-400 transition-colors">
                                {recording.title}
                              </h3>
                              {recording.description && (
                                <p className="text-sm text-slate-400 mb-3 line-clamp-1">{recording.description}</p>
                              )}
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{new Date(recording.created_at).toLocaleDateString()}</span>
                                <div className="flex items-center gap-3">
                                  {recording.replay_count !== undefined && recording.replay_count > 0 && (
                                    <span className="flex items-center gap-1 text-amber-400/70">
                                      <Users className="w-3 h-3" />
                                      {recording.replay_count.toLocaleString()}
                                    </span>
                                  )}
                                  {recording.duration_seconds && (
                                    <span>{Math.floor(recording.duration_seconds / 60)}:{(recording.duration_seconds % 60).toString().padStart(2, '0')}</span>
                                  )}
                                </div>
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-14 h-14 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 transform scale-0 group-hover:scale-100 transition-transform duration-300">
                                  <Play className="w-6 h-6 text-white ml-1" />
                                </div>
                              </div>
                            </div>
                          </Link>
                        </motion.div>
                      ))}
                    </div>

                    {recordings.length > 6 && (
                      <div className="flex justify-center mt-8">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setShowAllRecordings(s => !s)}
                          className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-sm font-semibold transition-all"
                        >
                          {showAllRecordings ? (
                            <><ChevronUp className="w-4 h-4" /> Show Less</>
                          ) : (
                            <><ChevronDown className="w-4 h-4" /> Show {recordings.length - 6} More</>
                          )}
                        </motion.button>
                      </div>
                    )}
                  </>
                )}
              </motion.section>
            )}
          </div>
        </main>
      </div>

      {/* ── Player Overlay ── */}
      <AnimatePresence mode="wait">
        {isPlaying && currentStream && !isMinimized && (
          <FullPlayer
            key="full"
            stream={currentStream}
            company={company}
            isPlaying={isPlaying}
            connectionState={connectionState}
            remoteStream={remoteStream}
            audioStats={audioStats}
            onMinimize={() => setIsMinimized(true)}
            onStop={handleStopPlayback}
            onRetry={retryConnection}
            onVolumeChange={updateVolume}
            streamSlug={currentStream.slug}
            viewerCount={realtimeViewerCount}
          />
        )}

        {isPlaying && currentStream && isMinimized && (
          <MiniPlayer
            key="mini"
            stream={currentStream}
            isPlaying={isPlaying}
            onExpand={() => setIsMinimized(false)}
            onStop={handleStopPlayback}
            connectionState={connectionState}
          />
        )}
      </AnimatePresence>
    </>
  );
}