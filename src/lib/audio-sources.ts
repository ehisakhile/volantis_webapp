"use client";

/**
 * Modular Audio Source Architecture
 * 
 * This module provides a clean separation of concerns for audio sources,
 * making it easy to add new source types without modifying existing code.
 * 
 * Design Principles:
 * - Each audio source is encapsulated in its own class
 * - The AudioSourceManager handles source selection and lifecycle
 * - Sources can be easily extended or swapped
 * - Backward compatibility is maintained with existing utilities
 */

import {
  captureMicrophone,
  captureSystemAudio,
  mixAudioStreams,
  getAudioInputDevices,
} from './webrtc-utils';

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────

export interface AudioSourceConfig {
  /** Unique identifier for this source */
  id: string;
  /** Human-readable name */
  name: string;
  /** Whether this source is currently active */
  isActive: boolean;
  /** Optional device ID for microphone sources */
  deviceId?: string;
}

export interface AudioSourceResult {
  /** The captured media stream */
  stream: MediaStream;
  /** Optional cleanup function */
  cleanup?: () => void;
}

export type AudioSourceType = 'microphone' | 'system' | 'mixed';

export interface AudioSourceState {
  useMic: boolean;
  useSystemAudio: boolean;
  mixAudio: boolean;
  selectedMicDevice: string;
}

// ─────────────────────────────────────────────
// Abstract Base Class
// ─────────────────────────────────────────────

/**
 * Base class for all audio sources.
 * Provides a common interface for capturing and managing audio streams.
 */
export abstract class AudioSource {
  protected config: AudioSourceConfig;
  protected stream: MediaStream | null = null;

  constructor(config: AudioSourceConfig) {
    this.config = config;
  }

  /** Unique identifier */
  get id(): string {
    return this.config.id;
  }

  /** Human-readable name */
  get name(): string {
    return this.config.name;
  }

  /** Whether this source is currently active */
  get active(): boolean {
    return this.config.isActive;
  }

  /** Get the current audio stream */
  get currentStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Capture the audio stream.
   * Must be implemented by subclasses.
   */
  abstract capture(): Promise<AudioSourceResult>;

  /**
   * Stop the audio source and release resources.
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.config.isActive = false;
  }

  /**
   * Validate the source configuration.
   * Returns an error message if invalid, null if valid.
   */
  validate(): string | null {
    return null; // Base implementation always valid
  }
}

// ─────────────────────────────────────────────
// Concrete Implementations
// ─────────────────────────────────────────────

/**
 * Microphone audio source.
 * Captures audio from the user's microphone.
 */
export class MicrophoneAudioSource extends AudioSource {
  private deviceId?: string;

  constructor(deviceId?: string) {
    super({
      id: 'microphone',
      name: 'Microphone',
      isActive: false,
      deviceId,
    });
    this.deviceId = deviceId;
  }

  /** Update the device ID */
  setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
    this.config.deviceId = deviceId;
  }

  /** Get available microphone devices */
  static async getDevices(): Promise<MediaDeviceInfo[]> {
    return getAudioInputDevices();
  }

  override validate(): string | null {
    if (!this.deviceId && !navigator.mediaDevices) {
      return 'Microphone not available';
    }
    return null;
  }

  override async capture(): Promise<AudioSourceResult> {
    console.log(`Capturing microphone with device: ${this.deviceId || 'default'}`);
    
    const stream = await captureMicrophone(this.deviceId);
    this.stream = stream;
    this.config.isActive = true;
    
    console.log('Microphone captured');
    
    return {
      stream,
      cleanup: () => this.stop(),
    };
  }
}

/**
 * System audio source.
 * Captures audio from the user's system (screen sharing audio).
 */
export class SystemAudioSource extends AudioSource {
  constructor() {
    super({
      id: 'system',
      name: 'System Audio',
      isActive: false,
    });
  }

  override async capture(): Promise<AudioSourceResult> {
    console.log('Capturing system audio...');
    
    const stream = await captureSystemAudio();
    this.stream = stream;
    this.config.isActive = true;
    
    console.log('System audio captured');
    
    return {
      stream,
      cleanup: () => this.stop(),
    };
  }
}

/**
 * Mixed audio source.
 * Combines multiple audio sources into one stream.
 */
export class MixedAudioSource extends AudioSource {
  private sources: AudioSource[];
  private originalStreams: MediaStream[] = [];

  constructor(sources: AudioSource[]) {
    super({
      id: 'mixed',
      name: 'Mixed Audio',
      isActive: false,
    });
    this.sources = sources;
  }

  /** Add an audio source to the mix */
  addSource(source: AudioSource): void {
    this.sources.push(source);
  }

  /** Remove an audio source from the mix */
  removeSource(sourceId: string): void {
    this.sources = this.sources.filter(s => s.id !== sourceId);
  }

  override validate(): string | null {
    if (this.sources.length === 0) {
      return 'Mixed source requires at least one audio source';
    }
    
    for (const source of this.sources) {
      const error = source.validate();
      if (error) {
        return `Invalid source: ${error}`;
      }
    }
    
    return null;
  }

