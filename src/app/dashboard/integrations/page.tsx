'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { useAuth } from '@/lib/auth-context';
import { telegramApi, TelegramConnection } from '@/lib/api/telegram';
import {
  LogOut, Play, Eye, Settings, Plug, MessageCircle,
  CheckCircle, XCircle, RefreshCw, ExternalLink, Trash2,
  Plus, Download, List, Music, Pause, PlayCircle, FolderPlus,
  Clock, FileDown, Loader2, Save
} from 'lucide-react';

interface TelegramChannel {
  id: number;
  title: string;
  username: string | null;
  type: string;
}

interface TelegramIntegrationState {
  connections: TelegramConnection[];
  loading: boolean;
  error: string | null;
  connecting: boolean;
  phoneNumber: string;
  verificationCode: string;
  sessionId: string;
  selectedChannelId: number | null;
  availableChannels: TelegramChannel[];
  showAuthModal: boolean;
  authStep: 'phone' | 'code' | 'channel' | null;
  importingNew: number | null;
}

interface TelegramPlaylistOut {
  id: number;
  company_id: number;
  title: string;
  items: TelegramPlaylistItem[];
  is_playing: boolean;
  created_at: string;
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

export default function IntegrationsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  const [telegramState, setTelegramState] = useState<TelegramIntegrationState>({
    connections: [],
    loading: false,
    error: null,
    connecting: false,
    phoneNumber: '',
    verificationCode: '',
    sessionId: '',
    selectedChannelId: null,
    availableChannels: [],
    showAuthModal: false,
    authStep: null,
    importingNew: null,
  });

  const [selectedConnectionId, setSelectedConnectionId] = useState<number | null>(null);
  const [importingHistory, setImportingHistory] = useState<number | null>(null);
  const [playlists, setPlaylists] = useState<TelegramPlaylistOut[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<number[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [playingPlaylistId, setPlayingPlaylistId] = useState<number | null>(null);

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
    if (isAuthenticated) {
      fetchTelegramConnections();
      fetchPlaylists();
    }
  }, [isAuthenticated]);

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

