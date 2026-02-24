"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Users, Play, X, ChevronRight } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { StreamCard } from '@/components/streaming/stream-card';
import { AudioPlayer } from '@/components/streaming/audio-player';
import { livestreamApi } from '@/lib/api/livestream';
import { useWebRTC } from '@/hooks/useWebRTC';
import type { VolLivestreamOut } from '@/types/livestream';
import type { VolCompanyResponse } from '@/types/company';

export default function CompanyPage() {
  const params = useParams();
  const slug = params?.slug as string;
  
  // Company and stream state
  const [company, setCompany] = useState<VolCompanyResponse | null>(null);
  const [streams, setStreams] = useState<VolLivestreamOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Currently playing stream
  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // WebRTC playback
  const {
    remoteStream,
    connectionState,
    startPlayback,
    stop: stopPlayback,
    retryConnection,
  } = useWebRTC();
  
  // Fetch company and streams
  const fetchData = useCallback(async () => {
    if (!slug) return;
    
    setIsLoading(true);
    
    try {
      // For now, fetch livestreams (would need a public company endpoint)
      const allStreams = await livestreamApi.getCompanyLivestreams(50, 0);
      
      // Filter by slug or just show all for demo
      const companyStreams = allStreams.filter(s => 
        s.slug.includes(slug) || slug.includes(s.company_id.toString())
      );
      
      setStreams(companyStreams);
      
      // Demo: create a mock company if none found
      if (companyStreams.length > 0) {
        setCompany({
          id: companyStreams[0].company_id,
          name: companyStreams[0].created_by_username || 'Demo Streamer',
          slug: slug,
          description: 'Audio streaming channel',
          email: 'demo@example.com',
          logo_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      } else {
        // Create demo company for testing
        setCompany({
          id: 1,
          name: slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          slug: slug,
          description: 'Live audio streaming',
          email: 'demo@example.com',
          logo_url: null,
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      // Demo data for testing
      setCompany({
        id: 1,
        name: slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        slug: slug,
        description: 'Live audio streaming',
        email: 'demo@example.com',
        logo_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [slug]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Get live streams and recordings
  const liveStreams = streams.filter(s => s.is_active);
  const recordedStreams = streams.filter(s => !s.is_active && s.recording_url);
  
  // Handle play stream
  const handlePlayStream = async (stream: VolLivestreamOut) => {
    if (!stream.cf_webrtc_playback_url) {
      // Demo mode - use a placeholder
      setCurrentStream(stream);
      setIsPlaying(true);
      return;
    }
    
    setCurrentStream(stream);
    await startPlayback(stream.cf_webrtc_playback_url);
    setIsPlaying(true);
  };
  
  // Handle stop playback
  const handleStopPlayback = () => {
    stopPlayback();
    setIsPlaying(false);
    setCurrentStream(null);
  };
  
  // Handle retry connection
  const handleRetry = () => {
    retryConnection();
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-sky-500">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Company Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center gap-4 mb-4">
              {/* Logo placeholder */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center text-2xl font-bold text-white">
                {company?.name?.[0]?.toUpperCase() || '?'}
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-white">{company?.name || 'Loading...'}</h1>
                {company?.description && (
                  <p className="text-slate-400 mt-1">{company.description}</p>
                )}
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                {liveStreams.length} Live
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {liveStreams.reduce((sum, s) => sum + s.viewer_count, 0)} watching
              </span>
            </div>
          </motion.div>
          
          {/* Live Now Section */}
          {liveStreams.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Now
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveStreams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    variant="live"
                    onClick={() => handlePlayStream(stream)}
                  />
                ))}
              </div>
            </motion.section>
          )}
          
          {/* Past Broadcasts Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-slate-400" />
              Past Broadcasts
            </h2>
            
            {recordedStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recordedStreams.map((stream) => (
                  <StreamCard
                    key={stream.id}
                    stream={stream}
                    variant="recording"
                    onClick={() => handlePlayStream(stream)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <Radio className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400">No past broadcasts yet</p>
                {liveStreams.length === 0 && (
                  <p className="text-slate-500 text-sm mt-2">
                    This channel is currently offline
                  </p>
                )}
              </div>
            )}
          </motion.section>
        </div>
      </main>
      
      {/* Play Modal */}
      <AnimatePresence>
        {isPlaying && currentStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4"
          >
            {/* Close button */}
            <button
              onClick={handleStopPlayback}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            
            <div className="w-full max-w-2xl">
              {/* Stream info */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-bold text-white">{currentStream.title}</h2>
                <p className="text-slate-400 mt-2">
                  {currentStream.description || 'Live audio stream'}
                </p>
              </motion.div>
              
              {/* Audio Player */}
              <AudioPlayer
                stream={remoteStream}
                title={currentStream.title}
                connectionState={connectionState}
                isPlaying={isPlaying}
                onRetry={handleRetry}
              />
              
              {/* Share info */}
              <div className="mt-8 text-center">
                <p className="text-slate-500 text-sm">
                  Listening to {company?.name}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
