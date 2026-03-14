import { useEffect } from 'react';

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
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      // Set metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Live Stream',
        artist: artist || 'Channel',
        album: 'Volantis Live',
        artwork: artwork ? [
          { src: artwork, sizes: '96x96', type: 'image/png' },
          { src: artwork, sizes: '128x128', type: 'image/png' },
          { src: artwork, sizes: '192x192', type: 'image/png' },
          { src: artwork, sizes: '256x256', type: 'image/png' },
          { src: artwork, sizes: '384x384', type: 'image/png' },
          { src: artwork, sizes: '512x512', type: 'image/png' },
        ] : []
      });

      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Set action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        onPlay?.();
        navigator.mediaSession.playbackState = 'playing';
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        onPause?.();
        navigator.mediaSession.playbackState = 'paused';
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        onStop?.();
        navigator.mediaSession.playbackState = 'none';
      });

      // These are optional for live streams
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);

    } catch (e) {
      console.warn('MediaSession setup failed:', e);
    }

    return () => {
      if ('mediaSession' in navigator) {
        // Clear metadata but don't remove action handlers
        navigator.mediaSession.metadata = null;
      }
    };
  }, [title, artist, artwork, isPlaying, onPlay, onPause, onStop]);
}