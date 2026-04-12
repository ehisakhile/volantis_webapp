"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mic,
  Monitor,
  Music,
  VolumeX,
  Volume2,
  Headphones,
  Upload,
  X,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Repeat,
  FileAudio,
  Speaker,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MixerEngine, type MixerChannel, type ChannelType, createMixerEngine, getAudioInputDevicesList, captureMicSource, captureSystemSource } from '@/lib/mixer-engine';
import { BackgroundAudioSource, createBackgroundAudioSource } from '@/lib/audio-sources';

// ─────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────

interface CreatorMixerProps {
  /** The mixer engine instance */
  mixerEngine: MixerEngine;
  /** Whether streaming is active */
  isStreaming: boolean;
  /** Callback when a new channel should be added */
  onAddChannel?: (type: ChannelType) => void;
  /** Callback when a channel should be removed */
  onRemoveChannel?: (id: string) => void;
}

interface VUMeterProps {
  level: number;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ─────────────────────────────────────────────
// VU Meter Component
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// VU Meter Component - Optimized for performance
// ─────────────────────────────────────────────

function VUMeter({ level, orientation = 'vertical', size = 'md', className }: VUMeterProps) {
  const heights = {
    sm: 'h-16',
    md: 'h-24',
    lg: 'h-32',
  };

  const widths = {
    sm: 'w-3',
    md: 'w-4',
    lg: 'w-5',
  };

  // Determine color based on level - use inline styles for performance
  const getColor = (l: number) => {
    if (l > 0.85) return '#ef4444'; // red-500
    if (l > 0.7) return '#facc15'; // yellow-400
    return '#22c55e'; // green-500
  };

  return (
    <div className={cn('relative bg-slate-800 rounded-sm overflow-hidden border border-slate-700', widths[size], heights[size], className)}>
      {/* Level bar - direct CSS update, no animation library */}
      <div
        className="absolute bottom-0 left-0 right-0 rounded-sm"
        style={{
          height: `${level * 100}%`,
          backgroundColor: getColor(level),
          transition: 'height 50ms linear, background-color 50ms linear'
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Channel Fader Component - Simplified for responsiveness
// ─────────────────────────────────────────────

interface ChannelFaderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function ChannelFader({ value, onChange, disabled }: ChannelFaderProps) {
  // Use a local state for immediate feedback, sync with parent on release
  const [localValue, setLocalValue] = useState(value);

  // Sync with parent value when it changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setLocalValue(newValue);
    // Call onChange directly for responsive feedback
    onChange(newValue);
  };

  return (
    <div className="relative h-32 flex items-center justify-center py-2">
      {/* Fader track - simplified */}
      <div className="absolute h-full w-3 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
        {/* Fill - direct CSS, no animation */}
        <div
          className="absolute bottom-0 left-0 right-0 bg-sky-500"
          style={{ height: `${localValue}%` }}
        />
      </div>
      
      {/* Simple vertical range input */}
      <input
        type="range"
        min="0"
        max="100"
        value={localValue}
        onChange={handleChange}
        disabled={disabled}
        className="absolute h-28 w-6 appearance-none bg-transparent cursor-pointer disabled:cursor-not-allowed z-10"
        style={{
          writingMode: 'vertical-lr',
          direction: 'rtl',
          accentColor: '#0ea5e9',
        }}
      />
      
      {/* dB scale */}
      <div className="absolute -right-6 top-0 bottom-0 flex flex-col justify-between text-[10px] text-slate-500 py-2">
        <span>+6</span>
        <span>0</span>
        <span>-12</span>
        <span>-∞</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Channel Card Component
// ─────────────────────────────────────────────

interface MixerChannelCardProps {
  channel: MixerChannel;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onRemove: () => void;
  onSourceChange: (type: ChannelType, deviceId?: string) => void;
  onUploadBackground: (file: File) => void;
  availableDevices: MediaDeviceInfo[];
  isStreaming: boolean;
}

function MixerChannelCard({
  channel,
  onVolumeChange,
  onMuteToggle,
  onRemove,
  onSourceChange,
  onUploadBackground,
  availableDevices,
  isStreaming,
}: MixerChannelCardProps) {
  const [level, setLevel] = useState(0);
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [label, setLabel] = useState(channel.label);
  const animationRef = useRef<number | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get icon based on channel type
  const getIcon = () => {
    switch (channel.type) {
      case 'mic':
        return <Mic className="w-4 h-4" />;
      case 'system':
        return <Monitor className="w-4 h-4" />;
      case 'background':
        return <Music className="w-4 h-4" />;
      default:
        return <Volume2 className="w-4 h-4" />;
    }
  };

  // Get color based on channel type
  const getColor = () => {
    switch (channel.type) {
      case 'mic':
        return 'sky';
      case 'system':
        return 'purple';
      case 'background':
        return 'emerald';
      default:
        return 'slate';
    }
  };

  const color = getColor();

  // Animation loop for VU meter
  useEffect(() => {
    const updateLevel = () => {
      // Use analyser data to get real-time level
      const analyser = channel.analyserNode;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = dataArray[i] / 255;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const scaledLevel = Math.min(1, rms * 2.5);
      
      setLevel(scaledLevel);
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    animationRef.current = requestAnimationFrame(updateLevel);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [channel.analyserNode]);

  // Handle file upload for background
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadBackground(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle label edit
  const handleLabelSubmit = () => {
    setIsEditingLabel(false);
    // Could add callback to update label in engine
  };

  return (
    <div className={cn(
      'relative flex flex-col items-center p-3 bg-slate-900 rounded-lg border-2 transition-colors',
      channel.isMuted ? 'border-red-500/50' : `border-${color}-500/30`
    )}>
      {/* Channel header */}
      <div className="flex items-center justify-between w-full mb-2">
        {isEditingLabel ? (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleLabelSubmit()}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-0.5 text-xs text-white"
            autoFocus
          />
        ) : (
          <button
            onDoubleClick={() => setIsEditingLabel(true)}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium',
              channel.type === 'mic' && 'text-sky-400',
              channel.type === 'system' && 'text-purple-400',
              channel.type === 'background' && 'text-emerald-400'
            )}
          >
            {getIcon()}
            <span>{channel.label}</span>
          </button>
        )}
        
        {channel.type !== 'mic' && (
          <button
            onClick={onRemove}
            className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-red-400 transition-colors"
            title="Remove channel"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* VU Meter */}
      <VUMeter level={level} size="md" className="mb-3" />

      {/* Fader */}
      <ChannelFader
        value={channel.volume}
        onChange={onVolumeChange}
        disabled={!isStreaming}
      />

      {/* Volume display - editable input */}
      <div className="flex items-center justify-center mt-1">
        <input
          type="number"
          min="0"
          max="150"
          value={channel.volume}
          onChange={(e) => {
            const val = Math.max(0, Math.min(150, Number(e.target.value)));
            onVolumeChange(val);
          }}
          disabled={!isStreaming}
          className="w-12 bg-transparent text-xs text-center text-slate-400 border border-slate-700 rounded px-1 py-0.5 focus:outline-none focus:border-sky-500 disabled:cursor-not-allowed"
        />
        <span className="text-xs text-slate-500 ml-1">%</span>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-2 mt-3">
        {/* Mute button */}
        <button
          onClick={onMuteToggle}
          disabled={!isStreaming}
          className={cn(
            'p-2 rounded-lg transition-colors',
            channel.isMuted 
              ? 'bg-red-500/20 text-red-400' 
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
            !isStreaming && 'opacity-50 cursor-not-allowed'
          )}
          title={channel.isMuted ? 'Unmute' : 'Mute'}
        >
          {channel.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Monitor button (headphones) */}
        <button
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 transition-colors"
          title="Monitor (coming soon)"
        >
          <Headphones className="w-4 h-4" />
        </button>
      </div>

      {/* Source selector / Upload button */}
      <div className="mt-3 w-full">
        {channel.type === 'background' ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!isStreaming}
              className={cn(
                'w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30 transition-colors',
                !isStreaming && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Upload className="w-3 h-3" />
              <span>Change File</span>
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowDevicePicker(!showDevicePicker)}
              disabled={!isStreaming || channel.type === 'system'}
              className={cn(
                'w-full flex items-center justify-between gap-1 px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700 transition-colors',
                (!isStreaming || channel.type === 'system') && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="flex items-center gap-1">
                <Settings className="w-3 h-3" />
                {channel.type === 'system' ? 'System' : 'Select Source'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Device picker dropdown */}
            {showDevicePicker && channel.type === 'mic' && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-32 overflow-y-auto">
                {availableDevices.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-slate-500">No devices found</div>
                ) : (
                  availableDevices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        onSourceChange('mic', device.deviceId);
                        setShowDevicePicker(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors',
                        channel.deviceId === device.deviceId && 'bg-sky-500/20 text-sky-400'
                      )}
                    >
                      {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Channel type indicator */}
      <div className={cn(
        'absolute -top-1 -right-1 w-3 h-3 rounded-full',
        channel.type === 'mic' && 'bg-sky-500',
        channel.type === 'system' && 'bg-purple-500',
        channel.type === 'background' && 'bg-emerald-500'
      )} />
    </div>
  );
}

// ─────────────────────────────────────────────
// Master Output Component
// ─────────────────────────────────────────────

interface MasterOutputProps {
  mixerEngine: MixerEngine;
  isStreaming: boolean;
}

function MasterOutput({ mixerEngine, isStreaming }: MasterOutputProps) {
  const [level, setLevel] = useState(0);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const updateLevel = () => {
      const masterLevel = mixerEngine.getMasterLevel();
      setLevel(masterLevel);
      animationRef.current = requestAnimationFrame(updateLevel);
    };

    animationRef.current = requestAnimationFrame(updateLevel);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mixerEngine]);

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-900 rounded-lg border border-slate-700">
      <div className="text-sm font-medium text-slate-400">MASTER OUT</div>
      
      {/* Stereo VU meters */}
      <div className="flex gap-1">
        <VUMeter level={level} orientation="horizontal" size="sm" className="w-6" />
        <VUMeter level={level * 0.95} orientation="horizontal" size="sm" className="w-6" />
      </div>
      
      {/* Level bars */}
      <div className="flex-1 flex items-center gap-1">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'flex-1 h-4 rounded-sm',
              (i + 1) / 20 <= level 
                ? i >= 16 
                  ? 'bg-red-500' 
                  : i >= 12 
                    ? 'bg-yellow-400' 
                    : 'bg-green-500'
                : 'bg-slate-800'
            )}
          />
        ))}
      </div>
      
      {/* Level percentage */}
      <div className="text-xs text-slate-500 w-12 text-right">
        {Math.round(level * 100)}%
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Add Channel Button Component
// ─────────────────────────────────────────────

interface AddChannelButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

function AddChannelButton({ onClick, disabled }: AddChannelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center w-20 h-40 bg-slate-800/50 border-2 border-dashed border-slate-600 rounded-lg hover:border-slate-500 hover:bg-slate-800 transition-colors',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Plus className="w-6 h-6 text-slate-400 mb-2" />
      <span className="text-xs text-slate-400">Add Channel</span>
    </button>
  );
}

// ─────────────────────────────────────────────
// Main CreatorMixer Component
// ─────────────────────────────────────────────

export function CreatorMixer({ 
  mixerEngine, 
  isStreaming, 
  onAddChannel, 
  onRemoveChannel 
}: CreatorMixerProps) {
  const [channels, setChannels] = useState<MixerChannel[]>([]);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  
  // Background music player state
  const [bgMusicName, setBgMusicName] = useState<string>('');
  const [bgMusicPlaying, setBgMusicPlaying] = useState(true);
  const [bgPlayOut, setBgPlayOut] = useState(false);
  const [bgCurrentTime, setBgCurrentTime] = useState(0);
  const [bgDuration, setBgDuration] = useState(0);
  const bgSourceRef = useRef<BackgroundAudioSource | null>(null);

  // Update channels when engine changes
  useEffect(() => {
    const updateChannels = () => {
      setChannels(mixerEngine.allChannels);
    };

    updateChannels();

    // Poll for channel changes
    const interval = setInterval(updateChannels, 500);
    return () => clearInterval(interval);
  }, [mixerEngine]);

  // Load available audio input devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        const devices = await getAudioInputDevicesList();
        setAvailableDevices(devices);
      } catch (err) {
        console.error('Failed to load audio devices:', err);
      }
    };

    loadDevices();
  }, []);

