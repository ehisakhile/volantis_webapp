"use client";

import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { livestreamApi } from '@/lib/api/livestream';

export interface StreamRecorderOptions {
  /** Callback when recording is ready for download */
  onRecordingReady?: (blob: Blob, filename: string) => void;
  /** Callback when upload completes */
  onUploadComplete?: (recordingUrl: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
  /** Callback when auto-upload completes - used to navigate after success */
  onAutoUploadComplete?: (recordingUrl: string) => void;
}

export interface StreamRecorderState {
  /** Whether user wants to record the stream */
  wantsToRecord: boolean | null;
  /** Whether recording is currently in progress */
  isRecording: boolean;
  /** Duration of current recording in seconds */
  recordingDuration: number;
  /** Whether the raw recording is currently being transcoded to MP3 */
  isTranscoding: boolean;
  /** Recording file blob (available after recording stops and transcoding finishes) - always audio/mpeg */
  recordedBlob: Blob | null;
  /** Original filename of the recording - always .mp3 */
  recordedFilename: string | null;
  /** Whether upload is in progress */
  isUploading: boolean;
  /** Upload progress (0-100) */
  uploadProgress: number;
  /** Error message if any */
  error: string | null;
  /** Slug of the stream being recorded */
  streamSlug: string | null;
  /** Whether auto-upload is enabled (recording will be uploaded automatically after stream ends) */
  autoUpload: boolean;
  /** Whether the recording has been uploaded/made available for replay */
  isUploaded: boolean;
}

export interface StreamRecorderReturn {
  state: StreamRecorderState;
  /** Show recording prompt to user - call before starting stream */
  promptRecording: () => void;
  /** User accepts recording - save locally only */
  acceptRecording: () => void;
  /** User accepts recording with auto-upload */
  acceptRecordingWithAutoUpload: () => void;
  /** User declines recording */
  declineRecording: () => void;
  /** Start recording with the provided media stream (audio being sent to WebRTC) */
  startRecording: (stream: MediaStream, streamSlug: string, streamTitle: string) => void;
  /** Stop recording - waits for MP3 transcoding to finish, then auto-downloads if enabled */
  stopRecording: () => Promise<void>;
  /** Upload the recorded file to the server */
  uploadRecording: () => Promise<void>;
  /** Download the recording to user's local storage */
  downloadRecording: () => void;
  /** Reset recorder state for a new stream */
  reset: () => void;
  /** Check if recording prompt should be shown */
  shouldPromptRecording: boolean;
}

// ---------------------------------------------------------------------------
// ffmpeg.wasm setup (module-level singleton so the ~30MB core only loads once
// per page session, not once per recording).
// ---------------------------------------------------------------------------

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;

// Single-threaded core - no COOP/COEP cross-origin-isolation headers required
// (the -mt/core-mt build needs SharedArrayBuffer + those headers; this one doesn't).
const FFMPEG_CORE_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      console.log('[ffmpeg]', message);
    });

    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${FFMPEG_CORE_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
    ]);

    await ffmpeg.load({ coreURL, wasmURL });
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (err) {
    // Allow retrying on next call if load failed
    ffmpegLoadPromise = null;
    throw err;
  }
}

/** Kick off loading the ffmpeg core in the background without blocking the caller. */
function preloadFFmpeg(): void {
  getFFmpeg().catch((err) => {
    console.warn('ffmpeg preload failed (will retry on demand):', err);
  });
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return 'webm';
}

/**
 * Transcode a raw MediaRecorder blob (webm/mp4/wav/whatever the browser gave us)
 * into an MP3 blob using ffmpeg.wasm.
 */
