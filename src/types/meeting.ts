// Meeting Types based on MEETINGAPI.md

export type MeetingStatus = 'pending' | 'active' | 'ended' | 'cancelled';
export type MeetingType = 'instant' | 'scheduled';
export type ParticipantRole = 'host' | 'co_host' | 'participant';
export type StreamTypeInput = 'audio_only' | 'video';

export interface VolMeetingOut {
  id: number;
  company_id: number;
  created_by_id: number;
  title: string;
  description?: string | null;
  meeting_type: MeetingType;
  status: MeetingStatus;
  scheduled_start_time?: string | null;
  scheduled_end_time?: string | null;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  stream_type: StreamTypeInput;
  max_participants: number;
  participant_count: number;
  peak_participants: number;
  total_views: number;
  thumbnail_url?: string | null;
  cf_live_input_uid?: string | null;
  cf_webrtc_publish_url?: string | null;
  cf_webrtc_playback_url?: string | null;
  cf_rtmps_url?: string | null;
  cf_stream_key?: string | null;
  cf_status?: string | null;
  cf_stream_status?: string | null;
  cf_started_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  company_name?: string | null;
  company_slug?: string | null;
  created_by_email?: string | null;
  playback?: VolMeetingPlaybackOut;
  participants?: VolMeetingParticipantOut[];
  nice_id?: string | null;
}

export interface VolMeetingPlaybackOut {
  status: 'idle' | 'recording' | 'ready';
  video_uid?: string | null;
  hls_url?: string | null;
  dash_url?: string | null;
  preview_url?: string | null;
  webrtc_playback_url?: string | null;
}

export interface VolMeetingParticipantOut {
  id: number;
  user_id: number;
  role: ParticipantRole;
  status: 'joined' | 'left' | 'pending';
  joined_at?: string | null;
  left_at?: string | null;
  user_email?: string | null;
  user_username?: string | null;
}

export interface StartInstantMeetingRequest {
  title: string;
  description?: string;
  stream_type?: StreamTypeInput;
  max_participants?: number;
  thumbnail?: File;
}

export interface ScheduleMeetingRequest {
  title: string;
  description?: string;
  stream_type?: StreamTypeInput;
  max_participants?: number;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  thumbnail?: File;
}

export interface MeetingListResponse {
  meetings: VolMeetingOut[];
  total: number;
}

export interface ActiveMeetingsResponse {
  meetings: VolMeetingOut[];
  total: number;
}

// WebSocket event types for real-time updates
export type MeetingWebSocketEvent =
  | { type: 'participant_joined'; payload: VolMeetingParticipantOut }
  | { type: 'participant_left'; payload: { user_id: number } }
  | { type: 'meeting_ended'; payload: object }
  | { type: 'chat_message'; payload: { id: number; user_id: number; content: string; created_at: string } };
