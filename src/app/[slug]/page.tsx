"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';
import {
  Radio, Users, Play, X, ChevronRight, Headphones, Eye, History,
  Pause, Volume2, VolumeX, Minimize2, Maximize2, Wifi, WifiOff,
  Activity, Zap, ChevronDown, ChevronUp, Clock, BarChart2, Signal,
  ArrowLeft, Share2, Heart, Bell
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { StreamCard } from '@/components/streaming/stream-card';
import { AudioPlayer } from '@/components/streaming/audio-player';
import { livestreamApi, type CompanyLivePageResponse } from '@/lib/api/livestream';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { VolLivestreamOut } from '@/types/livestream';
import type { VolCompanyResponse } from '@/types/company';

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
}: {
  stream: VolLivestreamOut;
  variant: 'live' | 'recording';
  onClick: () => void;
  isActive?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = ['from-sky-600 to-indigo-700', 'from-violet-600 to-fuchsia-700', 'from-emerald-600 to-cyan-700', 'from-orange-600 to-rose-700'];
  const grad = colors[stream.id % colors.length];

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className={`relative cursor-pointer rounded-2xl overflow-hidden border transition-all duration-300 ${
        isActive
          ? 'border-sky-400/60 shadow-[0_0_30px_rgba(56,189,248,0.25)]'
          : 'border-white/5 hover:border-white/15'
      }`}
      style={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)' }}
    >
      {/* Top gradient bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${grad}`} />

      {/* Thumbnail area */}
      <div className={`relative h-36 bg-gradient-to-br ${grad} opacity-20`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <PulseRings isActive={variant === 'live' && hovered} />
            <motion.div
              className={`w-14 h-14 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center shadow-2xl`}
              animate={variant === 'live' ? { boxShadow: ['0 0 0px rgba(56,189,248,0.3)', '0 0 30px rgba(56,189,248,0.5)', '0 0 0px rgba(56,189,248,0.3)'] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {variant === 'live' ? <Radio className="w-6 h-6 text-white" /> : <History className="w-6 h-6 text-white" />}
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

      <div className="relative w-full max-w-2xl">
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
                  <span className="text-white font-semibold">{stream.viewer_count.toLocaleString()}</span>
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
                      { label: 'Viewers', value: stream.viewer_count.toLocaleString(), icon: Users },
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
    </motion.div>
  );
}

/* ─────────────────────────────── PAGE ─────────────────────────────── */
export default function CompanyPage() {
  const params = useParams();
  const slug = params?.slug as string;

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

  const {
    remoteStream,
    connectionState,
    startPlayback,
    stop: stopPlayback,
    retryConnection,
    audioStats,
  } = useWebRTC();
  
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
      const livePageData = await livestreamApi.getCompanyLivePage(slug) as CompanyLivePageResponse;
      setCompany({
        id: livePageData.company.id,
        name: livePageData.company.name,
        slug: livePageData.company.slug,
        description: livePageData.company.description,
        email: '',
        logo_url: livePageData.company.logo_url,
        is_active: true,
        created_at: new Date().toISOString(),
      });
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
      } finally {
        setIsLoadingStreams(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    await startPlayback(stream.cf_webrtc_playback_url);
    setIsPlaying(true);
    setIsMinimized(false);
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

  const visiblePast = showAllPast ? previousStreams : previousStreams.slice(0, 6);

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
                    className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)' }}
                  >
                    {company?.name?.[0]?.toUpperCase() || '?'}
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
                  </div>
                </div>

                {/* Bell */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all self-start sm:self-center"
                >
                  <Bell className="w-4 h-4" />
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
                        <StreamTile
                          stream={stream}
                          variant="live"
                          onClick={() => handlePlayStream(stream)}
                          isActive={isPlaying && currentStream?.id === stream.id}
                        />
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
              transition={{ delay: 0.25 }}
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