"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// Gradient presets for company cards
const GRADIENT_PRESETS = [
  'from-violet-600 via-purple-600 to-pink-600',
  'from-cyan-500 via-blue-500 to-indigo-600',
  'from-orange-500 via-red-500 to-pink-600',
  'from-emerald-500 via-teal-500 to-cyan-600',
  'from-amber-500 via-yellow-500 to-orange-600',
  'from-rose-500 via-red-500 to-rose-700',
  'from-lime-500 via-green-500 to-emerald-600',
  'from-sky-500 via-indigo-500 to-purple-600',
];

function getGradientForCompany(name: string): string {
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
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function ListenPage() {
  const { isAuthenticated } = useAuth();
  
const [streams, setStreams] = useState<ActiveStreamItem[]>([]);
  const [filteredStreams, setFilteredStreams] = useState<ActiveStreamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // All companies (for browsing even when not live)
  const [allCompanies, setAllCompanies] = useState<CompanySearchResult[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanySearchResult[]>([]);
  const [isCompaniesLoading, setIsCompaniesLoading] = useState(false);
  
  // Pagination state for companies
  const [companiesPage, setCompaniesPage] = useState(0);
  const [companiesLimit] = useState(50);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [isLoadingMoreCompanies, setIsLoadingMoreCompanies] = useState(false);
  
  // Live stream playback state
  const [currentStream, setCurrentStream] = useState<ActiveStreamItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Auto-reconnection state
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recording state — only track WHICH recording is selected.
  // RecordingPlayer owns all audio lifecycle for recordings.
  const [currentRecording, setCurrentRecording] = useState<VolRecordingOut | null>(null);
  const [allRecordings, setAllRecordings] = useState<VolRecordingOut[]>([]);
  const [isRecordingsLoading, setIsRecordingsLoading] = useState(false);
  
  // Creator not streaming modal
  const [showCreatorNotStreaming, setShowCreatorNotStreaming] = useState(false);
  const [creatorNotStreamingInfo, setCreatorNotStreamingInfo] = useState<{
    creatorName: string;
    streamTitle?: string;
  } | null>(null);
  
  // Audio visualization refs (live stream only)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
// ─── Fetch active streams ───────────────────────────────────────────────────
  const fetchStreams = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await livestreamApi.getActiveLivestreams(50, 0);
      const streamsArray = (response as ActiveStreamsResponse)?.streams || [];
      setStreams(streamsArray);
      setFilteredStreams(streamsArray);
    } catch (err) {
      console.error('Failed to fetch streams:', err);
      const demoStreams: ActiveStreamItem[] = [
        {
          id: 1, title: 'Morning Worship Service', slug: 'morning-worship',
          company_id: 14, company_slug: 'stalbert', company_name: 'St Albert Parish',
          company_logo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=SA',
          is_live: true, viewer_count: 1250, thumbnail_url: null,
          started_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 2, title: 'Praise & Worship Live', slug: 'praise-worship',
          company_id: 14, company_slug: 'stalbert', company_name: 'Grace Community Church',
          company_logo_url: 'https://api.dicebear.com/7.x/initials/svg?seed=GC',
          is_live: true, viewer_count: 890, thumbnail_url: null,
          started_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ];
      setStreams(demoStreams);
      setFilteredStreams(demoStreams);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
// ─── Fetch all companies (for browsing with pagination) ─────────────────────
  const fetchCompanies = useCallback(async (reset: boolean = true) => {
    const offset = reset ? 0 : companiesPage * companiesLimit;
    
    if (reset) {
      setIsCompaniesLoading(true);
      setCompaniesPage(0);
    } else {
      setIsLoadingMoreCompanies(true);
    }
    
    try {
      const response: CompaniesResponse = await companyApi.getCompanies(companiesLimit, offset);
      
      // Sort companies: those with logo_url first, then by name
      const sortedCompanies = [...response.companies].sort((a, b) => {
        // Companies with logos first
        if (a.logo_url && !b.logo_url) return -1;
        if (!a.logo_url && b.logo_url) return 1;
        return a.name.localeCompare(b.name);
      });
      
      if (reset) {
        setAllCompanies(sortedCompanies);
        setFilteredCompanies(sortedCompanies);
      } else {
        // Append new companies and sort again
        const newAllCompanies = [...allCompanies, ...sortedCompanies];
        const reSorted = newAllCompanies.sort((a, b) => {
          if (a.logo_url && !b.logo_url) return -1;
          if (!a.logo_url && b.logo_url) return 1;
          return a.name.localeCompare(b.name);
        });
        setAllCompanies(reSorted);
        setFilteredCompanies(reSorted);
      }
      
      setCompaniesTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      if (reset) {
        setAllCompanies([]);
        setFilteredCompanies([]);
      }
    } finally {
      if (reset) {
        setIsCompaniesLoading(false);
      } else {
        setIsLoadingMoreCompanies(false);
      }
    }
  }, [companiesPage, companiesLimit]);

  // Store allCompanies in a ref to avoid dependency issues
  const allCompaniesRef = useRef<CompanySearchResult[]>([]);
  useEffect(() => { allCompaniesRef.current = allCompanies; }, [allCompanies]);

  // Updated fetchCompanies with ref
  const fetchCompaniesWithRef = useCallback(async (reset: boolean = true) => {
    const offset = reset ? 0 : companiesPage * companiesLimit;
    
    if (reset) {
      setIsCompaniesLoading(true);
      setCompaniesPage(0);
    } else {
      setIsLoadingMoreCompanies(true);
    }
    
    try {
      const response: CompaniesResponse = await companyApi.getCompanies(companiesLimit, offset);
      
      // Sort companies: those with logo_url first, then by name
      const sortedCompanies = [...response.companies].sort((a, b) => {
        // Companies with logos first
        if (a.logo_url && !b.logo_url) return -1;
        if (!a.logo_url && b.logo_url) return 1;
        return a.name.localeCompare(b.name);
      });
      
      if (reset) {
        setAllCompanies(sortedCompanies);
        setFilteredCompanies(sortedCompanies);
      } else {
        // Append new companies and sort again using ref
        const newAllCompanies = [...allCompaniesRef.current, ...sortedCompanies];
        const reSorted = newAllCompanies.sort((a, b) => {
          if (a.logo_url && !b.logo_url) return -1;
          if (!a.logo_url && b.logo_url) return 1;
          return a.name.localeCompare(b.name);
        });
        setAllCompanies(reSorted);
        setFilteredCompanies(reSorted);
      }
      
      setCompaniesTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      if (reset) {
        setAllCompanies([]);
        setFilteredCompanies([]);
      }
    } finally {
      if (reset) {
        setIsCompaniesLoading(false);
      } else {
        setIsLoadingMoreCompanies(false);
      }
    }
  }, [companiesPage, companiesLimit]);

  // Initial fetch of companies on mount
  useEffect(() => {
    fetchCompaniesWithRef(true);
  }, []);
  
  // ─── Fetch recordings ───────────────────────────────────────────────────────
  const fetchRecordings = useCallback(async () => {
    if (!isAuthenticated) { setAllRecordings([]); return; }
    setIsRecordingsLoading(true);
    try {
      const recs = await recordingsApi.getRecordings(50, 0);
      setAllRecordings(recs);
    } catch (err) {
      console.error('Failed to fetch recordings:', err);
      setAllRecordings([]);
    } finally {
      setIsRecordingsLoading(false);
    }
  }, [isAuthenticated]);
  
// Filter streams (companies are now filtered via API)
  useEffect(() => {
    if (!searchQuery.trim()) { 
      setFilteredStreams(streams); 
      return; 
    }
    const q = searchQuery.toLowerCase();
    setFilteredStreams(streams.filter(s =>
      s.company_name.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.company_slug.toLowerCase().includes(q)
    ));
  }, [searchQuery, streams]);
  
useEffect(() => { fetchStreams(); }, [fetchStreams]);
  
  // Initial fetch of companies happens via debounced search effect (searchQuery starts empty)
  
  useEffect(() => {
    if (isAuthenticated) fetchRecordings();
    else setAllRecordings([]);
  }, [isAuthenticated, fetchRecordings]);
  
  // ─── Audio visualization (live stream only) ─────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !analyzerRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const draw = () => {
      if (!analyzerRef.current || !ctx || !canvas) return;
      const bufferLength = analyzerRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzerRef.current.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.6;
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
      const avg = sum / dataArray.length;
      setAudioLevel(avg / 255);
      const barCount = 64;
      const angleStep = (Math.PI * 2) / barCount;
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * (dataArray.length / 2));
        const value = dataArray[dataIndex] || 0;
        const barHeight = (value / 255) * (radius * 0.8) + 4;
        const angle = i * angleStep - Math.PI / 2;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);
        const hue = (i / barCount) * 60 + 180;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.4 + (value / 255) * 0.6})`;
        ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      }
      const pulseScale = 1 + (avg / 255) * 0.15;
      const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3 * pulseScale, centerX, centerY, radius * 0.8 * pulseScale);
      gradient.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.6)');
      gradient.addColorStop(1, 'rgba(236, 72, 153, 0.2)');
      ctx.beginPath(); ctx.arc(centerX, centerY, radius * 0.5 * pulseScale, 0, Math.PI * 2);
      ctx.fillStyle = gradient; ctx.fill();
      animationRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isPlaying]);
  
  // ─── Live stream connection (WebRTC / WHEP) ─────────────────────────────────
  const connectToStream = useCallback(async (stream: ActiveStreamItem) => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const livePageData = await livestreamApi.getCompanyLivePage(stream.company_slug);
      if (!livePageData.livestream?.webrtc_playback_url) {
        setConnectionError('No playback URL available for this stream');
        setIsConnecting(false);
        return;
      }
      const playbackUrl = livePageData.livestream.webrtc_playback_url;
      if (peerConnectionRef.current) peerConnectionRef.current.close();
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }, { urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;
      pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        if (!remoteStream) return;
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          audioContextRef.current = audioCtx;
          const analyzer = audioCtx.createAnalyser();
          analyzer.fftSize = 128;
          analyzer.smoothingTimeConstant = 0.8;
          analyzerRef.current = analyzer;
          const source = audioCtx.createMediaStreamSource(remoteStream);
          source.connect(analyzer);
          sourceRef.current = source;
          const audio = new Audio();
          audio.srcObject = remoteStream;
          audio.volume = volume;
          audio.play().catch(console.error);
          (window as any).__audioEl = audio;
        } catch (err) {
          console.error('Failed to set up audio visualization:', err);
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setIsConnecting(false);
          setIsPlaying(true);
          setIsReconnecting(false);
          reconnectAttemptsRef.current = 0;
          // Stop any polling interval
          if (reconnectIntervalRef.current) {
            clearInterval(reconnectIntervalRef.current);
            reconnectIntervalRef.current = null;
          }
        }
        else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setIsConnecting(false);
          setIsPlaying(false);
          setConnectionError('Connection failed. Attempting to reconnect...');
          // Start polling to check if stream resumed
          startPollingReconnection(stream);
        }
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const response = await fetch(playbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/sdp' }, body: offer.sdp });
      if (!response.ok) throw new Error('Failed to connect to stream');
      const answerSDP = await response.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSDP });
      setCurrentStream(stream);
    } catch (err) {
      const error = err as { status?: number };
      if (error.status === 409) {
        setCreatorNotStreamingInfo({ creatorName: stream.company_name, streamTitle: stream.title });
        setShowCreatorNotStreaming(true);
        setIsConnecting(false);
        return;
      }
      setConnectionError('Failed to connect to stream. Please try again.');
      setIsConnecting(false);
    }
  }, [volume]);
  
  const stopLivePlayback = useCallback(() => {
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (audio) { audio.pause(); audio.srcObject = null; }
    if (peerConnectionRef.current) { peerConnectionRef.current.close(); peerConnectionRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    analyzerRef.current = null;
    sourceRef.current = null;
    setIsPlaying(false);
    setCurrentStream(null);
    setAudioLevel(0);
  }, []);
  
  const toggleLivePlayPause = useCallback(() => {
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(console.error); }
  }, [isPlaying]);
  
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (audio) audio.volume = newVolume;
  }, []);
  
  const toggleMute = useCallback(() => {
    const audio = (window as any).__audioEl as HTMLAudioElement | undefined;
    if (audio) { audio.muted = !isMuted; setIsMuted(!isMuted); }
  }, [isMuted]);

  // Polling reconnection function - checks every 10 seconds if stream has resumed
  const startPollingReconnection = useCallback((stream: ActiveStreamItem) => {
    // Don't start multiple polling intervals
    if (reconnectIntervalRef.current) {
      return;
    }
    
    setIsReconnecting(true);
    reconnectAttemptsRef.current = 0;
    
    console.log('Starting polling reconnection...');
    
    reconnectIntervalRef.current = setInterval(async () => {
      // Stop after max attempts
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.log('Max reconnection attempts reached');
        if (reconnectIntervalRef.current) {
          clearInterval(reconnectIntervalRef.current);
          reconnectIntervalRef.current = null;
        }
        setIsReconnecting(false);
        setConnectionError('Unable to reconnect after multiple attempts. Please try again manually.');
        return;
      }
      
      reconnectAttemptsRef.current++;
      console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
      
      try {
        // Check if stream is still live
        const response = await livestreamApi.getActiveLivestreams(50, 0);
        const streamsArray = (response as ActiveStreamsResponse)?.streams || [];
        const streamStillLive = streamsArray.find(s => s.id === stream.id && s.is_live);
        
        if (streamStillLive) {
          console.log('Stream is live again, attempting to reconnect...');
          
          // Stop polling
          if (reconnectIntervalRef.current) {
            clearInterval(reconnectIntervalRef.current);
            reconnectIntervalRef.current = null;
          }
          
          // Attempt to reconnect
          stopLivePlayback();
          await connectToStream(streamStillLive);
        } else {
          console.log('Stream not yet live, will retry in 10 seconds...');
          setConnectionError(`Stream unavailable. Retrying... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
        }
      } catch (err) {
        console.error('Polling reconnection error:', err);
        setConnectionError(`Reconnection failed. Retrying... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      }
    }, 10000); // Poll every 10 seconds
    
    // Cleanup on unmount
    return () => {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
    };
  }, [connectToStream, stopLivePlayback]);
  
  const handleStreamSelect = useCallback((stream: ActiveStreamItem) => {
    if (currentStream?.id === stream.id) { toggleLivePlayPause(); return; }
    stopLivePlayback();
    connectToStream(stream);
  }, [currentStream, connectToStream, stopLivePlayback, toggleLivePlayPause]);
  
  // ─── Recording selection ────────────────────────────────────────────────────
  // We only manage WHICH recording is active here.
  // RecordingPlayer handles all audio internally.
  const handleRecordingSelect = useCallback((recording: VolRecordingOut) => {
    // Stop live stream if playing
    if (currentStream) stopLivePlayback();
    
    // If clicking the same recording that's already mounted in RecordingPlayer,
    // do nothing — the player handles its own toggle.
    // If clicking a different recording, swap it out.
    if (currentRecording?.id !== recording.id) {
      setCurrentRecording(recording);
    }
  }, [currentStream, currentRecording, stopLivePlayback]);
  
  const handleRecordingClose = useCallback(() => {
    setCurrentRecording(null);
  }, []);
  
  // Cleanup live stream on unmount
  useEffect(() => {
    return () => {
      stopLivePlayback();
      // Cleanup polling interval
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
        reconnectIntervalRef.current = null;
      }
    };
  }, [stopLivePlayback]);

  // Cleanup polling when stream is manually stopped
  useEffect(() => {
    if (!currentStream && reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
      setIsReconnecting(false);
    }
  }, [currentStream]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <CreatorNotStreamingModal
        isOpen={showCreatorNotStreaming}
        onClose={() => setShowCreatorNotStreaming(false)}
        creatorName={creatorNotStreamingInfo?.creatorName || 'The Creator'}
        streamTitle={creatorNotStreamingInfo?.streamTitle}
      />
      
      <Navbar />
      
      {/* Hero */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative container-custom">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500/20 rounded-full text-sky-400 text-sm font-medium mb-6">
              <Headphones className="w-4 h-4" /><span>Live Audio Streaming</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              Listen to Live{' '}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-400 bg-clip-text text-transparent">Audio Streams</span>
            </h1>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              Discover and tune into live audio streams from churches, ministries, and community radio stations from around the world.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search stations, churches, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="flex items-center justify-center gap-8 mt-6 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <RadioReceiver className="w-4 h-4 text-sky-400" />
                <span>{filteredStreams?.length || 0} Live Stations</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{formatViewerCount(filteredStreams?.reduce?.((acc, s) => acc + (s?.viewer_count || 0), 0) || 0)} Listeners</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Recordings Section */}
     
      
      {/* Streams Grid */}
      <section className="px-4 pb-32">
        <div className="container-custom">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => <div key={i} className="animate-pulse bg-slate-800/50 rounded-3xl h-72" />)}
            </div>
          ) : !(filteredStreams?.length > 0) ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Radio className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No stations found</h3>
              <p className="text-slate-400 mb-6">{searchQuery ? 'Try adjusting your search query' : 'No stations are currently live'}</p>
              {!searchQuery && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-slate-500">But there are still {companiesTotal} channels to explore!</p>
                  <Link 
                    href="#browse-channels"
                    className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-full font-medium transition-colors inline-flex items-center gap-2"
                  >
                    <Disc3 className="w-5 h-5" />
                    Browse Channels
                  </Link>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredStreams.map((stream, index) => (
                  <motion.div
                    key={stream.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/${stream.company_slug}`} className="block group">
                      <div className="relative overflow-hidden rounded-3xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-sky-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-sky-500/20">
                        {/* Thumbnail background - priority: thumbnail_url > gradient */}
                        {stream.thumbnail_url ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-90 transition-opacity"
                            style={{ backgroundImage: `url(${stream.thumbnail_url})` }}
                          />
                        ) : (
                          <div className={`absolute inset-0 bg-gradient-to-br ${getGradientForCompany(stream.company_name)} opacity-20 group-hover:opacity-30 transition-opacity`} />
                        )}
                        {stream.is_live && (
                          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-red-500/90 rounded-full text-white text-xs font-medium">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />LIVE
                          </div>
                        )}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-full text-white text-xs font-medium">
                          <Eye className="w-3 h-3" />{formatViewerCount(stream.viewer_count)}
                        </div>
                        <div className="relative p-6 pt-24">
                          <div className="relative w-20 h-20 mx-auto mb-4 -mt-16">
                            <div className={`absolute inset-0 bg-gradient-to-br ${getGradientForCompany(stream.company_name)} rounded-2xl blur-xl opacity-50`} />
                            <div className="relative w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-slate-700/50 group-hover:border-sky-500/50 transition-colors overflow-hidden">
                              {stream.company_logo_url
                                ? <img src={stream.company_logo_url} alt={stream.company_name} className="w-full h-full object-cover" />
                                : <Radio className="w-8 h-8 text-slate-400" />}
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-white text-center mb-1 group-hover:text-sky-400 transition-colors">{stream.company_name}</h3>
                          <p className="text-sm text-slate-400 text-center mb-3 line-clamp-1">{stream.title}</p>
                          <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Waves className="w-3 h-3" />{formatTimeSince(stream.started_at)}</span>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 transform scale-0 group-hover:scale-100 transition-transform duration-300">
                              <Play className="w-7 h-7 text-white ml-1" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
      
      {/* Browse Channels Section - All companies even if not live */}
      <section id="browse-channels" className="px-4 pb-32">
        <div className="container-custom">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Disc3 className="w-5 h-5 text-violet-400" />
              <h2 className="text-2xl font-bold text-white">Browse Channels</h2>
              <span className="text-sm text-slate-400">({companiesTotal} channels)</span>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              Explore all channels and subscribe to get notified when they go live
            </p>
            
            {isCompaniesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-slate-800/50 rounded-2xl h-40" />
                ))}
              </div>
            ) : filteredCompanies.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <Disc3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">{searchQuery ? 'No channels found' : 'No channels available'}</p>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {filteredCompanies.slice(0, 24).map((company, index) => (
                    <motion.div
                      key={company.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link href={`/${company.slug}`} className="block group">
                        <div className="relative overflow-hidden rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-violet-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/20 p-4 text-center">
                          {/* Logo */}
                          <div className="relative w-16 h-16 mx-auto mb-3">
                            <div className={`absolute inset-0 bg-gradient-to-br ${getGradientForCompany(company.name)} rounded-xl blur-xl opacity-40`} />
                            <div className="relative w-16 h-16 bg-slate-800 rounded-xl flex items-center justify-center border-2 border-slate-700/50 group-hover:border-violet-500/50 transition-colors overflow-hidden">
                              {company.logo_url ? (
                                <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                              ) : (
                                <Radio className="w-6 h-6 text-slate-400" />
                              )}
                            </div>
                          </div>
                          <h3 className="text-sm font-semibold text-white group-hover:text-violet-400 transition-colors line-clamp-1">{company.name}</h3>
                          {company.subscriber_count > 0 && (
                            <p className="text-xs text-slate-500 mt-1">{company.subscriber_count.toLocaleString()} subscribers</p>
                          )}
                          {company.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{company.description}</p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                
                {allCompanies.length < companiesTotal && (
                  <div className="flex justify-center mt-6">
                    <button
                      onClick={() => {
                        setCompaniesPage(prev => prev + 1);
                        fetchCompaniesWithRef(false);
                      }}
                      disabled={isLoadingMoreCompanies}
                      className="px-6 py-2 rounded-full border border-slate-700 hover:border-violet-500 text-slate-400 hover:text-violet-400 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isLoadingMoreCompanies ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-slate-400/30 border-t-violet-400 rounded-full animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        `Load More (${companiesTotal - allCompanies.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </section>
      
      {/* Live Stream Player - Fixed Bottom */}
      <AnimatePresence>
        {currentStream && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50"
          >
            <div className="absolute -top-24 left-0 right-0 h-24 pointer-events-none">
              <canvas ref={canvasRef} width={400} height={96} className="w-full h-full" />
            </div>
            <div className="container-custom py-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                  <div className={`relative w-14 h-14 bg-gradient-to-br ${getGradientForCompany(currentStream.company_name)} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    {currentStream.company_logo_url
                      ? <img src={currentStream.company_logo_url} alt={currentStream.company_name} className="w-full h-full object-cover rounded-xl" />
                      : <Radio className="w-6 h-6 text-white" />}
                    {isPlaying && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-white font-semibold truncate">{currentStream.company_name}</h4>
                    <p className="text-sm text-slate-400 truncate">{currentStream.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mx-auto">
                  <button onClick={toggleLivePlayPause} disabled={isConnecting} className="w-12 h-12 bg-sky-500 hover:bg-sky-600 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50">
                    {isConnecting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={toggleMute} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input type="range" min="0" max="1" step="0.1" value={isMuted ? 0 : volume} onChange={(e) => handleVolumeChange(parseFloat(e.target.value))} className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-400 flex-shrink-0">
                  <Eye className="w-4 h-4" />{formatViewerCount(currentStream.viewer_count)}
                </div>
                <button onClick={stopLivePlayback} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {connectionError && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute -top-12 left-0 right-0 flex items-center justify-center">
                  <div className="px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-full text-red-400 text-sm">{connectionError}</div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Player — stable mount: only unmounts when currentRecording is null */}
      <AnimatePresence>
        {currentRecording && (
          <RecordingPlayer
            key={currentRecording.id}   // remount ONLY when a different recording is selected
            recording={currentRecording}
            onClose={handleRecordingClose}
            onCompleted={fetchRecordings}
          />
        )}
      </AnimatePresence>
      
      <div className={(currentStream || currentRecording) ? 'pb-32' : ''}>
        <Footer />
      </div>
    </div>
  );
}