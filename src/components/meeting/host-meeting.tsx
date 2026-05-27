"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Settings,
  Users,
  SignalHigh,
  Clock,
  MoreVertical,
  Copy,
  Check,
  WifiOff,
  Loader2,
  AlertCircle,
  Grid,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { meetingsApi } from "@/lib/api/meetings";
import {
  ICE_CONFIG,
  startVisualizer,
  waitForIce,
  preferOpus,
  detectAudioCodec,
  getAudioInputDevices,
  captureMicrophone,
} from "@/lib/webrtc-utils";
import type { VolMeetingOut, VolMeetingParticipantOut } from "@/types/meeting";
import { ConnectionStatus } from "@/types/livestream";

interface HostMeetingProps {
  meeting: VolMeetingOut;
  onMeetingEnded?: () => void;
  onError?: (error: string) => void;
}

interface ParticipantWithMute extends VolMeetingParticipantOut {
  isMuted: boolean;
}

export function HostMeeting({ meeting, onMeetingEnded, onError }: HostMeetingProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionStatus>("idle");
  const [participants, setParticipants] = useState<VolMeetingParticipantOut[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online");
  const [codec, setCodec] = useState<string>("—");
  const [bitrate, setBitrate] = useState<string>("—");
  const [iceState, setIceState] = useState<string>("—");
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicDevice, setSelectedMicDevice] = useState<string>("");
  const [showMicPicker, setShowMicPicker] = useState(false);
  const [viewMode, setViewMode] = useState<"gallery" | "speaker">("gallery");
  const [mutedParticipants, setMutedParticipants] = useState<Set<number>>(new Set());

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const subscribePcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const stopVizRef = useRef<(() => void) | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const participantsPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Attach remote track
  const attachRemoteTrack = useCallback((track: MediaStreamTrack) => {
    const remoteStream = remoteStreamRef.current;
    if (!remoteStream.getTracks().some((existing) => existing.id === track.id)) {
      remoteStream.addTrack(track);
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current
        .play()
        .catch((err) => console.warn("Remote audio autoplay blocked:", err));
    }
  }, []);

  // Start WebRTC subscribe connection (receive participants)
  const startSubscribeConnection = useCallback(async () => {
    if (!meeting.cf_webrtc_playback_url) return;

    try {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      subscribePcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        console.log(`Subscribe ICE → ${pc.iceConnectionState}`);
      };

      pc.ontrack = (event) => {
        console.log("Received participant track:", event.track.kind);
        if (event.track.kind === "audio") {
          attachRemoteTrack(event.track);
        }
      };

      pc.addTransceiver("audio", { direction: "sendrecv" });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await waitForIce(pc, 2000);

      const res = await fetch(meeting.cf_webrtc_playback_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
          Accept: "application/sdp",
        },
        body: pc.localDescription!.sdp,
      });

      if (res.ok) {
        const answerSdp = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      }
    } catch (err) {
      console.error("Subscribe connection error:", err);
    }
  }, [meeting.cf_webrtc_playback_url, attachRemoteTrack]);

  // Load microphone devices
  useEffect(() => {
    loadMicDevices();
  }, []);

  const loadMicDevices = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const devices = await getAudioInputDevices();
      setMicDevices(devices);
      if (devices.length > 0 && !selectedMicDevice) {
        setSelectedMicDevice(devices[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to load mic devices:", err);
    }
  }, [selectedMicDevice]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setNetworkStatus("online");
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Prevent browser back
  useEffect(() => {
    const handlePopState = () => {
      const confirmed = window.confirm(
        "Leaving this meeting will end it for all participants. Are you sure?"
      );
      if (!confirmed) {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Start WebRTC connection
  const startWebRTC = useCallback(async () => {
    if (!meeting.cf_webrtc_publish_url) {
      setError("No publish URL available");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Capture microphone
      const stream = await captureMicrophone(
        selectedMicDevice || undefined
      );
      localStreamRef.current = stream;

      // Mute if already muted
      if (isMuted) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      // Start visualizer
      if (canvasRef.current) {
        stopVizRef.current = startVisualizer(
          stream,
          canvasRef.current,
          "#00e5a0"
        );
      }

      // Create WebRTC connection
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        setIceState(s);
        console.log(`Publish ICE → ${s}`);

        if (s === "connected" || s === "completed") {
          setConnectionState("connected");
          setIsConnected(true);
          startStats();
        } else if (s === "failed" || s === "disconnected") {
          setConnectionState("failed");
          setIsConnected(false);
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(`Publish ICE gathering → ${pc.iceGatheringState}`);
      };

      // Add audio track
      stream
        .getAudioTracks()
        .forEach((t) => pc.addTrack(t, stream));

      // Create offer
      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      const sdpWithOpus = preferOpus(offer.sdp || "");
      await pc.setLocalDescription({ type: offer.type, sdp: sdpWithOpus });

      await waitForIce(pc, 2000);

      // Send to server (WHIP protocol)
      const res = await fetch(meeting.cf_webrtc_publish_url, {
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
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      // Detect codec
      const detectedCodec = detectAudioCodec(answerSdp);
      setCodec(detectedCodec);

      // Start subscribe connection to receive participants' audio
      startSubscribeConnection();

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setMeetingDuration((prev) => prev + 1);
      }, 1000);

      // Connect WebSocket for real-time updates
      connectWebSocket();

      // Start polling participants
      startParticipantsPolling();

    } catch (err) {
      console.error("WebRTC error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to connect";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  }, [
    meeting.cf_webrtc_publish_url,
    selectedMicDevice,
    isMuted,
    onError,
    startSubscribeConnection,
  ]);

  // Connect WebSocket for real-time updates
  const connectWebSocket = useCallback(() => {
    if (!meeting.id) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/meeting/${meeting.id}`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      socketRef.current = socket;
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "participant_joined") {
          setParticipants((prev) => [...prev, data.payload]);
        } else if (data.type === "participant_left") {
          setParticipants((prev) =>
            prev.filter((p) => p.user_id !== data.payload.user_id)
          );
        } else if (data.type === "meeting_ended") {
          handleEndMeeting();
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    socket.onerror = () => {
      console.error("WebSocket error");
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
      socketRef.current = null;
    };
  }, [meeting.id]);

  // Start participants polling
  const startParticipantsPolling = useCallback(() => {
    fetchParticipants();

    participantsPollingRef.current = setInterval(fetchParticipants, 5000);
  }, []);

  const fetchParticipants = async () => {
    try {
      const participantsData = await meetingsApi.getParticipants(meeting.id);
      setParticipants(participantsData);
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    }
  };

  // Stats monitoring
  const startStats = useCallback(() => {
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

  // Cleanup
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (subscribePcRef.current) {
      subscribePcRef.current.close();
      subscribePcRef.current = null;
    }

    remoteStreamRef.current.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = new MediaStream();

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (stopVizRef.current) {
      stopVizRef.current();
      stopVizRef.current = null;
    }

    if (statsTimerRef.current) {
      clearInterval(statsTimerRef.current);
      statsTimerRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (participantsPollingRef.current) {
      clearInterval(participantsPollingRef.current);
      participantsPollingRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  // End meeting
  const handleEndMeeting = useCallback(async () => {
    cleanup();

    try {
      await meetingsApi.endMeeting(meeting.id);
    } catch (err) {
      console.error("Failed to end meeting via API:", err);
    }

    onMeetingEnded?.();
  }, [meeting.id, cleanup, onMeetingEnded]);

  // Mute a specific participant (request from server/WS)
  const muteParticipant = useCallback((participantId: number) => {
    setMutedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });

    if (socketRef.current) {
      socketRef.current.send(
        JSON.stringify({
          type: mutedParticipants.has(participantId) ? "unmute_participant" : "mute_participant",
          participant_id: participantId,
        })
      );
    }
  }, [mutedParticipants]);

  // Mute all participants
  const muteAllParticipants = useCallback(() => {
    const allMuted = participants.length > 0 && participants.every((p) => mutedParticipants.has(p.id));
    if (allMuted) {
      setMutedParticipants(new Set());
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: "unmute_all" }));
      }
    } else {
      const allIds = new Set(participants.map((p) => p.id));
      setMutedParticipants(allIds);
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: "mute_all" }));
      }
    }
  }, [participants, mutedParticipants]);

  // Leave meeting (as host, this ends it)
  const handleLeaveMeeting = useCallback(() => {
    const confirmed = window.confirm(
      "Are you sure you want to leave? This will end the meeting for all participants."
    );
    if (confirmed) {
      handleEndMeeting();
    }
  }, [handleEndMeeting]);

  // Copy meeting link
  const copyMeetingLink = useCallback(() => {
    const link = `${window.location.origin}/meeting/${meeting.nice_id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [meeting.id]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-start on mount
  useEffect(() => {
    startWebRTC();

    return () => {
      cleanup();
    };
  }, []);

  // Listen for beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Leaving this page will end your meeting.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const isHost = true; // Since this is the HostMeeting component

  return (
<div className={cn(
        "fixed inset-0 bg-slate-950 flex flex-col",
        showFullscreen && "z-50"
      )}>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Network Status Banner */}
      {networkStatus === "offline" && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Network connection lost</span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-white">In Meeting</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">{formatDuration(meetingDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Quality */}
          <div className="flex items-center gap-1 mr-4">
            <SignalHigh className={cn(
              "w-4 h-4",
              isConnected ? "text-green-500" : "text-slate-500"
            )} />
            <span className="text-xs text-slate-400">{iceState || "—"}</span>
          </div>

          {/* Copy Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyMeetingLink}
            className="text-slate-400 hover:text-white"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 mr-1" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            {copiedLink ? "Copied!" : "Copy Link"}
          </Button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullscreen(!showFullscreen)}
            className="text-slate-400 hover:text-white"
          >
            {showFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </Button>

          {/* Participants Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
            className={cn(
              "text-slate-400 hover:text-white",
              showParticipants && "bg-slate-800"
            )}
          >
            <Users className="w-4 h-4 mr-1" />
            {participants.length}
          </Button>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={cn(
          "flex-1 p-4",
          showParticipants && "pr-80"
        )}>
          {/* Visualizer / Video Preview */}
          <div className="h-full bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800">
            {/* Host Video Area */}
            <div className={cn(
              "absolute inset-0 flex items-center justify-center",
              viewMode === "gallery" ? "grid grid-cols-2 gap-4 p-4" : "flex"
            )}>
              {/* Self Preview / Visualizer */}
              {isConnected && !isVideoOff && (
                <div className="relative bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden">
                  {/* Audio Visualizer Canvas */}
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={400}
                    className={cn(
                      "w-full h-full object-cover",
                      viewMode === "gallery" ? "h-48" : "h-full"
                    )}
                  />

                  {/* Self Label */}
                  <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1 flex items-center gap-2">
                    <span className="text-xs text-white">You (Host)</span>
                    {!isMuted && <Mic className="w-3 h-3 text-green-400" />}
                    {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
                  </div>

                  {/* Name Tag */}
                  <div className="absolute top-2 left-2 bg-sky-500 rounded-lg px-2 py-1">
                    <span className="text-xs text-white font-medium">Host</span>
                  </div>
                </div>
              )}

              {/* Video Off Placeholder */}
              {(isVideoOff || !isConnected) && (
                <div className="bg-slate-800 rounded-xl flex items-center justify-center w-full h-48">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                      <VideoOff className="w-8 h-8 text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-400">
                      {!isConnected ? "Connecting..." : "Camera Off"}
                    </span>
                  </div>
                </div>
              )}

              {/* Speaker View: Show Participant Tiles */}
              {viewMode === "speaker" && participants.length > 0 && (
                participants.map((participant, idx) => (
                  <div
                    key={participant.id}
                    className="bg-slate-800 rounded-xl flex items-center justify-center ml-4 w-full h-full"
                  >
                    <div className="text-center">
                      <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-10 h-10 text-slate-500" />
                      </div>
                      <span className="text-sm text-slate-300">
                        {participant.user_username || "Participant"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Recording Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-medium text-white">Recording</span>
            </div>

            {/* View Toggle */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-black/60 rounded-lg p-1">
              <button
                onClick={() => setViewMode("gallery")}
                className={cn(
                  "p-2 rounded",
                  viewMode === "gallery"
                    ? "bg-white/20 text-white"
                    : "text-slate-400 hover:text-white"
                )}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Overlay */}
            <div className="absolute top-4 right-4 bg-black/60 rounded-lg p-2">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">ICE</span>
                  <div className="text-white">{iceState || "—"}</div>
                </div>
                <div>
                  <span className="text-slate-400">Codec</span>
                  <div className="text-white">{codec}</div>
                </div>
                <div>
                  <span className="text-slate-400">Bitrate</span>
                  <div className="text-white">{bitrate}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Panel */}
        {showParticipants && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="font-semibold text-white">
                Participants ({participants.length + 1})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowParticipants(false)}
                className="text-slate-400 hover:text-white"
              >
                <ChevronUp className="w-4 h-4 rotate-90" />
              </Button>
            </div>

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto p-2">
              {/* Host */}
              <div className="flex items-center gap-3 p-2 rounded-lg bg-sky-500/10 mb-2">
                <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">H</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">You</div>
                  <div className="text-xs text-slate-400">Host</div>
                </div>
                <Mic className="w-4 h-4 text-green-400" />
              </div>

              {/* Other Participants */}
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800"
                >
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-slate-300">
                      {(participant.user_username || "P")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white">
                      {participant.user_username || "Participant"}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {participant.role}
                    </div>
                  </div>
                  <button
                    onClick={() => muteParticipant(participant.id)}
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      mutedParticipants.has(participant.id)
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "hover:bg-slate-700 text-slate-400"
                    )}
                    title={mutedParticipants.has(participant.id) ? "Unmute participant" : "Mute participant"}
                  >
                    {mutedParticipants.has(participant.id) ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}

              {participants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Waiting for participants...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-3 py-4 bg-slate-900 border-t border-slate-800">
        {/* Mic Toggle */}
        <button
          onClick={toggleMute}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            isMuted
              ? "bg-red-500 hover:bg-red-600"
              : "bg-slate-700 hover:bg-slate-600"
          )}
          title={isMuted ? "Unmute yourself" : "Mute yourself"}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Mute All Participants */}
        <button
          onClick={muteAllParticipants}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            participants.length > 0 && participants.every((p) => mutedParticipants.has(p.id))
              ? "bg-red-500 hover:bg-red-600"
              : "bg-slate-700 hover:bg-slate-600"
          )}
          title={
            participants.length > 0 && participants.every((p) => mutedParticipants.has(p.id))
              ? "Unmute all participants"
              : "Mute all participants"
          }
        >
          <Users className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">
              {participants.length > 0 && participants.every((p) => mutedParticipants.has(p.id)) ? "X" : participants.length}
            </span>
          </span>
        </button>

        {/* Video Toggle */}
        <button
          onClick={handleLeaveMeeting}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>

        {/* More Options */}
        <button
          onClick={() => setShowControls(!showControls)}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            showControls ? "bg-slate-600" : "bg-slate-700 hover:bg-slate-600"
          )}
        >
          <MoreVertical className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Connecting Overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Connecting to meeting...</p>
            <p className="text-slate-400 text-sm mt-2">
              Setting up your audio and video
            </p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-50">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default HostMeeting;
