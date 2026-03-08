"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play, Pause, Volume2, VolumeX, Clock, SkipBack, SkipForward, 
  ArrowLeft, Share2, Heart, X, Users, Calendar, ChevronRight,
  Radio, History, Check, Copy
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { recordingsApi, type RecordingStatsResponse } from '@/lib/api/recordings';
import type { VolRecordingOut, VolRecordingWithReplayOut } from '@/types/livestream';

const API_BASE_URL = 'https://api-dev.volantislive.com';

function AudioVisualizer({ isActive, isMuted }: { isActive: boolean; isMuted: boolean }) {
  const bars = 48;
  return (
    <div className="flex items-end justify-center gap-[2px] h-16 w-full px-4">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 max-w-2 rounded-full origin-bottom"
          style={{ 
            background: isMuted 
              ? 'rgba(245, 158, 11, 0.3)' 
              : 'linear-gradient(to top, #f59e0b, #f97316)',
            opacity: isActive && !isMuted ? 1 : 0.2
          }}
          animate={isActive && !isMuted ? {
            scaleY: [0.1, Math.random() * 0.8 + 0.2, Math.random() * 0.6 + 0.3, 0.1],
          } : { scaleY: 0.08 }}
          transition={isActive && !isMuted ? {
            duration: 0.6 + Math.random() * 0.4,
            repeat: Infinity,
            delay: i * 0.02,
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
          className="absolute rounded-full border border-amber-400/30"
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

function RecordingCard({
  recording,
  isActive,
  onClick,
}: {
  recording: VolRecordingOut;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left group relative overflow-hidden rounded-2xl bg-slate-800/50 border transition-all duration-300 ${
        isActive 
          ? 'border-amber-500/50 shadow-lg shadow-amber-500/20' 
          : 'border-slate-700/50 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/20'
      }`}
    >
      {recording.thumbnail_url ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-90 transition-opacity"
          style={{ backgroundImage: `url(${recording.thumbnail_url})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600 via-orange-500 to-rose-600 opacity-20 group-hover:opacity-30 transition-opacity" />
      )}
      
      {isActive && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/90 rounded-full text-white text-xs font-medium z-10">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          PLAYING
        </div>
      )}
      
      <div className="relative p-4 pt-20">
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
        
        <h3 className="text-base font-semibold text-white mb-1 line-clamp-1 group-hover:text-amber-400 transition-colors">
          {recording.title}
        </h3>
        
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{new Date(recording.created_at).toLocaleDateString()}</span>
          {recording.duration_seconds && (
            <span>{Math.floor(recording.duration_seconds / 60)}:{(recording.duration_seconds % 60).toString().padStart(2, '0')}</span>
          )}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 transform scale-0 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export default function RecordingPage() {
  const params = useParams();
  const companySlug = params?.companySlug as string;
  const recordingId = params?.recordingId as string;
  
  const router = useRouter();
  
  const [recording, setRecording] = useState<VolRecordingOut | null>(null);
  const [playbackData, setPlaybackData] = useState<VolRecordingWithReplayOut | null>(null);
  const [recommendations, setRecommendations] = useState<VolRecordingOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const positionUpdateRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRecording = useCallback(async () => {
    if (!companySlug || !recordingId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const recId = parseInt(recordingId, 10);
      if (isNaN(recId)) {
        throw new Error('Invalid recording ID');
      }
      
      const playback = await recordingsApi.getRecordingForPlayback(recId);
      setPlaybackData(playback);
      setRecording(playback);
      setDuration(playback.duration_seconds || 0);
      
      const recs = await recordingsApi.getRecordingsByCompany(companySlug, 50, 0);
      const otherRecordings = recs.filter(r => r.id !== recId).slice(0, 6);
      
      const recsWithStats = await Promise.all(
        otherRecordings.map(async (rec) => {
          try {
            const stats: RecordingStatsResponse = await recordingsApi.getRecordingStats(rec.id);
            return { ...rec, replay_count: stats.replay_count };
          } catch {
            return { ...rec, replay_count: 0 };
          }
        })
      );
      
      setRecommendations(recsWithStats);
    } catch (err) {
      console.error('Failed to load recording:', err);
      setError('Recording not found or unavailable');
    } finally {
      setIsLoading(false);
    }
  }, [companySlug, recordingId]);

  useEffect(() => {
    fetchRecording();
  }, [fetchRecording]);

  useEffect(() => {
    if (!playbackData?.streaming_url) return;
    
    let isMounted = true;
    
    const initAudio = async () => {
      try {
        setIsLoadingAudio(true);
        
        let fullUrl = playbackData.streaming_url;
        if (fullUrl && !fullUrl.startsWith('http')) {
          fullUrl = `${API_BASE_URL}${fullUrl}`;
        }
        
        const audio = new Audio();
        audioRef.current = audio;
        audio.crossOrigin = 'anonymous';
        audio.src = fullUrl;
        audio.volume = volume;
        
        audio.onloadedmetadata = () => {
          if (!isMounted) return;
          setDuration(audio.duration);
          setIsLoadingAudio(false);
        };
        
        audio.oncanplay = () => { if (isMounted) setIsBuffering(false); };
        audio.onwaiting = () => { if (isMounted) setIsBuffering(true); };
        
        audio.onplay = () => { if (isMounted) setIsPlaying(true); };
        audio.onpause = () => { if (isMounted) setIsPlaying(false); };
        
        audio.ontimeupdate = () => {
          if (!isMounted || !audio) return;
          setCurrentTime(audio.currentTime);
          if (audio.buffered.length > 0) {
            setBuffered(audio.buffered.end(audio.buffered.length - 1));
          }
        };
        
        audio.onended = async () => {
          if (!isMounted) return;
          setIsPlaying(false);
          try {
            await recordingsApi.markRecordingCompleted(parseInt(recordingId, 10));
          } catch (err) {
            console.error('Failed to mark completed:', err);
          }
        };
        
        audio.onerror = () => {
          if (!isMounted) return;
          setError('Failed to load audio');
          setIsLoadingAudio(false);
        };
        
        const handleCanPlay = () => {
          audio.removeEventListener('canplay', handleCanPlay);
          if (!isMounted) return;
          audio.play().catch(() => {
            setIsLoadingAudio(false);
          });
        };
        audio.addEventListener('canplay', handleCanPlay);
        
      } catch (err) {
        if (isMounted) {
          setError('Failed to initialize player');
          setIsLoadingAudio(false);
        }
      }
    };
    
    initAudio();
    
    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [playbackData?.streaming_url, recordingId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push(`/${companySlug}`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [companySlug, router]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(console.error);
  }, [isPlaying]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) audioRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    audioRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, []);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRecommendationClick = (recId: number) => {
    router.push(`/${companySlug}/recording/${recId}`);
  };

  const handleShare = useCallback(async () => {
    const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://volantislive.com'}/${companySlug}/recording/${recordingId}`;
    const shareData = {
      title: recording?.title || 'Recording',
      text: recording?.description || `Listen to ${recording?.title} on Volantis`,
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareUrl);
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (clipErr) {
        console.error('Failed to copy:', clipErr);
      }
    }
  }, [companySlug, recordingId, recording]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  useEffect(() => {
    if (!recording) return;
    
    document.title = `${recording.title} | Volantis`;
    
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
    
    const description = recording.description || `Listen to ${recording.title} on Volantis`;
    updateMetaTag('description', description);
    updateMetaTag('og:title', recording.title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:type', 'video', true);
    updateMetaTag('og:url', `${typeof window !== 'undefined' ? window.location.origin : 'https://volantislive.com'}/${companySlug}/recording/${recordingId}`, true);
    if (recording.thumbnail_url) {
      updateMetaTag('og:image', recording.thumbnail_url, true);
    }
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', recording.title);
    updateMetaTag('twitter:description', description);
    if (recording.thumbnail_url) {
      updateMetaTag('twitter:image', recording.thumbnail_url);
    }
  }, [recording, companySlug, recordingId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-500"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-slate-500 text-sm tracking-widest uppercase">Loading Recording</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Recording not found'}</p>
          <Link href={`/${companySlug}`} className="text-sky-400 hover:text-sky-300">
            Go back to channel
          </Link>
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
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.3); border-radius: 2px; }
      `}</style>

      <GrainOverlay />

      <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #030712 0%, #060c1e 50%, #03060f 100%)' }}>
        <Navbar />

        <main className="pt-20 pb-32">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Link 
                href={`/${companySlug}`}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to {recording.company_name || companySlug}</span>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
              style={{ background: 'linear-gradient(160deg, rgba(15,23,42,0.95) 0%, rgba(8,14,28,0.98) 100%)' }}
            >
              <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" />

              <div className="p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-slate-800">
                    {recording.thumbnail_url ? (
                      <img src={recording.thumbnail_url} alt={recording.title} className="w-full h-full object-cover" />
                    ) : recording.company_logo_url ? (
                      <img src={recording.company_logo_url} alt={recording.company_name || 'Company'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-white mb-1">{recording.title}</h1>
                    {recording.description && (
                      <p className="text-slate-400 text-sm line-clamp-2">{recording.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(recording.created_at).toLocaleDateString()}
                      </span>
                      {recording.duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(recording.duration_seconds / 60)}:{(recording.duration_seconds % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                      {playbackData?.replay_count !== undefined && playbackData.replay_count > 0 && (
                        <span className="flex items-center gap-1 text-amber-400/70">
                          <Users className="w-3 h-3" />
                          {playbackData.replay_count.toLocaleString()} plays
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setLiked(l => !l)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                        liked
                          ? 'bg-rose-500/30 border-rose-500/50 text-rose-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-rose-400'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleShare}
                      className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-sky-400 transition-colors"
                    >
                      {showCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden mb-6" style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.04) 0%, rgba(139,92,246,0.04) 100%)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                  
                  <div className="relative py-8 flex flex-col items-center justify-center">
                    <div className="relative mb-4">
                      <PulseRings isActive={isPlaying && !isMuted} />
                      <motion.div
                        className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-2xl"
                        animate={isPlaying ? { scale: [1, 1.05, 1], boxShadow: ['0 0 20px rgba(245,158,11,0.3)', '0 0 40px rgba(245,158,11,0.6)', '0 0 20px rgba(245,158,11,0.3)'] } : {}}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        {isLoadingAudio ? (
                          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="w-8 h-8 text-white" />
                        ) : (
                          <Play className="w-8 h-8 text-white ml-1" />
                        )}
                      </motion.div>
                    </div>
                    
                    <AudioVisualizer isActive={isPlaying} isMuted={isMuted} />
                    
                    {isLoadingAudio && (
                      <p className="text-slate-500 text-sm mt-2">Loading audio...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <button onClick={toggleMute} disabled={isLoadingAudio} className="text-slate-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-50">
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="relative flex-1 h-2 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                    <div className="absolute h-full bg-white/20 transition-all" style={{ width: `${bufferedPercent}%` }} />
                    <div className="absolute h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all" style={{ width: `${progressPercent}%` }} />
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      disabled={isLoadingAudio}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
                    />
                  </div>
                  <span className="text-slate-500 text-xs mono w-16 text-right">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center justify-center gap-4 mt-4">
                  <button onClick={() => skip(-10)} disabled={isLoadingAudio} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50">
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    disabled={isLoadingAudio}
                    className="w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25"
                  >
                    {isLoadingAudio || isBuffering ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-0.5" />
                    )}
                  </button>
                  <button onClick={() => skip(10)} disabled={isLoadingAudio} className="w-10 h-10 text-slate-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-50">
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="text-slate-500 text-xs">Volume</span>
                  <input
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    disabled={isLoadingAudio}
                    className="w-20 h-1 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {recommendations.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-16"
              >
                <div className="flex items-center gap-3 mb-6">
                  <Radio className="w-4 h-4 text-amber-400" />
                  <h2 className="text-lg font-bold text-white uppercase tracking-widest">Listen to Other Livestreams</h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                    >
                      <RecordingCard
                        recording={rec}
                        onClick={() => handleRecommendationClick(rec.id)}
                      />
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center mt-8">
                  <Link
                    href={`/${companySlug}`}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 text-sm font-semibold transition-all"
                  >
                    View All Recordings
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
