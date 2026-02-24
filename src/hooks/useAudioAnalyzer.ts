"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioAnalyzerOptions {
  smoothingTimeConstant?: number;
  fftSize?: number;
}

interface UseAudioAnalyzerReturn {
  audioContext: AudioContext | null;
  analyzer: AnalyserNode | null;
  dataArray: Uint8Array<ArrayBuffer> | null;
  isActive: boolean;
  currentLevel: number;
  start: (stream: MediaStream) => void;
  stop: () => void;
  getFrequencyData: () => Uint8Array<ArrayBuffer> | null;
  getTimeDomainData: () => Uint8Array<ArrayBuffer> | null;
}

export function useAudioAnalyzer(options: UseAudioAnalyzerOptions = {}) {
  const { 
    smoothingTimeConstant = 0.8, 
    fftSize = 256 
  } = options;

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyzer, setAnalyzer] = useState<AnalyserNode | null>(null);
  const [dataArray, setDataArray] = useState<Uint8Array<ArrayBuffer> | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);

  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Start audio analysis
  const start = useCallback((stream: MediaStream) => {
    try {
      // Create audio context
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      // Create analyzer node
      const analyzerNode = ctx.createAnalyser();
      analyzerNode.smoothingTimeConstant = smoothingTimeConstant;
      analyzerNode.fftSize = fftSize;

      // Create source from stream
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyzerNode);
      sourceRef.current = source;

      // Create data array
      const bufferLength = analyzerNode.frequencyBinCount;
      const data = new Uint8Array(bufferLength) as Uint8Array<ArrayBuffer>;

      setAudioContext(ctx);
      setAnalyzer(analyzerNode);
      setDataArray(data);
      setIsActive(true);

      // Start animation loop
      const updateLevel = () => {
        if (!analyzerNode || !data) return;

        analyzerNode.getByteFrequencyData(data);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          sum += data[i];
        }
        const average = sum / data.length;
        // Normalize to 0-1
        const normalizedLevel = average / 255;
        setCurrentLevel(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.error('Failed to start audio analyzer:', err);
    }
  }, [smoothingTimeConstant, fftSize]);

  // Stop audio analysis
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContext) {
      audioContext.close();
    }

    setAudioContext(null);
    setAnalyzer(null);
    setDataArray(null);
    setIsActive(false);
    setCurrentLevel(0);
  }, [audioContext]);

  // Get frequency data
  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyzer || !dataArray) return null;
    analyzer.getByteFrequencyData(dataArray);
    return dataArray;
  }, [analyzer, dataArray]);

  // Get time domain data
  const getTimeDomainData = useCallback((): Uint8Array | null => {
    if (!analyzer || !dataArray) return null;
    analyzer.getByteTimeDomainData(dataArray);
    return dataArray;
  }, [analyzer, dataArray]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    audioContext,
    analyzer,
    dataArray,
    isActive,
    currentLevel,
    start,
    stop,
    getFrequencyData,
    getTimeDomainData,
  };
}

export default useAudioAnalyzer;
