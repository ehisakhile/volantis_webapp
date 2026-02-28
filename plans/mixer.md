# 🎚️ Web Audio Mixer — Implementation Plan

> **Goal**: Bring a Mixlr-style desktop mixer to the web, enabling creators to manage multiple audio channels (MIC, ANY INPUT, PLAYLIST/BACKGROUND), adjust volumes, monitor levels, and hot-swap sources — all while the WebRTC stream stays live.

---

## 📋 Overview

The mixer sits **on top of** the existing WebRTC pipeline. The key insight is that instead of routing a single `MediaStream` into the `RTCPeerConnection`, we route a **`AudioContext`-powered mix bus** whose output goes into the peer connection. Individual channels can then be added, removed, or muted without ever touching the `RTCPeerConnection`.

```
Mic Source ──┐
             ├──► GainNode ──► MixBus (DestinationNode) ──► RTCPeerConnection
System Src ──┤
             │
Background ──┘
```

---

## 🗂️ Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/mixer-engine.ts` | **CREATE** | Core Web Audio mix bus, channel management |
| `lib/audio-sources.ts` | **MODIFY** | Add `BackgroundAudioSource` class |
| `components/creator-mixer.tsx` | **CREATE** | The full mixer UI component (channels, faders, meters) |
| `components/creator-streaming.tsx` | **MODIFY** | Replace single-source flow with mixer integration |

---

## Phase 1 — `mixer-engine.ts` (The Core)

This is the most critical file. It must be built **before** any UI work.

### Responsibilities
- Own a single shared `AudioContext`
- Maintain a map of `MixerChannel` objects
- Provide the final `MediaStream` output for WebRTC
- Allow hot-add / hot-remove / volume / mute per channel

### Channel Interface

```typescript
export interface MixerChannel {
  id: string;               // 'mic', 'system', 'background', or custom uuid
  label: string;            // Display name: "MIC", "ANY INPUT", "BACKGROUND"
  type: 'mic' | 'system' | 'background';
  gainNode: GainNode;       // Controls volume (0.0–1.5)
  analyserNode: AnalyserNode; // For VU meter visualization
  sourceNode: MediaStreamAudioSourceNode;
  stream: MediaStream;
  isMuted: boolean;
  volume: number;           // 0–100 (maps to gainNode.gain)
}
```

### MixerEngine Class

```typescript
export class MixerEngine {
  private audioCtx: AudioContext;
  private destination: MediaStreamAudioDestinationNode;
  private channels: Map<string, MixerChannel>;

  constructor() { ... }

  /** The stream to feed into RTCPeerConnection */
  get outputStream(): MediaStream { ... }

  /** Add a new channel from an existing MediaStream */
  addChannel(id: string, label: string, type: ChannelType, stream: MediaStream): MixerChannel { ... }

  /** Remove channel (hot-swap safe) */
  removeChannel(id: string): void { ... }

  /** Set volume 0–100 */
  setVolume(id: string, volume: number): void { ... }

  /** Toggle mute */
  setMute(id: string, muted: boolean): void { ... }

  /** Get current RMS level for VU meter (0–1) */
  getLevel(id: string): number { ... }

  /** Replace the stream source on an existing channel (hot-swap) */
  replaceSource(id: string, newStream: MediaStream): void { ... }

  /** Tear down all channels and close AudioContext */
  destroy(): void { ... }
}
```

### ⚠️ Critical Rules for `mixer-engine.ts`
1. **Never close `AudioContext`** while stream is live — only call `destroy()` on stream stop.
2. When replacing a source (`replaceSource`), disconnect old `sourceNode`, connect new one — `gainNode` stays in place so volume is preserved.
3. `GainNode.gain.value` should use `setTargetAtTime` for smooth volume transitions (no audio pops).
4. The `destination` node's stream feeds directly into the `RTCPeerConnection` track — **this track must never be removed while streaming**.
5. On `addChannel`, always call `analyserNode.connect(destination)` — not `gainNode` directly, to allow per-channel analysis.

---

## Phase 2 — Add `BackgroundAudioSource` to `audio-sources.ts`

Add a new class that accepts a `File` (MP3/WAV/OGG) and plays it through the `AudioContext`:

