"use client";

export interface VideoCaptureOptions {
  width?: number;
  height?: number;
  frameRate?: number;
  deviceId?: string;
}

export interface CameraStreamResult {
  stream: MediaStream;
  deviceId: string;
  label: string;
}

export interface ScreenCaptureResult {
  stream: MediaStream;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export async function captureCamera(options: VideoCaptureOptions = {}): Promise<CameraStreamResult> {
  const {
    width = 1920,
    height = 1080,
    frameRate = 30,
    deviceId,
  } = options;

  const constraints: MediaStreamConstraints = {
    video: {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: frameRate },
      ...(deviceId && { deviceId: { exact: deviceId } }),
    },
    audio: false,
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const videoTrack = stream.getVideoTracks()[0];
  const settings = videoTrack.getSettings();

  return {
    stream,
    deviceId: settings.deviceId || deviceId || '',
    label: videoTrack.label || 'Camera',
  };
}

export async function captureCameraWithAudio(options: VideoCaptureOptions = {}): Promise<CameraStreamResult & { audioStream: MediaStream }> {
  const {
    width = 1920,
    height = 1080,
    frameRate = 30,
    deviceId,
  } = options;

  const videoConstraints: MediaStreamConstraints = {
    video: {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: frameRate },
      ...(deviceId && { deviceId: { exact: deviceId } }),
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: { ideal: 48000 },
    },
  };

  const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);
  const videoTrack = stream.getVideoTracks()[0];
  const settings = videoTrack.getSettings();

  const audioStream = new MediaStream(stream.getAudioTracks());

  return {
    stream,
    audioStream,
    deviceId: settings.deviceId || deviceId || '',
    label: videoTrack.label || 'Camera',
  };
}

export async function captureScreen(options: VideoCaptureOptions = {}): Promise<ScreenCaptureResult> {
  const {
    width = 1920,
    height = 1080,
    frameRate = 30,
  } = options;

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: width },
      height: { ideal: height },
      frameRate: { ideal: frameRate },
    },
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: { ideal: 48000 },
    },
  });

  const videoTrack = displayStream.getVideoTracks()[0];
  const audioTracks = displayStream.getAudioTracks();

  const videoEnabled = videoTrack.enabled && !videoTrack.muted;
  const audioEnabled = audioTracks.length > 0 && audioTracks[0].enabled && !audioTracks[0].muted;

  return {
    stream: displayStream,
    videoEnabled,
    audioEnabled,
  };
}

export async function getVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter(d => d.kind === 'videoinput');
}

export async function getDisplayMediaWithSystemAudio(): Promise<MediaStream> {
  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    },
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      sampleRate: { ideal: 48000 },
    },
  });

  return displayStream;
}