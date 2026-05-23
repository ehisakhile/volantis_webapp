// Meeting WebSocket Service
// Handles real-time participant updates for meetings

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-dev.volantislive.com";
const WS_BASE_URL = API_BASE_URL.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

export interface ParticipantJoinedData {
  id: number;
  user_id: number;
  role: "host" | "co_host" | "participant";
  status: "joined" | "left" | "pending";
  joined_at?: string | null;
  left_at?: string | null;
  user_email?: string | null;
  user_username?: string | null;
}

export interface ParticipantLeftData {
  user_id: number;
}

export interface MeetingEndedData {
  meeting_id: number;
  ended_at: string;
}

export interface ChatMessageData {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  username?: string;
}

export interface HandRaisedData {
  user_id: number;
  raised: boolean;
}

export type MeetingEvent =
  | "participant_joined"
  | "participant_left"
  | "meeting_ended"
  | "chat_message"
  | "hand_raised"
  | "hand_lowered";

export interface MeetingWebSocketMessage {
  type: MeetingEvent;
  payload: ParticipantJoinedData | ParticipantLeftData | MeetingEndedData | ChatMessageData | HandRaisedData;
}

export type MeetingEventCallback = (
  data:
    | ParticipantJoinedData
    | ParticipantLeftData
    | MeetingEndedData
    | ChatMessageData
    | HandRaisedData
) => void;

export class MeetingWebSocket {
  private ws: WebSocket | null = null;
  private meetingId: number;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<MeetingEventCallback>> = new Map();
  private isConnected = false;
  private isIntentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(meetingId: number) {
    this.meetingId = meetingId;
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isIntentionalClose = false;

      const params = new URLSearchParams({});
      if (token) {
        params.append("token", token);
      }

      const wsUrl = `${WS_BASE_URL}/ws/meeting/${this.meetingId}${
        params.toString() ? `?${params.toString()}` : ""
      }`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          console.log(`Meeting WebSocket connected for meeting ${this.meetingId}`);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: MeetingWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse meeting WebSocket message:", error);
          }
        };

        this.ws.onerror = (error) => {
          console.error("Meeting WebSocket error:", error);
          if (!this.isConnected) {
            reject(error);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log("Meeting WebSocket disconnected");
          if (!this.isIntentionalClose) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: MeetingWebSocketMessage) {
    const eventListeners = this.listeners.get(message.type);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(message.payload));
    }
  }

  private attemptReconnect() {
    if (this.isIntentionalClose) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnect attempts reached for meeting WebSocket");
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect meeting WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
      });
    }, delay);
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  send(message: { type: string; [key: string]: unknown }) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  sendChatMessage(content: string) {
    this.send({
      type: "chat_message",
      content,
    });
  }

  raiseHand() {
    this.send({
      type: "hand_raised",
    });
  }

  lowerHand() {
    this.send({
      type: "hand_lowered",
    });
  }

  on(event: MeetingEvent, callback: MeetingEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: MeetingEvent, callback: MeetingEventCallback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  get connectionState() {
    if (!this.ws) return "closed";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "open";
      case WebSocket.CLOSING:
        return "closing";
      case WebSocket.CLOSED:
      default:
        return "closed";
    }
  }

  get connectionStatus() {
    return this.isConnected;
  }
}

// Singleton instance management
const meetingSockets = new Map<number, MeetingWebSocket>();

export function meetingWs(meetingId: number): MeetingWebSocket {
  if (!meetingSockets.has(meetingId)) {
    meetingSockets.set(meetingId, new MeetingWebSocket(meetingId));
  }
  return meetingSockets.get(meetingId)!;
}

export function disconnectMeetingSocket(meetingId: number) {
  const socket = meetingSockets.get(meetingId);
  if (socket) {
    socket.disconnect();
    meetingSockets.delete(meetingId);
  }
}

export default MeetingWebSocket;