```typescript
export class BackgroundAudioSource extends AudioSource {
  private file: File;
  private loop: boolean;
  // Uses AudioContext.decodeAudioData → BufferSourceNode → MediaStreamDestinationNode
  // Returns the destination's stream for use with MixerEngine

  constructor(file: File, loop = true) { ... }
  override async capture(): Promise<AudioSourceResult> { ... }
}
```

**Do NOT break existing exports.** Only add, never remove.

---

## Phase 3 — `creator-mixer.tsx` (The UI)

### Layout

Inspired by Mixlr's layout (channels in a row at the bottom):

```
┌─────────────────────────────────────────────────────────┐
│  [CH 1: MIC]   [CH 2: ANY INPUT]  [CH 3: BACKGROUND]   │
│   ┌──────┐      ┌──────┐           ┌──────┐             │
│   │ VU   │      │ VU   │           │ VU   │             │
│   │ ████ │      │ ████ │           │ ████ │             │
│   │ ████ │      │ ████ │           │ ████ │             │
│   │ ────  │      │ ────  │           │ ────  │             │
│   │ FADER│      │ FADER│           │ FADER│             │
│   └──────┘      └──────┘           └──────┘             │
│  [🎧] [🔇]    [🎧] [🔇]          [🎧] [🔇]            │
│  [Select Src▼] [Select Src▼]      [Upload File]         │
└─────────────────────────────────────────────────────────┘
         Master OUT: ████████████████  [REC ●]
```

### Props

```typescript
interface CreatorMixerProps {
  mixerEngine: MixerEngine;       // Pass the engine from parent
  isStreaming: boolean;
  onAddChannel: (type: ChannelType) => void;
  onRemoveChannel: (id: string) => void;
}
```

### Channel Card (`MixerChannelCard`)

Each channel is a self-contained card with:
- **VU Meter**: Vertical bar updated via `requestAnimationFrame` using `analyserNode.getByteFrequencyData`
- **Fader**: Vertical `<input type="range" orient="vertical">` (or custom drag slider)
- **Mute button**: Toggles `gainNode.gain` to 0 and shows visual indicator
- **Monitor button** (headphone icon): For future monitor output
- **Source selector**: Dropdown to swap source type (`Select Source ▼`) — triggers `replaceSource` on the engine
- **Label**: Editable on double-click

### VU Meter Animation Loop

```typescript
// Run outside React render cycle for perf
function runMeterLoop(engine: MixerEngine, channelId: string, barElement: HTMLElement) {
  let rafId: number;
  const tick = () => {
    const level = engine.getLevel(channelId); // 0–1
    barElement.style.height = `${level * 100}%`;
    // Color: green → yellow → red based on level
    rafId = requestAnimationFrame(tick);
  };
  tick();
  return () => cancelAnimationFrame(rafId);
}
```

---

## Phase 4 — Modify `creator-streaming.tsx`

This is the integration layer. **Make surgical changes only.**

### Changes Required

#### 4.1 — Add `mixerEngineRef`

```typescript
const mixerEngineRef = useRef<MixerEngine | null>(null);
```

#### 4.2 — Initialize MixerEngine on stream start

In `handleStartStream` (after audio capture, before WebRTC setup):

```typescript
// EXISTING: const { stream } = await audioSourceManager.capture();
// REPLACE WITH:

const engine = new MixerEngine();
mixerEngineRef.current = engine;

// Add the initial source as a channel
const { stream: micStream } = await micSource.capture();
engine.addChannel('mic', 'MIC', 'mic', micStream);

// Use engine output for WebRTC — NOT the raw stream
const outputStream = engine.outputStream;
pubStreamRef.current = outputStream;
```

#### 4.3 — Feed engine output into RTCPeerConnection

```typescript
// EXISTING (likely):
pc.addTrack(stream.getAudioTracks()[0], stream);

// CHANGE TO:
const outputStream = mixerEngineRef.current!.outputStream;
outputStream.getAudioTracks().forEach(track => {
  pc.addTrack(track, outputStream);
});
```

#### 4.4 — Add mixer UI below visualizer section

