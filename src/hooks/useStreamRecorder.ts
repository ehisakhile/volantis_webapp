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
}

export interface StreamRecorderReturn {
  state: StreamRecorderState;
  /** Show recording prompt to user - call before starting stream */
  promptRecording: () => void;
  /** User accepts recording */
  acceptRecording: () => void;
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
  const { onRecordingReady, onUploadComplete, onUploadError } = options;

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
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const destNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Get supported MIME type for audio-only recording
  const getSupportedMimeType = useCallback((): string => {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }, []);

  // Show recording prompt to user
  const promptRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      wantsToRecord: null,
      error: null,
    }));
  }, []);

  // User accepts recording
  const acceptRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      wantsToRecord: true,
    }));
  }, []);

  // User declines recording
  const declineRecording = useCallback(() => {
    setState(prev => ({
      ...prev,
      wantsToRecord: false,
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
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeTitle = streamTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const filename = `recording_${safeTitle}_${timestamp}.webm`;

        setState(prev => ({
          ...prev,
          recordedBlob: blob,
          recordedFilename: filename,
          isRecording: false,
        }));

        // Notify callback
        onRecordingReady?.(blob, filename);

        // Auto-download the recording
        downloadBlob(blob, filename);
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
  }, [state.wantsToRecord, state.isRecording, getSupportedMimeType, onRecordingReady]);

  // Stop recording
  const stopRecording = useCallback(() => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop the media recorder
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

    console.log('Recording stopped');
  }, []);

  // Helper function to download a blob
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
      // Create a File from the Blob
      const file = new File([state.recordedBlob], state.recordedFilename, {
        type: state.recordedBlob.type || 'audio/webm',
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
    });
  }, []);

  // Check if we should show the recording prompt
  const shouldPromptRecording = state.wantsToRecord === null;

  return {
    state,
    promptRecording,
    acceptRecording,
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