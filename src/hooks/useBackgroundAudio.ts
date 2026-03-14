import { useRef, useCallback, useEffect } from 'react';

interface UseBackgroundAudioProps {
  title?: string;
  artist?: string;
  artwork?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

export function useBackgroundAudio({
  title,
  artist,
  artwork,
  onPlay,
  onPause,
  onStop,
}: UseBackgroundAudioProps = {}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volumeRef = useRef(0.8);
  const isInitializedRef = useRef(false);

  // Initialize audio element
  const initializeAudio = useCallback((stream: MediaStream) => {
    if (audioRef.current) {
      // Clean up existing audio
      audioRef.current.pause();
      audioRef.current.srcObject = null;
    }

    const audio = new Audio();
    
    // Critical for mobile background playback
    audio.setAttribute('playsinline', '');
    audio.setAttribute('webkit-playsinline', '');
    audio.setAttribute('x-webkit-airplay', 'allow');
    
    // Configure for background playback
    audio.controls = false;
    audio.autoplay = true;
    
    // Enable background audio on iOS
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: title || 'Live Stream',
          artist: artist || 'Channel',
          album: 'Volantis Live',
          artwork: artwork ? [
            { src: artwork, sizes: '512x512', type: 'image/png' }
          ] : []
        });

        navigator.mediaSession.playbackState = 'playing';
      } catch (e) {
        console.warn('MediaSession not fully supported:', e);
      }
    }

    audio.srcObject = stream;
    audio.volume = volumeRef.current;
    
    audioRef.current = audio;
    isInitializedRef.current = true;

    // Auto-play with error handling
    audio.play().catch(err => {
      console.log('Auto-play prevented, waiting for user interaction:', err);
      isInitializedRef.current = false;
    });

    return audio;
  }, [title, artist, artwork]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    volumeRef.current = Math.max(0, Math.min(1, volume));
    if (audioRef.current) {
      audioRef.current.volume = volumeRef.current;
    }
  }, []);

  // Play
  const play = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play()
        .then(() => {
          isInitializedRef.current = true;
          onPlay?.();
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        })
        .catch(err => {
          console.error('Playback failed:', err);
          isInitializedRef.current = false;
        });
    }
  }, [onPlay]);

  // Pause
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      onPause?.();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
  }, [onPause]);

  // Stop and cleanup
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
      isInitializedRef.current = false;
      onStop?.();
      
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = null;
      }
    }
  }, [onStop]);

  // Get current state
  const getState = useCallback(() => ({
    isPlaying: audioRef.current ? !audioRef.current.paused : false,
    volume: volumeRef.current,
    isInitialized: isInitializedRef.current,
  }), []);

  // Cleanup on unmount (but don't stop if we want background playback)
  useEffect(() => {
    return () => {
      // Only fully cleanup if component is unmounting and page is closing
      if (document.visibilityState === 'visible') {
        // User is navigating away, stop playback
        stop();
      }
      // If page is hidden, let it continue playing in background
    };
  }, [stop]);

  return {
    audioRef,
    initializeAudio,
    setVolume,
    play,
    pause,
    stop,
    getState,
  };
}