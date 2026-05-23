"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  meetingWs,
  disconnectMeetingSocket,
  type ParticipantJoinedData,
  type ParticipantLeftData,
  type MeetingEndedData,
  type ChatMessageData,
  type HandRaisedData,
  type MeetingEvent,
  type MeetingEventCallback,
} from "@/lib/api/meeting-websocket";

interface UseMeetingWebSocketOptions {
  meetingId: number;
  onParticipantJoined?: (data: ParticipantJoinedData) => void;
  onParticipantLeft?: (data: ParticipantLeftData) => void;
  onMeetingEnded?: (data: MeetingEndedData) => void;
  onChatMessage?: (data: ChatMessageData) => void;
  onHandRaised?: (data: HandRaisedData) => void;
  onHandLowered?: (data: HandRaisedData) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Event) => void;
}

interface UseMeetingWebSocketReturn {
  isConnected: boolean;
  sendChatMessage: (content: string) => void;
  raiseHand: () => void;
  lowerHand: () => void;
  disconnect: () => void;
}

export function useMeetingWebSocket(
  options: UseMeetingWebSocketOptions
): UseMeetingWebSocketReturn {
  const {
    meetingId,
    onParticipantJoined,
    onParticipantLeft,
    onMeetingEnded,
    onChatMessage,
    onHandRaised,
    onHandLowered,
    onConnected,
    onDisconnected,
    onError,
  } = options;

  const socketRef = useRef<ReturnType<typeof meetingWs> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = meetingWs(meetingId);
    socketRef.current = socket;

    // Create type-safe wrapper callbacks
    const wrappedJoined: MeetingEventCallback = (data) =>
      onParticipantJoined?.(data as ParticipantJoinedData);
    const wrappedLeft: MeetingEventCallback = (data) =>
      onParticipantLeft?.(data as ParticipantLeftData);
    const wrappedEnded: MeetingEventCallback = (data) =>
      onMeetingEnded?.(data as MeetingEndedData);
    const wrappedChat: MeetingEventCallback = (data) =>
      onChatMessage?.(data as ChatMessageData);
    const wrappedRaised: MeetingEventCallback = (data) =>
      onHandRaised?.(data as HandRaisedData);
    const wrappedLowered: MeetingEventCallback = (data) =>
      onHandLowered?.(data as HandRaisedData);

    // Set up event listeners
    if (onParticipantJoined) {
      socket.on("participant_joined", wrappedJoined);
    }
    if (onParticipantLeft) {
      socket.on("participant_left", wrappedLeft);
    }
    if (onMeetingEnded) {
      socket.on("meeting_ended", wrappedEnded);
    }
    if (onChatMessage) {
      socket.on("chat_message", wrappedChat);
    }
    if (onHandRaised) {
      socket.on("hand_raised", wrappedRaised);
    }
    if (onHandLowered) {
      socket.on("hand_lowered", wrappedLowered);
    }

    // Connect
    socket
      .connect()
      .then(() => {
        setIsConnected(true);
        onConnected?.();
      })
      .catch((error) => {
        console.error("Failed to connect meeting WebSocket:", error);
        onError?.(error);
      });

    // Cleanup
    return () => {
      if (onParticipantJoined) {
        socket.off("participant_joined", wrappedJoined);
      }
      if (onParticipantLeft) {
        socket.off("participant_left", wrappedLeft);
      }
      if (onMeetingEnded) {
        socket.off("meeting_ended", wrappedEnded);
      }
      if (onChatMessage) {
        socket.off("chat_message", wrappedChat);
      }
      if (onHandRaised) {
        socket.off("hand_raised", wrappedRaised);
      }
      if (onHandLowered) {
        socket.off("hand_lowered", wrappedLowered);
      }
      disconnectMeetingSocket(meetingId);
      setIsConnected(false);
      onDisconnected?.();
    };
  }, [meetingId]);

  const sendChatMessage = useCallback((content: string) => {
    socketRef.current?.sendChatMessage(content);
  }, []);

  const raiseHand = useCallback(() => {
    socketRef.current?.raiseHand();
  }, []);

  const lowerHand = useCallback(() => {
    socketRef.current?.lowerHand();
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setIsConnected(false);
  }, []);

  return {
    isConnected,
    sendChatMessage,
    raiseHand,
    lowerHand,
    disconnect,
  };
}

export default useMeetingWebSocket;