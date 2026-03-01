'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { telegramApi, TelegramConnection, TelegramMediaItem } from '@/lib/api/telegram';
import {
  LogOut, Play, Eye, Settings, Plug, MessageCircle,
  CheckCircle, XCircle, RefreshCw, Download, Music,
  Video, Volume2, FileText, ChevronLeft, FolderPlus,
  Loader2, PlayCircle, Pause, ExternalLink, CheckSquare,
  Square
} from 'lucide-react';

interface TelegramConnectionWithMedia extends TelegramConnection {
  media: TelegramMediaItem[];
  loadingMedia: boolean;
}

interface TelegramChannelMediaItem {
  message_id: number;
  date: string;
  title: string | null;
  file_name: string | null;
  file_type: string;
  file_size: number | null;
  duration_seconds: number | null;
  performer: string | null;
}

interface TelegramPlaylistItem {
  id: number;
  telegram_media_id: number;
  title: string | null;
  file_name: string;
  file_type: string;
  duration_seconds: number | null;
  file_url: string | null;
  order: number;
}

interface TelegramPlaylistOut {
  id: number;
  company_id: number;
  title: string;
  items: TelegramPlaylistItem[];
  is_playing: boolean;
  created_at: string;
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
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [playlists, setPlaylists] = useState<TelegramPlaylistOut[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [playingPlaylistId, setPlayingPlaylistId] = useState<number | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'imported' | 'telegram'>('imported');

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
    }
  }, [isAuthenticated, connectionId]);

  const fetchConnectionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch connection details
      const connectionsResponse = await telegramApi.getConnections();
      const foundConnection = connectionsResponse.connections.find(c => c.id === connectionId);

      if (!foundConnection) {
        setError('Connection not found');
        setLoading(false);
        return;
      }

      // Fetch media for this connection
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

  const handleImportSingleMedia = async (messageId: number) => {
    setImportingSingle(messageId);
    try {
      await telegramApi.importSingleMedia(connectionId, messageId);
      alert('Media imported successfully!');
      fetchConnectionDetails();
    } catch (err: unknown) {
      console.error('Failed to import media:', err);
      alert('Failed to import media');
    } finally {
      setImportingSingle(null);
    }
  };

  const fetchChannelMedia = async () => {
    setLoadingChannelMedia(true);
    try {
      const response = await telegramApi.getChannelMedia(connectionId, 50, 0);
      setChannelMedia(response.messages);
    } catch (err: unknown) {
      console.error('Failed to fetch channel media:', err);
    } finally {
      setLoadingChannelMedia(false);
    }
  };

  const fetchPlaylists = async () => {
    setLoadingPlaylists(true);
    try {
      const response = await telegramApi.getCompanyPlaylists();
      setPlaylists(response.playlists);
    } catch (err: unknown) {
      console.error('Failed to fetch playlists:', err);
    } finally {
      setLoadingPlaylists(false);
    }
  };

  const handleTabChange = (tab: 'imported' | 'telegram') => {
    setActiveTab(tab);
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

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || selectedMediaIds.length === 0) {
      alert('Please enter a playlist name and select at least one media item');
      return;
    }

    setCreatingPlaylist(true);
    try {
      await telegramApi.createPlaylist(connectionId, {
        title: playlistName,
        media_ids: selectedMediaIds,
      });
      setShowPlaylistModal(false);
      setPlaylistName('');
      setSelectedMediaIds([]);
      fetchPlaylists();
      alert('Playlist created successfully!');
    } catch (err: unknown) {
      console.error('Failed to create playlist:', err);
      alert('Failed to create playlist');
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const handlePlayPlaylist = async (playlistId: number) => {
    try {
      await telegramApi.playPlaylist(playlistId);
      setPlayingPlaylistId(playlistId);
    } catch (err: unknown) {
      console.error('Failed to play playlist:', err);
    }
  };

  const handleStopPlaylist = async (playlistId: number) => {
    try {
      await telegramApi.stopPlaylist(playlistId);
      setPlayingPlaylistId(null);
    } catch (err: unknown) {
      console.error('Failed to stop playlist:', err);
    }
  };

  const handleDownload = async (fileUrl: string, fileType: 'video' | 'audio') => {
    setDownloadingFile(fileUrl);
    try {
      const result = await telegramApi.startDownload({ file_url: fileUrl, file_type: fileType });
      if (result.file_url) {
        window.open(result.file_url, '_blank');
      } else {
        alert('Download started. Check back later for the file.');
      }
    } catch (err: unknown) {
      console.error('Failed to start download:', err);
      alert('Failed to start download');
    } finally {
      setDownloadingFile(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated && connectionId) {
      fetchConnectionDetails();
      fetchPlaylists();
    }
  }, [isAuthenticated, connectionId]);

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

  const menuItems = [
    { icon: Play, label: 'Go Live', href: '/creator/stream', color: 'bg-red-500' },
    { icon: Plug, label: 'Integrations', href: '/dashboard/integrations', color: 'bg-indigo-500' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings', color: 'bg-slate-500' },
  ];

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
              <div className="bg-white rounded-xl border border-slate-200 mb-6">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
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
                  {activeTab === 'imported' && connection.media.length > 0 && (
                    <button
                      onClick={() => setShowPlaylistModal(true)}
                      disabled={selectedMediaIds.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Create Playlist ({selectedMediaIds.length})
                    </button>
                  )}
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
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {connection.media.map((item) => (
                          <div
                            key={item.id}
                            className={`border rounded-lg p-4 hover:border-slate-300 transition-colors ${
                              selectedMediaIds.includes(item.id)
                                ? 'border-purple-300 bg-purple-50'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => toggleMediaSelection(item.id)}
                                className="mt-1 flex-shrink-0"
                              >
                                {selectedMediaIds.includes(item.id) ? (
                                  <CheckSquare className="w-5 h-5 text-purple-500" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-400" />
                                )}
                              </button>
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                {getFileTypeIcon(item.file_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">
                                  {item.title || item.file_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.file_type} • {formatFileSize(item.file_size)}
                                  {item.duration_seconds && ` • ${formatDuration(item.duration_seconds)}`}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(item.imported_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              {item.file_url ? (
                                <a
                                  href={item.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 rounded transition-colors"
                                >
                                  <Download className="w-3 h-3" />
                                  Download
                                </a>
                              ) : (
                                <button
                                  onClick={() => handleDownload(item.file_url || '', item.file_type as 'video' | 'audio')}
                                  disabled={downloadingFile === item.file_url}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                                >
                                  {downloadingFile === item.file_url ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ExternalLink className="w-3 h-3" />
                                  )}
                                  Download
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
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
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {channelMedia.map((item) => (
                          <div
                            key={item.message_id}
                            className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                {getFileTypeIcon(item.file_type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">
                                  {item.title || item.file_name || 'Untitled'}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.file_type}
                                  {item.file_size && ` • ${formatFileSize(item.file_size)}`}
                                  {item.duration_seconds && ` • ${formatDuration(item.duration_seconds)}`}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {new Date(item.date).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex gap-2">
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
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Playlists Section */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Playlists</h2>
                  <p className="text-sm text-slate-500">
                    {playlists.length} playlists created
                  </p>
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
                      Select imported media above to create a playlist
                    </p>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {playlists.map((playlist) => (
                      <div
                        key={playlist.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Music className="w-4 h-4 text-purple-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{playlist.title}</p>
                            <p className="text-xs text-slate-500">{playlist.items.length} items</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {playlist.is_playing || playingPlaylistId === playlist.id ? (
                            <button
                              onClick={() => handleStopPlaylist(playlist.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Pause className="w-4 h-4" />
                              Stop
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePlayPlaylist(playlist.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                              Play
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              <p className="text-sm text-slate-600 mb-2">
                Selected {selectedMediaIds.length} media items
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPlaylistModal(false);
                  setPlaylistName('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={creatingPlaylist || !playlistName.trim() || selectedMediaIds.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingPlaylist ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}