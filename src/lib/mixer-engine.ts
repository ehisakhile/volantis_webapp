"use client";

/**
 * MixerEngine - Core Web Audio Mix Bus
 * 
 * This module provides a complete audio mixing solution that sits on top
 * of the existing WebRTC pipeline. Instead of routing a single MediaStream
 * into the RTCPeerConnection, we route an AudioContext-powered mix bus
 * whose output goes into the peer connection.
 * 
 * Audio Flow:
 * Mic Source ──┐
 *              ├──► GainNode ──► MixBus (DestinationNode) ──► RTCPeerConnection
 * System Src ──┤
 *              │
 * Background ──┘
 */

import { captureMicrophone, captureSystemAudio, getAudioInputDevices } from './webrtc-utils';

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────

export type ChannelType = 'mic' | 'system' | 'background';

export interface MixerChannel {
  id: string;
  label: string;
  type: ChannelType;
  gainNode: GainNode;
  analyserNode: AnalyserNode;
  sourceNode: MediaStreamAudioSourceNode;
  stream: MediaStream;
  isMuted: boolean;
  volume: number; // 0-100 (maps to gainNode.gain)
  deviceId?: string; // For microphone sources
}

export interface MixerEngineConfig {
  /** AudioContext sample rate (default: 44100) */
  sampleRate?: number;
}

// ─────────────────────────────────────────────
// MixerEngine Class
// ─────────────────────────────────────────────

/**
 * Main mixer engine class that manages all audio channels
 * and provides the final output stream for WebRTC.
 */
export class MixerEngine {
  private audioCtx: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private masterGain: GainNode;
  private masterAnalyser: AnalyserNode;
  private channels: Map<string, MixerChannel> = new Map();
  private isDestroyed: boolean = false;

  constructor(config?: MixerEngineConfig) {
    // Create AudioContext with specified sample rate
    const sampleRate = config?.sampleRate || 44100;
    
    // Try to use existing context or create new one
    const existingCtx = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (existingCtx) {
      this.audioCtx = new existingCtx() as AudioContext;
    } else {
      this.audioCtx = new AudioContext({ sampleRate });
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    // Create master destination node (output to WebRTC)
    this.destination = this.audioCtx.createMediaStreamDestination();
    
    // Create master gain node for overall volume control
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = 1.0;
    
    // Create master analyser for VU meter
    this.masterAnalyser = this.audioCtx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.8;
    
    // Connect master chain: masterGain -> masterAnalyser -> destination
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.destination);

    console.log('[MixerEngine] Created with sample rate:', this.audioCtx.sampleRate);
  }

  /**
   * Get the output stream to feed into RTCPeerConnection
   * This stream must never have its track removed while streaming
   */
  get outputStream(): MediaStream {
    return this.destination.stream;
  }

  /**
   * Get the AudioContext for external use
   */
  get context(): AudioContext {
    return this.audioCtx;
  }

  /**
   * Get all channels
   */
  get allChannels(): MixerChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get a specific channel by ID
   */
  getChannel(id: string): MixerChannel | undefined {
    return this.channels.get(id);
  }

  /**
   * Add a new channel from an existing MediaStream
   * 
   * @param id - Unique identifier for the channel
   * @param label - Display name (e.g., "MIC", "ANY INPUT", "BACKGROUND")
   * @param type - Type of audio source
   * @param stream - The MediaStream to add
   * @param deviceId - Optional device ID for microphone sources
   */
  addChannel(id: string, label: string, type: ChannelType, stream: MediaStream, deviceId?: string): MixerChannel {
    if (this.isDestroyed) {
      throw new Error('MixerEngine has been destroyed');
    }

    // Check if channel already exists
    if (this.channels.has(id)) {
      console.warn(`[MixerEngine] Channel ${id} already exists, replacing...`);
      this.removeChannel(id);
    }

    // Create source node from the stream
    const sourceNode = this.audioCtx.createMediaStreamSource(stream);
    
    // Create gain node for volume control
    const gainNode = this.audioCtx.createGain();
    gainNode.gain.value = 0.75; // Default volume (75%)
    
    // Create analyser node for VU meter visualization
    const analyserNode = this.audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;

    // Connect the chain: source -> gain -> analyser -> master -> destination
    sourceNode.connect(gainNode);
    gainNode.connect(analyserNode);
    analyserNode.connect(this.masterGain);

    const channel: MixerChannel = {
      id,
      label,
      type,
      gainNode,
      analyserNode,
      sourceNode,
      stream,
      isMuted: false,
      volume: 75, // Default 75%
      deviceId,
    };

    this.channels.set(id, channel);
    console.log(`[MixerEngine] Added channel: ${label} (${id})`);

    return channel;
  }

  /**
   * Remove a channel (hot-swap safe)
   * Disconnects nodes but keeps the mix bus intact
   */
  removeChannel(id: string): void {
    const channel = this.channels.get(id);
    if (!channel) {
      console.warn(`[MixerEngine] Channel ${id} not found`);
      return;
    }

    // Disconnect all nodes
    channel.sourceNode.disconnect();
    channel.gainNode.disconnect();
    channel.analyserNode.disconnect();

    // Stop the stream tracks
    channel.stream.getTracks().forEach(track => track.stop());

    this.channels.delete(id);
    console.log(`[MixerEngine] Removed channel: ${channel.label} (${id})`);
  }