async function transcodeToMp3(inputBlob: Blob, sourceMimeType: string): Promise<Blob> {
  const ffmpeg = await getFFmpeg();

  const inputExt = extensionForMimeType(sourceMimeType);
  const inputName = `input_${Date.now()}.${inputExt}`;
  const outputName = `output_${Date.now()}.mp3`;

  await ffmpeg.writeFile(inputName, await fetchFile(inputBlob));

  await ffmpeg.exec([
    '-i', inputName,
    '-vn',
    '-codec:a', 'libmp3lame',
    '-b:a', '128k',
    '-ar', '44100',
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);

  // Best-effort cleanup of the virtual FS so long sessions don't leak memory
  await ffmpeg.deleteFile(inputName).catch(() => {});
  await ffmpeg.deleteFile(outputName).catch(() => {});

  // readFile can return a string in text mode; we always want binary here
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;

  // ffmpeg.wasm types the returned buffer as ArrayBufferLike (which includes
  // SharedArrayBuffer), but Blob's BlobPart wants a concrete ArrayBuffer.
  // Copy into a fresh, plain ArrayBuffer to satisfy the type and guarantee
  // we're not accidentally holding a view over a shared/detached buffer.
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);

  return new Blob([arrayBuffer], { type: 'audio/mpeg' });
}

/**
 * Custom hook for recording livestreams on the client side.
 *
 * Workflow:
 * 1. Call promptRecording() to show user a prompt asking if they want to record
 * 2. User accepts or declines - if accepted, wantsToRecord = true
 * 3. When stream starts, call startRecording() with the audio stream
 * 4. Recording runs throughout the stream (captured via MediaRecorder, browser-native format)
 * 5. When stream ends, call stopRecording() - this transcodes to MP3 via ffmpeg.wasm,
 *    then auto-downloads the recording
 * 6. User can then upload the recording via uploadRecording()
 *
 * The recording captures the same audio that is being sent to the WebRTC stream.
 * Regardless of what the browser's MediaRecorder supports natively, the final
 * recordedBlob/recordedFilename exposed by this hook is always MP3 (audio/mpeg),
 * to match mobile app playback requirements.
 */