  // Handle volume change for a channel
  const handleVolumeChange = useCallback((channelId: string, volume: number) => {
    mixerEngine.setVolume(channelId, volume);
    // Force re-render
    setChannels([...mixerEngine.allChannels]);
  }, [mixerEngine]);

  // Handle mute toggle for a channel
  const handleMuteToggle = useCallback((channelId: string) => {
    const channel = mixerEngine.getChannel(channelId);
    if (channel) {
      mixerEngine.setMute(channelId, !channel.isMuted);
      setChannels([...mixerEngine.allChannels]);
    }
  }, [mixerEngine]);

  // Handle channel removal
  const handleRemoveChannel = useCallback((channelId: string) => {
    mixerEngine.removeChannel(channelId);
    onRemoveChannel?.(channelId);
    setChannels([...mixerEngine.allChannels]);
  }, [mixerEngine, onRemoveChannel]);

  // Handle source change (for mic channels)
  const handleSourceChange = useCallback(async (channelId: string, type: ChannelType, deviceId?: string) => {
    try {
      let newStream: MediaStream;
      
      if (type === 'mic') {
        newStream = await captureMicSource(deviceId);
      } else if (type === 'system') {
        newStream = await captureSystemSource();
      } else {
        return;
      }

      mixerEngine.replaceSource(channelId, newStream, deviceId);
      setChannels([...mixerEngine.allChannels]);
    } catch (err) {
      console.error('Failed to change source:', err);
    }
  }, [mixerEngine]);