  override async capture(): Promise<AudioSourceResult> {
    console.log('Capturing mixed audio from sources:', this.sources.map(s => s.name).join(', '));
    
    // Capture all sources
    const results = await Promise.all(
      this.sources.map(async (source) => {
        const result = await source.capture();
        this.originalStreams.push(result.stream);
        return result;
      })
    );
    
    // Mix all streams together
    const mixedStream = mixAudioStreams(this.originalStreams);
    this.stream = mixedStream;
    this.config.isActive = true;
    
    console.log('Audio streams mixed');
    
    return {
      stream: mixedStream,
      cleanup: () => {
        // Stop all original sources
        this.sources.forEach(source => source.stop());
        this.originalStreams = [];
        this.stop();
      },
    };
  }

  override stop(): void {
    super.stop();
    this.originalStreams = [];
  }
}

// ─────────────────────────────────────────────
// Audio Source Manager
// ─────────────────────────────────────────────

/**
 * Manages audio source selection and lifecycle.
 * Provides a unified interface for handling multiple audio sources.
 */
export class AudioSourceManager {
  private microphoneSource: MicrophoneAudioSource;
  private systemAudioSource: SystemAudioSource;
  private mixedSource: MixedAudioSource | null = null;
  private activeSource: AudioSource | null = null;
  
  private state: AudioSourceState = {
    useMic: true,
    useSystemAudio: false,
    mixAudio: false,
    selectedMicDevice: '',
  };

  constructor() {
    this.microphoneSource = new MicrophoneAudioSource();
    this.systemAudioSource = new SystemAudioSource();
  }

  /** Get current state */
  getState(): AudioSourceState {
    return { ...this.state };
  }

  /** Update microphone enabled state */
  setUseMic(enabled: boolean): void {
    this.state.useMic = enabled;
  }

  /** Update system audio enabled state */
  setUseSystemAudio(enabled: boolean): void {
    this.state.useSystemAudio = enabled;
  }

  /** Update mixed audio state */
  setMixAudio(enabled: boolean): void {
    this.state.mixAudio = enabled;
  }

  /** Update selected microphone device */
  setSelectedMicDevice(deviceId: string): void {
    this.state.selectedMicDevice = deviceId;
    this.microphoneSource.setDeviceId(deviceId);
  }

  /** Check if configuration is valid */
  validate(): string | null {
    if (!this.state.useMic && !this.state.useSystemAudio) {
      return 'Select at least one audio source';
    }

    if (this.state.mixAudio && (!this.state.useMic || !this.state.useSystemAudio)) {
      return 'Mix requires both Microphone and System Audio';
    }

    return null;
  }

  /** Get list of available microphone devices */
  async getMicrophoneDevices(): Promise<MediaDeviceInfo[]> {
    return MicrophoneAudioSource.getDevices();
  }

  /**
   * Capture audio based on current configuration.
   * Returns the appropriate stream based on user selection.
   */
  async capture(): Promise<AudioSourceResult> {
    // Validate before capturing
    const validationError = this.validate();
    if (validationError) {
      throw new Error(validationError);
    }

    const { useMic, useSystemAudio, mixAudio, selectedMicDevice } = this.state;

    // Reconfigure microphone source with selected device
    if (selectedMicDevice) {
      this.microphoneSource.setDeviceId(selectedMicDevice);
    }

    if (useMic && !useSystemAudio) {
      // Microphone only
      console.log('Using: Microphone only');
      this.activeSource = this.microphoneSource;
      return this.microphoneSource.capture();
    } 
    else if (useSystemAudio && !useMic) {
      // System audio only
      console.log('Using: System audio only');
      this.activeSource = this.systemAudioSource;
      return this.systemAudioSource.capture();
    } 
    else if (useMic && useSystemAudio && mixAudio) {
      // Mixed audio
      console.log('Using: Mixed audio (Microphone + System)');
      this.mixedSource = new MixedAudioSource([
        new MicrophoneAudioSource(selectedMicDevice),
        new SystemAudioSource(),
      ]);
      this.activeSource = this.mixedSource;
      return this.mixedSource.capture();
    } 
    else if (useMic && useSystemAudio && !mixAudio) {
      // Both selected but not mixed - use system audio (default behavior)
      console.log('Using: System audio (both selected, not mixed)');
      this.activeSource = this.systemAudioSource;
      return this.systemAudioSource.capture();
    }

    throw new Error('Invalid audio source configuration');
  }

  /** Stop all audio sources and release resources */
  stopAll(): void {
    if (this.activeSource) {
      this.activeSource.stop();
      this.activeSource = null;
    }
    
    // Also stop individual sources
    this.microphoneSource.stop();
    this.systemAudioSource.stop();
    
    if (this.mixedSource) {
      this.mixedSource.stop();
      this.mixedSource = null;
    }
  }

  /** Get the current active source */
  getActiveSource(): AudioSource | null {
    return this.activeSource;
  }

