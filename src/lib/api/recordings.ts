// Recordings API Service
import { apiClient } from './client';
import type { 
  VolRecordingOut, 
  VolRecordingWithReplayOut,
  RecordingWatchHistory
} from '@/types/livestream';

export const recordingsApi = {
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
    const response = await apiClient.request<VolRecordingWithReplayOut>(
      `/recordings/public/${recordingId}`,
      { method: 'GET' }
    );
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
};

export default recordingsApi;