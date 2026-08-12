'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import {
  playlistsApi,
  PlaylistOut,
  PlaylistMediaItemOut,
} from '@/lib/api/playlists';
import { recordingsApi } from '@/lib/api/recordings';
import { telegramApi, TelegramMediaItem } from '@/lib/api/telegram';
import type { VolRecordingOut } from '@/types/livestream';
import {
  LogOut, Play, Settings, Plug, ArrowLeft, Plus, Trash2, Loader2,
  ChevronUp, ChevronDown, ImagePlus, Save, Globe, EyeOff, Music,
  Film, X, CheckCircle2, Circle, MessageCircle, ListMusic
} from 'lucide-react';

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function PlaylistDetailPage() {
  const params = useParams();
  const playlistId = parseInt(params.playlistId as string, 10);
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [playlist, setPlaylist] = useState<PlaylistOut | null>(null);
  const [media, setMedia] = useState<PlaylistMediaItemOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Cover upload
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Media management
  const [busyMediaId, setBusyMediaId] = useState<number | null>(null);

  // Add media modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<'recordings' | 'telegram'>('recordings');
  const [recordings, setRecordings] = useState<VolRecordingOut[]>([]);
  const [telegramMedia, setTelegramMedia] = useState<TelegramMediaItem[]>([]);
  const [loadingAddMedia, setLoadingAddMedia] = useState(false);
  const [selectedRecordings, setSelectedRecordings] = useState<Set<number>>(new Set());
  const [selectedTelegram, setSelectedTelegram] = useState<Set<number>>(new Set());
  const [addingMedia, setAddingMedia] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [isAuthenticated, isLoading, router, user]);

  const fetchAll = useCallback(async () => {
    if (!playlistId) return;
    setLoading(true);
    setError(null);
    try {
      const [playlistData, mediaData] = await Promise.all([
        playlistsApi.getPlaylist(playlistId),
        playlistsApi.getPlaylistMedia(playlistId),
      ]);
      setPlaylist(playlistData);
      setName(playlistData.name);
      setDescription(playlistData.description || '');
      setLoopEnabled(playlistData.loop_enabled);
      setIsActive(playlistData.is_active);
      setMedia(mediaData.media);
    } catch (err: unknown) {
      console.error('Failed to load playlist:', err);
      setError('Failed to load playlist');
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    if (isAuthenticated && playlistId) {
      fetchAll();
    }
  }, [isAuthenticated, playlistId, fetchAll]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleSave = async () => {
    if (!playlist) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const response = await playlistsApi.updatePlaylist(playlist.id, {
        name: name.trim(),
        description: description.trim() || null,
        loop_enabled: loopEnabled,
        is_active: isActive,
      });
      setPlaylist(response.playlist);
      setSaveMessage('Playlist saved');
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: unknown) {
      console.error('Failed to save playlist:', err);
      setSaveMessage('Failed to save playlist');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!playlist) return;
    setCoverUploading(true);
    try {
      const response = await playlistsApi.uploadCover(playlist.id, file);
      setPlaylist(response.playlist);
    } catch (err: unknown) {
      console.error('Failed to upload cover:', err);
      alert('Failed to upload cover image');
    } finally {
      setCoverUploading(false);
    }
  };

  const moveItem = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= media.length) return;
    const next = [...media];
    const a = next[index];
    const b = next[target];
    next[index] = b;
    next[target] = a;
    const items = next.map((item, i) => ({ id: item.id, position: i + 1 }));
    setMedia(next);
    setBusyMediaId(a.id);
    try {
      const response = await playlistsApi.reorderMedia(playlistId, items);
      setMedia(response.media);
    } catch (err: unknown) {
      console.error('Failed to reorder media:', err);
      await fetchAll();
    } finally {
      setBusyMediaId(null);
    }
  };

  const toggleSkip = async (item: PlaylistMediaItemOut) => {
    setBusyMediaId(item.id);
    try {
      const response = await playlistsApi.updateMediaItem(playlistId, item.id, {
        is_skipped: !item.is_skipped,
      });
      setMedia(response.media);
    } catch (err: unknown) {
      console.error('Failed to update media item:', err);
    } finally {
      setBusyMediaId(null);
    }
  };

  const removeItem = async (item: PlaylistMediaItemOut) => {
    if (!confirm(`Remove "${item.title || 'this item'}" from the playlist?`)) return;
    setBusyMediaId(item.id);
    try {
      await playlistsApi.removeMedia(playlistId, item.id);
      await fetchAll();
    } catch (err: unknown) {
      console.error('Failed to remove media:', err);
    } finally {
      setBusyMediaId(null);
    }
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    setAddTab('recordings');
    setSelectedRecordings(new Set());
    setSelectedTelegram(new Set());
    setLoadingAddMedia(true);
    try {
      const [recs, tgMedia] = await Promise.all([
        recordingsApi.getRecordings(100, 0),
        telegramApi.getCompanyMedia(100, 0),
      ]);
      setRecordings(recs);
      setTelegramMedia(tgMedia.media);
    } catch (err: unknown) {
      console.error('Failed to load available media:', err);
    } finally {
      setLoadingAddMedia(false);
    }
  };

  const toggleSelectRecording = (id: number) => {
    setSelectedRecordings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectTelegram = (id: number) => {
    setSelectedTelegram(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const items: { media_type: 'recording' | 'telegram'; media_id: number }[] = [];
    selectedRecordings.forEach(id => items.push({ media_type: 'recording', media_id: id }));
    selectedTelegram.forEach(id => items.push({ media_type: 'telegram', media_id: id }));
    if (items.length === 0) return;

    setAddingMedia(true);
    try {
      await playlistsApi.addMediaBulk(playlistId, items);
      setShowAddModal(false);
      await fetchAll();
    } catch (err: unknown) {
      console.error('Failed to add media:', err);
      alert('Failed to add media to playlist');
    } finally {
      setAddingMedia(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const menuItems = [
    { icon: Play, label: 'Go Live', href: '/creator/stream', color: 'bg-red-500' },
    { icon: Plug, label: 'Integrations', href: '/dashboard/integrations', color: 'bg-indigo-500' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', color: 'bg-slate-500' },
  ];

  const alreadyInPlaylist = new Set(media.map(m => `${m.media_type}:${m.media_id}`));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <Container>
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      <main className="py-8">
        <Container>
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-600 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Integrations
          </Link>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
            </div>
          ) : error || !playlist ? (
            <div className="text-center py-20">
              <p className="text-slate-500">{error || 'Playlist not found'}</p>
              <Link href="/dashboard/integrations" className="mt-3 inline-block text-sm text-purple-600 hover:text-purple-700">
                Back to Integrations
              </Link>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar */}
              <div className="lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-xl border border-slate-200 p-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        item.label === 'Integrations'
                          ? 'bg-sky-50 text-sky-600'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${item.color.replace('bg-', 'text-')}`} />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-6">
                {/* Details card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <h1 className="text-xl font-bold text-slate-900 mb-6">Manage Playlist</h1>
                  <div className="flex flex-col sm:flex-row gap-6">
                    {/* Cover */}
                    <div className="flex-shrink-0">
                      <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        {playlist.cover_image_url ? (
                          <img src={playlist.cover_image_url} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600">
                            <ListMusic className="w-12 h-12 text-white/80" />
                          </div>
                        )}
                        {coverUploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => coverInputRef.current?.click()}
                        disabled={coverUploading}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ImagePlus className="w-4 h-4" />
                        Upload Cover
                      </button>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCoverUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {/* Form */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 cursor-pointer">
                          <div>
                            <p className="text-sm font-medium text-slate-700">Loop playback</p>
                            <p className="text-xs text-slate-500">Repeat when finished</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={loopEnabled}
                            onChange={(e) => setLoopEnabled(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                        </label>
                        <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 cursor-pointer">
                          <div>
                            <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                              {isActive ? <Globe className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                              {isActive ? 'Public' : 'Hidden'}
                            </p>
                            <p className="text-xs text-slate-500">Visible on your channel page</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Save Changes
                        </button>
                        {saveMessage && (
                          <span className={`text-sm ${saveMessage === 'Playlist saved' ? 'text-green-600' : 'text-red-600'}`}>
                            {saveMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Media card */}
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Media Items</h2>
                      <p className="text-sm text-slate-500">{media.length} items in this playlist</p>
                    </div>
                    <button
                      onClick={openAddModal}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Media
                    </button>
                  </div>

                  <div className="p-6">
                    {media.length === 0 ? (
                      <div className="text-center py-10">
                        <ListMusic className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No media in this playlist yet</p>
                        <p className="text-sm text-slate-400">Add recordings or Telegram media (audio &amp; video)</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {media.map((item, index) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                              item.is_skipped ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {item.thumbnail_url ? (
                              <img src={item.thumbnail_url} alt={item.title || ''} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {item.media_type === 'telegram' ? (
                                  item.media_subtype === 'audio' || item.media_subtype === 'voice' ? (
                                    <Music className="w-5 h-5 text-blue-500" />
                                  ) : (
                                    <Film className="w-5 h-5 text-blue-500" />
                                  )
                                ) : (
                                  <Film className="w-5 h-5 text-purple-500" />
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {item.title || `Media #${item.media_id}`}
                              </p>
                              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                                <span className="capitalize">{item.media_type}</span>
                                {item.media_subtype && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="capitalize">{item.media_subtype}</span>
                                  </>
                                )}
                                <span className="text-slate-300">•</span>
                                {formatDuration(item.duration_seconds)}
                              </p>
                            </div>
                            {item.is_skipped && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Skipped</span>
                            )}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveItem(index, -1)}
                                disabled={index === 0 || busyMediaId === item.id}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                title="Move up"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveItem(index, 1)}
                                disabled={index === media.length - 1 || busyMediaId === item.id}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                title="Move down"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => toggleSkip(item)}
                                disabled={busyMediaId === item.id}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                title={item.is_skipped ? 'Include in playback' : 'Skip in playback'}
                              >
                                {item.is_skipped ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => removeItem(item)}
                                disabled={busyMediaId === item.id}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Container>
      </main>

      {/* Add Media Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">Add Media to Playlist</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 px-6 pt-4 flex-shrink-0">
              <button
                onClick={() => setAddTab('recordings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  addTab === 'recordings' ? 'bg-purple-50 text-purple-600' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Film className="w-4 h-4" />
                Recordings ({recordings.length})
              </button>
              <button
                onClick={() => setAddTab('telegram')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  addTab === 'telegram' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                Telegram Media ({telegramMedia.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingAddMedia ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                </div>
              ) : addTab === 'recordings' ? (
                recordings.length === 0 ? (
                  <div className="text-center py-10">
                    <Film className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No recordings yet</p>
                    <p className="text-xs text-slate-400">Upload recordings from your dashboard</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recordings.map((rec) => {
                      const inPlaylist = alreadyInPlaylist.has(`recording:${rec.id}`);
                      const selected = selectedRecordings.has(rec.id);
                      return (
                        <div
                          key={rec.id}
                          onClick={() => !inPlaylist && toggleSelectRecording(rec.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            inPlaylist
                              ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                              : selected
                                ? 'border-purple-400 bg-purple-50'
                                : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {rec.thumbnail_url ? (
                            <img src={rec.thumbnail_url} alt={rec.title} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <Film className="w-5 h-5 text-purple-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{rec.title}</p>
                            <p className="text-xs text-slate-500">{formatDuration(rec.duration_seconds)}</p>
                          </div>
                          {inPlaylist ? (
                            <CheckCircle2 className="w-5 h-5 text-slate-300" />
                          ) : selected ? (
                            <CheckCircle2 className="w-5 h-5 text-purple-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : telegramMedia.length === 0 ? (
                <div className="text-center py-10">
                  <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">No Telegram media imported yet</p>
                  <p className="text-xs text-slate-400">Connect a channel and import media first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {telegramMedia.map((item) => {
                    const inPlaylist = alreadyInPlaylist.has(`telegram:${item.id}`);
                    const selected = selectedTelegram.has(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => !inPlaylist && toggleSelectTelegram(item.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          inPlaylist
                            ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                            : selected
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="w-11 h-11 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {item.media_type === 'audio' || item.media_type === 'voice' ? (
                            <Music className="w-5 h-5 text-blue-500" />
                          ) : (
                            <Film className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{item.file_name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <span className="capitalize">{item.media_type}</span>
                            <span className="text-slate-300">•</span>
                            {formatDuration(item.duration_seconds)}
                          </p>
                        </div>
                        {inPlaylist ? (
                          <CheckCircle2 className="w-5 h-5 text-slate-300" />
                        ) : selected ? (
                          <CheckCircle2 className="w-5 h-5 text-blue-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
              <p className="text-sm text-slate-500">
                {selectedRecordings.size + selectedTelegram.size} selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={addingMedia || (selectedRecordings.size + selectedTelegram.size) === 0}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
