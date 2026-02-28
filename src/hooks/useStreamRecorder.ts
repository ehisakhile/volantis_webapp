"use client";

import { useState, useRef, useCallback } from 'react';
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
  /** Recording file blob (available after recording stops) */
  recordedBlob: Blob | null;
  /** Original filename of the recording */
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
  /** Stop recording - will auto-download if enabled */
  stopRecording: () => void;
  /** Upload the recorded file to the server */
  uploadRecording: () => Promise<void>;
  /** Download the recording to user's local storage */
  downloadRecording: () => void;
  /** Reset recorder state for a new stream */
  reset: () => void;
  /** Check if recording prompt should be shown */
  shouldPromptRecording: boolean;
}

/**
 * Custom hook for recording livestreams on the client side.
 * 
 * Workflow:
 * 1. Call promptRecording() to show user a prompt asking if they want to record
 * 2. User accepts or declines - if accepted, wantsToRecord = true
 * 3. When stream starts, call startRecording() with the audio stream
 * 4. Recording runs throughout the stream
 * 5. When stream ends, call stopRecording() - this auto-downloads the recording
 * 6. User can then upload the recording via uploadRecording()
 * 
 * The recording captures the same audio that is being sent to the WebRTC stream.
 */
export function useStreamRecorder(options: StreamRecorderOptions = {}): StreamRecorderReturn {
  const { onRecordingReady, onUploadComplete, onUploadError, onAutoUploadComplete } = options;

  const [state, setState] = useState<StreamRecorderState>({
    wantsToRecord: null,
    isRecording: false,
    recordingDuration: 0,
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

  // Get supported MIME type for audio-only recording
  // Prefer MP4/M4A (AAC codec) over webm for better compatibility
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
      console.log('Using MIME type for recording:', mimeType);

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

      mediaRecorder.onstop = () => {
        // Create blob from recorded chunks
        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        // Determine file extension based on MIME type
        let extension = 'webm';
        if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
          extension = 'm4a';
        } else if (mimeType.includes('wav')) {
          extension = 'wav';
        } else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
          extension = 'mp3';
        }
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeTitle = streamTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const filename = `recording_${safeTitle}_${timestamp}.${extension}`;

        // Store in refs for auto-upload
        recordedBlobRef.current = blob;
        recordedFilenameRef.current = filename;

        setState(prev => ({
          ...prev,
          recordedBlob: blob,
          recordedFilename: filename,
          isRecording: false,
        }));

        // Notify callback
        onRecordingReady?.(blob, filename);

        // Auto-download the recording (only if not auto-uploading)
        if (!state.autoUpload) {
          downloadBlob(blob, filename);
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

    // Stop the media recorder - this will trigger the onstop handler
    // which creates the blob and handles the rest
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
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

    // If auto-upload is enabled and we have the stream slug and blob, upload
    if (shouldAutoUpload && currentStreamSlug) {
      // Wait for the blob to be created (onstop handler runs async)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
          const blobType = blob.type || 'audio/mp4';
          const file = new File([blob], filename, {
            type: blobType,
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
      // Create a File from the Blob - use the actual blob type or default to m4a/mp4
      const blobType = state.recordedBlob.type || 'audio/mp4';
      const file = new File([state.recordedBlob], state.recordedFilename, {
        type: blobType,
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

    setState({
      wantsToRecord: null,
      isRecording: false,
      recordingDuration: 0,
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