export function useStreamRecorder(options: StreamRecorderOptions = {}): StreamRecorderReturn {
  const { onRecordingReady, onUploadComplete, onUploadError, onAutoUploadComplete } = options;

  const [state, setState] = useState<StreamRecorderState>({
    wantsToRecord: null,
    isRecording: false,
    recordingDuration: 0,
    isTranscoding: false,
    recordedBlob: null,
    recordedFilename: null,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    streamSlug: null,
    autoUpload: false,
    isUploaded: false,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Refs to store recording data for auto-upload (avoids async state issues)
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedFilenameRef = useRef<string | null>(null);
  const streamTitleRef = useRef<string>('');
  const streamSlugRef = useRef<string | null>(null);

  // Resolver for the promise stopRecording() awaits, so it knows the async
  // onstop handler (capture -> transcode -> finalize) has actually completed,
  // instead of guessing with a fixed setTimeout.
  const stopProcessingResolveRef = useRef<(() => void) | null>(null);

  // Get supported MIME type for the *capture* stage. This is just what
  // MediaRecorder records into before we transcode to MP3 - it does not
  // affect the final output format.
  const getSupportedMimeType = useCallback((): string => {
    const mimeTypes = [
      'audio/mp4',        // MP4 with AAC - preferred for better compatibility
      'audio/x-m4a',      // M4A variant
      'audio/webm;codecs=opus',  // Fallback to webm with Opus
      'audio/webm',
      'audio/wav',
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Supported MIME type found:', type);
        return type;
      }
    }

    // Default fallback - try webm
    return 'audio/webm';
  }, []);

  // Helper function to download a blob - defined before startRecording uses it
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Recording downloaded:', filename);
  };

  // Show recording prompt to user
  const promptRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      wantsToRecord: null,
      error: null,
    }));
  }, []);

  // User accepts recording - save locally only
  const acceptRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      wantsToRecord: true,
      autoUpload: false,
    }));
  }, []);

  // User accepts recording with auto-upload
  const acceptRecordingWithAutoUpload = useCallback(() => {
    setState(prev => ({
      ...prev,
      wantsToRecord: true,
      autoUpload: true,
    }));
  }, []);

  // User declines recording
  const declineRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      wantsToRecord: false,
      autoUpload: false,
    }));
  }, []);

  // Start recording the stream audio
  const startRecording = useCallback((stream: MediaStream, streamSlug: string, streamTitle: string) => {
    if (state.wantsToRecord !== true) {
      console.log('Recording not enabled, skipping');
      return;
    }

    if (state.isRecording) {
      console.warn('Already recording');
      return;
    }

    try {
      // Store stream info in refs for auto-upload
      streamSlugRef.current = streamSlug;
      streamTitleRef.current = streamTitle;

      // Warm up the ffmpeg core in the background now, so it's (hopefully)
      // already loaded by the time the user stops the stream.
      preloadFFmpeg();

      // Create audio context to capture the stream audio
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create a MediaStreamDestination to capture the mixed audio
      const destNode = audioContext.createMediaStreamDestination();
      destNodeRef.current = destNode;

      // Create source from the original stream and connect to destination
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(destNode);

      // Get the audio tracks from the destination
      const recordingStream = destNode.stream;

      const mimeType = getSupportedMimeType();
      console.log('Using MIME type for capture:', mimeType);

      // Create MediaRecorder with the audio stream
      const mediaRecorder = new MediaRecorder(recordingStream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps for good quality audio
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          setState(prev => ({ ...prev, isTranscoding: true }));

          // Raw blob in whatever format the browser captured
          const rawBlob = new Blob(chunksRef.current, { type: mimeType });

          // Transcode to MP3 so downstream (download/upload/mobile playback)
          // always deals with a consistent format
          const mp3Blob = await transcodeToMp3(rawBlob, mimeType);

          // Generate filename with timestamp - always .mp3 now
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const safeTitle = streamTitleRef.current.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
          const filename = `recording_${safeTitle}_${timestamp}.mp3`;

          // Store in refs for auto-upload
          recordedBlobRef.current = mp3Blob;
          recordedFilenameRef.current = filename;

          setState(prev => ({
            ...prev,
            recordedBlob: mp3Blob,
            recordedFilename: filename,
            isRecording: false,
            isTranscoding: false,
          }));

          // Notify callback
          onRecordingReady?.(mp3Blob, filename);

          // Auto-download the recording (only if not auto-uploading)
          if (!state.autoUpload) {
            downloadBlob(mp3Blob, filename);
          }
        } catch (err) {
          console.error('Failed to transcode recording to MP3:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to process recording audio';
          setState(prev => ({
            ...prev,
            isRecording: false,
            isTranscoding: false,
            error: errorMessage,
          }));
        } finally {
          // Let stopRecording() know the async work here is done, whether it
          // succeeded or failed.
          stopProcessingResolveRef.current?.();
          stopProcessingResolveRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;

      // Start recording with timeslice of 1 second for regular data availability
      mediaRecorder.start(1000);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          recordingDuration: prev.recordingDuration + 1,
        }));
      }, 1000);

      setState(prev => ({
        ...prev,
        isRecording: true,
        recordingDuration: 0,
        streamSlug,
        error: null,
      }));

      console.log('Recording started for stream:', streamSlug);
    } catch (err) {
      console.error('Failed to start recording:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        wantsToRecord: false,
      }));
    }
  }, [state.wantsToRecord, state.isRecording, state.autoUpload, getSupportedMimeType, onRecordingReady]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Store autoUpload setting and recording data from refs (not state - state is async)
    const shouldAutoUpload = state.autoUpload;
    const currentStreamSlug = streamSlugRef.current;
    const currentStreamTitle = streamTitleRef.current;

    // Set up a promise that resolves once onstop's async transcoding work
    // finishes, so we don't guess with a fixed timeout (transcoding time
    // scales with recording length).
    const wasRecording = mediaRecorderRef.current?.state === 'recording';
    const onStopComplete = wasRecording
      ? new Promise<void>((resolve) => {
          stopProcessingResolveRef.current = resolve;
        })
      : Promise.resolve();

    // Stop the media recorder - this will trigger the onstop handler
    // which creates the blob, transcodes to MP3, and handles the rest
    if (wasRecording) {
      mediaRecorderRef.current!.stop();
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    destNodeRef.current = null;
    streamRef.current = null;

    setState(prev => ({
      ...prev,
      isRecording: false,
    }));

    console.log('Recording stopped, autoUpload:', shouldAutoUpload, 'slug:', currentStreamSlug);

    // Wait for onstop (capture -> MP3 transcode -> finalize) to actually finish
    await onStopComplete;

    // If auto-upload is enabled and we have the stream slug and blob, upload
    if (shouldAutoUpload && currentStreamSlug) {
      // Use refs for the blob and filename (these are populated in onstop handler)
      const blob = recordedBlobRef.current;
      const filename = recordedFilenameRef.current;

      if (blob && filename && currentStreamSlug) {
        setState(prev => ({
          ...prev,
          isUploading: true,
          uploadProgress: 0,
        }));

        try {
          const file = new File([blob], filename, {
            type: 'audio/mpeg',
          });

          // Pass description and duration to the API
          const response = await livestreamApi.uploadRecording(
            currentStreamSlug,
            file,
            `Recording of stream: ${currentStreamTitle}`,
            state.recordingDuration
          );

          setState(prev => ({
            ...prev,
            isUploading: false,
            uploadProgress: 100,
            isUploaded: true,
          }));

          onUploadComplete?.(response.recording_url);
          onAutoUploadComplete?.(response.recording_url);
          console.log('Auto-upload completed:', response.recording_url);
        } catch (err) {
          console.error('Auto-upload failed:', err);
          const error = err instanceof Error ? err : new Error('Failed to auto-upload recording');
          setState(prev => ({
            ...prev,
            isUploading: false,
            uploadProgress: 0,
            error: error.message,
          }));
          onUploadError?.(error);
        }
      } else {
        console.error('Auto-upload skipped: blob or filename not available', { blob: !!blob, filename: !!filename });
      }
    }
  }, [state.autoUpload, state.recordingDuration, onUploadComplete, onUploadError, onAutoUploadComplete]);

  // Download the recording to local storage
  const downloadRecording = useCallback(() => {
    if (!state.recordedBlob || !state.recordedFilename) {
      setState(prev => ({
        ...prev,
        error: 'No recording available to download',
      }));
      return;
    }

    downloadBlob(state.recordedBlob, state.recordedFilename);
  }, [state.recordedBlob, state.recordedFilename]);

  // Upload the recording to the server
  const uploadRecording = useCallback(async () => {
    if (!state.recordedBlob || !state.recordedFilename || !state.streamSlug) {
      const error = new Error('No recording available or stream slug missing');
      setState(prev => ({
        ...prev,
        error: error.message,
      }));
      onUploadError?.(error);
      return;
    }

    setState(prev => ({
      ...prev,
      isUploading: true,
      uploadProgress: 0,
      error: null,
    }));

    try {
      // recordedBlob is always MP3 by the time it's set (post-transcode)
      const file = new File([state.recordedBlob], state.recordedFilename, {
        type: 'audio/mpeg',
      });

      // Upload using the livestream API
      const response = await livestreamApi.uploadRecording(state.streamSlug, file);

      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 100,
      }));

      onUploadComplete?.(response.recording_url);
      console.log('Recording uploaded successfully:', response.recording_url);
    } catch (err) {
      console.error('Failed to upload recording:', err);
      const error = err instanceof Error ? err : new Error('Failed to upload recording');
      setState(prev => ({
        ...prev,
        isUploading: false,
        uploadProgress: 0,
        error: error.message,
      }));
      onUploadError?.(error);
    }
  }, [state.recordedBlob, state.recordedFilename, state.streamSlug, onUploadComplete, onUploadError]);

  // Reset recorder state
  const reset = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    mediaRecorderRef.current = null;
    chunksRef.current = [];
    streamRef.current = null;
    destNodeRef.current = null;
    stopProcessingResolveRef.current = null;

    setState({
      wantsToRecord: null,
      isRecording: false,
      recordingDuration: 0,
      isTranscoding: false,
      recordedBlob: null,
      recordedFilename: null,
      isUploading: false,
      uploadProgress: 0,
      error: null,
      streamSlug: null,
      autoUpload: false,
      isUploaded: false,
    });
  }, []);

  // Check if we should show the recording prompt
  const shouldPromptRecording = state.wantsToRecord === null;

  return {
    state,
    promptRecording,
    acceptRecording,
    acceptRecordingWithAutoUpload,
    declineRecording,
    startRecording,
    stopRecording,
    uploadRecording,
    downloadRecording,
    reset,
    shouldPromptRecording,
  };
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS format
 */
export function formatRecordingDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default useStreamRecorder;