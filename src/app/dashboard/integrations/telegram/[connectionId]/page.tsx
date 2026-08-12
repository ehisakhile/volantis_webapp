'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { telegramApi, TelegramConnection, TelegramMediaItem } from '@/lib/api/telegram';
import { playlistsApi, type PlaylistOut } from '@/lib/api/playlists';
import {
  LogOut, Play, Eye, MessageCircle,
  CheckCircle, XCircle, RefreshCw, Download, Music,
  Video, Volume2, FileText, ChevronLeft, FolderPlus,
  Loader2, Plus, ListMusic, Pencil, Check, ChevronDown
} from 'lucide-react';

interface TelegramConnectionWithMedia extends TelegramConnection {
  media: TelegramMediaItem[];
  loadingMedia: boolean;
}

interface TelegramChannelMediaItem {
  message_id: number;
  message_date: string;
  media_type: string | null;
  duration_seconds: number | null;
  caption: string | null;
  file_name: string | null;
  file_size: number | null;
  is_imported: boolean;
  imported_media_id: number | null;
}

export default function TelegramConnectionPage() {
  const router = useRouter();
  const params = useParams();
  const connectionId = Number(params.connectionId);

  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [connection, setConnection] = useState<TelegramConnectionWithMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importingSingle, setImportingSingle] = useState<number | null>(null);
  const [channelMedia, setChannelMedia] = useState<TelegramChannelMediaItem[]>([]);
  const [loadingChannelMedia, setLoadingChannelMedia] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'imported' | 'telegram'>('imported');

  // Unified playlists state
  const [playlists, setPlaylists] = useState<PlaylistOut[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [addingToPlaylist, setAddingToPlaylist] = useState<number | null>(null);
  const [addingMediaId, setAddingMediaId] = useState<number | null>(null);
  const [playlistMenuFor, setPlaylistMenuFor] = useState<number | null>(null);
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState<number | null>(null);

  // Create playlist modal
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const noticeTimer = useRef<NodeJS.Timeout | null>(null);

  const showNotice = useCallback((type: 'success' | 'error', message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice({ type, message });
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && user && !user.company_id) {
      router.push('/user/dashboard');
    }
  }, [isAuthenticated, isLoading, router, user]);

  useEffect(() => {
    if (isAuthenticated && connectionId) {
      fetchConnectionDetails();
      fetchPlaylists();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, connectionId]);

  const fetchConnectionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const connectionsResponse = await telegramApi.getConnections();
      const foundConnection = connectionsResponse.connections.find(c => c.id === connectionId);

      if (!foundConnection) {
        setError('Connection not found');
        setLoading(false);
        return;
      }

      const mediaResponse = await telegramApi.getMedia(connectionId, 50, 0);

      setConnection({
        ...foundConnection,
        media: mediaResponse.media,
        loadingMedia: false,
      });
    } catch (err: unknown) {
      console.error('Failed to fetch connection details:', err);
      setError('Failed to load connection details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const pls = await playlistsApi.listPlaylists(50, 0);
      setPlaylists(pls);
    } catch (err: unknown) {
      console.error('Failed to fetch playlists:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleImportSingleMedia = async (messageId: number) => {
    setImportingSingle(messageId);
    try {
      await telegramApi.importSingleMedia(connectionId, messageId);
      showNotice('success', 'Media imported successfully!');
      fetchConnectionDetails();
      if (activeTab === 'telegram') fetchChannelMedia();
    } catch (err: unknown) {
      console.error('Failed to import media:', err);
      showNotice('error', 'Failed to import media');
    } finally {
      setImportingSingle(null);
    }
  };

  const fetchChannelMedia = async () => {
    setLoadingChannelMedia(true);
    try {
      const response = await telegramApi.getChannelMedia(connectionId, 50, 0);
      setChannelMedia(response.media);
    } catch (err: unknown) {
      console.error('Failed to fetch channel media:', err);
    } finally {
      setLoadingChannelMedia(false);
    }
  };

  const handleTabChange = (tab: 'imported' | 'telegram') => {
    setActiveTab(tab);
    setPlaylistMenuOpen(null);
    if (tab === 'telegram' && channelMedia.length === 0) {
      fetchChannelMedia();
    }
  };

  const toggleMediaSelection = (mediaId: number) => {
    setSelectedMediaIds(prev =>
      prev.includes(mediaId)
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    );
  };

  const isSelected = (mediaId: number) => selectedMediaIds.includes(mediaId);

  const canAddToPlaylist = (item: TelegramMediaItem) =>
    item.status === 'completed' && (item.media_type === 'audio' || item.media_type === 'video' || item.media_type === 'voice');

  // Add a single media item to a playlist
  const handleAddItemToPlaylist = async (playlistId: number, mediaId: number) => {
    setAddingMediaId(mediaId);
    try {
      await playlistsApi.addMedia(playlistId, 'telegram', mediaId);
      showNotice('success', 'Added to playlist!');
      fetchPlaylists();
    } catch (err: unknown) {
      console.error('Failed to add media to playlist:', err);
      showNotice('error', 'Failed to add media to playlist');
    } finally {
      setAddingMediaId(null);
      setPlaylistMenuFor(null);
      setPlaylistMenuOpen(null);
    }
  };

  // Bulk add all selected media to a playlist
  const handleAddSelectedToPlaylist = async (playlistId: number) => {
    if (selectedMediaIds.length === 0) return;
    setAddingToPlaylist(playlistId);
    try {
      await playlistsApi.addMediaBulk(playlistId, selectedMediaIds.map(id => ({ media_type: 'telegram' as const, media_id: id })));
      showNotice('success', `Added ${selectedMediaIds.length} item(s) to playlist!`);
      setSelectedMediaIds([]);
      fetchPlaylists();
    } catch (err: unknown) {
      console.error('Failed to add selected media to playlist:', err);
      showNotice('error', 'Failed to add media to playlist');
    } finally {
      setAddingToPlaylist(null);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim()) {
      showNotice('error', 'Please enter a playlist name');
      return;
    }

    setCreatingPlaylist(true);
    try {
      const response = await playlistsApi.createPlaylist({
        name: playlistName.trim(),
        description: playlistDescription.trim() || undefined,
        loop_enabled: loopEnabled,
        is_active: true,
      });
      const newPlaylistId = response.playlist.id;

      // If media is selected, add it to the new playlist right away.
      if (selectedMediaIds.length > 0) {
        await playlistsApi.addMediaBulk(newPlaylistId, selectedMediaIds.map(id => ({ media_type: 'telegram' as const, media_id: id })));
      }

      setShowPlaylistModal(false);
      setPlaylistName('');
      setPlaylistDescription('');
      setLoopEnabled(false);
      setSelectedMediaIds([]);
      fetchPlaylists();
      showNotice(
        'success',
        selectedMediaIds.length > 0
          ? `Playlist created with ${selectedMediaIds.length} item(s)!`
          : 'Playlist created!'
      );
    } catch (err: unknown) {
      console.error('Failed to create playlist:', err);
      showNotice('error', 'Failed to create playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handleDownload = async (fileUrl: string, fileType: 'video' | 'audio') => {
    setDownloadingFile(fileUrl);
    try {
      const result = await telegramApi.startDownload({ file_url: fileUrl, file_type: fileType });
      if (result.file_url) {
        window.open(result.file_url, '_blank');
      } else {
        showNotice('success', 'Download started. Check back later for the file.');
      }
    } catch (err: unknown) {
      console.error('Failed to start download:', err);
      showNotice('error', 'Failed to start download');
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleGoLive = () => {
    router.push('/creator/stream');
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case 'video':
        return <Video className="w-5 h-5 text-purple-500" />;
      case 'audio':
        return <Volume2 className="w-5 h-5 text-blue-500" />;
      case 'voice':
        return <Music className="w-5 h-5 text-green-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              <Link href="/listen" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">
                <Eye className="w-4 h-4" />
                View Channel
              </Link>
              <button
                onClick={handleGoLive}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                <Play className="w-4 h-4" />
                Go Live
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-sky-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-sky-600">
                    {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-700 hidden sm:inline">{user?.username || user?.email}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <Container>
          {/* Back Button */}
          <Link
            href="/dashboard/integrations"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Integrations
          </Link>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
              {error}
            </div>
          ) : connection ? (
            <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 items-start">
              {/* Left column - media */}
              <div>
                {/* Connection Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h1 className="text-xl font-semibold text-slate-900">
                          {connection.channel_title}
                        </h1>
                        {connection.channel_username && (
                          <p className="text-sm text-slate-500">@{connection.channel_username}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {connection.is_active ? (
                        <span className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-slate-400">
                          <XCircle className="w-5 h-5" />
                          Disconnected
                        </span>
                      )}
                      <button
                        onClick={fetchConnectionDetails}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>
                  </div>
                  {connection.last_sync_at && (
                    <p className="text-sm text-slate-500 mt-3">
                      Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Media Tabs */}
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="p-4 border-b border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleTabChange('imported')}
                          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                            activeTab === 'imported'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Imported Media ({connection.media.length})
                        </button>
                        <button
                          onClick={() => handleTabChange('telegram')}
                          className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                            activeTab === 'telegram'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Telegram Channel
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeTab === 'imported' && selectedMediaIds.length > 0 && (
                          <span className="text-sm text-slate-500">
                            {selectedMediaIds.length} selected
                          </span>
                        )}
                        <button
                          onClick={() => setShowPlaylistModal(true)}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <FolderPlus className="w-4 h-4" />
                          New Playlist
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Imported Media Tab */}
                  {activeTab === 'imported' && (
                    <>
                      {connection.media.length === 0 ? (
                        <div className="p-12 text-center">
                          <Music className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">No media imported yet</p>
                          <p className="text-sm text-slate-400">
                            Import history from the integrations page to see media here
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {connection.media.map((item) => {
                            const addable = canAddToPlaylist(item);
                            return (
                              <div
                                key={item.id}
                                className={`relative border rounded-lg p-4 hover:border-slate-300 transition-colors ${
                                  isSelected(item.id)
                                    ? 'border-purple-300 bg-purple-50'
                                    : 'border-slate-200'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <button
                                    onClick={() => toggleMediaSelection(item.id)}
                                    className="mt-1 flex-shrink-0"
                                    aria-label={isSelected(item.id) ? 'Deselect' : 'Select'}
                                  >
                                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      isSelected(item.id)
                                        ? 'bg-purple-500 border-purple-500 text-white'
                                        : 'border-slate-300 text-transparent'
                                    }`}>
                                      <Check className="w-3.5 h-3.5" />
                                    </span>
                                  </button>
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    {getFileTypeIcon(item.media_type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 truncate">
                                      {item.caption || item.file_name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {item.media_type} • {formatFileSize(item.file_size_bytes)}
                                      {item.duration_seconds && ` • ${formatDuration(item.duration_seconds)}`}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                      {new Date(item.created_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  {addable && (
                                    <div className="relative">
                                      <button
                                        onClick={() => {
                                          setPlaylistMenuFor(item.id);
                                          setPlaylistMenuOpen(prev => prev === item.id ? null : item.id);
                                        }}
                                        disabled={addingMediaId === item.id || loadingPlaylists}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-50"
                                      >
                                        {addingMediaId === item.id ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Plus className="w-3 h-3" />
                                        )}
                                        Add to playlist
                                        <ChevronDown className="w-3 h-3" />
                                      </button>

                                      {playlistMenuFor === item.id && playlistMenuOpen === item.id && (
                                        <div className="absolute left-0 top-full mt-1 z-30 w-56 bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden">
                                          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                                            Choose a playlist
                                          </div>
                                          {playlists.length === 0 ? (
                                            <div className="px-3 py-3 text-xs text-slate-500">
                                              No playlists yet. Create one first.
                                            </div>
                                          ) : (
                                            <div className="max-h-56 overflow-y-auto">
                                              {playlists.map(playlist => (
                                                <button
                                                  key={playlist.id}
                                                  onClick={() => handleAddItemToPlaylist(playlist.id, item.id)}
                                                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 transition-colors text-left"
                                                >
                                                  <ListMusic className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                                  <span className="truncate">{playlist.name}</span>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {item.s3_url ? (
                                    <a
                                      href={item.s3_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 rounded transition-colors"
                                    >
                                      <Download className="w-3 h-3" />
                                      Download
                                    </a>
                                  ) : (
                                    <button
                                      onClick={() => handleDownload(item.s3_url || '', item.media_type as 'video' | 'audio')}
                                      disabled={downloadingFile === item.s3_url}
                                      className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                                    >
                                      {downloadingFile === item.s3_url ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Download className="w-3 h-3" />
                                      )}
                                      Download
                                    </button>
                                  )}
                                  {!addable && (
                                    <span className="text-[11px] text-slate-400">{item.status}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Telegram Channel Media Tab */}
                  {activeTab === 'telegram' && (
                    <>
                      {loadingChannelMedia ? (
                        <div className="p-12 text-center">
                          <Loader2 className="w-8 h-8 text-blue-500 mx-auto animate-spin" />
                          <p className="text-slate-500 mt-3">Loading channel media...</p>
                        </div>
                      ) : channelMedia.length === 0 ? (
                        <div className="p-12 text-center">
                          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">No media found in this channel</p>
                          <button
                            onClick={fetchChannelMedia}
                            className="mt-3 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            Refresh
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          {channelMedia.map((item) => (
                            <div
                              key={item.message_id}
                              className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  {getFileTypeIcon(item.media_type || 'document')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-900 truncate">
                                    {item.caption || item.file_name || 'Untitled'}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.media_type || 'unknown'}
                                    {item.file_size && ` • ${formatFileSize(item.file_size)}`}
                                    {item.duration_seconds && ` • ${formatDuration(item.duration_seconds)}`}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {new Date(item.message_date).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-3 flex gap-2">
                                {item.is_imported ? (
                                  <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-600">
                                    <CheckCircle className="w-3 h-3" />
                                    Imported
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleImportSingleMedia(item.message_id)}
                                    disabled={importingSingle === item.message_id}
                                    className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                  >
                                    {importingSingle === item.message_id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Download className="w-3 h-3" />
                                    )}
                                    Import
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right column - playlists */}
              <div className="mt-6 lg:mt-0 lg:sticky lg:top-20">
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Playlists</h2>
                      <p className="text-sm text-slate-500">{playlists.length} playlists</p>
                    </div>
                    <button
                      onClick={() => setShowPlaylistModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      New
                    </button>
                  </div>

                  {loadingPlaylists ? (
                    <div className="p-8 text-center">
                      <Loader2 className="w-6 h-6 text-purple-500 mx-auto animate-spin" />
                    </div>
                  ) : playlists.length === 0 ? (
                    <div className="p-8 text-center">
                      <Music className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500">No playlists yet</p>
                      <p className="text-sm text-slate-400">
                        Create one, then add media with the &quot;Add to playlist&quot; button on any item.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
                      {playlists.map((playlist) => {
                        const canAddSelected = selectedMediaIds.length > 0;
                        return (
                          <div
                            key={playlist.id}
                            className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <ListMusic className="w-4 h-4 text-purple-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{playlist.name}</p>
                                <p className="text-xs text-slate-500">
                                  {playlist.media_count} item{playlist.media_count === 1 ? '' : 's'}
                                  {playlist.is_active ? '' : ' • hidden'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() => handleAddSelectedToPlaylist(playlist.id)}
                                disabled={!canAddSelected || addingToPlaylist === playlist.id}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {addingToPlaylist === playlist.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Plus className="w-3 h-3" />
                                )}
                                {canAddSelected ? `Add ${selectedMediaIds.length} selected` : 'Add selected'}
                              </button>
                              <Link
                                href={`/dashboard/integrations/playlists/${playlist.id}`}
                                className="flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                Manage
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </Container>
      </main>

      {/* Playlist Creation Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Create Playlist</h3>
              <button onClick={() => setShowPlaylistModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Playlist Name
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                placeholder="Enter playlist name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={playlistDescription}
                onChange={(e) => setPlaylistDescription(e.target.value)}
                placeholder="Enter playlist description"
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div className="mb-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="loopEnabled"
                checked={loopEnabled}
                onChange={(e) => setLoopEnabled(e.target.checked)}
                className="w-4 h-4 text-purple-500 rounded border-slate-300 focus:ring-purple-500"
              />
              <label htmlFor="loopEnabled" className="text-sm text-slate-700">
                Enable loop playback
              </label>
            </div>

            {selectedMediaIds.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <p className="text-sm text-purple-700">
                  {selectedMediaIds.length} selected item(s) will be added to this playlist.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPlaylistModal(false);
                  setPlaylistName('');
                  setPlaylistDescription('');
                  setLoopEnabled(false);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={creatingPlaylist || !playlistName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPlaylist ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notice */}
      {notice && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white ${
          notice.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {notice.message}
        </div>
      )}
    </div>
  );
}