```tsx
{isStreaming && mixerEngineRef.current && (
  <CreatorMixer
    mixerEngine={mixerEngineRef.current}
    isStreaming={isStreaming}
    onAddChannel={handleAddMixerChannel}
    onRemoveChannel={handleRemoveMixerChannel}
  />
)}
```

#### 4.5 — Add channel handlers

```typescript
const handleAddMixerChannel = useCallback(async (type: ChannelType) => {
  if (!mixerEngineRef.current) return;
  // Capture appropriate source based on type
  // Add to engine with a unique id
}, []);

const handleRemoveMixerChannel = useCallback((id: string) => {
  mixerEngineRef.current?.removeChannel(id);
}, []);
```

#### 4.6 — Cleanup on stop

```typescript
// In handleStopStream, after existing cleanup:
if (mixerEngineRef.current) {
  mixerEngineRef.current.destroy();
  mixerEngineRef.current = null;
}
```

#### 4.7 — Remove old audio source UI (pre-stream config only)

The old `useMic / useSystemAudio / mixAudio` toggles can stay as the **pre-stream setup panel** to configure the initial channel. After stream starts, the mixer panel takes over. Do not delete that UI — just hide it when `isStreaming === true`.

---

## Phase 5 — Background Source (Playlist Channel)

In `creator-mixer.tsx`, the "BACKGROUND" channel card has an **"Upload File"** button. Flow:

1. User clicks upload → `<input type="file" accept="audio/*">` opens
2. `BackgroundAudioSource` is created with the `File`
3. `capture()` decodes audio via `AudioContext.decodeAudioData`
4. Returns a `MediaStream` from a `MediaStreamDestinationNode`
5. That stream is passed to `engine.addChannel('background', 'BACKGROUND', 'background', stream)`
6. Fader/mute in mixer controls its volume independently

---

## 🔌 WebRTC Compatibility Notes

| Concern | Solution |
|---------|---------|
| RTCPeerConnection expects a stable track | Use `engine.outputStream` track — it never changes identity |
| Adding a channel mid-stream | Safe — new channels connect to the AudioContext mix bus, the output track stays the same |
| Removing a channel mid-stream | Safe — disconnect nodes, output track is unchanged |
| Browser AudioContext autoplay policy | Resume `audioCtx` inside the user gesture that starts the stream |
| `MediaStreamAudioDestinationNode` track count | Always exactly 1 audio track — perfect for WebRTC |

---

## 🏗️ Build Order for Agent

Execute strictly in this order to avoid breaking the streaming flow:

```
1. CREATE  lib/mixer-engine.ts          (pure audio logic, no UI)
2. MODIFY  lib/audio-sources.ts         (add BackgroundAudioSource only)
3. CREATE  components/creator-mixer.tsx (full mixer UI, uses mixer-engine)
4. MODIFY  components/creator-streaming.tsx (integrate mixer, surgical edits)
```

**After each step**: verify the streaming flow still starts, connects, and audio is transmitted before moving to the next step.

---

## ✅ Feature Checklist

- [ ] Multiple independent audio channels (MIC, ANY INPUT, BACKGROUND)
- [ ] Per-channel vertical fader (volume control)  
- [ ] Per-channel VU meter (real-time level visualization)
- [ ] Per-channel mute toggle
- [ ] Hot-swap source on a channel while streaming
- [ ] Add new channel while streaming
- [ ] Remove channel while streaming
- [ ] Background music upload (File → AudioContext)
- [ ] Background music loop toggle
- [ ] Master output VU meter
- [ ] Microphone device picker per channel
- [ ] System audio capture per channel
- [ ] Channel label editing (double-click)
- [ ] WebRTC track identity preserved across all changes

---

## 🚫 Do NOT Do

- Do not call `pc.removeTrack()` or `pc.addTrack()` after stream starts — this triggers re-negotiation and can break the stream.
- Do not create multiple `RTCPeerConnection` tracks. One audio track (from engine output) only.
- Do not close the `AudioContext` while streaming.
- Do not use `MediaRecorder` on individual channels — it's for the final mix only.
- Do not modify the existing `AudioSourceManager` class interface — only extend `audio-sources.ts`.
- Do not remove the pre-stream audio source selection UI — repurpose it as the initial channel config.