"use client";

import { useState, useCallback, useEffect, useRef, memo } from "react";
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
  Crown,
  Hand,
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
import { useAuth } from "@/lib/auth-context";
import type { ParticipantRole } from "@/types/meeting";

interface ParticipantWithSelf extends VolMeetingParticipantOut {
  isSelf?: boolean;
}

interface MeetingRoomProps {
  meeting: VolMeetingOut;
  onMeetingEnded?: () => void;
  onLeft?: () => void;
  onError?: (error: string) => void;
}

export function MeetingRoom({ meeting, onMeetingEnded, onLeft, onError }: MeetingRoomProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isHost = user?.id === meeting.created_by_id;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionState, setConnectionState] = useState<ConnectionStatus>("idle");
  const [participants, setParticipants] = useState<ParticipantWithSelf[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isLocallyMuted, setIsLocallyMuted] = useState(false);
  const [isHostMuted, setIsHostMuted] = useState(false);
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
  const [talkbackState, setTalkbackState] = useState<string>("idle");
  const [myRole, setMyRole] = useState<ParticipantRole>("host");

  const publishUrl = meeting.cf_webrtc_publish_url;
  const playbackUrl = meeting.cf_webrtc_playback_url || meeting.playback?.webrtc_playback_url;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const publishPcRef = useRef<RTCPeerConnection | null>(null);
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

  const startPublishConnection = useCallback(async (stream: MediaStream) => {
    // Note: Cloudflare Stream WHIP only allows ONE publisher (the host).
    // Participants should NOT publish - they only subscribe to playback.
    // Their microphone audio is sent to the host who mixes it into their publish stream.
    if (!isHost) {
      console.log("Participants do not publish directly - host manages audio mixing");
      return;
    }

    if (!publishUrl) {
      console.log("No publish URL available");
      return;
    }

    try {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      pcRef.current = pc;

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
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

      // Add transceiver first to ensure MID exists for BUNDLE policy
      const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      stream.getAudioTracks().forEach(track => {
        transceiver.sender.replaceTrack(track);
      });

      const offer = await pc.createOffer();

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
        throw new Error(`Server ${res.status}: ${txt.slice(0, 200)}`);
      }

      const answerSdp = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      const detectedCodec = detectAudioCodec(answerSdp);
      setCodec(detectedCodec);
    } catch (err) {
      console.error("Publish connection error:", err);
    }
  }, [publishUrl, isHost]);

  const startSubscribeConnection = useCallback(async () => {
    if (!playbackUrl) return;

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
      await pc.setLocalDescription({ type: offer.type, sdp: preferOpus(offer.sdp || "") });

      await waitForIce(pc, 2000);

      const res = await fetch(playbackUrl, {
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
  }, [playbackUrl, attachRemoteTrack]);

  const startWebRTC = useCallback(async () => {
    if (!playbackUrl && !publishUrl) {
      setError("No playback URL available");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const stream = await captureMicrophone(
        selectedMicDevice || undefined
      );
      localStreamRef.current = stream;

      if (isMuted) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      if (canvasRef.current) {
        stopVizRef.current = startVisualizer(
          stream,
          canvasRef.current,
          "#00e5a0"
        );
      }

      if (isHost) {
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

        // Add transceiver first to ensure MID is created for BUNDLE policy
        const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
        stream.getAudioTracks().forEach(track => {
          transceiver.sender.replaceTrack(track);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription({ type: offer.type, sdp: preferOpus(offer.sdp || "") });
        await waitForIce(pc, 2000);

        const res = await fetch(publishUrl!, {
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

        setCodec(detectAudioCodec(answerSdp));
        startSubscribeConnection();
      } else {
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

        pc.ontrack = (event) => {
          console.log("Received track:", event.track.kind);
          if (event.track.kind === "audio") {
            attachRemoteTrack(event.track);
          }
        };

        // Use addTransceiver for recvonly to get MID for BUNDLE policy
        pc.addTransceiver("audio", { direction: "recvonly" });

        const offer = await pc.createOffer();
        await pc.setLocalDescription({ type: offer.type, sdp: preferOpus(offer.sdp || "") });
        await waitForIce(pc, 2000);

        const res = await fetch(playbackUrl!, {
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
        setCodec(detectAudioCodec(answerSdp));

        // Start host publish connection (participants don't publish directly)
        if (isHost) {
          startPublishConnection(stream);
        }
      }

      durationIntervalRef.current = setInterval(() => {
        setMeetingDuration((prev) => prev + 1);
      }, 1000);

      connectWebSocket();
      fetchParticipants();
      participantsPollingRef.current = setInterval(fetchParticipants, 5000);

    } catch (err) {
      console.error("WebRTC error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to connect";
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsConnecting(false);
    }
  }, [
    publishUrl,
    playbackUrl,
    selectedMicDevice,
    isMuted,
    isHost,
    onError,
    startSubscribeConnection,
    startPublishConnection,
    attachRemoteTrack,
  ]);

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

  useEffect(() => {
    loadMicDevices();
  }, [loadMicDevices]);

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

  useEffect(() => {
    const message = isHost
      ? "Leaving this meeting will end it for all participants. Are you sure?"
      : "Leaving this meeting will disconnect you. Are you sure?";
    const handlePopState = () => {
      const confirmed = window.confirm(message);
      if (!confirmed) {
        window.history.pushState(null, "", window.location.href);
      }
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isHost]);

  useEffect(() => {
    startWebRTC();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = isHost
        ? "Leaving this page will end your meeting."
        : "Leaving this page will disconnect you from the meeting.";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isHost]);

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
          setParticipants((prev) => {
            if (!prev.some((p) => p.id === data.payload.id)) {
              return [...prev, data.payload];
            }
            return prev;
          });
        } else if (data.type === "participant_left") {
          setParticipants((prev) =>
            prev.filter((p) => p.user_id !== data.payload.user_id)
          );
        } else if (data.type === "meeting_ended") {
          cleanup();
          onMeetingEnded?.();
        } else if (data.type === "mute_participant") {
          if (data.participant_id === user?.id) {
            setIsHostMuted(true);
            setIsMuted(true);
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = false;
              });
            }
          }
        } else if (data.type === "unmute_participant") {
          if (data.participant_id === user?.id) {
            setIsHostMuted(false);
            if (!isLocallyMuted && localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach((track) => {
                track.enabled = true;
              });
            }
            setIsMuted(isLocallyMuted);
          }
        } else if (data.type === "mute_all") {
          setIsHostMuted(true);
          setIsMuted(true);
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              track.enabled = false;
            });
          }
        } else if (data.type === "unmute_all") {
          setIsHostMuted(false);
          if (!isLocallyMuted && localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              track.enabled = true;
            });
          }
          setIsMuted(isLocallyMuted);
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
  }, [meeting.id, user?.id, isLocallyMuted, onMeetingEnded]);

  const fetchParticipants = async () => {
    try {
      const participantsData = await meetingsApi.getParticipants(meeting.id);
      setParticipants(participantsData);
    } catch (err) {
      console.error("Failed to fetch participants:", err);
    }
  };

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
        } else if (r.type === "inbound-rtp" && r.kind === "audio") {
          const now = r.timestamp;
          const bytes = r.bytesReceived;
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

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (publishPcRef.current) {
      publishPcRef.current.close();
      publishPcRef.current = null;
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

  const toggleMute = useCallback(() => {
    if (isHostMuted) return;

    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });

      if (isHost) {
        setIsMuted(!isMuted);
      } else {
        const newMuted = !isLocallyMuted;
        setIsLocallyMuted(newMuted);
        setIsMuted(isHostMuted ? true : newMuted);

        if (socketRef.current) {
          socketRef.current.send(
            JSON.stringify({
              type: newMuted ? "participant_muted" : "participant_unmuted",
            })
          );
        }
      }
    }
  }, [isMuted, isLocallyMuted, isHostMuted, isHost]);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  }, [isVideoOff]);

  const toggleHandRaised = useCallback(() => {
    setIsHandRaised(!isHandRaised);
    if (socketRef.current) {
      socketRef.current.send(
        JSON.stringify({
          type: isHandRaised ? "hand_lowered" : "hand_raised",
        })
      );
    }
  }, [isHandRaised]);

  const muteParticipant = useCallback((participantId: number) => {
    if (!isHost) return;

    setMutedParticipants((prev) => {
      const next = new Set(prev);
      const wasMuted = next.has(participantId);
      if (wasMuted) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }

      if (socketRef.current) {
        socketRef.current.send(
          JSON.stringify({
            type: wasMuted ? "unmute_participant" : "mute_participant",
            participant_id: participantId,
          })
        );
      }

      return next;
    });
  }, [isHost]);

  const muteAllParticipants = useCallback(() => {
    if (!isHost) return;

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
  }, [participants, mutedParticipants, isHost]);

  const handleEndOrLeaveMeeting = useCallback(async () => {
    const message = isHost
      ? "Are you sure you want to leave? This will end the meeting for all participants."
      : "Are you sure you want to leave the meeting?";

    if (!window.confirm(message)) return;

    cleanup();

    try {
      if (isHost) {
        await meetingsApi.endMeeting(meeting.id);
        onMeetingEnded?.();
      } else {
        await meetingsApi.leaveMeeting(meeting.id);
        onLeft?.();
      }
    } catch (err) {
      console.error(isHost ? "Failed to end meeting" : "Failed to leave meeting", err);
      if (isHost) {
        onMeetingEnded?.();
      } else {
        onLeft?.();
      }
    }
  }, [isHost, meeting.id, cleanup, onMeetingEnded, onLeft]);

  const copyMeetingLink = useCallback(() => {
    const link = `${window.location.origin}/meeting/${meeting.nice_id || meeting.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [meeting.id, meeting.nice_id]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const allParticipants: ParticipantWithSelf[] = [
    {
      id: -1,
      user_id: meeting.created_by_id,
      role: "host" as ParticipantRole,
      status: "joined" as const,
      user_email: user?.email,
      user_username: user?.username || user?.email?.split("@")[0] || "You",
      isSelf: true,
    },
    ...participants.filter((p) => p.user_id !== meeting.created_by_id),
  ];

  return (
    <div className={cn(
      "fixed inset-0 bg-slate-950 flex flex-col",
      showFullscreen && "z-50"
    )}>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {networkStatus === "offline" && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Network connection lost</span>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-sm font-medium text-white">In Meeting</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-mono">{formatDuration(meetingDuration)}</span>
          </div>
          {isHost && (
            <span className="rounded-full bg-sky-500/15 text-sky-300 px-2 py-0.5 text-xs font-medium">
              Host
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-4">
            <SignalHigh className={cn(
              "w-4 h-4",
              isConnected ? "text-green-500" : "text-slate-500"
            )} />
            <span className="text-xs text-slate-400">{iceState || "—"}</span>
          </div>

          {!isHost && (
            <div className={cn(
              "hidden rounded-full px-3 py-1 text-xs font-medium sm:block",
              talkbackState === "live" && "bg-emerald-500/15 text-emerald-300",
              talkbackState === "connecting" && "bg-yellow-500/15 text-yellow-300",
              talkbackState === "failed" && "bg-red-500/15 text-red-300",
              (talkbackState === "idle" || talkbackState === "unavailable") &&
                "bg-slate-800 text-slate-400"
            )}>
              Talkback {talkbackState}
            </div>
          )}

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
            {allParticipants.length}
          </Button>

          {isHost && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className={cn(
          "flex-1 p-4",
          showParticipants && "pr-80"
        )}>
          <div className="h-full bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-800">
            <div className={cn(
              "absolute inset-0 flex items-center justify-center p-4",
              viewMode === "gallery" ? "grid grid-cols-2 gap-4" : "flex flex-col"
            )}>
              {allParticipants.map((participant, idx) => {
                const isSelf = participant.isSelf;
                const isCurrentMuted = isSelf ? isMuted : mutedParticipants.has(participant.id);
                const isCurrentHostMuted = !isSelf && isHostMuted;
                const currentIsMuted = isSelf ? isMuted : (isCurrentMuted || isCurrentHostMuted);

                return (
                  <div
                    key={isSelf ? "self" : participant.id}
                    className={cn(
                      "relative bg-slate-950 rounded-xl flex items-center justify-center overflow-hidden",
                      viewMode === "gallery" ? "h-48" : "w-full h-full"
                    )}
                  >
                    <canvas
                      ref={isSelf ? canvasRef : undefined}
                      width={800}
                      height={400}
                      className={cn(
                        "w-full h-full object-cover absolute inset-0",
                        viewMode === "gallery" ? "h-48" : "h-full"
                      )}
                    />

                    <div className="absolute bottom-2 left-2 bg-black/60 rounded-lg px-2 py-1 flex items-center gap-2 z-10">
                      <span className="text-xs text-white">
                        {isSelf ? "You" : (participant.user_username || "Participant")}
                      </span>
                      {!currentIsMuted && <Mic className="w-3 h-3 text-green-400" />}
                      {currentIsMuted && <MicOff className="w-3 h-3 text-red-400" />}
                      {isCurrentHostMuted && (
                        <span className="text-xs text-yellow-400">(Host muted)</span>
                      )}
                    </div>

                    <div className="absolute top-2 left-2 rounded-lg px-2 py-1 z-10">
                      {participant.role === "host" || isSelf && isHost ? (
                        <span className="text-xs text-white font-medium bg-sky-500 px-2 py-1 rounded">
                          {isSelf ? "Host" : participant.role === "co_host" ? "Co-host" : "Host"}
                        </span>
                      ) : participant.role === "co_host" ? (
                        <span className="text-xs text-white font-medium bg-purple-500 px-2 py-1 rounded">
                          Co-host
                        </span>
                      ) : null}
                    </div>

                    {isSelf && (
                      <button
                        onClick={() => setShowMicPicker(!showMicPicker)}
                        className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 rounded-lg p-1.5 z-10"
                        title="Change microphone"
                      >
                        <Settings className="w-3 h-3 text-white" />
                      </button>
                    )}
                  </div>
                );
              })}

              {allParticipants.length === 0 && (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="w-8 h-8 text-slate-600" />
                    </div>
                    <span className="text-sm text-slate-500">
                      {isConnecting ? "Connecting..." : "Waiting for participants..."}
                    </span>
                  </div>
                </div>
              )}
            </div>

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

        {showParticipants && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="font-semibold text-white">
                Participants ({allParticipants.length})
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

            <div className="flex-1 overflow-y-auto p-2">
              {allParticipants.map((participant) => {
                const isSelf = participant.isSelf;
                const isCurrentMuted = isSelf ? isMuted : mutedParticipants.has(participant.id);
                const canMute = isHost && !isSelf && participant.role === "participant";

                return (
                  <div
                    key={isSelf ? "self" : participant.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      isSelf ? "bg-sky-500/10 border border-sky-500/20" : "hover:bg-slate-800",
                      participant.role === "participant" && isHandRaised && !isSelf && "bg-yellow-500/10"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      participant.role === "host" || (isSelf && isHost) ? "bg-sky-500" : "bg-slate-700"
                    )}>
                      <span className="text-xs font-medium text-white">
                        {(participant.user_username || "P")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white flex items-center gap-2">
                        {isSelf ? "You" : (participant.user_username || "Participant")}
                        {isSelf && (
                          <span className="text-xs text-sky-400">(Host)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">
                        {participant.role === "host" || (isSelf && isHost) ? "Host" : participant.role}
                      </div>
                      {!isSelf && isHostMuted && participant.role === "participant" && (
                        <div className="text-xs text-yellow-400">Muted by host</div>
                      )}
                    </div>
                    {!isCurrentMuted && <Mic className="w-4 h-4 text-green-400" />}
                    {isCurrentMuted && <MicOff className="w-4 h-4 text-red-400" />}
                    {canMute && (
                      <button
                        onClick={() => muteParticipant(participant.id)}
                        className={cn(
                          "p-1.5 rounded-full transition-colors",
                          isCurrentMuted
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "hover:bg-slate-700 text-slate-400"
                        )}
                        title={isCurrentMuted ? "Unmute participant" : "Mute participant"}
                      >
                        {isCurrentMuted ? (
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

              {allParticipants.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Waiting for participants...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 py-4 bg-slate-900 border-t border-slate-800">
        <button
          onClick={toggleMute}
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center transition-colors",
            isMuted
              ? "bg-red-500 hover:bg-red-600"
              : "bg-slate-700 hover:bg-slate-600",
            isHostMuted && "opacity-50"
          )}
          title={isHostMuted ? "Muted by host" : isMuted ? "Unmute yourself" : "Mute yourself"}
          disabled={isHostMuted}
        >
          {isMuted ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className="w-6 h-6 text-white" />
          )}
          {isHostMuted && !isHost && (
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-slate-800">
              <span className="text-[8px] font-bold text-white">H</span>
            </span>
          )}
        </button>

        {isHost && (
          <button
            onClick={muteAllParticipants}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors relative",
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
            {participants.length > 0 && participants.every((p) => mutedParticipants.has(p.id)) ? (
              <MicOff className="w-3 h-3 absolute top-1 right-1 text-white" />
            ) : participants.length > 0 ? (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{participants.length}</span>
              </span>
            ) : null}
          </button>
        )}

        {!isHost && (
          <button
            onClick={toggleHandRaised}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-colors",
              isHandRaised
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-slate-700 hover:bg-slate-600"
            )}
            title={isHandRaised ? "Lower hand" : "Raise hand"}
          >
            <Hand className="w-6 h-6 text-white" />
          </button>
        )}

        <button
          onClick={handleEndOrLeaveMeeting}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
          title={isHost ? "End meeting" : "Leave meeting"}
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>

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

      {isConnecting && (
        <div className="absolute inset-0 bg-slate-950/90 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">
              {isHost ? "Starting meeting..." : "Joining meeting..."}
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Setting up your audio connection
            </p>
          </div>
        </div>
      )}

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

export default memo(MeetingRoom);