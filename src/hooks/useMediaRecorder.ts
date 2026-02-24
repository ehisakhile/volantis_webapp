"use client";

import { useState, useRef, useCallback } from 'react';
import type { RecordingState } from '@/types/livestream';

interface UseMediaRecorderOptions {
  mimeType?: string;
  onDataAvailable?: (blob: Blob) => void;
  onStop?: (blob: Blob) => void;
}

interface UseMediaRecorderReturn {
  recordingState: RecordingState;
  isRecording: boolean;
  startRecording: (stream: MediaStream) => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const {
    mimeType: defaultMimeType,
    onDataAvailable,
    onStop,
  } = options;

  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    duration: 0,
    mimeType: 'video/webm',
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine the best supported MIME type
  const getSupportedMimeType = useCallback((): string => {
    if (defaultMimeType && MediaRecorder.isTypeSupported(defaultMimeType)) {
      return defaultMimeType;
    }

    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const type of mimeTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'video/webm';
  }, [defaultMimeType]);

  // Start recording
  const startRecording = useCallback((stream: MediaStream) => {
    if (mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    chunksRef.current = [];
    const mimeType = getSupportedMimeType();

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
          onDataAvailable?.(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onStop?.(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      // Start duration timer
      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);

      setRecordingState({
        isRecording: true,
        duration: 0,
        mimeType,
      });
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [getSupportedMimeType, onDataAvailable, onStop]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    setRecordingState(prev => ({
      ...prev,
      isRecording: false,
    }));
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
    }
  }, []);

  return {
    recordingState,
    isRecording: recordingState.isRecording,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}

export default useMediaRecorder;
