"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  PanelRight,
  LayoutPanelTop,
  SlidersHorizontal,
  MoreVertical,
  Clock,
  Headphones,
  X,
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
import { subscriptionsApi } from "@/lib/api/subscriptions";
import { StreamUsageBanner } from "./stream-usage-banner";
import { StreamLimitModal } from "./stream-limit-modal";
import { useViewerCount } from "@/lib/api/useViewerCount";
import "./creator-video-studio.css";

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

// Subscription type from API
interface Subscription {
  id: number;
  company_id: number;
  plan_id: number;
  billing_cycle: string;
  subscription_start: string;
  subscription_end: string | null;
  paystack_subscription_code: string | null;
  paystack_customer_code: string | null;
  is_active: boolean;
  auto_renew: boolean;
  referral_code: string;
  additional_integrations: number;
  integration_addon_price_kobo: number;
  created_at: string;
  updated_at: string;
  plan_name: string;
  plan_display_name: string;
  monthly_price_kobo: number;
  annual_price_kobo: number;
  daily_stream_used: number;
  daily_stream_limit: number;
  monthly_uploads_used: number;
  monthly_uploads_limit: number;
  integrations_used: number;
  integrations_allowed: number;
  is_within_limits: boolean;
}

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
  const [copied, setCopied] = useState(false);

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

  // DESIGN: Theme state with localStorage persistence
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("creator-studio-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  // DESIGN: Panel visibility state with localStorage persistence
  const [leftDockCollapsed, setLeftDockCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("studio-left-dock-collapsed") === "true";
    }
    return false;
  });

  const [rightDockCollapsed, setRightDockCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("studio-right-dock-collapsed") === "true";
    }
    return false;
  });

  const [showStats, setShowStats] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Viewers sparkline data (UI-only state, no API calls)
  const viewerHistoryRef = useRef<number[]>([]);
  const [viewerSparkline, setViewerSparkline] = useState<number[]>([]);

  // End stream confirmation state
  const [stopConfirmPending, setStopConfirmPending] = useState(false);
  const stopConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [realtimeViewerCount, setRealtimeViewerCount] = useState(0);
  const [peakViewerCount, setPeakViewerCount] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isFreeUser, setIsFreeUser] = useState(false);

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
  
  // Fetch subscription on mount to determine if user is free tier
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await subscriptionsApi.getCurrentSubscription();
        const subscriptionData = response as Subscription;
        setSubscription(subscriptionData);
        setIsFreeUser(subscriptionData?.plan_name === 'free' || subscriptionData?.daily_stream_limit === 3600);
      } catch (err) {
        console.error('Failed to fetch subscription:', err);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    
    fetchSubscription();
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

  // DESIGN: Apply theme to document and persist to localStorage
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("creator-studio-theme", theme);
    }
  }, [theme]);

  // DESIGN: Persist dock collapse state to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("studio-left-dock-collapsed", String(leftDockCollapsed));
    }
  }, [leftDockCollapsed]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("studio-right-dock-collapsed", String(rightDockCollapsed));
    }
  }, [rightDockCollapsed]);

  // DESIGN: Update sparkline data when viewer count changes
  const triggerScreenCapture = useCallback(async () => {
    try {
      const result = await captureScreen();
      previewStreamRef.current = result.stream;
      setPreviewStream(result.stream);
      setScreenSelectionDone(true);
      setIsPreviewActive(true);

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = result.stream;
        videoPreviewRef.current.play().catch(console.error);
      }

      if (!result.audioEnabled && useSystemAudio) {
        console.warn("Screen capture started without audio.");
        setError("System audio was not captured. Please ensure 'Share audio' is checked in the browser picker.");
      }

      result.stream.getVideoTracks()[0].onended = () => {
        console.log("Screen capture ended");
        setVideoSourceType("camera");
        setScreenSelectionDone(false);
        if (previewStreamRef.current) {
          previewStreamRef.current.getTracks().forEach(track => track.stop());
          previewStreamRef.current = null;
        }
        setPreviewStream(null);
        setIsPreviewActive(false);
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };
    } catch (err) {
      console.error("Failed to capture screen:", err);
      setError("Screen capture failed. Please try again.");
      setVideoSourceType("camera");
    }
  }, [useSystemAudio]);

  const handleScreenSourceClick = useCallback(async () => {
    if (isStreaming || isStarting) return;
    setVideoSourceType("screen");
    setUseMic(false);
    setUseSystemAudio(true);
    await triggerScreenCapture();
  }, [isStreaming, isStarting, triggerScreenCapture]);

  const startPreview = useCallback(async () => {
    if (isStreaming) return;
    if (previewOpRef.current) {
      previewOpRef.current.abort();
      previewOpRef.current = null;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    setError(null);

    if (videoSourceType === "screen") {
      if (screenSelectionDone && previewStreamRef.current) {
        setIsPreviewActive(true);
      } else if (!screenSelectionDone) {
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
        if (!screenSelectionDone) {
          setIsPreviewActive(false);
          setPreviewStream(null);
          previewStreamRef.current = null;
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = null;
          }
        }
      } else {
        if (screenSelectionDone) {
          setScreenSelectionDone(false);
        }
        restartPreview();
      }
    }
  }, [videoSourceType, selectedCameraDevice, screenSelectionDone, restartPreview, isStreaming]);

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

 
  const { usage: streamUsage } = useStreamUsage({
    slug: currentStream?.slug ?? '',
    enabled: isFreeUser && isStreaming && !!currentStream?.slug,
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
  
  // Placeholder streamUsage when hook is disabled to avoid undefined errors
  const safeStreamUsage = isFreeUser ? streamUsage : null;

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

    if (videoSourceType === "screen" && (!previewStreamRef.current || !screenSelectionDone)) {
      setError("Please select a screen to share first");
      return;
    }

    setIsStarting(true);
    setError(null);
    setConnectionState("connecting");
    setShowLimitModal(false);

    let videoStream: MediaStream;
    let screenCaptureDone = false;

    if (videoSourceType === "screen") {
      videoStream = previewStreamRef.current!;
      screenCaptureDone = true;
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
        const screenAudioTracks = videoStream.getAudioTracks();
        if (screenAudioTracks.length > 0) {
          console.log('[Publisher] Using screen audio tracks:', screenAudioTracks.length);
          engine.addChannel('screen-audio', 'SYSTEM', 'system', new MediaStream(screenAudioTracks));
        } else {
          console.warn("Screen capture has no audio tracks. User may have not selected 'Share audio'.");
          setError("System audio was not captured. Please ensure 'Share audio' is checked in the browser picker.");
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
    if (stopConfirmPending) {
      if (stopConfirmTimeoutRef.current) {
        clearTimeout(stopConfirmTimeoutRef.current);
        stopConfirmTimeoutRef.current = null;
      }
      setStopConfirmPending(false);
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
    } else {
      setStopConfirmPending(true);
      stopConfirmTimeoutRef.current = setTimeout(() => {
        setStopConfirmPending(false);
      }, 3000);
    }
  }, [currentStream, teardownPublish, onStreamStopped, videoSourceType, stopConfirmPending]);

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

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  }, []);

  // Cleanup stop confirm timeout on unmount
  useEffect(() => {
    return () => {
      if (stopConfirmTimeoutRef.current) {
        clearTimeout(stopConfirmTimeoutRef.current);
      }
    };
  }, []);

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

  // DESIGN: Compute sparkline path for viewers
  const getSparklinePath = () => {
    if (viewerSparkline.length < 2) return "";
    const max = Math.max(...viewerSparkline, 1);
    const width = 40;
    const height = 16;
    const points = viewerSparkline.map((v, i) => {
      const x = (i / (viewerSparkline.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    });
    return `M${points.join(" L")}`;
  };

  return (
    <div className="creator-studio" data-theme={theme}>
      {/* DESIGN: Network status banner */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            className="network-banner offline"
          >
            <WifiOff className="w-4 h-4" />
            <span>Network connection lost</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESIGN: Header Bar */}
      <header className="studio-header">
        <div className="flex items-center justify-between h-full px-4 lg:px-6">
          {/* Left: Logo + Breadcrumb */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-200 to-white flex items-center justify-center">
                 <img src="/logo.png" alt="Volantislive" className="h-8 w-auto" />
              </div>
            </Link>
            <nav className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Creator Studio</span>
              <span className="text-[var(--text-muted)]">›</span>
              <Link href="/creator/stream" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Audio
              </Link>
              <span className="text-[var(--text-muted)]">›</span>
              <span className="text-[var(--accent)] font-medium">Video</span>
            </nav>
          </div>

          {/* Center: Live badge (only when streaming) */}
          <div className="hidden md:flex items-center gap-3">
            {isStreaming ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-3"
              >
                <div className="live-badge">
                  <motion.span
                    className="live-dot"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                  LIVE
                </div>
                <span className="text-[var(--text-primary)] font-medium truncate max-w-32">
                  {streamTitle.slice(0, 32)}
                </span>
                <span className="font-mono text-[var(--accent)]">
                  {formatDuration(streamDuration)}
                </span>
              </motion.div>
            ) : (
              <span className="text-[var(--text-muted)] text-sm">Ready to go live</span>
            )}
          </div>

          {/* Right: Panel toggles + Stats chip + Theme toggle + Avatar */}
          <div className="flex items-center gap-2">
            

{isStreaming && currentStream && (
  <button
    onClick={async () => {
      if (!companySlug || !currentStream) return;

      const link = `${window.location.origin}/${companySlug}/${currentStream.slug}`;

      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Copy failed", err);
      }
    }}
    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
    style={{
      backgroundColor: copied ? "#22c55e" : "var(--accent)",
      color: copied ? "#fff" : theme === "dark" ? "#000" : "#fff",
    }}
  >
    {copied ? "Copied!" : "Copy Streaming Link"}
  </button>
)}
            {/* DESIGN: Panel visibility toggles (desktop) */}
            <div className="hidden lg:flex items-center gap-1 panel-toolbar">
              <button
                onClick={() => setLeftDockCollapsed(!leftDockCollapsed)}
                className={cn("panel-toggle touch-target", !leftDockCollapsed && "active")}
                aria-label={leftDockCollapsed ? "Show controls" : "Hide controls"}
                title={leftDockCollapsed ? "Show Controls" : "Hide Controls"}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowStats(!showStats)}
                className={cn("panel-toggle touch-target", showStats && "active")}
                aria-label={showStats ? "Hide stats" : "Show stats"}
                title={showStats ? "Hide Stats" : "Show Stats"}
              >
                <LayoutPanelTop className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRightDockCollapsed(!rightDockCollapsed)}
                className={cn("panel-toggle touch-target", !rightDockCollapsed && "active")}
                aria-label={rightDockCollapsed ? "Show chat" : "Hide chat"}
                title={rightDockCollapsed ? "Show Chat" : "Hide Chat"}
              >
                <PanelRight className="w-4 h-4" />
              </button>
            </div>

            {/* Viewer count chip (only when streaming) */}
            {isStreaming && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]"
              >
                <Users className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-sm font-medium">{realtimeViewerCount}</span>
              </motion.div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="panel-toggle touch-target theme-toggle-icon"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <AnimatePresence mode="wait">
                {theme === "dark" ? (
                  <motion.div
                    key="moon"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="sun"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>

            {/* Mobile menu button */}

            <div className="lg:hidden">
                <button
              onClick={() => setMobileMenuOpen(true)}
              className="panel-toggle touch-target"
              aria-label="Open menu"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            </div>
            
          </div>
        </div>
      </header>

      {/* Stream Limit Modal */}
      <StreamLimitModal isOpen={showLimitModal} usage={safeStreamUsage} />

      {/* Stream Ended Modal */}
      <AnimatePresence>
        {showStreamEndedModal && !showLimitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="studio-modal-backdrop"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="studio-modal"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: "var(--live)", opacity: 0.2 }}>
                <CheckCircle className="w-8 h-8" style={{ color: "var(--live)" }} />
              </div>
              <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>
                Stream complete
              </p>
              <h2 className="text-2xl font-semibold mb-2">That&apos;s a wrap!</h2>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Your video stream ended successfully.
              </p>
              <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-6" style={{ backgroundColor: "var(--bg-base)" }}>
                <div className="text-left">
                  <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Peak viewers</p>
                  <p className="text-2xl font-semibold">{peakViewerCount > 0 ? peakViewerCount.toLocaleString() : "0"}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs mb-0.5" style={{ color: "var(--text-muted)" }}>Duration</p>
                  <p className="text-2xl font-semibold font-mono">{formatDuration(streamDuration)}</p>
                </div>
                <Users className="w-8 h-8 opacity-50" style={{ color: "var(--accent)" }} />
              </div>
              <button
                onClick={() => {
                  setShowStreamEndedModal(false);
                  router.push("/dashboard");
                }}
                className="w-full py-3 px-5 rounded-xl font-semibold transition-all active:scale-[0.98]"
                style={{ backgroundColor: "var(--accent)", color: theme === "dark" ? "#000" : "#fff" }}
              >
                Go to dashboard
              </button>
              {currentStream?.slug && (
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/${companySlug}/${currentStream.slug}`;
                    navigator.clipboard.writeText(link);
                  }}
                  className="mt-3 w-full py-2 px-5 rounded-xl font-medium transition-all border"
                  style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                >
                  Copy Replay Link
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usage Warning Banner */}
      {isStreaming && showUsageBanner && safeStreamUsage && (
        <div className="fixed top-56 left-1/2 -translate-x-1/2 z-40 max-w-lg w-full px-4">
          <StreamUsageBanner
            usage={safeStreamUsage}
            dismissed={usageBannerDismissed}
            onDismiss={() => setUsageBannerDismissed(true)}
          />
        </div>
      )}

      {/* Main Three-Region Layout */}
      <div className="studio-layout">
        {/* DESIGN: Left Dock - Controls */}
        <aside className={cn("studio-left-dock", leftDockCollapsed && "collapsed")}>
          <div className="p-4 space-y-4">
            {/* Panel 1: Video Source */}
            <div className="collapsible-section">
              <div className="collapsible-header">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-medium">Video Source</span>
                </div>
              </div>
              <div className="collapsible-content space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isStreaming && !isStarting) {
                      setVideoSourceType("camera");
                      setUseMic(true);
                      setUseSystemAudio(false);
                    }
                  }}
                  disabled={isStreaming || isStarting}
                  className={cn(
                    "source-card w-full flex items-center gap-3",
                    videoSourceType === "camera" && "selected",
                    (isStreaming || isStarting) && "disabled"
                  )}
                >
                  <Camera className="w-5 h-5" style={{ color: "var(--accent)" }} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Camera</p>
                    {selectedCameraDevice && !isStreaming && (
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {cameraDevices.find(d => d.deviceId === selectedCameraDevice)?.label || "Default"}
                      </p>
                    )}
                  </div>
                  {(isStreaming || isStarting) && <Settings className="w-4 h-4 opacity-50" />}
                </button>

                <button
                  type="button"
                  onClick={handleScreenSourceClick}
                  disabled={isStreaming || isStarting}
                  className={cn(
                    "source-card w-full flex items-center gap-3",
                    videoSourceType === "screen" && "selected",
                    (isStreaming || isStarting) && "disabled"
                  )}
                >
                  <Monitor className="w-5 h-5" style={{ color: "var(--live)" }} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">Screen Capture</p>
                    {videoSourceType === "screen" && !isStreaming && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {screenSelectionDone ? "Selected" : "Not selected"}
                      </p>
                    )}
                  </div>
                </button>

                {/* Camera device picker inline */}
                {videoSourceType === "camera" && !isStreaming && (
                  <button
                    type="button"
                    onClick={() => setShowCameraPicker(!showCameraPicker)}
                    className="text-xs w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--accent-muted)] transition-colors"
                    style={{ color: "var(--accent)" }}
                  >
                    <Settings className="w-3 h-3 inline mr-1" />
                    {selectedCameraDevice
                      ? cameraDevices.find(d => d.deviceId === selectedCameraDevice)?.label || "Select Camera"
                      : "Select Camera"}
                  </button>
                )}

                {showCameraPicker && (
                  <div className="bg-[var(--bg-base)] rounded-lg p-2 max-h-32 overflow-y-auto">
                    {cameraDevices.length === 0 ? (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>No devices found</span>
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
                            "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-surface)]",
                            selectedCameraDevice === device.deviceId && "bg-[var(--accent-muted)]"
                          )}
                          style={selectedCameraDevice === device.deviceId ? { color: "var(--accent)" } : {}}
                        >
                          {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2: Audio Source */}
            <div className="collapsible-section">
              <div className="collapsible-header">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-medium">Audio Source</span>
                </div>
              </div>
              <div className="collapsible-content space-y-2">
                {videoSourceType === "camera" && (
                  <label className={cn("source-card flex items-center gap-3", (isStreaming || isStarting) && "disabled")}>
                    <input
                      type="checkbox"
                      checked={useMic}
                      onChange={(e) => !isStreaming && setUseMic(e.target.checked)}
                      disabled={isStreaming || isStarting}
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <Mic className="w-5 h-5" style={{ color: "var(--accent)" }} />
                    <span className="text-sm">Microphone</span>
                  </label>
                )}

                {useMic && !isStreaming && videoSourceType === "camera" && (
                  <div className="ml-7 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowMicPicker(!showMicPicker)}
                      className="text-xs flex items-center gap-1"
                      style={{ color: "var(--accent)" }}
                    >
                      <Settings className="w-3 h-3" />
                      {selectedMicDevice
                        ? micDevices.find(d => d.deviceId === selectedMicDevice)?.label || "Select Microphone"
                        : "Select Microphone"}
                    </button>

                    {showMicPicker && (
                      <div className="mt-2 bg-[var(--bg-base)] rounded-lg p-2 max-h-32 overflow-y-auto">
                        {micDevices.length === 0 ? (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>No devices found</span>
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
                                "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-[var(--bg-surface)]",
                                selectedMicDevice === device.deviceId && "bg-[var(--accent-muted)]"
                              )}
                              style={selectedMicDevice === device.deviceId ? { color: "var(--accent)" } : {}}
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
                  <label className={cn("source-card flex items-center gap-3", (isStreaming || isStarting) && "disabled")}>
                    <input
                      type="checkbox"
                      checked={useSystemAudio}
                      onChange={(e) => !isStreaming && setUseSystemAudio(e.target.checked)}
                      disabled={isStreaming || isStarting}
                      className="w-4 h-4"
                      style={{ accentColor: "var(--live)" }}
                    />
                    <Monitor className="w-5 h-5" style={{ color: "var(--live)" }} />
                    <span className="text-sm">System Audio</span>
                  </label>
                )}
              </div>
            </div>

            {/* Panel 3: Stream Setup (only when not streaming) */}
            {!isStreaming && (
              <div className="collapsible-section">
                <div className="collapsible-header">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-medium">Broadcast</span>
                  </div>
                </div>
                <div className="collapsible-content space-y-3">
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Title</label>
                    <div className="float-label-input">
                      <input
                        type="text"
                        value={streamTitle}
                        onChange={(e) => setStreamTitle(e.target.value)}
                        placeholder="Stream title..."
                        disabled={isStarting}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Description</label>
                    <div className="float-label-input">
                      <textarea
                        value={streamDescription}
                        onChange={(e) => setStreamDescription(e.target.value)}
                        placeholder="What's your stream about?"
                        disabled={isStarting}
                        rows={2}
                        className="w-full resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel 4: Mixer (only when streaming) */}
            {isStreaming && mixerEngineRef.current && (
              <div className="collapsible-section">
                <div className="collapsible-header">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-medium">Mixer</span>
                  </div>
                </div>
                <div className="collapsible-content">
                  <CreatorMixer mixerEngine={mixerEngineRef.current} isStreaming={isStreaming} />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* CENTER: Main Preview Area */}
        <main className="studio-main-preview">
          {/* No Signal placeholder when not streaming */}
          {!isStreaming && !isPreviewActive && videoSourceType === "screen" && (
            <div className="studio-surface p-8 text-center mb-4">
              <Radio className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
              <h3 className="text-lg font-medium mb-1">No Signal</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Configure your source and hit Go Live
              </p>
            </div>
          )}

          {/* Usage banner (top of preview) */}
          {isStreaming && showUsageBanner && safeStreamUsage && (
            <StreamUsageBanner
              usage={safeStreamUsage}
              dismissed={usageBannerDismissed}
              onDismiss={() => setUsageBannerDismissed(true)}
            />
          )}

          {/* Error display */}
          {error && (
            <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: "rgba(255, 71, 87, 0.1)", borderColor: "rgba(255, 71, 87, 0.3)" }}>
              <p className="text-sm flex items-center gap-2" style={{ color: "#FF4757" }}>
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {/* Visualizer Canvas + Live Preview */}
          <div className="preview-container mb-4" style={{ aspectRatio: "16/9" }}>
            {isStreaming ? (
              <>
                <video
                  ref={(el) => { streamingVideoRef.current = el; streamPreviewRef.current = el; }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                  aria-label="Live stream preview"
                />
                {/* Live overlay badge + Share button */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <div className="live-badge">
                    <motion.span
                      className="live-dot"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    LIVE
                  </div>
                  {currentStream && (
                    <button
                      onClick={() => {
                        if (companySlug && currentStream) {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/${companySlug}/${currentStream.slug}`
                          );
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "var(--accent)", color: theme === "dark" ? "#000" : "#fff" }}
                    >
                      <Share2 className="w-3 h-3" />
                      Copy Link
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                  aria-label="Camera preview"
                />
                {!isPreviewActive && videoSourceType === "camera" && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
                    <div className="text-center" style={{ color: "var(--text-muted)" }}>
                      <Camera className="w-12 h-12 mx-auto mb-2" />
                      <p>Starting preview...</p>
                    </div>
                  </div>
                )}
                {!isPreviewActive && videoSourceType === "screen" && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
                    <div className="text-center" style={{ color: "var(--text-muted)" }}>
                      <Monitor className="w-12 h-12 mx-auto mb-2" />
                      <p>Select a screen to share on the left</p>
                    </div>
                  </div>
                )}
                {!isVideoEnabled && isPreviewActive && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
                    <div className="text-center" style={{ color: "var(--text-muted)" }}>
                      <CameraOff className="w-12 h-12 mx-auto mb-2" />
                      <p>Video is off</p>
                    </div>
                  </div>
                )}
                {isStreaming && !streamForPreview && !hasStreamingVideo && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "var(--bg-base)" }}>
                    <div className="text-center">
                      <PulseRings isActive={true} />
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--accent), var(--live))" }}>
                        <RadioIcon className="w-8 h-8 text-white" />
                      </div>
                      <p className="mt-4 font-semibold" style={{ color: "var(--accent)" }}>Streaming Live</p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{formatDuration(streamDuration)}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Audio Visualizer */}
          <AudioVisualizer
            isActive={isStreaming && !!mixerEngineRef.current}
            canvasRef={canvasRef}
            accentColor={theme === "dark" ? "#00E5A0" : "#00A86B"}
          />

          {/* Preview controls (toggle video/audio) */}
          {/* <div className="flex gap-2 mt-4">
            <button
              onClick={toggleVideo}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                isVideoEnabled ? "bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]" : "bg-red-500/20"
              )}
              disabled={isStreaming}
              style={!isVideoEnabled ? { color: "#FF4757" } : {}}
            >
              {isVideoEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
              {isVideoEnabled ? "Video On" : "Video Off"}
            </button>
            <button
              onClick={toggleAudio}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                isAudioEnabled ? "bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)]" : "bg-red-500/20"
              )}
              disabled={isStreaming}
              style={!isAudioEnabled ? { color: "#FF4757" } : {}}
            >
              {isAudioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {isAudioEnabled ? "Mic On" : "Mic Off"}
            </button>
          </div> */}
{/* 
                    {showStats && (
            <div className="mt-4">
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="stats-pill"
                >
                  <div className="stats-pill-item">
                    <Signal className="w-4 h-4" style={{ color: connectionQuality.color.includes("green") ? "var(--live)" : connectionQuality.color.includes("yellow") ? "var(--warning)" : "var(--danger)" }} />
                    <span className="text-sm font-medium">{iceState || "—"}</span>
                  </div>
                  <div className="stats-pill-item">
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{codec}</span>
                  </div>
                  <div className="stats-pill-item">
                    <span className="text-sm font-mono">{bitrate}</span>
                  </div>
                </motion.div>

               
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="ghost-card">
                    <div className="ghost-card-label">Status</div>
                    <div className="flex items-center gap-2">
                      {isStreaming ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          <span className="font-semibold" style={{ color: "var(--live)" }}>LIVE</span>
                        </>
                      ) : (
                        <span className="text-sm" style={{ color: "var(--text-muted)" }}>Offline</span>
                      )}
                    </div>
                  </div>

                  <div className="ghost-card">
                    <div className="ghost-card-label">Duration</div>
                    <div className="font-mono font-semibold">{formatDuration(streamDuration)}</div>
                  </div>

                  <div className="ghost-card">
                    <div className="ghost-card-label">Viewers</div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{realtimeViewerCount}</span>
                      {viewerSparkline.length > 1 && (
                        <svg width="40" height="16" className="sparkline">
                          <path d={getSparklinePath()} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="ghost-card">
                    <div className="ghost-card-label">Audio</div>
                    <div className={cn("font-semibold", isStreaming ? "" : "")} style={{ color: isStreaming ? "var(--live)" : "var(--text-muted)" }}>
                      {isStreaming ? "Active" : "Inactive"}
                    </div>
                  </div>
                </div>
              </AnimatePresence>
            </div>
          )} */}


          {/* Go Live / End Stream CTA */}
          <div className="mt-6">
            {!isStreaming ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStartStream}
                disabled={isStarting || !streamTitle.trim()}
                className="cta-button go-live"
                aria-live="polite"
                aria-label={isStarting ? "Connecting..." : "Go Live"}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Radio className="w-5 h-5" />
                    Go Live
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: stopConfirmPending ? 1 : 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStopStream}
                className={cn("cta-button", stopConfirmPending ? "bg-yellow-500" : "end-stream")}
                aria-live="polite"
                aria-label={stopConfirmPending ? "Tap again to confirm" : "End Stream"}
              >
                {stopConfirmPending ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Tap again to confirm
                  </>
                ) : (
                  <>
                    <Square className="w-5 h-5" />
                    End Stream
                  </>
                )}
              </motion.button>
            )}
          </div>

         
        </main>

        {/* DESIGN: Right Dock - Chat */}
        <aside className={cn("studio-right-dock", rightDockCollapsed && "collapsed")}>
          {isStreaming && currentStream && (
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" style={{ color: "var(--accent)" }} />
                  <h3 className="text-sm font-semibold">Live Chat</h3>
                </div>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{chatMessages.length}</span>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto space-y-2 mb-3 chat-log"
                role="log"
                aria-live="polite"
                style={{ scrollSnapType: "y proximity" }}
              >
                {chatMessages.length === 0 ? (
                  <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>
                    No messages yet
                  </p>
                ) : (
                  chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("chat-message", msg.is_creator && "own")}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="chat-message-username">{msg.username || "Anonymous"}</span>
                        <span className="chat-message-time">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </motion.div>
                  ))
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessageInput}
                  onChange={(e) => setChatMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  placeholder="Send a message..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm"
                  style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button
                  onClick={handleSendChatMessage}
                  disabled={!chatMessageInput.trim() || isSendingChat}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                  style={{ backgroundColor: "var(--accent)", color: theme === "dark" ? "#000" : "#fff" }}
                  aria-label="Send message"
                >
                  {isSendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* NOT streaming: placeholder */}
          {!isStreaming && (
            <div className="p-4 text-center" style={{ color: "var(--text-muted)" }}>
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Chat will appear when you go live</p>
            </div>
          )}

          {/* Collapsed rail on desktop */}
          {!rightDockCollapsed && (
            <div className="lg:hidden p-4 text-center border-t" style={{ borderColor: "var(--border)" }}>
              <button
                onClick={() => setRightDockCollapsed(true)}
                className="text-xs flex items-center gap-1 mx-auto"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronRight className="w-4 h-4" />
                Collapse
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile left dock sheet */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-[80vw] max-w-80 z-50 p-4 overflow-y-auto lg:hidden"
              style={{ backgroundColor: "var(--bg-surface)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Controls</span>
                <button onClick={() => setMobileMenuOpen(false)} className="panel-toggle">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Copy source panels here for mobile */}
              <div className="space-y-4">
                <div className="collapsible-section">
                  <div className="flex items-center gap-2 mb-3">
                    <Video className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-medium">Video Source</span>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isStreaming) {
                          setVideoSourceType("camera");
                          setUseMic(true);
                          setUseSystemAudio(false);
                        }
                      }}
                      disabled={isStreaming}
                      className={cn("source-card w-full flex items-center gap-3", videoSourceType === "camera" && "selected", isStreaming && "disabled")}
                    >
                      <Camera className="w-5 h-5" style={{ color: "var(--accent)" }} />
                      <span className="text-sm">Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleScreenSourceClick}
                      disabled={isStreaming}
                      className={cn("source-card w-full flex items-center gap-3", videoSourceType === "screen" && "selected", isStreaming && "disabled")}
                    >
                      <Monitor className="w-5 h-5" style={{ color: "var(--live)" }} />
                      <span className="text-sm">Screen Capture</span>
                    </button>
                  </div>
                </div>

                <div className="collapsible-section">
                  <div className="flex items-center gap-2 mb-3">
                    <Mic className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-medium">Audio Source</span>
                  </div>
                  {videoSourceType === "camera" && (
                    <label className="source-card flex items-center gap-3">
                      <input type="checkbox" checked={useMic} onChange={(e) => !isStreaming && setUseMic(e.target.checked)} disabled={isStreaming} className="w-4 h-4" />
                      <span className="text-sm">Microphone</span>
                    </label>
                  )}
                  <label className="source-card flex items-center gap-3 mt-2">
                    <input type="checkbox" checked={useSystemAudio} onChange={(e) => !isStreaming && setUseSystemAudio(e.target.checked)} disabled={isStreaming} className="w-4 h-4" />
                    <span className="text-sm">System Audio</span>
                  </label>
                </div>

                {!isStreaming && (
                  <div className="collapsible-section">
                    <div className="flex items-center gap-2 mb-3">
                      <Radio className="w-4 h-4" style={{ color: "var(--accent)" }} />
                      <span className="text-sm font-medium">Broadcast</span>
                    </div>
                    <div className="space-y-3">
                      <div className="float-label-input">
                        <input type="text" value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} placeholder="Stream title..." disabled={isStarting} className="w-full" />
                      </div>
                      <div className="float-label-input">
                        <textarea value={streamDescription} onChange={(e) => setStreamDescription(e.target.value)} placeholder="Description..." disabled={isStarting} rows={2} className="w-full resize-none" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile sticky CTA bar */}
      <div className="lg:hidden mobile-sticky-cta">
        {!isStreaming ? (
          <button
            onClick={handleStartStream}
            disabled={isStarting || !streamTitle.trim()}
            className="cta-button go-live"
            aria-live="polite"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Radio className="w-5 h-5" />
                Go Live
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleStopStream}
            className={cn("cta-button", stopConfirmPending ? "bg-yellow-500" : "end-stream")}
            aria-live="polite"
          >
            {stopConfirmPending ? "Tap again to confirm" : "End Stream"}
          </button>
        )}
      </div>

      {/* Mobile floating chat bubble */}
      {isStreaming && (
        <button
          onClick={() => setMobileChatOpen(true)}
          className="mobile-chat-bubble lg:hidden"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {chatMessages.length > 0 && (
            <span className="mobile-chat-badge">{Math.min(chatMessages.length, 99)}</span>
          )}
        </button>
      )}

      {/* Mobile chat sheet */}
      <AnimatePresence>
        {mobileChatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              onClick={() => setMobileChatOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="mobile-sheet lg:hidden"
            >
              <div className="mobile-sheet-handle" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" style={{ color: "var(--accent)" }} />
                  <h3 className="font-semibold">Live Chat</h3>
                </div>
                <button onClick={() => setMobileChatOpen(false)} className="panel-toggle">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="chat-message">
                    <div className="flex items-center justify-between mb-1">
                      <span className="chat-message-username">{msg.username || "Anonymous"}</span>
                      <span className="chat-message-time">{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                ))}
                <div ref={chatMessagesEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatMessageInput}
                  onChange={(e) => setChatMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                  placeholder="Send a message..."
                  className="flex-1 px-4 py-3 rounded-xl text-sm"
                  style={{ backgroundColor: "var(--bg-base)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <button
                  onClick={handleSendChatMessage}
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "var(--accent)", color: theme === "dark" ? "#000" : "#fff" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

            