// Livestream API Service
import { apiClient } from './client';
import type { 
  VolLivestreamOut, 
  VolLivestreamPlaybackOut,
  StartAudioStreamRequest,
  StartVideoStreamRequest
} from '@/types/livestream';

export const livestreamApi = {
  /**
   * Start an audio-only livestream
   */
  async startAudioStream(data: StartAudioStreamRequest): Promise<VolLivestreamOut> {
    // Use FormData for file upload support (when thumbnail is provided)
    if (data.thumbnail) {
      const formData = new FormData();
      formData.append('title', data.title);
      if (data.description) {
        formData.append('description', data.description);
      }
      formData.append('thumbnail', data.thumbnail);

      const response = await apiClient.requestFormData<VolLivestreamOut>(
        '/livestreams/start/audio',
        formData
      );
      return response;
    }

    // Fallback to URL-encoded form for backward compatibility
    const formData = new URLSearchParams();
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.request<VolLivestreamOut>('/livestreams/start/audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    return response;
  },

  /**
   * Start a video livestream
   */
  async startVideoStream(data: StartVideoStreamRequest): Promise<VolLivestreamOut> {
    const formData = new URLSearchParams();
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.request<VolLivestreamOut>('/livestreams/start/video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    return response;
  },

  /**
   * Get playback info for a livestream
   */
  async getPlaybackInfo(slug: string): Promise<VolLivestreamPlaybackOut> {
    const response = await apiClient.request<VolLivestreamPlaybackOut>(
      `/livestreams/${encodeURIComponent(slug)}/playback`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Stop a livestream
   */
  async stopStream(slug: string): Promise<VolLivestreamOut> {
    const response = await apiClient.request<VolLivestreamOut>(
      `/livestreams/${encodeURIComponent(slug)}/stop`,
      { method: 'POST' }
    );
    return response;
  },

  /**
   * Get active streams for the current user's company
   * Used to check if there's an existing active stream when reconnecting
   * or handling network issues
   */
  async getActiveStreams(
    limit: number = 50,
    offset: number = 0
  ): Promise<VolLivestreamOut[]> {
    const response = await apiClient.request<VolLivestreamOut[]>(
      `/livestreams?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    // Filter to only return active streams
    return response.filter(stream => stream.is_active);
  },

  /**
   * Get all livestreams for the current user's company
   */
  async getCompanyLivestreams(
    limit: number = 50, 
    offset: number = 0
  ): Promise<VolLivestreamOut[]> {
    const response = await apiClient.request<VolLivestreamOut[]>(
      `/livestreams?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get a specific livestream by slug
   */
  async getLivestream(slug: string): Promise<VolLivestreamOut> {
    const response = await apiClient.request<VolLivestreamOut>(
      `/livestreams/${encodeURIComponent(slug)}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Upload a recording for an existing livestream
   */
  async uploadRecording(slug: string, file: File): Promise<{ recording_url: string }> {
    const formData = new FormData();
    formData.append('recording', file);

    const response = await apiClient.requestFormData<{ recording_url: string }>(
      `/livestreams/${encodeURIComponent(slug)}/upload-recording`,
      formData
    );
    return response;
  },

  // ==================== Public Endpoints (No Auth Required) ====================

  /**
   * Get all active livestreams across the platform
   * Public endpoint - no authentication required
   */
  async getActiveLivestreams(
    limit: number = 50,
    offset: number = 0
  ): Promise<ActiveStreamsResponse> {
    const response = await apiClient.request<ActiveStreamsResponse>(
      `/livestreams/active?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get company live page with current stream info
   * Public endpoint - no authentication required
   * Returns company info and current active livestream (if any)
   */
  async getCompanyLivePage(companySlug: string): Promise<CompanyLivePageResponse> {
    const response = await apiClient.request<CompanyLivePageResponse>(
      `/${encodeURIComponent(companySlug)}/live`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get all livestreams (active and inactive) for a company
   * Public endpoint - no authentication required
   */
  async getCompanyStreams(
    companySlug: string,
    limit: number = 50,
    offset: number = 0,
    includeInactive: boolean = true
  ): Promise<VolLivestreamOut[]> {
    const response = await apiClient.request<VolLivestreamOut[]>(
      `/${encodeURIComponent(companySlug)}/streams?limit=${limit}&offset=${offset}&include_inactive=${includeInactive}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get stream history for a company (completed streams only)
   * Public endpoint - no authentication required
   */
  async getCompanyStreamHistory(
    companySlug: string,
    limit: number = 20
  ): Promise<VolLivestreamOut[]> {
    const response = await apiClient.request<VolLivestreamOut[]>(
      `/${encodeURIComponent(companySlug)}/history?limit=${limit}`,
      { method: 'GET' }
    );
    return response;
  },
};

// ==================== Types for Public Endpoints ====================

// Response from /livestreams/active endpoint
export interface ActiveStreamsResponse {
  streams: ActiveStreamItem[];
  total: number;
}

export interface ActiveStreamItem {
  id: number;
  title: string;
  slug: string;
  company_id: number;
  company_slug: string;
  company_name: string;
  company_logo_url: string | null;
  is_live: boolean;
  viewer_count: number;
  thumbnail_url: string | null;
  started_at: string;
}

// For backward compatibility, keep the old type but map to it
export type ActiveStreamWithCompany = ActiveStreamItem;

export interface CompanyLivePageResponse {
  company: {
    id: number;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
  };
  livestream: {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    is_live: boolean;
    viewer_count: number;
    peak_viewers: number;
    total_views: number;
    webrtc_playback_url: string | null;
    hls_url: string | null;
    started_at: string;
  } | null;
  subscribers_count: number;
  message?: string;
}

export default livestreamApi;
