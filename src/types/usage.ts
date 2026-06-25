// Stream usage / plan-limit types
// Mirrors the payload emitted by the livestream usage WebSocket and the
// `/livestreams/{slug}/usage-status` REST fallback endpoint.

export type StreamUsageEventType =
  | 'usage_update'
  | 'usage_warning'
  | 'limit_reached'
  | 'stream_stopped';

export interface StreamUsage {
  event: StreamUsageEventType;
  stream_id: number;
  slug: string;
  is_active: boolean;
  cf_status: string;
  cf_stream_status: string;
  plan_name: string;
  daily_used_seconds: number;
  daily_limit_seconds: number;
  daily_remaining_seconds: number;
  usage_percentage: number;
  warning_threshold: number;
  has_reached_limit: boolean;
  should_warn: boolean;
  should_stop_broadcasting: boolean;
  message: string | null;
}
