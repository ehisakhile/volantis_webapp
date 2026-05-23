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
  SignalHigh,
  Clock,
  Users,
  MoreVertical,
  WifiOff,
  Loader2,
  AlertCircle,
  Grid,
  ChevronUp,
  X,
  Maximize2,
  Minimize2,
  Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { meetingsApi } from "@/lib/api/meetings";
import {
  ICE_CONFIG,
  startVisualizer,
  waitForIce,
  detectAudioCodec,
  captureMicrophone,
  preferOpus,
} from "@/lib/webrtc-utils";
import type { VolMeetingOut, VolMeetingParticipantOut } from "@/types/meeting";
import type { ConnectionStatus } from "@/types/livestream";

interface ParticipantMeetingProps {
  meeting: VolMeetingOut;
  onLeft?: () => void;
  onError?: (error: string) => void;
}

export function ParticipantMeeting({
  meeting,
  onLeft,
  onError,
}: ParticipantMeetingProps) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionState, setConnectionState] =
    useState<ConnectionStatus>("idle");
  const [participants, setParticipants] = useState<VolMeetingParticipantOut[]>(
    []
  );
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">(
    "online"
  );
  const [codec, setCodec] = useState<string>("—");
  const [bitrate, setBitrate] = useState<string>("—");
  const [iceState, setIceState] = useState<string>("—");
  const [talkbackState, setTalkbackState] = useState<string>("idle");
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"gallery" | "speaker">("gallery");
  const [localUsername] = useState<string>("Participant");
  const publishUrl = meeting.cf_webrtc_publish_url;
  const playbackUrl =
    meeting.cf_webrtc_playback_url || meeting.playback?.webrtc_playback_url;

  // WebRTC refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const publishPcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const stopVizRef = useRef<(() => void) | null>(null);
  const statsTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const participantsPollingRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

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
        "Leaving this meeting will disconnect you. Are you sure?"
      );
      if (!confirmed) {
        window.history.pushState(null, "", window.location.href);
      }
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  const startTalkbackPublish = useCallback(
    async (stream: MediaStream) => {
      if (!publishUrl) {
        setTalkbackState("unavailable");
        return;
      }

      try {
        setTalkbackState("connecting");
        const pc = new RTCPeerConnection(ICE_CONFIG);
        publishPcRef.current = pc;

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          if (state === "connected" || state === "completed") {
            setTalkbackState("live");
          } else if (state === "failed" || state === "disconnected") {
            setTalkbackState("failed");
          }
        };

        stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer({
          offerToReceiveAudio: false,
          offerToReceiveVideo: false,
        });
        const sdpWithOpus = preferOpus(offer.sdp || "");
        await pc.setLocalDescription({ type: offer.type, sdp: sdpWithOpus });
        await waitForIce(pc, 2000);

        const res = await fetch(publishUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
            Accept: "application/sdp",
          },
          body: pc.localDescription!.sdp,
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Talkback ${res.status}: ${txt.slice(0, 200)}`);
        }

        const answerSdp = await res.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        console.error("Talkback publish error:", err);
        setTalkbackState("failed");
      }
    },
    [publishUrl]
  );

  // Start WebRTC connection for participant playback and talkback
  const startWebRTC = useCallback(async () => {
    if (!playbackUrl) {
      setError("No playback URL available");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Capture microphone for participant
      const stream = await captureMicrophone();
      localStreamRef.current = stream;

      // Start visualizer
      if (canvasRef.current) {
        stopVizRef.current = startVisualizer(stream, canvasRef.current, "#00e5a0");
      }

      // Create WebRTC connection
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        setIceState(s);
        console.log(`Playback ICE → ${s}`);

        if (s === "connected" || s === "completed") {
          setConnectionState("connected");
          setIsConnected(true);
          startStats();
        } else if (s === "failed" || s === "disconnected") {
          setConnectionState("failed");
          setIsConnected(false);
        }
      };

      // Handle incoming tracks (from host)
      pc.ontrack = (event) => {
        console.log("Received track:", event.track.kind);
        if (event.track.kind === "audio") {
          attachRemoteTrack(event.track);
        }
      };

      // WHEP: add recvonly transceiver for audio
      pc.addTransceiver("audio", { direction: "recvonly" });

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await waitForIce(pc, 2000);

      // Send to server (WHEP protocol)
      const res = await fetch(playbackUrl, {
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

      startTalkbackPublish(stream);

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
    playbackUrl,
    attachRemoteTrack,
    startTalkbackPublish,
    onError,
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
          handleLeaveMeeting();
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
        if (r.type === "inbound-rtp" && r.kind === "audio") {
          const now = r.timestamp;
          const bytes = r.bytesReceived;
          if (lastTs) {
            const dt = (Number(now) - lastTs) / 1000;
            const kbps = Math.round(
              ((bytes - lastBytes) * 8) / dt / 1000
            );
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

    if (publishPcRef.current) {
      publishPcRef.current.close();
      publishPcRef.current = null;
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

  // Toggle hand raised
  const toggleHandRaised = useCallback(() => {
    setIsHandRaised(!isHandRaised);
    // Send to WebSocket if connected
    if (socketRef.current) {
      socketRef.current.send(
        JSON.stringify({
          type: isHandRaised ? "hand_lowered" : "hand_raised",
        })
      );
    }
  }, [isHandRaised]);

  // Leave meeting
  const handleLeaveMeeting = useCallback(async () => {
    cleanup();

    try {
      await meetingsApi.leaveMeeting(meeting.id);
    } catch (err) {
      console.error("Failed to leave meeting via API:", err);
    }

    onLeft?.();
  }, [meeting.id, cleanup, onLeft]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
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
      e.returnValue = "Leaving this page will disconnect you from the meeting.";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 bg-slate-950 flex flex-col",
        showFullscreen && "z-50"
      )}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Network Status Banner */}
      {networkStatus === "offline" && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            Network connection lost
          </span>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full animate-pulse",
                isConnected ? "bg-green-500" : "bg-yellow-500"
              )}
            />
            <span className="text-sm font-medium text-white">
              {meeting.title}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">
              {formatDuration(meetingDuration)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection Quality */}
          <div className="flex items-center gap-1 mr-4">
            <SignalHigh
              className={cn(
                "w-4 h-4",
                isConnected ? "text-green-500" : "text-slate-500"
              )}
            />
            <span className="text-xs text-slate-400">{iceState || "—"}</span>
          </div>
          <div
            className={cn(
              "hidden rounded-full px-3 py-1 text-xs font-medium sm:block",
              talkbackState === "live" && "bg-emerald-500/15 text-emerald-300",
              talkbackState === "connecting" &&
                "bg-yellow-500/15 text-yellow-300",
              talkbackState === "failed" && "bg-red-500/15 text-red-300",
              (talkbackState === "idle" || talkbackState === "unavailable") &&
                "bg-slate-800 text-slate-400"
            )}
          >
            Talkback {talkbackState}
          </div>

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

          {/* More Options */}
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className={cn("flex-1 p-4", showParticipants && "pr-80")}>
          {/* Video Preview Area */}
          <div className="h-full bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800">
            {/* Participant Videos Grid */}
            <div
              className={cn(
                "absolute inset-0 flex items-center justify-center p-4",
                viewMode === "gallery"
                  ? "grid grid-cols-2 gap-4"
                  : "flex flex-col"
              )}
            >
              {/* Host Video Tile */}
              <div className="bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden">
                {/* Audio Visualizer for Host */}
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className={cn(
                    "w-full h-full object-cover",
                    viewMode === "gallery" ? "h-48" : "h-64"
                  )}
                />

                {/* Self Label */}
                <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1 flex items-center gap-2">
                  <span className="text-xs text-white">Host</span>
                  <Mic className="w-3 h-3 text-green-400" />
                </div>

                {/* Host Name Tag */}
                <div className="absolute top-2 left-2 bg-sky-500 rounded-lg px-2 py-1">
                  <span className="text-xs text-white font-medium">Host</span>
                </div>
              </div>

              {/* Other Participant Tiles */}
              {participants
                .filter((p) => p.role !== "host")
                .slice(0, 3)
                .map((participant, idx) => (
                  <div
                    key={participant.id}
                    className="bg-slate-800 rounded-xl flex items-center justify-center relative overflow-hidden"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="w-8 h-8 text-slate-500" />
                      </div>
                      <span className="text-sm text-slate-300">
                        {participant.user_username || "Participant"}
                      </span>
                    </div>

                    {/* Name Tag */}
                    <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1 flex items-center gap-2">
                      <span className="text-xs text-white">
                        {participant.user_username || "Participant"}
                      </span>
                      <Mic className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                ))}
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
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 mb-1">
                <div className="w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">H</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">Host</div>
                  <div className="text-xs text-slate-400">Organizer</div>
                </div>
                <Mic className="w-4 h-4 text-green-400" />
              </div>

              {/* Other Participants */}
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800",
                    isHandRaised && participant.role === "participant" && "bg-yellow-500/10"
                  )}
                >
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-slate-300">
                      {(participant.user_username || "P")[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      {participant.user_username || "Participant"}
                      {participant.role === "co_host" && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                          Co
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 capitalize">
                      {participant.role}
                    </div>
                  </div>
                  {participant.status === "joined" && (
                    <Mic className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              ))}

              {participants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">
                    Waiting for participants...
                  </p>
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
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Video Toggle */}
        <button
          onClick={toggleVideo}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            isVideoOff
              ? "bg-red-500 hover:bg-red-600"
              : "bg-slate-700 hover:bg-slate-600"
          )}
        >
          {isVideoOff ? (
            <VideoOff className="w-6 h-6 text-white" />
          ) : (
            <Video className="w-6 h-6 text-white" />
          )}
        </button>

        {/* Raise Hand */}
        <button
          onClick={toggleHandRaised}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            isHandRaised
              ? "bg-yellow-500 hover:bg-yellow-600"
              : "bg-slate-700 hover:bg-slate-600"
          )}
        >
          <Hand
            className={cn(
              "w-6 h-6",
              isHandRaised ? "text-white" : "text-white"
            )}
          />
        </button>

        {/* Leave Meeting */}
        <button
          onClick={handleLeaveMeeting}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>

        {/* More Options */}
        <button className="w-14 h-14 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors">
          <MoreVertical className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Connecting Overlay */}
      {isConnecting && (
        <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">Joining meeting...</p>
            <p className="text-slate-400 text-sm mt-2">
              Setting up your connection
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

export default ParticipantMeeting;
