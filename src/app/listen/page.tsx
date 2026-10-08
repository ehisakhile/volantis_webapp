"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Search, Radio, Play, Pause, Volume2, VolumeX, 
  Users, Eye, X,
  Headphones, Disc3
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

// ─── Live badge ───────────────────────────────────────────────────────────────

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Live
    </span>
  );
}

// ─── Stream Card ──────────────────────────────────────────────────────────────

function StreamArtwork({ stream }: { stream: ActiveStreamItem }) {

  const thumbnail = stream.thumbnail_url;
  const source = thumbnail || stream.company_logo_url;


  if (!source) {
    return <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-slate-100"><Radio className="h-12 w-12 text-sky-600" /></div>;
  }



  return <img src={source} alt={thumbnail ? `${stream.title} thumbnail` : `${stream.company_name} logo`} className={`h-full w-full ${thumbnail ? 'object-cover' : 'object-contain bg-slate-100 p-8'}`} />;
}

function StreamCard({ stream }: { stream: ActiveStreamItem }) {
  return (
    <Link href={`/${stream.company_slug}/${stream.slug}`} className="group relative block min-h-[380px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-sky-200 sm:min-h-[420px]">
      <div className="absolute inset-0">
        <StreamArtwork stream={stream} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />

      <div className="absolute left-5 top-5"><LiveBadge /></div>
      <div className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          <Users className="h-3.5 w-3.5" aria-hidden="true" />{formatViewerCount(stream.viewer_count)}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <h3 className="line-clamp-2 text-2xl font-bold leading-tight text-white sm:text-3xl">{stream.title}</h3>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-sm">
            {stream.company_logo_url ? <img src={stream.company_logo_url} alt="" className="h-full w-full object-cover" /> : <Radio className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{stream.company_name}</p><p className="mt-0.5 text-xs text-slate-300">Started {formatTimeSince(stream.started_at)} ago</p></div>
        </div>
        <span className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white shadow-lg transition group-hover:bg-sky-500">
          <Play className="h-4 w-4 fill-current" /> Open live stream
        </span>
      </div>
    </Link>
  );
}

// ─── Company Card ─────────────────────────────────────────────────────────────

function CompanyCard({ company }: { company: CompanySearchResult }) {
  return (
    <Link href={`/${company.slug}`} className="block rounded-xl border border-slate-200 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-sm">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-sky-50 text-sky-700">
        {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-cover" /> : <Radio className="h-5 w-5" />}
      </div>
      <h3 className="truncate text-sm font-semibold text-slate-900">{company.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{company.subscriber_count > 0 ? `${company.subscriber_count.toLocaleString()} followers` : 'View channel'}</p>
    </Link>
  );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative max-w-xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search stations, churches, categories..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search channels and live streams"
          className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-11 pr-11 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
        />
        {value && <button onClick={() => onChange('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
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
        <h2 className="text-xl font-bold text-slate-950">
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}>
            {count}
          </span>
        )}
      </div>
      {subtitle && <p className="pl-11 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="h-1 bg-slate-100" />
      <div className={compact ? 'p-4' : 'p-5 pt-10'}>
        <div className={`rounded-xl mx-auto mb-3 ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}
          style={{ background: '#e2e8f0' }} />
        <div className="mx-auto mb-2 h-3 w-[70%] rounded-full bg-slate-200" />
        {!compact && <div className="mx-auto h-2.5 w-1/2 rounded-full bg-slate-100" />}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ListenPage() {
  const { isAuthenticated } = useAuth();

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
  const [, setAudioLevel] = useState(0);

  const [, setIsReconnecting] = useState(false);
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

  const playerColors = currentStream ? getGradientForCompany(currentStream.company_name) : ['#6366F1', '#8B5CF6'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <CreatorNotStreamingModal isOpen={showCreatorNotStreaming} onClose={() => setShowCreatorNotStreaming(false)} creatorName={creatorNotStreamingInfo?.creatorName || ''} streamTitle={creatorNotStreamingInfo?.streamTitle} />
      <Navbar />

      <section className="border-b border-slate-200 bg-white px-4 pb-10 pt-28 sm:px-6 sm:pb-12 sm:pt-32">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700"><Headphones className="h-4 w-4" aria-hidden="true" />Listen live</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Find a live stream and start listening</h1>
            <p className="mt-4 text-lg leading-8 text-slate-600">Discover churches, creators, and community stations. Tap once to listen.</p>
            <div className="mt-7"><SearchBar value={searchQuery} onChange={setSearchQuery} /></div>
            <div className="mt-5 flex flex-wrap gap-5 text-sm font-medium text-slate-500"><span>{filteredStreams.length} live now</span><span>{companiesTotal} channels</span></div>
          </div>
        </div>
      </section>

      {/* ── Live Streams ──────────────────────────────────────────────────── */}
      <section className="px-4 py-14 sm:px-6 sm:py-16">
        <div className="container mx-auto max-w-6xl">
          <SectionHeader
            icon={Radio}
            title="Live Now"
            count={filteredStreams?.length}
            accentColor="#F87171"
            subtitle="Real-time audio streams currently broadcasting"
          />

          {isLoading ? (
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
              {[...Array(10)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredStreams?.length > 0 ? (
            <div className="grid grid-cols-1 gap-7 lg:grid-cols-2">
              <AnimatePresence mode="popLayout">
                {filteredStreams.map((stream) => (
                  <StreamCard key={stream.id} stream={stream} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Radio className="h-5 w-5 text-slate-400" />
              </div>
              <p className="mb-1 text-sm font-medium text-slate-900">No live streams found</p>
              <p className="text-xs text-slate-500">
                {searchQuery ? 'Try adjusting your search' : 'Check back soon — streams start all the time'}
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Browse All Channels ───────────────────────────────────────────── */}
      <section id="browse-channels" className="border-t border-slate-200 bg-white px-4 py-16 sm:px-6 sm:py-20">
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
            <div className="py-12 text-center text-slate-500">
              <Disc3 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm">No channels found</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {filteredCompanies.slice(0, 32).map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>

              {allCompanies.length < companiesTotal && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={() => { setCompaniesPage(p => p + 1); fetchCompaniesWithRef(false); }}
                    disabled={isLoadingMoreCompanies}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:opacity-60">
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
                    aria-label={isPlaying ? 'Pause stream' : 'Play stream'}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-transform active:scale-95 disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${playerColors[0]}, ${playerColors[1]})`, boxShadow: `0 4px 20px ${playerColors[0]}50` }}>
                    {isConnecting
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>

                {/* Volume */}
                <div className="hidden sm:flex items-center gap-2.5">
                  <button onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'} className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-70" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20"
                    aria-label="Volume"
                    style={{ background: `linear-gradient(90deg, ${playerColors[0]} ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%)` }}
                  />
                </div>

                {/* Viewers */}
                <div className="hidden md:flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Eye className="w-3.5 h-3.5" />
                  {formatViewerCount(currentStream.total_views)}
                </div>

                {/* Close */}
                <button
                  onClick={stopLivePlayback}
                  aria-label="Close player"
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
