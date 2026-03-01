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
  Video, Volume2, FileText, ChevronLeft
} from 'lucide-react';

interface TelegramConnectionWithMedia extends TelegramConnection {
  media: TelegramMediaItem[];
  loadingMedia: boolean;
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

              {/* Media Grid */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Imported Media</h2>
                  <p className="text-sm text-slate-500">
                    {connection.media.length} items imported from this channel
                  </p>
                </div>

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
                        className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start gap-3">
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
                        {item.file_url && (
                          <div className="mt-3 flex gap-2">
                            <a
                              href={item.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 text-xs text-sky-600 hover:bg-sky-50 rounded transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </Container>
      </main>
    </div>
  );
}