// Livestream Types based on OpenAPI specification
// config/api.ts
export const API_BASE_URL = "https://api-dev.volantislive.com"; 
export interface VolLivestreamOut {
  id: number;
  company_id: number;
  title: string;
  slug: string;
  description?: string | null;
  stream_type?: StreamType | null;
  is_active: boolean;
  start_time: string;
  end_time?: string | null;
  cf_live_input_uid?: string | null;
  cf_rtmps_url?: string | null;
  cf_stream_key?: string | null;
  cf_webrtc_publish_url?: string | null;
  cf_webrtc_playback_url?: string | null;
  recording_url?: string | null;
  viewer_count: number;
  peak_viewers: number;
  created_by_username: string;
  created_at: string;
}

export interface VolLivestreamPlaybackOut {
  slug: string;
  title: string;
  status: 'live' | 'offline' | 'recording';
  video_uid?: string | null;
  hls_url?: string | null;
  dash_url?: string | null;
  preview_url?: string | null;
  thumbnail_url?: string | null;
  webrtc_playback_url?: string | null;
  ready_to_stream?: boolean | null;
  created?: string | null;
}

export type StreamType = 'audio' | 'video';

export interface StartAudioStreamRequest {
  title: string;
  description?: string;
}

export interface StartVideoStreamRequest {
  title: string;
  description?: string;
}

export interface StreamState {
  stream: VolLivestreamOut | null;
  isLoading: boolean;
  error: string | null;
}

export interface StreamListState {
  streams: VolLivestreamOut[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  offset: number;
}

// WebRTC connection states for UI
export type ConnectionStatus = 
  | 'idle' 
  | 'connecting' 
  | 'connected' 
  | 'reconnecting' 
  | 'disconnected' 
  | 'failed';

// Audio source device info
export interface AudioSource {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
}

// Recording state
export interface RecordingState {
  isRecording: boolean;
  duration: number;
  mimeType: string;
}

// ==================== Recording Types ====================

export type RecordingStreamType = 'audio_only' | 'video';

export interface WatchStatusOut {
  status: 'in_progress' | 'completed' | 'not_started';
  last_position: number | null;
  completed_at: string | null;
}

export interface VolRecordingOut {
  id: number;
  company_id: number;
  livestream_id: number | null;
  title: string;
  description: string | null;
  s3_url: string;
  streaming_url: string ;
  duration_seconds: number | null;
  file_size_bytes: number;
  is_processed: boolean;
  thumbnail_url: string | null;
  created_at: string;
}

export interface VolRecordingWithReplayOut extends VolRecordingOut {
  stream_type: RecordingStreamType | null;
  replay_count: number;
  watch_status: WatchStatusOut | null;
  s3_url: string;
}

// ==================== Recording Watch History Types ====================

export interface RecordingWatchHistory {
  recording_id: number;
  status: 'in_progress' | 'completed' | 'not_started';
  last_position: number | null;
  completed_at: string | null;
  recording: VolRecordingWithReplayOut;
}
