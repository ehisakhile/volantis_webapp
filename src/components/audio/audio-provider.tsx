"use client";

import React, { createContext, useContext, useRef, useCallback, useEffect, useState } from 'react';

interface AudioProviderState {
  isPlaying: boolean;
  isInitialized: boolean;
  volume: number;
}

interface AudioProviderActions {
  initializeAudio: (stream: MediaStream) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
}

const AudioContext = createContext<AudioProviderState & AudioProviderActions | null>(null);

export function useAudioProvider() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudioProvider must be used within an AudioProvider');
  }
  return context;
}

/**
 * Global Audio Provider
 * 
 * Creates a persistent HTML5 audio element at the app root level.
 * This is critical for mobile browsers to continue playback when the tab
 * is backgrounded or the browser is minimized. By creating the audio element
 * higher in the DOM tree and keeping it persistent, we trick the browser into
 * thinking we're playing regular HTML5 audio rather than a WebRTC stream.
 */
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<globalThis.AudioContext | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [volume, setVolumeState] = useState(0.8);

  // Initialize the global audio element on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Create a hidden audio element that will be our "fake" audio player
    // This element sits higher in the DOM and persists across navigations
    const audio = new Audio();
    
    // Critical attributes for mobile background playback
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('x-webkit-airplay', 'allow');
    
    // Don't show controls - we're managing this ourselves
    audio.controls = false;
    audio.autoplay = false;
    
    // Pre-load metadata to help browser recognize this as audio
    audio.preload = 'auto';
    
    // Set initial volume
    audio.volume = volume;
    
    // Keep reference but don't attach to DOM (we're using Web Audio API)
    audioRef.current = audio;

    // Handle audio events
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = (e) => {
      console.error('[AudioProvider] Audio error:', e);
      setIsPlaying(false);
    };

    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      mediaStreamSourceRef.current = null;
      gainNodeRef.current = null;
    };
  }, []);

  const initializeAudio = useCallback(async (stream: MediaStream) => {
    if (!audioRef.current) {
      console.error('[AudioProvider] Audio element not initialized');
      return;
    }

    try {
      // Create AudioContext if not exists
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new window.AudioContext();
      }

      // Resume AudioContext if suspended (required for mobile)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Disconnect previous source if exists
      if (mediaStreamSourceRef.current) {
        try {
          mediaStreamSourceRef.current.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }

      // Create a gain node for volume control
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = volume;
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }

      // Create MediaStreamSource from the WebRTC stream
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(gainNodeRef.current);
      mediaStreamSourceRef.current = source;

      // Also set srcObject on the audio element - this helps with some mobile browsers
      // that need to see the audio element actually "playing" something
      audioRef.current.srcObject = stream;

      // Now we need to "fake" the browser into thinking this is a regular audio play
      // We do this by starting and immediately pausing, but keeping the element alive
      // This registers with the browser's audio system
      try {
        await audioRef.current.play();
        // If we get here, autoplay worked
        audioRef.current.pause(); // We'll control playback manually
      } catch (e) {
        // Autoplay might be blocked, but that's okay - we'll play on user interaction
        console.log('[AudioProvider] Initial play blocked, will play on user interaction');
      }

      setIsInitialized(true);
      console.log('[AudioProvider] Audio initialized with WebRTC stream');
    } catch (error) {
      console.error('[AudioProvider] Failed to initialize audio:', error);
    }
  }, [volume]);

  // Play the audio
  const play = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      // Ensure AudioContext is running
      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('[AudioProvider] Play failed:', error);
    }
  }, []);

  // Pause the audio
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Stop the audio completely
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      setIsPlaying(false);
      setIsInitialized(false);
    }

    if (mediaStreamSourceRef.current) {
      try {
        mediaStreamSourceRef.current.disconnect();
      } catch (e) {
        // Ignore
      }
      mediaStreamSourceRef.current = null;
    }
  }, []);

  // Set volume
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
  }, []);

  // Handle visibility change - ensure audio continues on mobile
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        // Ensure audio context is running when page becomes visible
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume().catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  const value: AudioProviderState & AudioProviderActions = {
    isPlaying,
    isInitialized,
    volume,
    initializeAudio,
    play,
    pause,
    stop,
    setVolume,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export default AudioProvider;
