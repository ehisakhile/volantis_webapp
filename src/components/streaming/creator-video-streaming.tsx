"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Video,
  Radio,
  Square,
  Settings,
  VideoOff,
  VideoIcon,
  Monitor,
  Signal,
  SignalLow,
  SignalHigh,
  Users,
  Loader2,
  AlertCircle,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Share2,
  Wifi,
  WifiOff,
  CheckCircle,
  RadioIcon,
  MessageCircle,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { livestreamApi } from "@/lib/api/livestream";
import { chatApi } from "@/lib/api/chat";
import { companyApi } from "@/lib/api/company";
import {
  ICE_CONFIG,
  waitForIce,
  preferVideoCodecs,
  detectAudioCodec,
  captureSystemAudio,
  startVisualizer,
} from "@/lib/webrtc-utils";
import { captureCamera, captureScreen, getVideoInputDevices } from "@/lib/video-capture";
import { 
  MixerEngine, 
  createMixerEngine, 
  captureMicSource, 
  captureSystemSource,
  getAudioInputDevicesList,
  type ChannelType 
} from "@/lib/mixer-engine";
import { CreatorMixer } from "./creator-mixer";
import type { VolLivestreamOut } from "@/types/livestream";
import type { VolChatMessageOut } from "@/types/chat";
import { useStreamUsage } from "@/hooks/useStreamUsage";
import { StreamUsageBanner } from "./stream-usage-banner";
import { StreamLimitModal } from "./stream-limit-modal";
import { useViewerCount } from "@/lib/api/useViewerCount";

interface AudioVisualizerProps {
  isActive: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  accentColor?: string;
}

function AudioVisualizer({
  isActive,
  canvasRef,
  accentColor = "#38bdf8",
}: AudioVisualizerProps) {
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={64}
      className="w-full h-16 rounded-lg bg-black/50"
      style={{ display: isActive ? "block" : "none" }}
    />
  );
}

