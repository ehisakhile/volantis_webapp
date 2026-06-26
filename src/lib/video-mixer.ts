"use client";

import { captureCamera, captureScreen, type CameraStreamResult, type ScreenCaptureResult } from './video-capture';
import { captureMicSource, captureSystemSource } from './webrtc-utils';

export type VideoSourceType = 'camera' | 'screen';
export type AudioSourceType = 'mic' | 'system' | 'both';

export interface VideoMixerSource {
  id: string;
  type: VideoSourceType;
  label: string;
  stream: MediaStream;
  deviceId?: string;
  videoTrack: MediaStreamVideoTrack | null;
}

export interface AudioMixerSource {
  id: string;
  type: AudioSourceType;
  label: string;
  stream: MediaStream;
  track: MediaStreamAudioTrack | null;
}

export class VideoMixer {
  private videoSource: VideoMixerSource | null = null;
  private audioSources: AudioMixerSource[] = [];
  private outputStream: MediaStream | null = null;
  private isDestroyed: boolean = false;

  constructor() {
    this.outputStream = new MediaStream();
  }

  get currentVideoSource(): VideoMixerSource | null {
    return this.videoSource;
  }

  get currentAudioSources(): AudioMixerSource[] {
    return this.audioSources;
  }

  get stream(): MediaStream {
    return this.outputStream || new MediaStream();
  }

  async setVideoSource(
    type: VideoSourceType,
    deviceId?: string
  ): Promise<VideoMixerSource> {
    this.clearVideoSource();

    let result: CameraStreamResult | ScreenCaptureResult;

    if (type === 'camera') {
      result = await captureCamera({ deviceId });
    } else {
      result = await captureScreen({ deviceId });
    }

    const videoTrack = result.stream.getVideoTracks()[0];

    this.videoSource = {
      id: `${type}-${Date.now()}`,
      type,
      label: videoTrack.label || type,
      stream: result.stream,
      deviceId: (result as CameraStreamResult).deviceId,
      videoTrack,
    };

    this.addTrackToOutput(videoTrack);

    console.log(`[VideoMixer] Set video source: ${type}`);
    return this.videoSource;
  }

  clearVideoSource(): void {
    if (this.videoSource) {
      this.removeTrackFromOutput(this.videoSource.videoTrack!);
      this.videoSource.stream.getTracks().forEach(t => t.stop());
      this.videoSource = null;
    }
  }

  async addAudioSource(type: AudioSourceType): Promise<AudioMixerSource> {
    let stream: MediaStream;

    if (type === 'mic') {
      stream = await captureMicSource();
    } else if (type === 'system') {
      stream = await captureSystemSource();
    } else if (type === 'both') {
      const micStream = await captureMicSource();
      const systemStream = await captureSystemSource();
      
      const combinedStream = new MediaStream([
        ...micStream.getAudioTracks(),
        ...systemStream.getAudioTracks(),
      ]);
      stream = combinedStream;
    } else {
      throw new Error(`Unknown audio source type: ${type}`);
    }

    const audioTrack = stream.getAudioTracks()[0];

    const audioSource: AudioMixerSource = {
      id: `audio-${type}-${Date.now()}`,
      type,
      label: type === 'mic' ? 'Microphone' : type === 'system' ? 'System Audio' : 'Mixed Audio',
      stream,
      track: audioTrack,
    };

    this.audioSources.push(audioSource);
    this.addTrackToOutput(audioTrack);

    console.log(`[VideoMixer] Added audio source: ${type}`);
    return audioSource;
  }

  removeAudioSource(id: string): void {
    const index = this.audioSources.findIndex(s => s.id === id);
    if (index !== -1) {
      const source = this.audioSources[index];
      this.removeTrackFromOutput(source.track!);
      source.stream.getTracks().forEach(t => t.stop());
      this.audioSources.splice(index, 1);
      console.log(`[VideoMixer] Removed audio source: ${source.id}`);
    }
  }

  muteVideo(muted: boolean): void {
    if (this.videoSource?.videoTrack) {
      this.videoSource.videoTrack.enabled = !muted;
    }
  }

  muteAudio(muted: boolean, sourceId?: string): void {
    if (sourceId) {
      const source = this.audioSources.find(s => s.id === sourceId);
      if (source?.track) {
        source.track.enabled = !muted;
      }
    } else {
      this.audioSources.forEach(source => {
        if (source.track) {
          source.track.enabled = !muted;
        }
      });
    }
  }

  private addTrackToOutput(track: MediaStreamTrack): void {
    if (this.outputStream && !this.outputStream.getTracks().includes(track)) {
      this.outputStream.addTrack(track);
    }
  }

  private removeTrackFromOutput(track: MediaStreamTrack): void {
    if (this.outputStream) {
      this.outputStream.removeTrack(track);
    }
  }

  destroy(): void {
    if (this.isDestroyed) return;

    this.clearVideoSource();

    this.audioSources.forEach(source => {
      this.removeTrackFromOutput(source.track!);
      source.stream.getTracks().forEach(t => t.stop());
    });
    this.audioSources = [];

    this.outputStream = null;
    this.isDestroyed = true;
    console.log('[VideoMixer] Destroyed');
  }
}

export function createVideoMixer(): VideoMixer {
  return new VideoMixer();
}