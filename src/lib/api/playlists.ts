// Playlists API Service - unified playlists for recordings + telegram media
import { apiClient } from './client';

export interface PlaylistOut {
  id: number;
  company_id: number;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  category_ids: number[] | null;
  is_active: boolean;
  loop_enabled: boolean;
  livestream_id: number | null;
  current_media_type: string | null;
  current_media_id: number | null;
  playback_position: number | null;
  media_count: number;
  created_at: string;
}

export interface PlaylistResponse {
  playlist: PlaylistOut;
  message: string;
}

export interface PlaylistCreateRequest {
  name: string;
  description?: string;
  loop_enabled?: boolean;
  livestream_id?: number;
  is_active?: boolean;
}

export interface PlaylistUpdateRequest {
  name?: string;
  description?: string | null;
  loop_enabled?: boolean;
  livestream_id?: number | null;
  is_active?: boolean;
  cover_image_url?: string | null;
}

export interface PlaylistMediaItemOut {
  id: number;
  playlist_id: number;
  position: number;
  is_skipped: boolean;
  media_type: 'recording' | 'telegram';
  media_id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  s3_url: string | null;
  streaming_url: string | null;
  media_subtype: string | null;
  caption: string | null;
  file_name: string | null;
  category_ids: number[] | null;
  created_at: string | null;
}

export interface PlaylistMediaListResponse {
  playlist_id: number;
  media: PlaylistMediaItemOut[];
  total: number;
}

export interface PlaylistMediaAddRequest {
  media_type: 'recording' | 'telegram';
  media_id: number;
  position?: number;
}

export interface PlaylistMediaBulkAddRequest {
  media_items: { media_type: 'recording' | 'telegram'; media_id: number }[];
}

export interface PlaylistMediaUpdateRequest {
  position?: number;
  is_skipped?: boolean;
}

export interface PlaylistReorderItem {
  id: number;
  position: number;
}

export const playlistsApi = {
  /**
   * List all playlists for the current user's company.
   * Requires authentication.
   */
  async listPlaylists(limit = 50, offset = 0): Promise<PlaylistOut[]> {
    const response = await apiClient.request<PlaylistOut[]>(
      `/playlists?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get a single playlist by ID.
   * Requires authentication.
   */
  async getPlaylist(playlistId: number): Promise<PlaylistOut> {
    const response = await apiClient.request<PlaylistOut>(
      `/playlists/${playlistId}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Create a new playlist.
   * Requires authentication.
   */
  async createPlaylist(data: PlaylistCreateRequest): Promise<PlaylistResponse> {
    const response = await apiClient.request<PlaylistResponse>(
      '/playlists',
      { method: 'POST', body: JSON.stringify(data) }
    );
    return response;
  },

  /**
   * Update playlist details (name, description, visibility, cover URL, loop, etc.).
   * Requires authentication.
   */
  async updatePlaylist(playlistId: number, data: PlaylistUpdateRequest): Promise<PlaylistResponse> {
    const response = await apiClient.request<PlaylistResponse>(
      `/playlists/${playlistId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
    return response;
  },

  /**
   * Upload a cover image for the playlist.
   * Requires authentication.
   */
  async uploadCover(playlistId: number, file: File): Promise<PlaylistResponse> {
    const formData = new FormData();
    formData.append('cover_image', file);
    const response = await apiClient.requestFormData<PlaylistResponse>(
      `/playlists/${playlistId}/cover-image`,
      formData,
      { method: 'PUT' }
    );
    return response;
  },

  /**
   * Delete a playlist.
   * Requires authentication.
   */
  async deletePlaylist(playlistId: number): Promise<void> {
    await apiClient.request(`/playlists/${playlistId}`, { method: 'DELETE' });
  },

  /**
   * Get all media in a playlist (playback-ready).
   * Requires authentication.
   */
  async getPlaylistMedia(playlistId: number): Promise<PlaylistMediaListResponse> {
    const response = await apiClient.request<PlaylistMediaListResponse>(
      `/playlists/${playlistId}/media`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Add a single media item to a playlist.
   * Requires authentication.
   */
  async addMedia(playlistId: number, mediaType: 'recording' | 'telegram', mediaId: number, position?: number): Promise<PlaylistResponse> {
    const body: PlaylistMediaAddRequest = { media_type: mediaType, media_id: mediaId };
    if (position !== undefined) body.position = position;
    const response = await apiClient.request<PlaylistResponse>(
      `/playlists/${playlistId}/media`,
      { method: 'POST', body: JSON.stringify(body) }
    );
    return response;
  },

  /**
   * Add multiple media items to a playlist at once.
   * Requires authentication.
   */
  async addMediaBulk(playlistId: number, items: PlaylistMediaBulkAddRequest['media_items']): Promise<PlaylistResponse> {
    const response = await apiClient.request<PlaylistResponse>(
      `/playlists/${playlistId}/media/bulk`,
      { method: 'POST', body: JSON.stringify({ media_items: items }) }
    );
    return response;
  },

  /**
   * Reorder media within a playlist.
   * Requires authentication.
   */
  async reorderMedia(playlistId: number, items: PlaylistReorderItem[]): Promise<PlaylistMediaListResponse> {
    const response = await apiClient.request<PlaylistMediaListResponse>(
      `/playlists/${playlistId}/media/order`,
      { method: 'PUT', body: JSON.stringify({ items }) }
    );
    return response;
  },

  /**
   * Update a playlist media item (position / skip).
   * Requires authentication.
   */
  async updateMediaItem(playlistId: number, pmId: number, data: PlaylistMediaUpdateRequest): Promise<PlaylistMediaListResponse> {
    const response = await apiClient.request<PlaylistMediaListResponse>(
      `/playlists/${playlistId}/media/${pmId}`,
      { method: 'PATCH', body: JSON.stringify(data) }
    );
    return response;
  },

  /**
   * Remove a media item from a playlist.
   * Requires authentication.
   */
  async removeMedia(playlistId: number, pmId: number): Promise<void> {
    await apiClient.request(`/playlists/${playlistId}/media/${pmId}`, { method: 'DELETE' });
  },

  // ============================================
  // Public endpoints (no authentication required)
  // ============================================

  /**
   * Get all published playlists for a company by slug.
   * Public endpoint - no authentication required.
   */
  async getCompanyPlaylistsPublic(companySlug: string, limit = 50, offset = 0): Promise<PlaylistOut[]> {
    const response = await apiClient.request<PlaylistOut[]>(
      `/playlists/public/company/${companySlug}?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get a published playlist by ID.
   * Public endpoint - no authentication required.
   */
  async getPlaylistPublic(playlistId: number): Promise<PlaylistOut> {
    const response = await apiClient.request<PlaylistOut>(
      `/playlists/public/${playlistId}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get all media in a published playlist (playback-ready).
   * Public endpoint - no authentication required.
   */
  async getPlaylistMediaPublic(playlistId: number): Promise<PlaylistMediaListResponse> {
    const response = await apiClient.request<PlaylistMediaListResponse>(
      `/playlists/public/${playlistId}/media`,
      { method: 'GET' }
    );
    return response;
  },
};

export default playlistsApi;