  /**
   * Set volume for a channel (0-100)
   * Uses setTargetAtTime for smooth transitions (no audio pops)
   */
  setVolume(id: string, volume: number): void {
    const channel = this.channels.get(id);
    if (!channel) {
      console.warn(`[MixerEngine] Channel ${id} not found`);
      return;
    }

    // Clamp volume to 0-100
    const clampedVolume = Math.max(0, Math.min(100, volume));
    channel.volume = clampedVolume;

    // Map 0-100 to gain value (0.0 to 1.5 for extra headroom)
    const gainValue = (clampedVolume / 100) * 1.5;
    
    // Use setTargetAtTime for smooth transitions
    const currentTime = this.audioCtx.currentTime;
    channel.gainNode.gain.setTargetAtTime(gainValue, currentTime, 0.02);

    console.log(`[MixerEngine] Set volume for ${channel.label}: ${clampedVolume}%`);
  }

  /**
   * Toggle mute for a channel
   * When muted, gain is set to 0 but volume setting is preserved
   */
  setMute(id: string, muted: boolean): void {
    const channel = this.channels.get(id);
    if (!channel) {
      console.warn(`[MixerEngine] Channel ${id} not found`);
      return;
    }

    channel.isMuted = muted;
    
    // Use setTargetAtTime for smooth mute/unmute
    const currentTime = this.audioCtx.currentTime;
    const targetGain = muted ? 0 : (channel.volume / 100) * 1.5;
    channel.gainNode.gain.setTargetAtTime(targetGain, currentTime, 0.02);

    console.log(`[MixerEngine] ${muted ? 'Muted' : 'Unmuted'} channel: ${channel.label}`);
  }

  /**
   * Get current RMS level for VU meter (0-1)
   * Uses analyser node to get frequency data
   */
  getLevel(id: string): number {
    const channel = this.channels.get(id);
    if (!channel) {
      return 0;
    }

    return this.calculateLevel(channel.analyserNode);
  }

  /**
   * Get master output level for VU meter (0-1)
   */
  getMasterLevel(): number {
    return this.calculateLevel(this.masterAnalyser);
  }

  /**
   * Calculate RMS level from analyser node
   */
  private calculateLevel(analyser: AnalyserNode): number {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = dataArray[i] / 255;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Scale to 0-1 with some headroom
    return Math.min(1, rms * 2);
  }

  /**
   * Replace the stream source on an existing channel (hot-swap)
   * Disconnects old sourceNode, connects new one - gainNode stays intact
   */
  replaceSource(id: string, newStream: MediaStream, newDeviceId?: string): void {
    const channel = this.channels.get(id);
    if (!channel) {
      console.warn(`[MixerEngine] Channel ${id} not found`);
      return;
    }

    // Disconnect old source
    channel.sourceNode.disconnect();

    // Create new source node from the new stream
    const newSourceNode = this.audioCtx.createMediaStreamSource(newStream);
    
    // Connect to existing gain node (volume preserved)
    newSourceNode.connect(channel.gainNode);

    // Update channel with new source node and stream
    channel.sourceNode = newSourceNode;
    channel.stream = newStream;
    if (newDeviceId !== undefined) {
      channel.deviceId = newDeviceId;
    }

    console.log(`[MixerEngine] Replaced source for channel: ${channel.label}`);
  }

  /**
   * Update channel label
   */
  setLabel(id: string, label: string): void {
    const channel = this.channels.get(id);
    if (!channel) {
      console.warn(`[MixerEngine] Channel ${id} not found`);
      return;
    }

    channel.label = label;
    console.log(`[MixerEngine] Updated label for channel ${id}: ${label}`);
  }

  /**
   * Set master output volume (0-100)
   */
  setMasterVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    const gainValue = (clampedVolume / 100) * 1.5;
    
    const currentTime = this.audioCtx.currentTime;
    this.masterGain.gain.setTargetAtTime(gainValue, currentTime, 0.02);
    
    console.log(`[MixerEngine] Set master volume: ${clampedVolume}%`);
  }

  /**
   * Get current AudioContext state
   */
  getState(): AudioContextState {
    return this.audioCtx.state;
  }

  /**
   * Resume AudioContext if suspended
   */
  async resume(): Promise<void> {
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
      console.log('[MixerEngine] AudioContext resumed');
    }
  }

  /**
   * Tear down all channels and close AudioContext
   * Call this only when streaming stops completely
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    console.log('[MixerEngine] Destroying...');

    // Remove all channels
    this.channels.forEach((channel, id) => {
      this.removeChannel(id);
    });

    // Disconnect master chain
    this.masterGain.disconnect();
    this.masterAnalyser.disconnect();
    this.destination.disconnect();

    // Close AudioContext
    this.audioCtx.close().then(() => {
      console.log('[MixerEngine] AudioContext closed');
    }).catch(err => {
      console.error('[MixerEngine] Error closing AudioContext:', err);
    });

    this.isDestroyed = true;
    console.log('[MixerEngine] Destroyed');
  }

  /**
   * Check if engine is destroyed
   */
  get destroyed(): boolean {
    return this.isDestroyed;
  }
}

// ─────────────────────────────────────────────
// Factory Function
// ─────────────────────────────────────────────

/**
 * Create a new MixerEngine instance
 */
export function createMixerEngine(config?: MixerEngineConfig): MixerEngine {
  return new MixerEngine(config);
}

// ─────────────────────────────────────────────
// Helper: Capture microphone with device selection
// ─────────────────────────────────────────────

/**
 * Capture microphone audio with optional device ID
 */
export async function captureMicSource(deviceId?: string): Promise<MediaStream> {
  return captureMicrophone(deviceId);
}

/**
 * Capture system audio (screen sharing audio)
 */
export async function captureSystemSource(): Promise<MediaStream> {
  return captureSystemAudio();
}

/**
 * Get available audio input devices
 */
export async function getAudioInputDevicesList(): Promise<MediaDeviceInfo[]> {
  return getAudioInputDevices();
}