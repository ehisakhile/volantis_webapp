"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { 
  Search, Radio, Play, Pause, Volume2, VolumeX, 
  Users, Eye, X,
  Headphones, Waves, Disc3, RadioReceiver, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { livestreamApi, type ActiveStreamItem, type ActiveStreamsResponse } from '@/lib/api/livestream';
import { recordingsApi } from '@/lib/api/recordings';
import { companyApi, type CompanySearchResult, type CompaniesResponse } from '@/lib/api/company';
import { useAuth } from '@/lib/auth-context';
import { CreatorNotStreamingModal } from '@/components/streaming/creator-not-streaming-modal';
import { RecordingPlayer } from '@/components/streaming/recording-player';
import { type VolRecordingOut } from '@/types/livestream';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADIENT_PRESETS = [
  ['#7C3AED', '#EC4899'],
  ['#0EA5E9', '#6366F1'],
  ['#F97316', '#EF4444'],
  ['#10B981', '#0EA5E9'],
  ['#F59E0B', '#F97316'],
  ['#EF4444', '#BE185D'],
  ['#84CC16', '#10B981'],
  ['#38BDF8', '#818CF8'],
];

function getGradientForCompany(name: string): string[] {
  const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GRADIENT_PRESETS[index % GRADIENT_PRESETS.length];
}

function formatViewerCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

function formatTimeSince(dateString: string): string {
  const start = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

// ─── Floating orbs background ────────────────────────────────────────────────

function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Large ambient orbs */}
      <div className="absolute -top-[30%] -right-[15%] w-[700px] h-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      {/* Subtle noise overlay */}
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '128px' }} />
    </div>
  );
}

// ─── Live badge ───────────────────────────────────────────────────────────────

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)', color: '#F87171' }}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
      </span>
      Live
    </span>
  );
}

// ─── Stream Card ──────────────────────────────────────────────────────────────

