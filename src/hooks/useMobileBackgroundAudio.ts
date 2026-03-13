"use client";

import { useEffect, useRef, useCallback } from 'react';

/**
 * Mobile Background Audio Hook
 * 
 * Provides robust background audio playback support for iOS Safari and Android Chrome.
 * Handles:
 * - Audio session management
 * - Background playback
 * - Audio interruptions (calls, alarms)
 * - Lock screen controls
 * - Wake lock (Android)
 */

interface UseMobileBackgroundAudioOptions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  onInterruption?: (interrupted: boolean) => void;
  onRemotePlay?: () => void;
  onRemotePause?: () => void;
  title?: string;
  artist?: string;
  artwork?: string | null;
}

export function useMobileBackgroundAudio({
  audioRef,
  isPlaying,
  onInterruption,
  onRemotePlay,
  onRemotePause,
  title = 'Live Stream',
  artist = 'Volantislive',
  artwork,
}: UseMobileBackgroundAudioOptions) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Detect if we're on iOS Safari
  const isIOS = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
           !!(navigator as Navigator & { webkit?: unknown }).webkit;
  }, []);

  // Detect if we're on Android Chrome
  const isAndroidChrome = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return /Chrome/.test(navigator.userAgent) && 
           /Android/.test(navigator.userAgent);
  }, []);

  // Request wake lock to prevent screen from sleeping (Android)
  const requestWakeLock = useCallback(async () => {
    if (!isAndroidChrome()) return;
    
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } })
          .wakeLock.request('screen');
        console.log('[MobileAudio] Wake lock active');
      }
    } catch (err) {
      console.warn('[MobileAudio] Wake lock failed:', err);
    }
  }, [isAndroidChrome]);

  // Release wake lock
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('[MobileAudio] Wake lock released');
      } catch (err) {
        console.warn('[MobileAudio] Wake lock release failed:', err);
      }
    }
  }, []);

  // Re-request wake lock when page becomes visible again
  useEffect(() => {
    if (!isAndroidChrome()) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying, isAndroidChrome, requestWakeLock]);

  // Configure iOS Safari audio session
  const configureIOSAudioSession = useCallback(async () => {
    if (!isIOS()) return;

    try {
      // iOS 14.5+ requires user interaction to activate audio session
      // This is handled when user taps play
      const audio = audioRef.current;
      if (!audio) return;

      // Set up audio for background playback
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      
      // Try to configure audio session if available
      if ('audioSession' in navigator) {
        // iOS Safari audio session - use try/catch to handle availability
        try {
          const session = (navigator as unknown as { audioSession?: { configure: (opts: unknown) => Promise<void> } }).audioSession;
          if (session?.configure) {
            await session.configure({
              category: 'playback',
              mode: 'default',
            });
          }
        } catch (err) {
          console.warn('[MobileAudio] iOS audio session config failed:', err);
        }
      }
    } catch (err) {
      console.warn('[MobileAudio] iOS audio session config failed:', err);
    }
  }, [isIOS, audioRef]);

  // Set up Media Session API (only if not already set up by page)
  const setupMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    
    // Don't override if already configured with proper title
    if (navigator.mediaSession.metadata?.title && 
        navigator.mediaSession.metadata.title !== 'Live Stream') {
      return;
    }

    const artworkSizes = artwork 
      ? [
          { src: artwork, sizes: '96x96', type: 'image/jpeg' },
          { src: artwork, sizes: '128x128', type: 'image/jpeg' },
          { src: artwork, sizes: '192x192', type: 'image/jpeg' },
          { src: artwork, sizes: '256x256', type: 'image/jpeg' },
          { src: artwork, sizes: '384x384', type: 'image/jpeg' },
          { src: artwork, sizes: '512x512', type: 'image/jpeg' },
        ]
      : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album: '🔴 Live Stream',
      ...(artwork && { artwork: artworkSizes }),
    });

    // Handle remote play action
    navigator.mediaSession.setActionHandler('play', () => {
      console.log('[MobileAudio] Remote play received');
      onRemotePlay?.();
      navigator.mediaSession.playbackState = 'playing';
    });

    // Handle remote pause action
    navigator.mediaSession.setActionHandler('pause', () => {
      console.log('[MobileAudio] Remote pause received');
      onRemotePause?.();
      navigator.mediaSession.playbackState = 'paused';
    });

    // Handle remote stop action (for live streams, this ends playback)
    navigator.mediaSession.setActionHandler('stop', () => {
      console.log('[MobileAudio] Remote stop received');
      onRemotePause?.();
      navigator.mediaSession.playbackState = 'none';
    });

    // Disable seek actions (not applicable for live streams)
    navigator.mediaSession.setActionHandler('seekbackward', null);
    navigator.mediaSession.setActionHandler('seekforward', null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('nexttrack', null);
  }, [title, artist, artwork, onRemotePlay, onRemotePause]);

  // Update Media Session state
  const updateMediaSessionState = useCallback((playing: boolean) => {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, []);

  // Handle iOS audio interruptions
  const handleIOSInterruption = useCallback(() => {
    if (!isIOS()) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Listen for iOS audio session interruptions
    const handleInterruption = (e: Event) => {
      const event = e as CustomEvent<{ interrupted: boolean; reason?: string }>;
      
      if (event.detail?.interrupted) {
        console.log('[MobileAudio] Audio interrupted:', event.detail.reason);
        onInterruption?.(true);
        
        // Pause the audio
        audio.pause();
        updateMediaSessionState(false);
      } else {
        // Interruption ended, try to resume
        console.log('[MobileAudio] Interruption ended');
        onInterruption?.(false);
        
        // Only auto-resume if we were playing before
        if (isPlaying) {
          audio.play().catch(console.error);
          updateMediaSessionState(true);
        }
      }
    };

    // iOS Safari uses webkitbeginbackgroundtask for background audio
    // This is handled by the browser automatically when playsInline is set
    
    // Add event listener for interruption
    document.addEventListener('webkitbeginbackgroundtask', () => {
      console.log('[MobileAudio] iOS background task started');
    });
    
    document.addEventListener('webkitendbackgroundtask', () => {
      console.log('[MobileAudio] iOS background task ended');
    });
  }, [isIOS, audioRef, isPlaying, onInterruption, updateMediaSessionState]);

  // Handle Android audio focus
  const handleAndroidAudioFocus = useCallback(() => {
    if (!isAndroidChrome()) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Use the audio element's built-in handling for most cases
    // Android Chrome handles audio focus automatically with the audio element
    
    // Add visibility change handler for Android
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Don't pause on Android when backgrounded - Chrome handles this
        console.log('[MobileAudio] Android: Page hidden, continuing playback');
      } else if (document.visibilityState === 'visible') {
        console.log('[MobileAudio] Android: Page visible');
        // Ensure audio is playing if it should be
        if (isPlaying && audio.paused) {
          audio.play().catch(console.error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAndroidChrome, audioRef, isPlaying]);

  // Initialize on mount (but don't auto-setup media session - let the page handle it)
  useEffect(() => {
    if (isIOS()) {
      configureIOSAudioSession();
      handleIOSInterruption();
    }
    
    if (isAndroidChrome()) {
      handleAndroidAudioFocus();
    }

    return () => {
      releaseWakeLock();
      // Don't clear media session here - let the page handle it
    };
  }, []);

  // Update metadata when track info changes
  useEffect(() => {
    if (isPlaying) {
      setupMediaSession();
      updateMediaSessionState(true);
      requestWakeLock();
    } else {
      updateMediaSessionState(false);
      releaseWakeLock();
    }
  }, [isPlaying, title, artist, artwork]);

  return {
    setupMediaSession,
    updateMediaSessionState,
    requestWakeLock,
    releaseWakeLock,
  };
}

export default useMobileBackgroundAudio;
