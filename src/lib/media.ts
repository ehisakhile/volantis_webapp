// Media type detection helpers for recordings.
// Video vs audio is determined solely from the file extension in s3_url.
// stream_type is intentionally ignored — it isn't reliable, and every
// recording has an s3_url regardless of stream_type, so we standardize on that.

const VIDEO_EXTENSIONS = ['mp4', 'm4v', 'mov', 'mkv', 'avi'];

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  try {
    const path = new URL(url, 'https://volantislive.com').pathname.toLowerCase();
    const ext = path.includes('.') ? path.split('.').pop() || '' : '';
    return VIDEO_EXTENSIONS.includes(ext);
  } catch {
    return false;
  }
}

export interface RecordingLike {
  stream_type?: string | null;
  s3_url?: string | null;
}

export function isVideoRecording(recording?: RecordingLike | null): boolean {
  if (!recording) return false;
  return isVideoUrl(recording.s3_url);
}