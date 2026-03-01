// Telegram API Service
import { apiClient } from './client';

export interface TelegramStartAuthRequest {
  phone: string;
}

export interface TelegramStartAuthResponse {
  session_id: string;
  phone_number?: string;
  requires_password?: boolean;
  message?: string;
}

export interface TelegramVerifyCodeRequest {
  session_id: string;
  code: string;
  phone?: string;
}

export interface TelegramChannel {
  id: number;
  title: string;
  username: string | null;
  type: string;
}

export interface TelegramVerifyCodeResponse {
  phone_number: string;
  channels: TelegramChannel[];
}

export interface TelegramConnectRequest {
  channel_id: number;
  session_id: string;
}

export interface TelegramConnection {
  id: number;
  company_id: number;
  telegram_channel_id: number;
  channel_title: string;
  channel_username: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

export interface TelegramConnectionListResponse {
  connections: TelegramConnection[];
}

export interface TelegramImportHistoryRequest {
  limit?: number;
}

export interface TelegramImportStatusResponse {
  status: 'started' | 'completed' | 'failed';
  imported_count: number;
  failed_count: number;
  message?: string;
}

export interface TelegramMediaItem {
  id: number;
  telegram_message_id: number;
  title: string | null;
  file_name: string;
  file_type: 'video' | 'audio' | 'voice' | 'document';
  file_size: number;
  duration_seconds: number | null;
  file_url: string | null;
  thumbnail_url: string | null;
  imported_at: string;
  telegram_created_at: string;
}

export interface TelegramMediaListResponse {
  media: TelegramMediaItem[];
  total: number;
}

export interface TelegramChannelMediaItem {
  message_id: number;
  date: string;
  title: string | null;
  file_name: string | null;
  file_type: string;
  file_size: number | null;
  duration_seconds: number | null;
  performer: string | null;
}

export interface TelegramChannelMediaListResponse {
  messages: TelegramChannelMediaItem[];
  total: number;
}

export interface TelegramPlaylistCreateRequest {
  title: string;
  media_ids: number[];
}

export interface TelegramPlaylistItem {
  id: number;
  telegram_media_id: number;
  title: string | null;
  file_name: string;
  file_type: string;
  duration_seconds: number | null;
  file_url: string | null;
  order: number;
}

export interface TelegramPlaylistOut {
  id: number;
  company_id: number;
  title: string;
  items: TelegramPlaylistItem[];
  is_playing: boolean;
  created_at: string;
}

export interface TelegramDownloadJobRequest {
  file_url: string;
  file_type: 'video' | 'audio';
}

export interface TelegramDownloadJobResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_url: string | null;
}

export const telegramApi = {
  /**
   * Check Telegram integration health status
   */
  async healthCheck(): Promise<void> {
    await apiClient.request('/telegram/health', { method: 'GET' });
  },

  /**
   * Start Telegram authentication flow
   * Sends code request to phone number
   */
  async startAuth(data: TelegramStartAuthRequest): Promise<TelegramStartAuthResponse> {
    const response = await apiClient.request<TelegramStartAuthResponse>('/telegram/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * Verify the code from Telegram and get available channels
   */
  async verifyCode(data: TelegramVerifyCodeRequest): Promise<TelegramVerifyCodeResponse> {
    const response = await apiClient.request<TelegramVerifyCodeResponse>('/telegram/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * Connect to a Telegram channel and save the connection
   */
  async connect(data: TelegramConnectRequest): Promise<TelegramConnection> {
    const response = await apiClient.request<TelegramConnection>('/telegram/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * List all Telegram connections for the company
   */
  async getConnections(): Promise<TelegramConnectionListResponse> {
    const response = await apiClient.request<TelegramConnectionListResponse>('/telegram/connections', {
      method: 'GET',
    });
    return response;
  },

  /**
   * Disconnect a Telegram channel
   */
  async disconnect(connectionId: number): Promise<void> {
    await apiClient.request(`/telegram/connection/${connectionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Import historical media from a Telegram channel
   */
  async importHistory(connectionId: number, data?: TelegramImportHistoryRequest): Promise<TelegramImportStatusResponse> {
    const response = await apiClient.request<TelegramImportStatusResponse>(
      `/telegram/${connectionId}/import-history`,
      {
        method: 'POST',
        body: JSON.stringify(data || {}),
      }
    );
    return response;
  },

  /**
   * Import new media since last sync
   */
  async importNew(connectionId: number): Promise<TelegramImportStatusResponse> {
    const response = await apiClient.request<TelegramImportStatusResponse>(
      `/telegram/${connectionId}/import-new`,
      { method: 'POST' }
    );
    return response;
  },

  /**
   * List imported media from a connection
   */
  async getMedia(connectionId: number, limit = 50, offset = 0): Promise<TelegramMediaListResponse> {
    const response = await apiClient.request<TelegramMediaListResponse>(
      `/telegram/${connectionId}/media?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * List media messages from a Telegram channel (directly from Telegram)
   */
  async getChannelMedia(connectionId: number, limit = 50, offset = 0): Promise<TelegramChannelMediaListResponse> {
    const response = await apiClient.request<TelegramChannelMediaListResponse>(
      `/telegram/${connectionId}/channel-media?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Import a specific media by its Telegram message ID
   */
  async importSingleMedia(connectionId: number, messageId: number): Promise<void> {
    await apiClient.request(`/telegram/${connectionId}/import-media/${messageId}`, {
      method: 'POST',
    });
  },

  /**
   * Create a playlist from imported media
   */
  async createPlaylist(connectionId: number, data: TelegramPlaylistCreateRequest): Promise<TelegramPlaylistOut> {
    const response = await apiClient.request<TelegramPlaylistOut>(
      `/telegram/${connectionId}/playlist`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response;
  },

  /**
   * Get playlist with all media items
   */
  async getPlaylist(playlistId: number): Promise<TelegramPlaylistOut> {
    const response = await apiClient.request<TelegramPlaylistOut>(
      `/telegram/playlist/${playlistId}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Start playing a playlist
   */
  async playPlaylist(playlistId: number): Promise<void> {
    await apiClient.request(`/telegram/playlist/${playlistId}/play`, { method: 'POST' });
  },

  /**
   * Stop playing a playlist
   */
  async stopPlaylist(playlistId: number): Promise<void> {
    await apiClient.request(`/telegram/playlist/${playlistId}/stop`, { method: 'POST' });
  },

  /**
   * Get all playlists for the company
   */
  async getCompanyPlaylists(): Promise<{ playlists: TelegramPlaylistOut[] }> {
    const response = await apiClient.request<{ playlists: TelegramPlaylistOut[] }>(
      '/telegram/playlist-by-company',
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Add media to a playlist
   */
  async addToPlaylist(playlistId: number, mediaIds: number[]): Promise<void> {
    await apiClient.request(`/telegram/playlist/${playlistId}/add-media`, {
      method: 'POST',
      body: JSON.stringify({ media_ids: mediaIds }),
    });
  },

  /**
   * Start a download job for external media
   */
  async startDownload(data: TelegramDownloadJobRequest): Promise<TelegramDownloadJobResponse> {
    const response = await apiClient.request<TelegramDownloadJobResponse>('/telegram/media', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response;
  },

  /**
   * Get download job status
   */
  async getDownloadStatus(jobId: string): Promise<TelegramDownloadJobResponse> {
    const response = await apiClient.request<TelegramDownloadJobResponse>(
      `/telegram/download-job/${jobId}`,
      { method: 'GET' }
    );
    return response;
  },
};

export default telegramApi;