  /** Get stream from active source */
  getCurrentStream(): MediaStream | null {
    return this.activeSource?.currentStream ?? null;
  }
}

// ─────────────────────────────────────────────
// Background Audio Source (for playlist/background music)
// ─────────────────────────────────────────────

/**
 * Background audio source for playing local audio files (MP3/WAV/OGG)
 * through the AudioContext for use with MixerEngine.
 */
export class BackgroundAudioSource extends AudioSource {
  private file: File;
  private loop: boolean;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private isPlaying: boolean = false;

  constructor(file: File, loop = true) {
    super({
      id: 'background',
      name: 'Background Audio',
      isActive: false,
    });
    this.file = file;
    this.loop = loop;
  }

  /** Set loop mode */
  setLoop(loop: boolean): void {
    this.loop = loop;
    if (this.sourceNode) {
      this.sourceNode.loop = loop;
    }
  }

  /** Get loop mode */
  getLoop(): boolean {
    return this.loop;
  }

  /** Get the audio duration in seconds */
  get duration(): number {
    return this.audioBuffer?.duration || 0;
  }

  override async capture(): Promise<AudioSourceResult> {
    console.log(`[BackgroundAudio] Loading file: ${this.file.name}`);
    
    // We need an AudioContext - create one or use existing
    let audioCtx: AudioContext;
    try {
      // Try to get existing context from window
      const existingCtx = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (existingCtx) {
        audioCtx = new existingCtx();
      } else {
        audioCtx = new AudioContext();
      }
    } catch {
      throw new Error('Failed to create AudioContext');
    }

    // Resume if suspended
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    // Decode the audio file
    try {
      const arrayBuffer = await this.file.arrayBuffer();
      this.audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      console.log(`[BackgroundAudio] Decoded: ${this.audioBuffer.duration.toFixed(2)}s`);
    } catch (err) {
      console.error('[BackgroundAudio] Failed to decode audio:', err);
      throw new Error(`Failed to decode audio file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Create destination node for output stream
    this.destinationNode = audioCtx.createMediaStreamDestination();

    // Create buffer source
    this.sourceNode = audioCtx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = this.loop;

    // Connect: source -> destination (for WebRTC stream ONLY)
    // Do NOT connect to audioCtx.destination - that would play through speakers
    this.sourceNode.connect(this.destinationNode);

    // Start playback
    this.sourceNode.start(0);
    this.isPlaying = true;
    this.config.isActive = true;

    console.log('[BackgroundAudio] Started playback');

    // Get the output stream
    const stream = this.destinationNode.stream;

    return {
      stream,
      cleanup: () => this.stop(),
    };
  }

  override stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
      } catch (e) {
        // Ignore if already stopped
      }
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.destinationNode) {
      this.destinationNode.disconnect();
      this.destinationNode = null;
    }

    this.isPlaying = false;
    this.config.isActive = false;
    console.log('[BackgroundAudio] Stopped');
  }

  /** Seek to a specific position (0-1) */
  seek(position: number): void {
    if (!this.sourceNode || !this.audioBuffer) return;
    
    const clampedPosition = Math.max(0, Math.min(1, position));
    const startTime = this.audioBuffer.duration * clampedPosition;
    
    this.sourceNode.stop();
    this.sourceNode = null;
    
    // Recreate source node at new position
    const audioCtx = this.destinationNode?.context;
    if (!audioCtx || !this.destinationNode) return;

    this.sourceNode = audioCtx.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.loop = this.loop;
    this.sourceNode.connect(this.destinationNode);
    this.sourceNode.connect(audioCtx.destination);
    this.sourceNode.start(0, startTime);
  }

  /** Pause playback */
  pause(): void {
    if (this.sourceNode && this.isPlaying) {
      // Note: AudioBufferSourceNode doesn't support pause, so we'd need to stop and track position
      this.isPlaying = false;
    }
  }

  /** Resume playback */
  resume(): void {
    if (this.sourceNode && !this.isPlaying) {
      // Similar limitation - would need to track position
      this.isPlaying = true;
    }
  }
}

// ─────────────────────────────────────────────
// Factory Functions (for convenience)
// ─────────────────────────────────────────────

/**
 * Create a microphone audio source with optional device ID.
 */
export function createMicrophoneSource(deviceId?: string): MicrophoneAudioSource {
  return new MicrophoneAudioSource(deviceId);
}

/**
 * Create a system audio source.
 */
export function createSystemAudioSource(): SystemAudioSource {
  return new SystemAudioSource();
}

/**
 * Create a mixed audio source from multiple sources.
 */
export function createMixedSource(sources: AudioSource[]): MixedAudioSource {
  return new MixedAudioSource(sources);
}

/**
 * Create a background audio source from a file.
 */
export function createBackgroundAudioSource(file: File, loop = true): BackgroundAudioSource {
  return new BackgroundAudioSource(file, loop);
}

/**
 * Create a new AudioSourceManager instance.
 */
export function createAudioSourceManager(): AudioSourceManager {
  return new AudioSourceManager();
}