  const fetchTelegramConnections = async () => {
    setTelegramState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await telegramApi.getConnections();
      setTelegramState(prev => ({
        ...prev,
        connections: response.connections,
        loading: false,
      }));
    } catch (err: unknown) {
      console.error('Failed to fetch Telegram connections:', err);
      setTelegramState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load Telegram connections',
      }));
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleGoLive = () => {
    router.push('/creator/stream');
  };

  // Telegram Auth Handlers
  const openTelegramAuth = () => {
    setTelegramState(prev => ({
      ...prev,
      showAuthModal: true,
      authStep: 'phone',
      phoneNumber: '',
      verificationCode: '',
      sessionId: '',
      selectedChannelId: null,
      availableChannels: [],
      error: null,
    }));
  };

  const closeTelegramAuth = () => {
    setTelegramState(prev => ({
      ...prev,
      showAuthModal: false,
      authStep: null,
      phoneNumber: '',
      verificationCode: '',
      sessionId: '',
      selectedChannelId: null,
      availableChannels: [],
      error: null,
    }));
  };

  const handleSendPhoneCode = async () => {
    if (!telegramState.phoneNumber) return;

    setTelegramState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      const response = await telegramApi.startAuth({
        phone: telegramState.phoneNumber,
      });
      setTelegramState(prev => ({
        ...prev,
        connecting: false,
        authStep: 'code',
        sessionId: response.session_id,
      }));
    } catch (err: unknown) {
      console.error('Failed to start Telegram auth:', err);
      setTelegramState(prev => ({
        ...prev,
        connecting: false,
        error: 'Failed to send verification code',
      }));
    }
  };

  const handleVerifyCode = async () => {
    console.log('Verify clicked, code:', telegramState.verificationCode, 'session:', telegramState.sessionId);
    
    if (!telegramState.verificationCode) {
      setTelegramState(prev => ({ ...prev, error: 'Please enter the verification code' }));
      return;
    }
    
    if (!telegramState.sessionId) {
      setTelegramState(prev => ({ ...prev, error: 'Missing verification session. Please start over.' }));
      return;
    }

    setTelegramState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      const response = await telegramApi.verifyCode({
        session_id: telegramState.sessionId,
        code: telegramState.verificationCode,
      });

      if (response.channels && response.channels.length > 0) {
        setTelegramState(prev => ({
          ...prev,
          connecting: false,
          authStep: 'channel',
          availableChannels: response.channels,
          selectedChannelId: response.channels[0].id,
        }));
      } else {
        setTelegramState(prev => ({
          ...prev,
          connecting: false,
          error: 'No channels found for this account',
        }));
      }
    } catch (err: unknown) {
      console.error('Failed to verify Telegram code:', err);
      setTelegramState(prev => ({
        ...prev,
        connecting: false,
        error: 'Invalid verification code',
      }));
    }
  };

  const handleConnectChannel = async (channelId: number) => {
    setTelegramState(prev => ({ ...prev, connecting: true, error: null }));
    try {
      await telegramApi.connect({ channel_id: channelId, session_id: telegramState.sessionId });
      closeTelegramAuth();
      fetchTelegramConnections();
    } catch (err: unknown) {
      console.error('Failed to connect Telegram channel:', err);
      setTelegramState(prev => ({
        ...prev,
        connecting: false,
        error: 'Failed to connect channel',
      }));
    }
  };

  const handleDisconnect = async (connectionId: number) => {
    if (!confirm('Are you sure you want to disconnect this channel?')) return;

    try {
      await telegramApi.disconnect(connectionId);
      fetchTelegramConnections();
      if (selectedConnectionId === connectionId) {
        setSelectedConnectionId(null);
      }
    } catch (err: unknown) {
      console.error('Failed to disconnect Telegram channel:', err);
    }
  };

  const handleImportHistory = async (connectionId: number) => {
    setImportingHistory(connectionId);
    try {
      await telegramApi.importHistory(connectionId, { limit: 100 });
      alert('Import started! It will run in the background.');
    } catch (err: unknown) {
      console.error('Failed to import history:', err);
      alert('Failed to start import');
    } finally {
      setImportingHistory(null);
    }
  };

  const handleImportNew = async (connectionId: number) => {
    setTelegramState(prev => ({ ...prev, importingNew: connectionId }));
    try {
      await telegramApi.importNew(connectionId);
      alert('Import started! New media since last sync will be imported.');
    } catch (err: unknown) {
      console.error('Failed to import new media:', err);
      alert('Failed to start import');
    } finally {
      setTelegramState(prev => ({ ...prev, importingNew: null }));
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistName.trim() || selectedMediaIds.length === 0) {
      alert('Please enter a playlist name and select at least one media item');
      return;
    }

    if (!selectedConnectionId) {
      alert('Please select a connection first');
      return;
    }

    setCreatingPlaylist(true);
    try {
      await telegramApi.createPlaylist(selectedConnectionId, {
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
      alert('Playlist is now playing!');
    } catch (err: unknown) {
      console.error('Failed to play playlist:', err);
      alert('Failed to play playlist');
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
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
            <p className="text-slate-600">Connect external services to enhance your streaming experience</p>
          </div>

          {/* Sidebar Layout */}
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

            {/* Main Content */}
            <div className="flex-1">
              {/* Telegram Integration */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.287 5.906q-1.168.486-4.666 2.01-.567.225-.595.442c-.03.243.275.339.69.47l.175.055c.408.133.958.288 1.243.294q.39.01.868-.32 3.269-2.206 3.374-2.23c.05-.012.12-.026.166.016s.042.12.037.141c-.03.129-1.227 1.241-1.846 1.817-.193.18-.33.307-.358.336a8 8 0 0 1-.188.186c-.38.366-.664.64.015 1.088.327.216.589.393.85.571.284.194.568.387.936.629q.14.092.27.187c.331.236.63.448.997.414.214-.02.435-.22.547-.82.265-1.417.786-4.486.906-5.751a1.4 1.4 0 0 0-.013-.315.34.34 0 0 0-.114-.217.53.53 0 0 0-.31-.093c-.3.005-.763.166-2.984 1.09"/>
</svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Telegram</h2>
                        <p className="text-sm text-slate-500">Import media from Telegram channels</p>
                      </div>
                    </div>
                    <button
                      onClick={openTelegramAuth}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Connect Channel
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {telegramState.loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                  ) : telegramState.connections.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No Telegram channels connected</p>
                      <p className="text-sm text-slate-400">Connect a channel to import media</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {telegramState.connections.map((connection) => (
                        <div
                          key={connection.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                            selectedConnectionId === connection.id
                              ? 'border-blue-300 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className="flex items-center gap-3 cursor-pointer flex-1"
                            onClick={() => setSelectedConnectionId(connection.id)}
                          >
                            {connection.is_active ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-slate-400" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{connection.channel_title}</p>
                              {connection.channel_username && (
                                <p className="text-sm text-slate-500">@{connection.channel_username}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleImportHistory(connection.id)}
                              disabled={importingHistory === connection.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Import historical media"
                            >
                              {importingHistory === connection.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              Import
                            </button>
                            <button
                              onClick={() => handleImportNew(connection.id)}
                              disabled={telegramState.importingNew === connection.id}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                              title="Import new media since last sync"
                            >
                              {telegramState.importingNew === connection.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                              New
                            </button>
                            <Link
                              href={`/dashboard/integrations/telegram/${connection.id}`}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                              <Music className="w-4 h-4" />
                              Media
                            </Link>
                            <button
                              onClick={() => handleDisconnect(connection.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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

              {/* Playlists Section */}
              <div className="bg-white rounded-xl border border-slate-200 mt-6">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                        <List className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Playlists</h2>
                        <p className="text-sm text-slate-500">Manage your imported media playlists</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPlaylistModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      <FolderPlus className="w-4 h-4" />
                      Create Playlist
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {loadingPlaylists ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin w-6 h-6 border-4 border-purple-500 border-t-transparent rounded-full" />
                    </div>
                  ) : playlists.length === 0 ? (
                    <div className="text-center py-8">
                      <List className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">No playlists created yet</p>
                      <p className="text-sm text-slate-400">Select media from the Media page to create a playlist</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {playlists.map((playlist) => (
                        <div
                          key={playlist.id}
                          className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <List className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{playlist.title}</p>
                              <p className="text-sm text-slate-500">{playlist.items.length} items</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {playlist.is_playing || playingPlaylistId === playlist.id ? (
                              <button
                                onClick={() => handleStopPlaylist(playlist.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Pause className="w-4 h-4" />
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={() => handlePlayPlaylist(playlist.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
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
            </div>
          </div>
        </Container>
      </main>

      {/* Telegram Auth Modal */}
      {telegramState.showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Connect Telegram Channel</h3>
              <button onClick={closeTelegramAuth} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {telegramState.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {telegramState.error}
              </div>
            )}

            {telegramState.authStep === 'phone' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={telegramState.phoneNumber}
                  onChange={(e) => setTelegramState(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && telegramState.phoneNumber) {
                      handleSendPhoneCode();
                    }
                  }}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  Enter your phone number with country code
                </p>
              </div>
            )}

            {telegramState.authStep === 'code' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={telegramState.verificationCode}
                  onChange={(e) => {
                    console.log('Code input changed:', e.target.value);
                    setTelegramState(prev => ({ ...prev, verificationCode: e.target.value }));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && telegramState.verificationCode) {
                      handleVerifyCode();
                    }
                  }}
                  placeholder="Enter the code from Telegram"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  We sent a code to {telegramState.phoneNumber}
                </p>
              </div>
            )}

            {telegramState.authStep === 'channel' && (
              <div>
                <p className="text-sm text-slate-600 mb-3">
                  Select a channel to connect:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                  {telegramState.availableChannels.map((channel) => (
                    <div
                      key={channel.id}
                      onClick={() => setTelegramState(prev => ({ ...prev, selectedChannelId: channel.id }))}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        telegramState.selectedChannelId === channel.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{channel.title}</p>
                      {channel.username && (
                        <p className="text-sm text-slate-500">@{channel.username}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeTelegramAuth}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              {telegramState.authStep === 'phone' && (
                <button
                  type="button"
                  onClick={handleSendPhoneCode}
                  disabled={telegramState.connecting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                >
                  {telegramState.connecting ? 'Sending...' : 'Send Code'}
                </button>
              )}
              {telegramState.authStep === 'code' && (
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={telegramState.connecting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                >
                  {telegramState.connecting ? 'Verifying...' : 'Verify'}
                </button>
              )}
              {telegramState.authStep === 'channel' && (
                <button
                  type="button"
                  onClick={() => handleConnectChannel(telegramState.selectedChannelId!)}
                  disabled={!telegramState.selectedChannelId || telegramState.connecting}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                >
                  {telegramState.connecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                To create a playlist, go to the Media page and select media items first.
              </p>
              <p className="text-xs text-slate-500">
                Select a connection above, then click "Media" to view and select imported media.
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
                disabled={creatingPlaylist || !playlistName.trim()}
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