  // Handle background audio upload
  const handleBackgroundUpload = useCallback(async (channelId: string, file: File) => {
    try {
      const bgSource = createBackgroundAudioSource(file, true);
      const result = await bgSource.capture();
      
      // Replace the channel source
      mixerEngine.replaceSource(channelId, result.stream);
      setChannels([...mixerEngine.allChannels]);
    } catch (err) {
      console.error('Failed to upload background audio:', err);
    }
  }, [mixerEngine]);

  // Ref for background file input
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Handle adding a new channel
  const handleAddChannel = useCallback(async (type: ChannelType) => {
    setShowAddMenu(false);

    try {
      let stream: MediaStream;
      let id: string;
      let label: string;

      switch (type) {
        case 'mic':
          id = `mic-${Date.now()}`;
          label = 'MIC';
          stream = await captureMicSource();
          break;
        case 'system':
          id = `system-${Date.now()}`;
          label = 'ANY INPUT';
          stream = await captureSystemSource();
          break;
        case 'background':
          // Trigger file picker for background music
          id = `background-${Date.now()}`;
          label = 'BACKGROUND';
          
          // Create a silent/inactive background channel first
          // The actual audio will be loaded when user selects a file
          // For now, create a dummy silent stream
          try {
            // Create an empty audio context and destination
            const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            
            // Get the stream (it will be silent until we add audio)
            stream = dest.stream;
            
            // Add the channel
            mixerEngine.addChannel(id, label, type, stream);
            onAddChannel?.(type);
            setChannels([...mixerEngine.allChannels]);
            
            // After adding, trigger the file picker for this channel
            // Use setTimeout to ensure state is updated first
            setTimeout(() => {
              // Find the background channel and trigger its file picker
              const bgChannel = mixerEngine.getChannel(id);
              if (bgChannel) {
                // We'll handle file selection at the channel level
                console.log('Background channel added, please select a file');
              }
            }, 100);
          } catch (err) {
            console.error('Failed to create background channel:', err);
          }
          return;
        default:
          return;
      }

      mixerEngine.addChannel(id, label, type, stream);
      onAddChannel?.(type);
      setChannels([...mixerEngine.allChannels]);
    } catch (err) {
      console.error('Failed to add channel:', err);
    }
  }, [mixerEngine, onAddChannel]);

