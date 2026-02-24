"use client";

// ─────────────────────────────────────────────
// ICE config — optimized for low latency
// ─────────────────────────────────────────────
export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// ─────────────────────────────────────────────
// Audio Visualizer
// ─────────────────────────────────────────────
export function startVisualizer(
  stream: MediaStream, 
  canvas: HTMLCanvasElement, 
  accentColor: string = '#00e5a0'
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.75;
  source.connect(analyser);
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  let rafId: number;

  function draw() {
    rafId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    const W = canvas.width;
    const H = canvas.height;
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    
    const barW = (W / bufferLength) * 2.2;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const barH = (dataArray[i] / 255) * H;
      const alpha = 0.4 + (dataArray[i] / 255) * 0.6;
      ctx.fillStyle = accentColor + Math.round(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.roundRect(x, H - barH, barW - 1, barH, 2);
      ctx.fill();
      x += barW;
    }
  }
  
  draw();

  return () => {
    cancelAnimationFrame(rafId);
    audioCtx.close();
  };
}

// ─────────────────────────────────────────────
// Capture System Audio (getDisplayMedia)
// ─────────────────────────────────────────────
export async function captureSystemAudio(): Promise<MediaStream> {
  console.log('Requesting system audio capture...');
  
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,  // required — browser won't let you skip this
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: { ideal: 48000 }
    }
  });

  // Pull only the audio track — drop the video track immediately
  const audioTracks = displayStream.getAudioTracks();
  if (audioTracks.length === 0) {
    throw new Error('No audio captured — user may have unchecked "Share audio" in the picker');
  }

  // Stop the video track we were forced to grab
  displayStream.getVideoTracks().forEach(t => t.stop());

  // Build an audio-only stream
  const audioOnlyStream = new MediaStream(audioTracks);
  console.log('System audio captured');
  
  return audioOnlyStream;
}

// ─────────────────────────────────────────────
// Capture Microphone Audio
// ─────────────────────────────────────────────
export async function captureMicrophone(deviceId?: string): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 },
      channelCount: { ideal: 1 },
      ...(deviceId && { deviceId: { exact: deviceId } })
    },
    video: false
  };
  return await navigator.mediaDevices.getUserMedia(constraints);
}

// ─────────────────────────────────────────────
// Enumerate Audio Input Devices
// ─────────────────────────────────────────────
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d => d.kind === 'audioinput');
}

// ─────────────────────────────────────────────
// Mix Multiple Audio Streams into One
// ─────────────────────────────────────────────
export function mixAudioStreams(streams: MediaStream[]): MediaStream {
  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();
  
  streams.forEach(stream => {
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(destination);
  });
  
  return destination.stream;
}

// ─────────────────────────────────────────────
// Wait for ICE gathering to complete or timeout
// ─────────────────────────────────────────────
export function waitForIce(pc: RTCPeerConnection, maxMs: number = 2000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return; }
    const timeout = setTimeout(resolve, maxMs);
    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        resolve();
      }
    };
    pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
      if (!e.candidate) { clearTimeout(timeout); resolve(); }
    };
  });
}

// ─────────────────────────────────────────────
// Prefer Opus codec in SDP — low latency settings
// ─────────────────────────────────────────────
export function preferOpus(sdp: string): string {
  const match = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/i);
  if (!match) return sdp;
  const pt = match[1];

  const opusFmtp = `a=fmtp:${pt} minptime=10;useinbandfec=1;stereo=0;maxaveragebitrate=96000`;

  if (sdp.includes(`a=fmtp:${pt} `)) {
    return sdp.replace(new RegExp(`a=fmtp:${pt} [^\r\n]+`), opusFmtp);
  } else {
    return sdp.replace(
      new RegExp(`(a=rtpmap:${pt} opus[^\r\n]+\r?\n)`),
      `$1${opusFmtp}\r\n`
    );
  }
}

// ─────────────────────────────────────────────
// Detect audio codec from SDP
// ─────────────────────────────────────────────
export function detectAudioCodec(sdp: string): string {
  const m = sdp.match(/a=rtpmap:\d+ ([A-Za-z0-9]+)\/\d+/);
  return m ? m[1].toUpperCase() : 'unknown';
}

// ─────────────────────────────────────────────
// Get stats for outbound/inbound RTP
// ─────────────────────────────────────────────
export async function getAudioStats(
  pc: RTCPeerConnection, 
  isOutbound: boolean
): Promise<{ bitrate?: number; jitter?: number }> {
  const stats = await pc.getStats();
  let result: { bitrate?: number; jitter?: number } = {};
  
  stats.forEach((r) => {
    if (isOutbound && r.type === 'outbound-rtp' && r.kind === 'audio') {
      // Handle bitrate calculation externally - we need timestamps
      result.bitrate = r.bytesSent;
    } else if (!isOutbound && r.type === 'inbound-rtp' && r.kind === 'audio') {
      if (r.jitter != null) {
        result.jitter = Number(r.jitter) * 1000;
      }
    }
  });
  
  return result;
}