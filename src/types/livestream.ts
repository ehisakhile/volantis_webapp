// Livestream Types based on OpenAPI specification

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