function StreamCard({ stream, index }: { stream: ActiveStreamItem; index: number }) {
  const [colors] = useState(() => getGradientForCompany(stream.company_name));
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Link href={`/${stream.company_slug}`} className="block">
        <div className="relative overflow-hidden rounded-2xl transition-all duration-300"
          style={{
            background: 'rgba(15,20,40,0.55)',
            backdropFilter: 'blur(20px)',
            border: hovered ? `1px solid rgba(${colors[0]}, 0.4)` : '1px solid rgba(255,255,255,0.07)',
            boxShadow: hovered ? `0 20px 60px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)` : '0 4px 24px rgba(0,0,0,0.3)',
            transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
          }}>

          {/* Gradient top bar */}
          <div className="h-1 w-full"
            style={{ background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})` }} />

          {/* Card background glow */}
          <motion.div
            className="absolute inset-0 opacity-0 pointer-events-none"
            animate={{ opacity: hovered ? 0.08 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${colors[0]}, transparent 70%)` }}
          />

          {/* Top badges */}
          <div className="absolute top-3 left-3 z-10">
            {stream.is_live && <LiveBadge />}
          </div>
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Eye className="w-3 h-3" />
            {formatViewerCount(stream.viewer_count)}
          </div>

          <div className="p-5 pt-10">
            {/* Logo */}
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-xl blur-2xl opacity-60"
                style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} />
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center"
                style={{ background: 'rgba(15,20,40,0.8)', border: '1.5px solid rgba(255,255,255,0.1)' }}>
                {stream.company_logo_url
                  ? <img src={stream.company_logo_url} alt={stream.company_name} className="w-full h-full object-cover" />
                  : <Radio className="w-7 h-7" style={{ color: colors[0] }} />}
              </div>
            </div>

            <h3 className="text-[15px] font-semibold text-white text-center mb-1 leading-snug truncate"
              style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {stream.company_name}
            </h3>
            <p className="text-xs text-center mb-4 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {stream.title}
            </p>

            <div className="flex items-center justify-between text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <span className="flex items-center gap-1">
                <Waves className="w-3 h-3" />
                {formatTimeSince(stream.started_at)} ago
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {formatViewerCount(stream.viewer_count)}
              </span>
            </div>
          </div>

          {/* Play overlay */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}>
            <motion.div
              initial={{ scale: 0.7 }}
              animate={{ scale: hovered ? 1 : 0.7 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`, boxShadow: `0 8px 32px ${colors[0]}60` }}>
              <Play className="w-6 h-6 text-white ml-0.5" />
            </motion.div>
          </motion.div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company, index }: { company: CompanySearchResult; index: number }) {
  const [colors] = useState(() => getGradientForCompany(company.name));
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.025, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      <Link href={`/${company.slug}`} className="block">
        <div className="relative overflow-hidden rounded-xl p-4 text-center transition-all duration-200"
          style={{
            background: hovered ? 'rgba(20,25,50,0.8)' : 'rgba(15,20,40,0.5)',
            backdropFilter: 'blur(16px)',
            border: hovered ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.06)',
            boxShadow: hovered ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
            transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          }}>

          {/* Bottom gradient glow on hover */}
          <motion.div className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: `linear-gradient(to top, ${colors[0]}25, transparent)` }} />

          <div className="relative w-12 h-12 mx-auto mb-2.5">
            <div className="absolute inset-0 rounded-lg opacity-50 blur-lg"
              style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} />
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center"
              style={{ background: 'rgba(15,20,40,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {company.logo_url
                ? <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                : <Radio className="w-5 h-5" style={{ color: colors[0] }} />}
            </div>
          </div>

          <h3 className="text-xs font-semibold text-white truncate leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {company.name}
          </h3>

          {company.subscriber_count > 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {company.subscriber_count.toLocaleString()} subs
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative max-w-xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden transition-all duration-300"
        style={{
          background: 'rgba(15,20,40,0.6)',
          backdropFilter: 'blur(20px)',
          border: focused ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
          boxShadow: focused ? '0 0 0 4px rgba(99,102,241,0.12), 0 8px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.2)',
        }}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5"
          style={{ color: focused ? '#818CF8' : 'rgba(255,255,255,0.35)' }} />
        <input
          type="text"
          placeholder="Search stations, churches, categories..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full pl-11 pr-10 py-4 bg-transparent text-white text-sm placeholder-transparent focus:outline-none"
          style={{ '--tw-placeholder-opacity': '0' } as React.CSSProperties}
        />
        <span className="absolute left-11 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none"
          style={{ color: value ? 'transparent' : 'rgba(255,255,255,0.3)' }}>
          Search stations, churches, categories...
        </span>
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onChange('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>
              <X className="w-3 h-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, count, accentColor = '#818CF8' }: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  count?: number | string;
  accentColor?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40` }}>
          <Icon className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
            {count}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm pl-11" style={{ color: 'rgba(255,255,255,0.4)' }}>{subtitle}</p>}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className={compact ? 'p-4' : 'p-5 pt-10'}>
        <div className={`rounded-xl mx-auto mb-3 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}
          style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="h-3 rounded-full mx-auto mb-2" style={{ background: 'rgba(255,255,255,0.06)', width: '70%' }} />
        {!compact && <div className="h-2.5 rounded-full mx-auto" style={{ background: 'rgba(255,255,255,0.04)', width: '50%' }} />}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ListenPage() {
  const { isAuthenticated } = useAuth();
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 400], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  const [streams, setStreams] = useState<ActiveStreamItem[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<ActiveStreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [allCompanies, setAllCompanies] = useState<CompanySearchResult[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanySearchResult[]>([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  const [companiesPage, setCompaniesPage] = useState(0);
  const [companiesLimit] = useState(50);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [isLoadingMoreCompanies, setIsLoadingMoreCompanies] = useState(false);

  const [currentStream, setCurrentStream] = useState<ActiveStreamItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [currentRecording, setCurrentRecording] = useState<VolRecordingOut | null>(null);
  const [allRecordings, setAllRecordings] = useState<VolRecordingOut[]>([]);
  const [isRecordingsLoading, setIsRecordingsLoading] = useState(false);

  const [showCreatorNotStreaming, setShowCreatorNotStreaming] = useState(false);
  const [creatorNotStreamingInfo, setCreatorNotStreamingInfo] = useState<{
    creatorName: string; streamTitle?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const allCompaniesRef = useRef<CompanySearchResult[]>([]);

  useEffect(() => { allCompaniesRef.current = allCompanies; }, [allCompanies]);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchStreams = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await livestreamApi.getActiveLivestreams(50, 0);
      const streamsArray = (response as ActiveStreamsResponse)?.streams || [];
      setStreams(streamsArray);
      setFilteredStreams(streamsArray);
    } catch (err) {
      const demoStreams: ActiveStreamItem[] = [
        { id: 1, title: 'Morning Worship Service', slug: 'morning-worship', company_id: 14, company_slug: 'stalbert', company_name: 'St Albert Parish', company_logo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=SA', is_live: true, viewer_count: 1250, thumbnail_url: null, started_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 2, title: 'Praise & Worship Live', slug: 'praise-worship', company_id: 14, company_slug: 'stalbert', company_name: 'Grace Community', company_logo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=GC', is_live: true, viewer_count: 890, thumbnail_url: null, started_at: new Date(Date.now() - 1800000).toISOString() },
      ];
      setStreams(demoStreams);
      setFilteredStreams(demoStreams);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCompaniesWithRef = useCallback(async (reset: boolean = true) => {
    const offset = reset ? 0 : companiesPage * companiesLimit;
    if (reset) { setIsCompaniesLoading(true); setCompaniesPage(0); }
    else setIsLoadingMoreCompanies(true);
    try {
      const response: CompaniesResponse = await companyApi.getCompanies(companiesLimit, offset);
      const sorted = [...response.companies].sort((a, b) => {
        if (a.logo_url && !b.logo_url) return -1;
        if (!a.logo_url && b.logo_url) return 1;
        return a.name.localeCompare(b.name);
      });
      if (reset) { setAllCompanies(sorted); setFilteredCompanies(sorted); }
      else {
        const merged = [...allCompaniesRef.current, ...sorted].sort((a, b) => {
          if (a.logo_url && !b.logo_url) return -1;
          if (!a.logo_url && b.logo_url) return 1;
          return a.name.localeCompare(b.name);
        });
        setAllCompanies(merged);
        setFilteredCompanies(merged);
      }
      setCompaniesTotal(response.total);
    } catch { if (reset) { setAllCompanies([]); setFilteredCompanies([]); } }
    finally { if (reset) setIsCompaniesLoading(false); else setIsLoadingMoreCompanies(false); }
  }, [companiesPage, companiesLimit]);

  const fetchRecordings = useCallback(async () => {
    if (!isAuthenticated) { setAllRecordings([]); return; }
    setIsRecordingsLoading(true);
    try { const recs = await recordingsApi.getRecordings(50, 0); setAllRecordings(recs); }
    catch { setAllRecordings([]); }
    finally { setIsRecordingsLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!searchQuery.trim()) { setFilteredStreams(streams); return; }
    const q = searchQuery.toLowerCase();
    setFilteredStreams(streams.filter(s => s.company_name.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)));
  }, [searchQuery, streams]);

  useEffect(() => { fetchStreams(); }, [fetchStreams]);
  useEffect(() => { fetchCompaniesWithRef(true); }, []);
  useEffect(() => { if (isAuthenticated) fetchRecordings(); else setAllRecordings([]); }, [isAuthenticated, fetchRecordings]);

  // ─── Audio visualization ────────────────────────────────────────────────────

  useEffect(() => {
    if (!isPlaying || !analyzerRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      if (!analyzerRef.current || !ctx) return;
      const bufferLength = analyzerRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzerRef.current.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.55;
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      setAudioLevel(avg / 255);
      const barCount = 72;
      const angleStep = (Math.PI * 2) / barCount;
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * (dataArray.length / 2));
        const value = dataArray[dataIndex] || 0;
        const barHeight = (value / 255) * (radius * 0.75) + 3;
        const angle = i * angleStep - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        const hue = (i / barCount) * 80 + 200;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${hue}, 85%, 65%, ${0.35 + (value / 255) * 0.65})`;
        ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke();
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying]);

  // ─── Stream connection ──────────────────────────────────────────────────────

  const connectToStream = useCallback(async (stream: ActiveStreamItem) => {
    setIsConnecting(true); setConnectionError(null);
    try {
      const livePageData = await livestreamApi.getCompanyLivePage(stream.company_slug);
      if (!livePageData.livestream?.webrtc_playback_url) { setConnectionError('No playback URL available'); setIsConnecting(false); return; }
      const playbackUrl = livePageData.livestream.webrtc_playback_url;
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }] });
      peerConnectionRef.current = pc;
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const analyzer = audioCtx.createAnalyser();
          analyzer.fftSize = 128; analyzer.smoothingTimeConstant = 0.8;
          analyzerRef.current = analyzer;
          const source = audioCtx.createMediaStreamSource(remoteStream);
          source.connect(analyzer); sourceRef.current = source;
          const audio = new Audio();
          audio.srcObject = remoteStream; audio.volume = volume;
          audio.play().catch(console.error);
          (window as any).__audioEl = audio;
        } catch (err) { console.error(err); }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') { setIsConnecting(false); setIsPlaying(true); setIsReconnecting(false); reconnectAttemptsRef.current = 0; if (reconnectIntervalRef.current) { clearInterval(reconnectIntervalRef.current); reconnectIntervalRef.current = null; } }
        else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') { setIsConnecting(false); setIsPlaying(false); setConnectionError('Connection lost. Attempting to reconnect...'); startPollingReconnection(stream); }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const response = await fetch(playbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp });
      if (!response.ok) throw new Error('Failed to connect');
      const answerSDP = await response.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP });
      setCurrentStream(stream);
    } catch (err) {
      const error = err as { status?: number };
      if (error.status === 409) { setCreatorNotStreamingInfo({ creatorName: stream.company_name, streamTitle: stream.title }); setShowCreatorNotStreaming(true); setIsConnecting(false); return; }
      setConnectionError('Failed to connect. Please try again.'); setIsConnecting(false);
    }
  }, [volume]);

  const stopLivePlayback = useCallback(() => {
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (audio) { audio.pause(); audio.srcObject = null; }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    analyzerRef.current = null; sourceRef.current = null;
    setIsPlaying(false); setCurrentStream(null); setAudioLevel(0);
  }, []);

  const toggleLivePlayPause = useCallback(() => {
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(console.error); }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (audio) audio.volume = v;
  }, []);

  const toggleMute = useCallback(() => {
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (audio) { audio.muted = !isMuted; setIsMuted(!isMuted); }
  }, [isMuted]);

  const startPollingReconnection = useCallback((stream: ActiveStreamItem) => {
    if (reconnectIntervalRef.current) return;
    setIsReconnecting(true);
    reconnectAttemptsRef.current = 0;
    reconnectIntervalRef.current = setInterval(async () => {
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        clearInterval(reconnectIntervalRef.current!); reconnectIntervalRef.current = null;
        setIsReconnecting(false); setConnectionError('Unable to reconnect. Please try manually.');
        return;
      }
      reconnectAttemptsRef.current++;
      try {
        const response = await livestreamApi.getActiveLivestreams(50, 0);
        const streamsArray = (response as ActiveStreamsResponse)?.streams || [];
        const stillLive = streamsArray.find(s => s.id === stream.id && s.is_live);
        if (stillLive) {
          clearInterval(reconnectIntervalRef.current!); reconnectIntervalRef.current = null;
          stopLivePlayback(); await connectToStream(stillLive);
        } else {
          setConnectionError(`Stream offline. Retrying... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        }
      } catch { setConnectionError(`Retrying... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`); }
    }, 10000);
  }, [connectToStream, stopLivePlayback]);

  const handleStreamSelect = useCallback((stream: ActiveStreamItem) => {
    if (currentStream?.id === stream.id) { toggleLivePlayPause(); return; }
    stopLivePlayback(); connectToStream(stream);
  }, [currentStream, connectToStream, stopLivePlayback, toggleLivePlayPause]);

  const handleRecordingSelect = useCallback((recording: VolRecordingOut) => {
    if (currentStream) stopLivePlayback();
    if (currentRecording?.id !== recording.id) setCurrentRecording(recording);
  }, [currentStream, currentRecording, stopLivePlayback]);

  const handleRecordingClose = useCallback(() => setCurrentRecording(null), []);

  useEffect(() => {
    return () => {
      stopLivePlayback();
      if (reconnectIntervalRef.current) { clearInterval(reconnectIntervalRef.current); reconnectIntervalRef.current = null; }
    };
  }, [stopLivePlayback]);

  useEffect(() => {
    if (!currentStream && reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current); reconnectIntervalRef.current = null; setIsReconnecting(false);
    }
  }, [currentStream]);

  const totalListeners = filteredStreams?.reduce?.((acc, s) => acc + (s?.viewer_count || 0), 0) || 0;
  const playerColors = currentStream ? getGradientForCompany(currentStream.company_name) : ['#6366F1', '#8B5CF6'];

  return (
    <div className="min-h-screen" style={{ background: '#080C1A', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        
        .glass-card {
          background: rgba(15, 20, 40, 0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        
        .glass-input {
          background: rgba(15, 20, 40, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

        /* Volume slider */
        input[type=range] { -webkit-appearance: none; appearance: none; height: 3px; border-radius: 2px; outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: white; cursor: pointer; box-shadow: 0 0 8px rgba(255,255,255,0.3); }
        
        /* Waveform bars animation */
        @keyframes waveBar { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }
        .wave-bar { animation: waveBar 0.8s ease-in-out infinite; transform-origin: center; }
      `}</style>

      <FloatingOrbs />
      <CreatorNotStreamingModal isOpen={showCreatorNotStreaming} onClose={() => setShowCreatorNotStreaming(false)} creatorName={creatorNotStreamingInfo?.creatorName || ''} streamTitle={creatorNotStreamingInfo?.streamTitle} />
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <motion.div style={{ y: heroParallax, opacity: heroOpacity }} className="relative container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center max-w-2xl mx-auto"
          >
            {/* Pill badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-8"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC' }}>
              <Headphones className="w-3.5 h-3.5" />
              Live Audio Platform
            </motion.div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-none tracking-tight">
              Tune into the{' '}
              <span className="relative inline-block">
                <span className="relative z-10" style={{ background: 'linear-gradient(135deg, #818CF8, #38BDF8, #34D399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  world
                </span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 h-px"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  style={{ background: 'linear-gradient(90deg, transparent, #818CF8, #38BDF8, transparent)', transformOrigin: 'left' }} />
              </span>
            </h1>

            <p className="text-base mb-10 leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Live audio streams from churches, ministries, and community stations — anywhere, anytime.
            </p>

            <SearchBar value={searchQuery} onChange={setSearchQuery} />

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-8 mt-8">
              {[
                { icon: RadioReceiver, label: `${filteredStreams?.length || 0} Live`, color: '#F87171' },
                { icon: Users, label: `${formatViewerCount(totalListeners)} Listeners`, color: '#34D399' },
                { icon: Disc3, label: `${companiesTotal} Channels`, color: '#818CF8' },
              ].map(({ icon: Icon, label, color }, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  {label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Live Streams ──────────────────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <div className="container mx-auto max-w-6xl">
          <SectionHeader
            icon={Radio}
            title="Live Now"
            count={filteredStreams?.length}
            accentColor="#F87171"
            subtitle="Real-time audio streams currently broadcasting"
          />

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredStreams?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredStreams.map((stream, index) => (
                  <StreamCard key={stream.id} stream={stream} index={index} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Radio className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />
              </div>
              <p className="text-sm font-medium text-white mb-1">No live stations</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {searchQuery ? 'Try adjusting your search' : 'Check back soon — streams start all the time'}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Browse All Channels ───────────────────────────────────────────── */}
      <section id="browse-channels" className="px-4 pb-32">
        <div className="container mx-auto max-w-6xl">
          <SectionHeader
            icon={Disc3}
            title="Browse Channels"
            count={companiesTotal}
            accentColor="#A78BFA"
            subtitle="Explore and subscribe to get notified when they go live"
          />

          {isCompaniesLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {[...Array(16)].map((_, i) => <SkeletonCard key={i} compact />)}
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <Disc3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No channels found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {filteredCompanies.slice(0, 32).map((company, index) => (
                  <CompanyCard key={company.id} company={company} index={index} />
                ))}
              </div>

              {allCompanies.length < companiesTotal && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => { setCompaniesPage(p => p + 1); fetchCompaniesWithRef(false); }}
                    disabled={isLoadingMoreCompanies}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                    style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#A78BFA' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.18)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(167,139,250,0.1)'; }}>
                    {isLoadingMoreCompanies ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : `Show ${companiesTotal - allCompanies.length} more channels`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Live Stream Player (fixed bottom) ─────────────────────────────── */}
      <AnimatePresence>
        {currentStream && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              background: 'rgba(8,12,26,0.92)',
              backdropFilter: 'blur(24px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              boxShadow: `0 -20px 80px -10px ${playerColors[0]}30`,
            }}>

            {/* Gradient top accent */}
            <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${playerColors[0]}, ${playerColors[1]}, transparent)` }} />

            {/* Waveform canvas */}
            <div className="absolute -top-16 left-0 right-0 h-16 pointer-events-none overflow-hidden">
              <canvas ref={canvasRef} width={800} height={64} className="w-full h-full opacity-80" />
            </div>

            <div className="mx-auto max-w-6xl px-4 py-3">
              <div className="flex items-center gap-4">
                {/* Track info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${playerColors[0]}, ${playerColors[1]})` }}>
                    {currentStream.company_logo_url
                      ? <img src={currentStream.company_logo_url} alt={currentStream.company_name} className="w-full h-full object-cover" />
                      : <Radio className="w-5 h-5 text-white absolute inset-0 m-auto" />}
                    {isPlaying && (
                      <div className="absolute inset-0 flex items-end justify-center gap-px pb-1.5">
                        {[1, 2, 3, 4].map((_, i) => (
                          <div key={i} className="wave-bar w-0.5 rounded-full bg-white/80"
                            style={{ height: '10px', animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate leading-tight">{currentStream.company_name}</p>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>{currentStream.title}</p>
                  </div>
                  <LiveBadge />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleLivePlayPause}
                    disabled={isConnecting}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${playerColors[0]}, ${playerColors[1]})`, boxShadow: `0 4px 20px ${playerColors[0]}50` }}>
                    {isConnecting
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>

                {/* Volume */}
                <div className="hidden sm:flex items-center gap-2.5">
                  <button onClick={toggleMute} className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20"
                    style={{ background: `linear-gradient(90deg, ${playerColors[0]} ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%)` }}
                  />
                </div>

                {/* Viewers */}
                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Eye className="w-3.5 h-3.5" />
                  {formatViewerCount(currentStream.viewer_count)}
                </div>

                {/* Close */}
                <button
                  onClick={stopLivePlayback}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = 'white'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.4)'; }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Connection error */}
              <AnimatePresence>
                {connectionError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs mt-2 text-center"
                    style={{ color: '#F87171' }}>
                    {connectionError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording player */}
      <AnimatePresence>
        {currentRecording && (
          <RecordingPlayer
            key={currentRecording.id}
            recording={currentRecording}
            onClose={handleRecordingClose}
            onCompleted={fetchRecordings}
          />
        )}
      </AnimatePresence>

      <div className={(currentStream || currentRecording) ? 'pb-28' : ''}>
        <Footer />
      </div>
    </div>
  );
}