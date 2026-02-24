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
};

export default livestreamApi;