  // Handle background file selection from the "Add Channel" menu
  const handleAddBackgroundChannel = useCallback(async () => {
    setShowAddMenu(false);
    
    // Create file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const { createBackgroundAudioSource } = await import('@/lib/audio-sources');
        
        // Stop previous background music if exists
        if (bgSourceRef.current) {
          bgSourceRef.current.stop();
        }
        
        const bgSource = createBackgroundAudioSource(file, true);
        bgSourceRef.current = bgSource;
        const result = await bgSource.capture();
        
        const id = `background-${Date.now()}`;
        mixerEngine.addChannel(id, 'BACKGROUND', 'background', result.stream);
        
        // Track the music name and state
        setBgMusicName(file.name);
        setBgMusicPlaying(true);
        setBgDuration(bgSource.getDuration());
        setBgCurrentTime(0);
        
        onAddChannel?.('background');
        setChannels([...mixerEngine.allChannels]);
      } catch (err) {
        console.error('Failed to add background music:', err);
      }
    };
    
    input.click();
  }, [mixerEngine, onAddChannel]);

  // Track background music position
  useEffect(() => {
    if (!bgSourceRef.current || !bgMusicPlaying) return;
    
    const interval = setInterval(() => {
      if (bgSourceRef.current) {
        const time = bgSourceRef.current.getCurrentTime();
        const dur = bgSourceRef.current.getDuration();
        setBgCurrentTime(time);
        setBgDuration(dur);
      }
    }, 250);
    
    return () => clearInterval(interval);
  }, [bgMusicPlaying]);

  // Handle background music controls
  const handleBgPlayPause = useCallback(() => {
    if (!bgSourceRef.current) return;
    
    if (bgMusicPlaying) {
      // Note: AudioBufferSourceNode doesn't support pause, would need to track position
      // For now, we'll mute/unmute via the channel
      const bgChannel = channels.find(c => c.type === 'background');
      if (bgChannel) {
        mixerEngine.setMute(bgChannel.id, true);
      }
    } else {
      const bgChannel = channels.find(c => c.type === 'background');
      if (bgChannel) {
        mixerEngine.setMute(bgChannel.id, false);
      }
    }
    setBgMusicPlaying(!bgMusicPlaying);
    setChannels([...mixerEngine.allChannels]);
  }, [bgMusicPlaying, channels, mixerEngine]);

  const handleBgStop = useCallback(() => {
    if (bgSourceRef.current) {
      bgSourceRef.current.stop();
      bgSourceRef.current = null;
    }
    
    // Remove background channel
    const bgChannel = channels.find(c => c.type === 'background');
    if (bgChannel) {
      mixerEngine.removeChannel(bgChannel.id);
    }
    
    setBgMusicName('');
    setBgMusicPlaying(false);
    setBgPlayOut(false);
    setBgCurrentTime(0);
    setBgDuration(0);
    setChannels([...mixerEngine.allChannels]);
    onRemoveChannel?.(bgChannel?.id || '');
  }, [channels, mixerEngine, onRemoveChannel]);

  const handleBgChangeMusic = useCallback(() => {
    // Remove current background and add new one
    handleBgStop();
    // Trigger new file selection after a short delay
    setTimeout(() => handleAddBackgroundChannel(), 100);
  }, [handleBgStop, handleAddBackgroundChannel]);

  const handleBgPlayOutToggle = useCallback(() => {
    if (!bgSourceRef.current) return;
    
    const newPlayOut = !bgPlayOut;
    bgSourceRef.current.setPlayOut(newPlayOut);
    setBgPlayOut(newPlayOut);
  }, [bgPlayOut]);

  const handleBgSeek = useCallback((position: number) => {
    if (!bgSourceRef.current || !bgDuration) return;
    bgSourceRef.current.seek(position);
    setBgCurrentTime(position * bgDuration);
  }, [bgDuration]);

  return (
    <div className="bg-slate-950 rounded-xl p-6 border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <div className="w-3 h-3 bg-sky-500 rounded-full animate-pulse" />
          Audio Mixer
        </h2>
        
        {/* Add channel menu */}
        <div className="relative">
          <Button
            onClick={() => setShowAddMenu(!showAddMenu)}
            variant="outline"
            size="sm"
            disabled={!isStreaming}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Channel
          </Button>

          {showAddMenu && (
            <div className="absolute right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 w-48">
              <button
                onClick={() => handleAddChannel('mic')}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Mic className="w-4 h-4 text-sky-400" />
                Microphone
              </button>
              <button
                onClick={() => handleAddChannel('system')}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Monitor className="w-4 h-4 text-purple-400" />
                System Audio
              </button>
              <button
                onClick={handleAddBackgroundChannel}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
              >
                <Music className="w-4 h-4 text-emerald-400" />
                Background Music
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mixer surface */}
      <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800/50">
        {/* Channels row */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {channels.map((channel) => (
            <MixerChannelCard
              key={channel.id}
              channel={channel}
              onVolumeChange={(vol) => handleVolumeChange(channel.id, vol)}
              onMuteToggle={() => handleMuteToggle(channel.id)}
              onRemove={() => handleRemoveChannel(channel.id)}
              onSourceChange={(type, deviceId) => handleSourceChange(channel.id, type, deviceId)}
              onUploadBackground={(file) => handleBackgroundUpload(channel.id, file)}
              availableDevices={availableDevices}
              isStreaming={isStreaming}
            />
          ))}

          {/* Add channel placeholder */}
          {channels.length < 3 && (
            <AddChannelButton
              onClick={() => setShowAddMenu(true)}
              disabled={!isStreaming}
            />
          )}
        </div>
      </div>

      {/* Background Music Player Panel */}
      {bgMusicName && (
        <div className="mt-4 bg-gradient-to-r from-emerald-950/50 to-slate-900 rounded-xl border border-emerald-500/30 p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {/* Music icon with animated border */}
              <div className="relative">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Music className="w-6 h-6 text-emerald-400" />
                </div>
                {bgMusicPlaying && (
                  <div className="absolute inset-0 rounded-lg border-2 border-emerald-400/50 animate-pulse" />
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Background Music</span>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    bgMusicPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                  )} />
                </div>
                <div className="text-sm text-white truncate max-w-[200px]" title={bgMusicName}>
                  {bgMusicName}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleBgStop}
              className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
              title="Remove background music"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Seek bar with time display */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-10 text-right">
                {formatTime(bgCurrentTime)}
              </span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max={bgDuration || 100}
                  value={bgCurrentTime}
                  onChange={(e) => handleBgSeek(Number(e.target.value) / bgDuration)}
                  disabled={!isStreaming}
                  className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed accent-emerald-500"
                />
              </div>
              <span className="text-xs text-slate-400 w-10">
                {formatTime(bgDuration)}
              </span>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={handleBgPlayPause}
                className={cn(
                  'p-3 rounded-full transition-colors',
                  bgMusicPlaying
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                )}
                title={bgMusicPlaying ? 'Mute/Pause (stops output to stream)' : 'Unmute/Play (resumes output to stream)'}
              >
                {bgMusicPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              
              {/* Volume/Mute indicator */}
              <div className="flex items-center gap-1 text-xs text-slate-400">
                {bgMusicPlaying ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                <span>{bgMusicPlaying ? 'Playing to stream' : 'Muted'}</span>
              </div>
            </div>
            
            {/* Right controls */}
            <div className="flex items-center gap-2">
              {/* Play Out button (radio studio monitor) */}
              <button
                onClick={handleBgPlayOutToggle}
                disabled={!isStreaming}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors',
                  bgPlayOut
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
                  !isStreaming && 'opacity-50 cursor-not-allowed'
                )}
                title="Play out to speakers - hear the music to confirm seek position"
              >
                <Speaker className="w-4 h-4" />
                <span>{bgPlayOut ? 'Playing Out' : 'Play Out'}</span>
              </button>
              
              {/* Loop indicator */}
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-xs text-slate-400">
                <Repeat className="w-3 h-3" />
                <span>Loop</span>
              </div>
              
              {/* Change music */}
              <button
                onClick={handleBgChangeMusic}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/20 text-sky-400 rounded-lg text-sm hover:bg-sky-500/30 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Change File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master output */}
      <div className="mt-4">
        <MasterOutput mixerEngine={mixerEngine} isStreaming={isStreaming} />
      </div>

      {/* Recording indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 mt-4 text-xs text-red-400">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>Live - Audio being streamed</span>
        </div>
      )}
    </div>
  );
}

export type { CreatorMixerProps, MixerChannel, ChannelType };