function PulseRings({ isActive }: { isActive: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ 
            borderWidth: '1px', 
            borderStyle: 'solid', 
            borderColor: 'rgba(14, 165, 233, 0.3)',
          }}
          animate={isActive ? { scale: [1, 2.5 + i * 0.5], opacity: [0.6, 0] } : { scale: 1, opacity: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

interface CreatorVideoStreamingProps {
  onStreamStarted?: (stream: VolLivestreamOut) => void;
  onStreamStopped?: () => void;
}

type VideoSourceType = "camera" | "screen";

export function CreatorVideoStreaming({
  onStreamStarted,
  onStreamStopped,
}: CreatorVideoStreamingProps) {
  const router = useRouter();
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamDescription, setStreamDescription] = useState("");
  const [companySlug, setCompanySlug] = useState<string | null>(null);

  const [currentStream, setCurrentStream] = useState<VolLivestreamOut | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<string>("idle");

  const [existingActiveStream, setExistingActiveStream] = useState<VolLivestreamOut | null>(null);
  const [networkRecovered, setNetworkRecovered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const [codec, setCodec] = useState<string>("—");
  const [bitrate, setBitrate] = useState<string>("—");
  const [iceState, setIceState] = useState<string>("—");

  const [streamDuration, setStreamDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [videoSourceType, setVideoSourceType] = useState<VideoSourceType>("camera");
  const [useMic, setUseMic] = useState(true);
  const [useSystemAudio, setUseSystemAudio] = useState(false);

  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraDevice, setSelectedCameraDevice] = useState<string>("");
  const [showCameraPicker, setShowCameraPicker] = useState(false);

  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>("");
  const [showMicPicker, setShowMicPicker] = useState(false);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [screenSelectionDone, setScreenSelectionDone] = useState(false);
  
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const [showUsageBanner, setShowUsageBanner] = useState(false);
  const [usageBannerDismissed, setUsageBannerDismissed] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showStreamEndedModal, setShowStreamEndedModal] = useState(false);
  const [hasStreamingVideo, setHasStreamingVideo] = useState(false);
  const [streamForPreview, setStreamForPreview] = useState<MediaStream | null>(null);
  const streamingVideoRef = useRef<HTMLVideoElement | null>(null);

  const pubStreamRef = useRef<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const streamPreviewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const mixerEngineRef = useRef<MixerEngine | null>(null);
  const previewAbortRef = useRef<(() => void) | null>(null);
  const previewOpRef = useRef<{ abort: () => void } | null>(null);
  const stopVizRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [chatMessages, setChatMessages] = useState<VolChatMessageOut[]>([]);
  const [chatMessageInput, setChatMessageInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [realtimeViewerCount, setRealtimeViewerCount] = useState(0);
  const [peakViewerCount, setPeakViewerCount] = useState(0);

  const checkForActiveStream = useCallback(async () => {
    try {
      const activeStreams = await livestreamApi.getActiveStreams(50, 0);
      if (activeStreams.filter(s => s.stream_type === "video").length > 0) {
        const videoStream = activeStreams.find(s => s.stream_type === "video");
        if (videoStream) {
          setExistingActiveStream(videoStream);
          setStreamTitle(videoStream.title);
          setStreamDescription(videoStream.description || "");
        }
      }
    } catch (err) {
      console.error("Failed to check for active streams:", err);
    }
  }, []);

  useEffect(() => {
    companyApi.getMyCompany().then((company) => {
      setCompanySlug(company.slug);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (isStreaming && connectionState === "failed") {
        setNetworkRecovered(true);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setNetworkRecovered(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isStreaming, connectionState]);

  useEffect(() => {
    checkForActiveStream();
  }, [checkForActiveStream]);

  const loadMicDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const devices = await getAudioInputDevicesList();
      setMicDevices(devices);
      if (devices.length > 0 && !selectedMicDevice) {
        setSelectedMicDevice(devices[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to load mic devices:", err);
    }
  }, [selectedMicDevice]);

  const loadCameraDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await getVideoInputDevices();
      setCameraDevices(devices);
      if (devices.length > 0 && !selectedCameraDevice) {
        setSelectedCameraDevice(devices[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to load camera devices:", err);
    }
  }, [selectedCameraDevice]);

  useEffect(() => {
    if (showCameraPicker) {
      loadCameraDevices();
    }
    if (showMicPicker) {
      loadMicDevices();
    }
  }, [showCameraPicker, showMicPicker, loadCameraDevices, loadMicDevices]);

  const startPreview = useCallback(async () => {
    if (isStreaming) return;
    if (previewOpRef.current) {
      previewOpRef.current.abort();
      previewOpRef.current = null;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setError(null);

    if (videoSourceType === "screen") {
      if (screenSelectionDone) {
        setIsPreviewActive(true);
      } else {
        setIsPreviewActive(false);
      }
      return;
    }

    if (previewStreamRef.current && previewStreamRef.current.getVideoTracks().length > 0) {
      return;
    }

    let abortFlag = false;
    let captureAborted = false;
    const op = {
      abort: () => {
        abortFlag = true;
        captureAborted = true;
      }
    };
    previewOpRef.current = op;

    const abortRef = previewAbortRef.current;
    previewAbortRef.current = () => { abortFlag = true; captureAborted = true; abortRef?.(); };

    let stream: MediaStream;

    try {
      if (videoSourceType === "camera") {
        const result = await captureCamera({ deviceId: selectedCameraDevice || undefined });
        if (abortFlag) return;
        stream = result.stream;
        
        if (result.deviceId && !selectedCameraDevice) {
          setSelectedCameraDevice(result.deviceId);
        }

        if (useMic && !abortFlag) {
          try {
            const micStream = await captureMicSource(selectedMicDevice || undefined);
            if (abortFlag) return;
            micStream.getAudioTracks().forEach(track => stream.addTrack(track));
          } catch (e) {
            console.log("Mic capture failed:", e);
          }
        }
      } else {
        const result = await captureScreen();
        if (abortFlag) return;
        stream = result.stream;
        setScreenSelectionDone(true);
        
        if (!result.audioEnabled && useSystemAudio) {
          console.warn("Screen capture started without audio. User may have unchecked 'Share audio'.");
          setError("System audio was not captured. Please ensure 'Share audio' is checked in the browser picker.");
        }
        
        stream.getVideoTracks()[0].onended = () => {
          console.log("Screen capture ended");
          setVideoSourceType("camera");
          setScreenSelectionDone(false);
        };
      }

      if (abortFlag) return;

      previewStreamRef.current = stream;
      setPreviewStream(stream);
      setIsPreviewActive(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        let playAborted = false;
        previewAbortRef.current = () => { playAborted = true; abortFlag = true; };
        try {
          await videoPreviewRef.current.play();
        } catch (err) {
          if (!playAborted && !abortFlag && (err as Error).name !== 'AbortError') {
            console.error("Error playing preview:", err);
          } else {
            console.log("Preview play aborted");
          }
        } finally {
          previewAbortRef.current = null;
        }
      }
    } catch (err) {
      console.error("Failed to start preview:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to start camera preview";
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Camera/microphone permission denied. Please allow access and try again.");
      } else {
        setError(errorMsg);
      }
    } finally {
      previewOpRef.current = null;
      previewAbortRef.current = null;
    }
  }, [videoSourceType, selectedCameraDevice, selectedMicDevice, useMic, useSystemAudio, isStreaming, screenSelectionDone]);

  const stopPreview = useCallback((keepTracksAlive = false) => {
    if (previewStreamRef.current) {
      if (!keepTracksAlive) {
        previewStreamRef.current.getTracks().forEach(track => track.stop());
      }
      previewStreamRef.current = null;
    }
    setPreviewStream(null);
    setIsPreviewActive(false);
    
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, []);

  const restartPreview = useCallback(async () => {
    if (previewOpRef.current) {
      previewOpRef.current.abort();
      previewOpRef.current = null;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const currentStream = previewStreamRef.current;
    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach(track => track.stop());
      previewStreamRef.current = null;
    }
    setPreviewStream(null);
    setIsPreviewActive(false);
    
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    await startPreview();
  }, [startPreview]);

  useEffect(() => {
    if (!isStreaming) {
      if (videoSourceType === "screen") {
        setIsPreviewActive(false);
        setPreviewStream(null);
        previewStreamRef.current = null;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      } else {
        startPreview();
      }
    } else {
      stopPreview();
    }

    return () => {
      stopPreview();
    };
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      if (videoSourceType === "screen") {
        setScreenSelectionDone(false);
        setIsPreviewActive(false);
        setPreviewStream(null);
        previewStreamRef.current = null;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      } else {
        restartPreview();
      }
    }
  }, [videoSourceType, selectedCameraDevice]);

  useEffect(() => {
    if (isStreaming && streamForPreview) {
      console.log('[useEffect] isStreaming:', isStreaming);
      console.log('[useEffect] streamForPreview:', streamForPreview);
      console.log('[useEffect] streamForPreview videoTracks:', streamForPreview.getVideoTracks().length);
      console.log('[useEffect] streamingVideoRef.current:', streamingVideoRef.current);
      
      if (streamingVideoRef.current) {
        console.log('[useEffect] Setting streamingVideoRef.srcObject');
        streamingVideoRef.current.srcObject = streamForPreview;
        const playPromise = streamingVideoRef.current.play();
        playPromise.then(() => console.log('[useEffect] Play started successfully'))
                   .catch(err => console.error('[useEffect] Play failed:', err));
      } else {
        console.warn('[useEffect] streamingVideoRef.current is null!');
        const timeout = setTimeout(() => {
          console.log('[useEffect] Retry setting srcObject');
          if (streamingVideoRef.current && streamForPreview) {
            streamingVideoRef.current.srcObject = streamForPreview;
            streamingVideoRef.current.play().catch(console.error);
          }
        }, 100);
        return () => clearTimeout(timeout);
      }
    }
  }, [isStreaming, streamForPreview]);

  const { viewerCount, peakViewers } = useViewerCount({
    slug: currentStream?.slug || '',
    companyId: currentStream?.company_id || 0,
    enabled: isStreaming && !!currentStream?.slug && !!currentStream?.company_id,
    pollingInterval: 5000,
  });

  useEffect(() => {
    if (viewerCount > 0) {
      setRealtimeViewerCount(viewerCount);
    }
    if (peakViewers > 0) {
      setPeakViewerCount(prev => Math.max(prev, peakViewers));
    }
  }, [viewerCount, peakViewers]);

  const fetchChatMessages = useCallback(async () => {
    if (!currentStream?.slug) return;
    try {
      const messages = await chatApi.getMessages(currentStream.slug, 1, 50);
      setChatMessages(messages);
    } catch (err) {
      console.error("Failed to fetch chat messages:", err);
    }
  }, [currentStream?.slug]);

  const handleSendChatMessage = useCallback(async () => {
    if (!chatMessageInput.trim() || !currentStream?.slug) return;

    setIsSendingChat(true);
    try {
      await chatApi.sendMessage(currentStream.slug, chatMessageInput.trim());
      setChatMessageInput("");
      await fetchChatMessages();
    } catch (err) {
      console.error("Failed to send chat message:", err);
    } finally {
      setIsSendingChat(false);
    }
  }, [chatMessageInput, currentStream?.slug, fetchChatMessages]);

  useEffect(() => {
    if (isStreaming && currentStream?.slug) {
      fetchChatMessages();
      chatPollIntervalRef.current = setInterval(fetchChatMessages, 5000);
    } else {
      if (chatPollIntervalRef.current) {
        clearInterval(chatPollIntervalRef.current);
        chatPollIntervalRef.current = null;
      }
      setChatMessages([]);
    }

    return () => {
      if (chatPollIntervalRef.current) {
        clearInterval(chatPollIntervalRef.current);
      }
    };
  }, [isStreaming, currentStream?.slug, fetchChatMessages]);

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  const { usage: streamUsage } = useStreamUsage({
    slug: currentStream?.slug ?? '',
    enabled: isStreaming && !!currentStream?.slug,
    onWarning: () => {
      setShowUsageBanner(true);
      setUsageBannerDismissed(false);
    },
    onLimitReached: () => {
      setShowUsageBanner(false);
      setShowLimitModal(true);
      setTimeout(() => handleStopStream(), 400);
    },
    onStreamStopped: () => {
      handleStopStream();
    },
  });

  const handleStartStream = useCallback(async () => {
    if (!streamTitle.trim()) {
      setError("Please enter a stream title");
      return;
    }

    if (videoSourceType === "camera") {
      const streamToPublish = previewStreamRef.current;
      if (!streamToPublish || streamToPublish.getVideoTracks().length === 0) {
        setError("Please select a video source (camera or screen)");
        return;
      }
    }

    setIsStarting(true);
    setError(null);
    setConnectionState("connecting");
    setShowLimitModal(false);

    let videoStream: MediaStream;
    let screenCaptureDone = false;

    if (videoSourceType === "screen") {
      try {
        const result = await captureScreen();
        videoStream = result.stream;
        setScreenSelectionDone(true);
        screenCaptureDone = true;

        if (!result.audioEnabled && useSystemAudio) {
          console.warn("Screen capture started without audio. User may have unchecked 'Share audio'.");
          setError("System audio was not captured. Please ensure 'Share audio' is checked in the browser picker.");
        }
        
        videoStream.getVideoTracks()[0].onended = () => {
          console.log("Screen capture ended");
          setVideoSourceType("camera");
          setScreenSelectionDone(false);
        };
      } catch (err) {
        console.error("Failed to capture screen:", err);
        setError("Screen capture failed. Please try again.");
        setIsStarting(false);
        return;
      }
    } else {
      videoStream = previewStreamRef.current!;
    }

    console.log('[handleStartStream] videoStream:', videoStream);
    console.log('[handleStartStream] video tracks:', videoStream?.getVideoTracks().length);

    try {
      const streamData = await livestreamApi.startVideoStream({
        title: streamTitle,
        description: streamDescription || undefined,
      });

      setCurrentStream(streamData);
      setExistingActiveStream(null);

      if (!streamData.cf_webrtc_publish_url) {
        throw new Error("No publish URL returned from API");
      }

      const engine = createMixerEngine();
      mixerEngineRef.current = engine;

      const videoTrack = videoStream.getVideoTracks()[0];
      const existingAudioTracks = previewStreamRef.current?.getAudioTracks() || [];

      if (useMic && existingAudioTracks.length > 0) {
        console.log('[Publisher] Using audio tracks from preview stream:', existingAudioTracks.length);
        existingAudioTracks.forEach((track, i) => {
          engine.addChannel(`preview-mic-${i}`, 'MIC', 'mic', new MediaStream([track]), selectedMicDevice || undefined);
        });
      }

      if (useSystemAudio && screenCaptureDone) {
        try {
          const systemStream = await captureSystemSource();
          engine.addChannel('system', 'SYSTEM', 'system', systemStream);
        } catch (e) {
          console.log("System audio not available:", e);
          setError("System audio is not available. Please ensure you selected audio sharing in the browser picker.");
        }
      } else if (useSystemAudio && videoSourceType === "screen") {
        try {
          const audioTracks = videoStream.getAudioTracks();
          if (audioTracks.length > 0) {
            engine.addChannel('system', 'SYSTEM', 'system', new MediaStream(audioTracks));
          }
        } catch (e) {
          console.log("System audio from screen capture not available:", e);
        }
      }

      const mixerStream = engine.outputStream;

      if (canvasRef.current) {
        stopVizRef.current = startVisualizer(mixerStream, canvasRef.current, "#38bdf8");
      }

      const combinedStream = new MediaStream();
      if (videoTrack) {
        console.log('[Publisher] Adding video track:', videoTrack.label, videoTrack.id);
        combinedStream.addTrack(videoTrack);
      }

      mixerStream.getAudioTracks().forEach((track) => {
        console.log('[Publisher] Adding audio track from mixer:', track.label, track.id);
        combinedStream.addTrack(track);
      });

      console.log('[Publisher] combinedStream has', combinedStream.getAudioTracks().length, 'audio tracks and', combinedStream.getVideoTracks().length, 'video tracks');

      if (combinedStream.getVideoTracks().length === 0) {
        console.error('[Publisher] ERROR: No video tracks in combinedStream!');
        setError("No video track available for streaming");
        return;
      }

      pubStreamRef.current = videoStream;

      previewStreamRef.current = null;
      setPreviewStream(null);
      setIsPreviewActive(false);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }

      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        setIceState(s);
        console.log(`Publish ICE → ${s}`);

        if (s === "connected") {
          setConnectionState("connected");
          startPubStats();
        } else if (s === "failed" || s === "disconnected") {
          setConnectionState("failed");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`Publish ICE gathering → ${pc.iceGatheringState}`);
      };

      combinedStream.getTracks().forEach((track) => {
        console.log('[Publisher] addTrack:', track.kind, track.label, track.id);
        pc.addTrack(track, combinedStream);
      });

      console.log('[Publisher] PC has', pc.getTransceivers().length, 'transceivers after addTrack');

      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      console.log('[Publisher] Created offer - checking SDP:');
      console.log('[Publisher] Has video m-line:', offer.sdp?.includes('m=video'));
      console.log('[Publisher] Has H264:', offer.sdp?.includes('H264'));
      console.log('[Publisher] SDP length:', offer.sdp?.length);

      const sdpWithCodecs = preferVideoCodecs(offer.sdp || "");
      await pc.setLocalDescription({ type: offer.type, sdp: sdpWithCodecs });

      console.log("Waiting for ICE gathering...");
      await waitForIce(pc, 2000);

      console.log(`Sending offer to: ${streamData.cf_webrtc_publish_url}`);

      const res = await fetch(streamData.cf_webrtc_publish_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          Accept: "application/sdp",
        },
        body: pc.localDescription!.sdp,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server ${res.status}: ${txt.slice(0, 200)}`);
      }

      const answerSdp = await res.text();
      console.log(`Answer received (${answerSdp.length} bytes)`);

      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      const detectedCodec = detectAudioCodec(answerSdp);
      setCodec(detectedCodec);
      console.log(`Negotiated codec: ${detectedCodec}`);

      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setStreamDuration(0);

      durationIntervalRef.current = setInterval(() => {
        setStreamDuration((prev) => prev + 1);
      }, 1000);

      setIsStreaming(true);
      const hasVideo = pubStreamRef.current !== null && pubStreamRef.current.getVideoTracks().length > 0;
      setHasStreamingVideo(hasVideo);
      setStreamForPreview(pubStreamRef.current);
      console.log('[handleStartStream] hasStreamingVideo:', hasVideo);
      console.log('[handleStartStream] streamForPreview set:', pubStreamRef.current);
      onStreamStarted?.(streamData);
    } catch (err: unknown) {
      console.error("Publish error:", err);
      const is403WithLimit = (err as { status?: number; detail?: string }).status === 403 &&
        typeof (err as { detail?: string }).detail === 'string' &&
        (err as { detail: string }).detail.toLowerCase().includes('daily stream limit');
      if (is403WithLimit) {
        setShowLimitModal(true);
      } else {
        const errorMsg = err instanceof Error ? err.message : "Failed to start stream";
        setError(errorMsg);
        if (videoSourceType === "camera") {
          startPreview();
        }
      }
      setConnectionState("failed");
      teardownPublish();
    } finally {
      setIsStarting(false);
    }
  }, [streamTitle, streamDescription, useMic, useSystemAudio, videoSourceType, selectedMicDevice, onStreamStarted, stopPreview, startPreview]);

  const startPubStats = useCallback(() => {
    let lastBytes = 0;
    let lastTs = 0;

    statsTimerRef.current = setInterval(async () => {
      if (!pcRef.current) return;
      const stats = await pcRef.current.getStats();
      stats.forEach((r) => {
        if (r.type === "outbound-rtp" && r.kind === "audio") {
          const now = r.timestamp;
          const bytes = r.bytesSent;
          if (lastTs) {
            const dt = (Number(now) - lastTs) / 1000;
            const kbps = Math.round(((bytes - lastBytes) * 8) / dt / 1000);
            setBitrate(kbps + " kbps");
          }
          lastBytes = Number(bytes);
          lastTs = Number(now);
        }
      });
    }, 1500);
  }, []);

  const teardownPublish = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (pubStreamRef.current) {
      pubStreamRef.current.getTracks().forEach((t) => t.stop());
      pubStreamRef.current = null;
    }

    if (mixerEngineRef.current) {
      mixerEngineRef.current.destroy();
      mixerEngineRef.current = null;
    }

    if (stopVizRef.current) {
      stopVizRef.current();
      stopVizRef.current = null;
    }

    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }

    setBitrate("—");
    setIceState("—");
  }, []);

  const handleStopStream = useCallback(async () => {
    teardownPublish();

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (currentStream?.slug) {
      try {
        await livestreamApi.stopStream(currentStream.slug);
      } catch (err) {
        console.error("Failed to stop stream via API:", err);
      }
    }

    setIsStreaming(false);
    setStreamDuration(0);
    setCurrentStream(null);
    setCodec("—");
    setConnectionState("idle");
    setShowUsageBanner(false);
    setUsageBannerDismissed(false);
    setShowStreamEndedModal(true);
    setRealtimeViewerCount(0);
    setPeakViewerCount(0);

    if (videoSourceType === "screen") {
      setScreenSelectionDone(false);
    }

    onStreamStopped?.();
  }, [currentStream, teardownPublish, onStreamStopped, videoSourceType]);

  const toggleVideo = useCallback(() => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);
    
    if (previewStreamRef.current) {
      previewStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  }, [isVideoEnabled]);

  const toggleAudio = useCallback(() => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);
    
    if (previewStreamRef.current) {
      previewStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = newState;
      });
    }
  }, [isAudioEnabled]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getConnectionQuality = () => {
    switch (connectionState) {
      case "connected":
        return { icon: SignalHigh, color: "text-green-500", label: "Live" };
      case "connecting":
        return { icon: Signal, color: "text-yellow-500", label: "Connecting" };
      case "failed":
        return { icon: SignalLow, color: "text-red-500", label: "Failed" };
      default:
        return { icon: Signal, color: "text-slate-400", label: "Offline" };
    }
  };

  const connectionQuality = getConnectionQuality();

  useEffect(() => {
    return () => {
      teardownPublish();
      stopPreview();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [teardownPublish, stopPreview]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Video Creator Studio</h1>
            <p className="text-slate-400">WHIP Video Streaming</p>
          </div>

          <Link
            href="/creator/stream"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <Radio className="w-4 h-4" />
            Switch to Audio Stream
          </Link>

          <div className="flex items-center gap-4">
            {isStreaming && (
              <>
                <connectionQuality.icon
                  className={cn("w-5 h-5", connectionQuality.color)}
                />
                <span className={cn("text-sm", connectionQuality.color)}>
                  {connectionQuality.label}
                </span>
                <div className="text-sky-400 font-mono">
                  {formatDuration(streamDuration)}
                </div>
              </>
            )}
          </div>
        </div>

        {!isOnline && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">Network connection lost</span>
          </div>
        )}

        <StreamLimitModal isOpen={showLimitModal} usage={streamUsage} />

        {showStreamEndedModal && !showLimitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center"
            >
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-7 h-7 text-emerald-500" />
              </div>
              <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">
                Stream complete
              </p>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                That's a wrap!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                Your video stream ended successfully.
              </p>
<div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3 mb-5">
                    <div className="text-left">
                      <p className="text-xs text-slate-400 mb-0.5">Peak viewers</p>
                      <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                        {peakViewerCount > 0 ? peakViewerCount.toLocaleString() : "0"}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-sky-400 opacity-70 shrink-0" />
                  </div>
              <button
                onClick={() => {
                  setShowStreamEndedModal(false);
                  router.push("/dashboard");
                }}
                className="w-full py-2.5 px-5 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all"
              >
                Go to dashboard
              </button>
            </motion.div>
          </div>
        )}

        {isStreaming && showUsageBanner && streamUsage && (
          <StreamUsageBanner
            usage={streamUsage}
            dismissed={usageBannerDismissed}
            onDismiss={() => setUsageBannerDismissed(true)}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <VideoIcon className="w-5 h-5 text-sky-500" />
                Video Preview
              </h2>

              <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
                {isStreaming ? (
                  <video
                    ref={(el) => { streamingVideoRef.current = el; streamPreviewRef.current = el; }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                )}
                {!isPreviewActive && !isStreaming && videoSourceType === "camera" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center text-slate-500">
                      <Camera className="w-12 h-12 mx-auto mb-2" />
                      <p>Starting preview...</p>
                    </div>
                  </div>
                )}
                {!isPreviewActive && !isStreaming && videoSourceType === "screen" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center text-slate-500">
                      <Monitor className="w-12 h-12 mx-auto mb-2" />
                      <p>Click "Start Video Stream" to select screen/window</p>
                    </div>
                  </div>
                )}
                {isStreaming && !streamForPreview && !hasStreamingVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <div className="relative">
                        <PulseRings isActive={true} />
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-emerald-500 flex items-center justify-center">
                          <RadioIcon className="w-8 h-8 text-white animate-pulse" />
                        </div>
                      </div>
                      <p className="mt-4 text-sky-400 font-semibold">Streaming Live</p>
                      <p className="text-slate-500 text-sm">{formatDuration(streamDuration)}</p>
                    </div>
                  </div>
                )}
                {!isVideoEnabled && isPreviewActive && !isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center text-slate-400">
                      <CameraOff className="w-12 h-12 mx-auto mb-2" />
                      <p>Video is off</p>
                    </div>
                  </div>
                )}
              </div>

              <AudioVisualizer
                isActive={isStreaming && !!mixerEngineRef.current}
                canvasRef={canvasRef}
              />

              <div className="flex gap-2">
                <button
                  onClick={toggleVideo}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    isVideoEnabled
                      ? "bg-slate-700 hover:bg-slate-600"
                      : "bg-red-500/20 text-red-400"
                  )}
                  disabled={isStreaming}
                >
                  {isVideoEnabled ? (
                    <Camera className="w-4 h-4" />
                  ) : (
                    <CameraOff className="w-4 h-4" />
                  )}
                  {isVideoEnabled ? "Video On" : "Video Off"}
                </button>

                <button
                  onClick={toggleAudio}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                    isAudioEnabled
                      ? "bg-slate-700 hover:bg-slate-600"
                      : "bg-red-500/20 text-red-400"
                  )}
                  disabled={isStreaming}
                >
                  {isAudioEnabled ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                  {isAudioEnabled ? "Mic On" : "Mic Off"}
                </button>
              </div>
            </div>

            {isStreaming && (
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h2 className="text-lg font-semibold mb-4">Stream Stats</h2>
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-sky-400">{formatDuration(streamDuration)}</p>
                    <p className="text-xs text-slate-500">Duration</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-400">{bitrate}</p>
                    <p className="text-xs text-slate-500">Bitrate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">{codec}</p>
                    <p className="text-xs text-slate-500">Codec</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">{iceState}</p>
                    <p className="text-xs text-slate-500">ICE State</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-pink-400">{realtimeViewerCount}</p>
                    <p className="text-xs text-slate-500">Viewers</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="w-5 h-5 text-sky-500" />
                Video Source
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="videoSource"
                    checked={videoSourceType === "camera"}
                    onChange={() => setVideoSourceType("camera")}
                    disabled={isStreaming || isStarting}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <Camera className="w-4 h-4 text-sky-400" />
                  <span className="text-sm">Camera</span>
                </label>

                {videoSourceType === "camera" && (
                  <div className="ml-7 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowCameraPicker(!showCameraPicker)}
                      disabled={isStreaming || isStarting}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      {selectedCameraDevice
                        ? cameraDevices.find((d) => d.deviceId === selectedCameraDevice)?.label || "Select camera"
                        : "Select camera"}
                    </button>

                    {showCameraPicker && (
                      <div className="mt-2 bg-slate-800 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {cameraDevices.length === 0 ? (
                          <span className="text-xs text-slate-500">No devices found</span>
                        ) : (
                          cameraDevices.map((device) => (
                            <button
                              key={device.deviceId}
                              type="button"
                              onClick={() => {
                                setSelectedCameraDevice(device.deviceId);
                                setShowCameraPicker(false);
                              }}
                              className={cn(
                                "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-700",
                                selectedCameraDevice === device.deviceId &&
                                  "bg-sky-500/20 text-sky-400"
                              )}
                            >
                              {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="videoSource"
                    checked={videoSourceType === "screen"}
                    onChange={() => setVideoSourceType("screen")}
                    disabled={isStreaming || isStarting}
                    className="w-4 h-4 accent-purple-500"
                  />
                  <Monitor className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">Screen Capture</span>
                </label>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Mic className="w-5 h-5 text-sky-500" />
                Audio Source
              </h2>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useMic}
                    onChange={(e) => setUseMic(e.target.checked)}
                    disabled={isStreaming || isStarting}
                    className="w-4 h-4 accent-sky-500"
                  />
                  <Mic className="w-4 h-4 text-sky-400" />
                  <span className="text-sm">Microphone</span>
                </label>

                {useMic && (
                  <div className="ml-7 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowMicPicker(!showMicPicker)}
                      disabled={isStreaming || isStarting}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      {selectedMicDevice
                        ? micDevices.find((d) => d.deviceId === selectedMicDevice)?.label || "Select microphone"
                        : "Select microphone"}
                    </button>

                    {showMicPicker && (
                      <div className="mt-2 bg-slate-800 rounded-lg p-2 max-h-32 overflow-y-auto">
                        {micDevices.length === 0 ? (
                          <span className="text-xs text-slate-500">No devices found</span>
                        ) : (
                          micDevices.map((device) => (
                            <button
                              key={device.deviceId}
                              type="button"
                              onClick={() => {
                                setSelectedMicDevice(device.deviceId);
                                setShowMicPicker(false);
                              }}
                              className={cn(
                                "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-slate-700",
                                selectedMicDevice === device.deviceId &&
                                  "bg-sky-500/20 text-sky-400"
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

                {videoSourceType === "screen" && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSystemAudio}
                      onChange={(e) => setUseSystemAudio(e.target.checked)}
                      disabled={isStreaming || isStarting}
                      className="w-4 h-4 accent-purple-500"
                    />
                    <Monitor className="w-4 h-4 text-purple-400" />
                    <span className="text-sm">System Audio (from screen share)</span>
                  </label>
                )}
              </div>
            </div>

            {isStreaming && mixerEngineRef.current && (
              <CreatorMixer
                mixerEngine={mixerEngineRef.current}
                isStreaming={isStreaming}
              />
            )}

            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Radio className="w-5 h-5 text-sky-500" />
                Stream Settings
              </h2>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                  Stream Title
                </label>
                <input
                  type="text"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="Enter stream title..."
                  disabled={isStreaming || isStarting}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={streamDescription}
                  onChange={(e) => setStreamDescription(e.target.value)}
                  placeholder="What's your stream about?"
                  disabled={isStreaming || isStarting}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 resize-none"
                />
              </div>

              {error && (
                <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {!isStreaming ? (
                <Button
                  onClick={handleStartStream}
                  disabled={isStarting || !streamTitle.trim() || (videoSourceType === "screen" && !screenSelectionDone)}
                  className="w-full"
                  size="lg"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : videoSourceType === "screen" && !screenSelectionDone ? (
                    <>
                      <Monitor className="w-4 h-4 mr-2" />
                      Select Screen to Share
                    </>
                  ) : (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Start Video Stream
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleStopStream}
                  className="w-full"
                  size="lg"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop Stream
                </Button>
              )}
            </div>

            {isStreaming && currentStream && (
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-sky-500" />
                  Chat
                </h2>
                
                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No messages yet</p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="bg-slate-800 rounded-lg p-2 text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sky-400">{msg.username || 'Anonymous'}</span>
                          <span className="text-slate-500 text-[10px]">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-slate-200">{msg.content}</p>
                      </div>
                    ))
                  )}
                  <div ref={chatMessagesEndRef} />
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessageInput}
                    onChange={(e) => setChatMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Send a message..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendChatMessage}
                    disabled={!chatMessageInput.trim() || isSendingChat}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {isStreaming && currentStream && (
              <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-sky-500" />
                  Share Stream
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${companySlug}/${currentStream.slug}`}
                    readOnly
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (companySlug && currentStream) {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/${companySlug}/${currentStream.slug}`
                        );
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}