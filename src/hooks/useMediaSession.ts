import { useEffect, useRef } from 'react';

interface MediaSessionProps {
  title: string;
  artist: string;
  artwork?: string;
  isPlaying: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
}

export function useMediaSession({
  title,
  artist,
  artwork,
  isPlaying,
  onPlay,
  onPause,
  onStop,
}: MediaSessionProps) {
  const handlersRef = useRef({ onPlay, onPause, onStop });

  useEffect(() => {
    handlersRef.current = { onPlay, onPause, onStop };
  }, [onPlay, onPause, onStop]);

  // Metadata is independent from playback state and control callbacks. Keeping
  // this effect stable prevents browsers from downloading the artwork again
  // whenever viewer counts or WebRTC state cause the player to re-render.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Live Stream',
        artist: artist || 'Channel',
        album: 'Volantis Live',
        artwork: artwork ? [{ src: artwork }] : [],
      });
    } catch (e) {
      console.warn('MediaSession setup failed:', e);
    }

    return () => {
      if ('mediaSession' in navigator) {
        // Clear metadata but don't remove action handlers
        navigator.mediaSession.metadata = null;
      }
    };
  }, [title, artist, artwork]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => {
      handlersRef.current.onPlay?.();
      navigator.mediaSession.playbackState = 'playing';
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      handlersRef.current.onPause?.();
      navigator.mediaSession.playbackState = 'paused';
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      handlersRef.current.onStop?.();
      navigator.mediaSession.playbackState = 'none';
    });
    navigator.mediaSession.setActionHandler('seekbackward', null);
    navigator.mediaSession.setActionHandler('seekforward', null);
    navigator.mediaSession.setActionHandler('previoustrack', null);
    navigator.mediaSession.setActionHandler('nexttrack', null);
  }, []);
}
