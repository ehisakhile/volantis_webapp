// Recordings API Service
import { apiClient } from './client';
import type { 
  VolRecordingOut, 
  VolRecordingWithReplayOut,
  RecordingWatchHistory
} from '@/types/livestream';

const DEBUG = process.env.NODE_ENV !== 'production';

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[RecordingsAPI]', ...args);
  }
}

function debugError(...args: any[]) {
  if (DEBUG) {
    console.error('[RecordingsAPI]', ...args);
  }
}

export const recordingsApi = {
  /**
   * Get recordings for a company by slug (public endpoint).
   * Does not require authentication.
   *
   * @param companySlug - The company slug (e.g., 'test')
   * @param limit - Number of recordings to fetch (default: 50)
   * @param offset - Offset for pagination (default: 0)
   */
  async getRecordingsByCompany(
    companySlug: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<VolRecordingOut[]> {
    const response = await apiClient.request<VolRecordingOut[]>(
      `/recordings/public/company/${companySlug}?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get all recordings for the current user's company.
   * Requires authentication.
   */
  async getRecordings(
    limit: number = 50,
    offset: number = 0
  ): Promise<VolRecordingOut[]> {
    const response = await apiClient.request<VolRecordingOut[]>(
      `/recordings?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get a specific recording by ID.
   * Requires authentication.
   */
  async getRecording(recordingId: number): Promise<VolRecordingOut> {
    const response = await apiClient.request<VolRecordingOut>(
      `/recordings/${recordingId}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get recording for public playback.
   * Records a replay when user accesses the recording.
   * This is the main endpoint for playback - it returns the S3 URL
   * and records that a user started watching.
   * Requires authentication.
   */
  async getRecordingForPlayback(recordingId: number): Promise<VolRecordingWithReplayOut> {
    debugLog(`[PLAYBACK] Fetching recording for playback, id: ${recordingId} (this will increment replay count)`);
    const response = await apiClient.request<VolRecordingWithReplayOut>(
      `/recordings/public/${recordingId}`,
      { method: 'GET' }
    );
    debugLog(`[PLAYBACK] Recording loaded, replay_count: ${response.replay_count}`);
    return response;
  },

  /**
   * Mark a recording as completed by the user.
   * Call this when the user finishes watching the recording.
   * Requires authentication.
   */
  async markRecordingCompleted(recordingId: number): Promise<void> {
    await apiClient.request(
      `/recordings/${recordingId}/complete`,
      { method: 'POST' }
    );
  },

  /**
   * Update the user's watch position for a recording.
   * Call this periodically (e.g., every 10 seconds) while the user is watching.
   * Requires authentication.
   */
  async updateWatchPosition(recordingId: number, positionSeconds: number): Promise<void> {
    await apiClient.request(
      `/recordings/${recordingId}/position?position_seconds=${positionSeconds}`,
      { method: 'POST' }
    );
  },

  /**
   * Get user's watch history for all recordings.
   * Includes both completed and in-progress recordings.
   * Requires authentication.
   */
  async getMyWatchHistory(
    status?: 'in_progress' | 'completed' | 'not_started',
    limit: number = 50,
    offset: number = 0
  ): Promise<RecordingWatchHistory[]> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    if (status) {
      params.append('status', status);
    }
    
    const response = await apiClient.request<RecordingWatchHistory[]>(
      `/recordings/my/watch-history?${params.toString()}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get recordings user is currently watching (not completed).
   * Requires authentication.
   */
  async getCurrentlyWatching(
    limit: number = 50,
    offset: number = 0
  ): Promise<RecordingWatchHistory[]> {
    const response = await apiClient.request<RecordingWatchHistory[]>(
      `/recordings/my/watching?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Get recordings user has completed watching.
   * Requires authentication.
   */
  async getWatchedRecordings(
    limit: number = 50,
    offset: number = 0
  ): Promise<RecordingWatchHistory[]> {
    const response = await apiClient.request<RecordingWatchHistory[]>(
      `/recordings/my/watched?limit=${limit}&offset=${offset}`,
      { method: 'GET' }
    );
    return response;
  },

  /**
   * Delete a recording.
   * Only admins can delete recordings.
   * Requires authentication.
   */
  async deleteRecording(recordingId: number): Promise<void> {
    await apiClient.request(
      `/recordings/${recordingId}`,
      { method: 'DELETE' }
    );
  },

  /**
   * Upload a recording file for on-demand playback.
   * This allows creators to upload pre-recorded audio that audiences
   * can play without requiring a live stream.
   * Requires authentication.
   *
   * @param file - The audio/video file to upload
   * @param title - Title of the recording
   * @param description - Optional description
   * @param durationSeconds - Duration of the recording in seconds
   * @param thumbnail - Optional thumbnail image
   */
  async uploadRecording(
    file: File,
    title: string,
    description: string,
    durationSeconds: number,
    thumbnail?: File
  ): Promise<VolRecordingOut> {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('duration_seconds', durationSeconds.toString());
    formData.append('file', file);
    
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }

    const response = await apiClient.requestFormData<VolRecordingOut>(
      '/recordings/upload',
      formData,
      { method: 'POST' }
    );
    return response;
  },

  /**
   * Get replay statistics for a recording.
   * Public endpoint - no authentication required.
   * Does NOT record a replay - use getRecordingForPlayback for that.
   * Use this for UI display of replay counts.
   */
  async getRecordingStats(recordingId: number): Promise<RecordingStatsResponse> {
    const response = await apiClient.request<RecordingStatsResponse>(
      `/recordings/public/${recordingId}/stats`,
      { method: 'GET' }
    );
    return response;
  },
};

export interface RecordingStatsResponse {
  recording_id: number;
  replay_count: number;
  unique_viewers: number;
  average_watch_duration_seconds: number | null;
  completion_rate: number | null;
}

export default recordingsApi;