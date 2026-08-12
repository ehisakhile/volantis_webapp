"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play, ArrowLeft, ListMusic, Music, Film, Clock, Repeat1
} from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { playlistsApi, PlaylistOut, PlaylistMediaItemOut } from '@/lib/api/playlists';
import AudioPlayer from '@/components/media/AudioPlayer';
import VideoPlayer from '@/components/media/VideoPlayer';
import { isVideoRecording } from '@/lib/media';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-dev.volantislive.com';

function resolveUrl(url: string | null): string {
  if (!url) return '';
  const absolute = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${API_BASE_URL}${url}`;
  // Proxy media through the same-origin /media-proxy route so the browser
  // never makes cross-origin range requests (206 responses) that S3/CDN
  // block via CORS.
  return `/media-proxy?url=${encodeURIComponent(absolute)}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function totalDuration(items: PlaylistMediaItemOut[]): number {
  return items.reduce((sum, item) => sum + (item.duration_seconds || 0), 0);
}

function isVideoItem(item: PlaylistMediaItemOut | null): boolean {
  if (!item) return false;
  return isVideoRecording({ s3_url: item.s3_url });
}

export default function PublicPlaylistPage() {
  const params = useParams();
  const companySlug = params.companySlug as string;
  const playlistId = parseInt(params.playlistId as string, 10);

  const [playlist, setPlaylist] = useState<PlaylistOut | null>(null);
  const [items, setItems] = useState<PlaylistMediaItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Only non-skipped items are part of the playback queue
  const queue = items.filter(item => !item.is_skipped);
  const currentItem = queue[currentIndex] || null;

  useEffect(() => {
    if (!playlistId) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [playlistData, mediaData] = await Promise.all([
          playlistsApi.getPlaylistPublic(playlistId),
          playlistsApi.getPlaylistMediaPublic(playlistId),
        ]);
        setPlaylist(playlistData);
        setItems(mediaData.media);
      } catch (err: unknown) {
        console.error('Failed to load playlist:', err);
        setError('Playlist not found or not available');
      } finally {
        setLoading(false);
      }
    })();
  }, [playlistId]);

  const playIndex = useCallback((index: number) => {
    if (index < 0 || index >= queue.length) return;
    setCurrentIndex(index);
    setIsPlaying(true);
  }, [queue.length]);

  const handleEnded = useCallback(() => {
    if (queue.length === 0) return;
    if (currentIndex < queue.length - 1) {
      playIndex(currentIndex + 1);
    } else if (playlist?.loop_enabled) {
      playIndex(0);
    } else {
      setIsPlaying(false);
      setCurrentIndex(0);
    }
  }, [queue.length, currentIndex, playlist?.loop_enabled, playIndex]);

  const currentSrc = resolveUrl(currentItem?.s3_url || currentItem?.streaming_url);
  const showVideo = isVideoItem(currentItem);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 pt-24 text-center">
          <ListMusic className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold">{error || 'Playlist not found'}</h1>
          <Link
            href={`/${companySlug}`}
            className="mt-4 inline-flex items-center gap-2 text-violet-400 hover:text-violet-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {companySlug}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Header */}
      <div className="relative border-b border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 via-transparent to-fuchsia-900/20" />
        <div className="relative max-w-5xl mx-auto px-6 pt-10 pb-8">
          <Link
            href={`/${companySlug}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-violet-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to channel
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {playlist.cover_image_url ? (
              <img
                src={playlist.cover_image_url}
                alt={playlist.name}
                className="w-40 h-40 rounded-2xl object-cover shadow-2xl shadow-violet-500/20 flex-shrink-0"
              />
            ) : (
              <div className="w-40 h-40 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center shadow-2xl shadow-violet-500/20 flex-shrink-0">
                <ListMusic className="w-16 h-16 text-white/80" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold mb-2">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-slate-400 mb-4">{playlist.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <ListMusic className="w-4 h-4" />
                  {queue.length} track{queue.length === 1 ? '' : 's'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatDuration(totalDuration(queue))}
                </span>
                {playlist.loop_enabled && (
                  <span className="flex items-center gap-1.5 text-violet-400">
                    <Repeat1 className="w-4 h-4" />
                    Loop
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Now playing player */}
        {currentItem && currentSrc ? (
          <div className="mb-10">
            {showVideo ? (
              <div className="max-w-3xl mx-auto">
                <VideoPlayer
                  src={currentSrc}
                  poster={currentItem.thumbnail_url}
                  title={currentItem.title || 'Now playing'}
                  autoPlay
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={handleEnded}
                />
                <p className="mt-2 text-center text-slate-400 text-sm">
                  {currentItem.title || 'Now playing'}
                </p>
              </div>
            ) : (
              <AudioPlayer
                src={currentSrc}
                title={currentItem.title || 'Now playing'}
                thumbnailUrl={currentItem.thumbnail_url}
                accent="violet"
                autoPlay
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={handleEnded}
                className="max-w-2xl mx-auto"
              />
            )}
          </div>
        ) : queue.length > 0 ? (
          <div className="mb-10 text-center">
            <button
              onClick={() => playIndex(0)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
            >
              <Play className="w-5 h-5" />
              Start Playing
            </button>
          </div>
        ) : null}

        {/* Track list */}
        {queue.length === 0 ? (
          <div className="text-center py-16">
            <ListMusic className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">This playlist has no media yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
              Tracks
            </h2>
            {queue.map((item, index) => {
              const active = index === currentIndex;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    if (!active) playIndex(index);
                  }}
                  whileHover={{ x: 4 }}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-colors text-left ${
                    active
                      ? 'border-violet-500/50 bg-violet-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-violet-500/30'
                  }`}
                >
                  <div className="w-10 flex-shrink-0 text-center">
                    {active && isPlaying ? (
                      <span className="flex gap-[3px] items-center justify-center h-4">
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="w-1 rounded-full bg-violet-400"
                            animate={{ height: [4, 14, 6, 14] }}
                            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </span>
                    ) : (
                      <Play className="w-4 h-4 text-slate-400 mx-auto" />
                    )}
                  </div>

                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title || ''} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                      {item.media_type === 'telegram' && (item.media_subtype === 'audio' || item.media_subtype === 'voice') ? (
                        <Music className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Film className="w-5 h-5 text-violet-400" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${active ? 'text-violet-300' : 'text-slate-200'}`}>
                      {item.title || `Track ${index + 1}`}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="capitalize">{item.media_type}</span>
                      {item.media_subtype && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{isVideoRecording({ s3_url: item.s3_url }) ? 'Video' : 'Audio'}</span>
                        </>
                      )}
                    </p>
                  </div>

                  <span className="text-sm text-slate-500 flex-shrink-0">{formatDuration(item.duration_seconds)}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
