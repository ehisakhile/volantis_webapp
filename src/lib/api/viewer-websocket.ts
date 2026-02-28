// Viewer WebSocket Service
// Handles real-time viewer count connections to the livestream

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-dev.volantislive.com';
const WS_BASE_URL = API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

export interface ViewerJoinedData {
  viewer_id: number;
  name: string;
  viewer_count: number;
  stream_title: string;
}

export interface ViewerCountUpdateData {
  count: number;
}

export interface ViewerErrorData {
  message: string;
}

export interface ViewerWebSocketMessage {
  event: 'viewer_joined' | 'viewer_count_update';
  data: ViewerJoinedData | ViewerCountUpdateData;
}

export type ViewerEventCallback = (data: ViewerJoinedData | ViewerCountUpdateData | ViewerErrorData) => void;

export class ViewerWebSocket {
  private ws: WebSocket | null = null;
  private slug: string;
  private companyId: number;
  private name?: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<ViewerEventCallback>> = new Map();
  private isConnected = false;
  private isIntentionalClose = false;

  constructor(slug: string, companyId: number, name?: string) {
    this.slug = slug;
    this.companyId = companyId;
    this.name = name;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isIntentionalClose = false;
      
      const params = new URLSearchParams({
        company_id: this.companyId.toString(),
      });
      
      if (this.name) {
        params.append('name', this.name);
      }

      const wsUrl = `${WS_BASE_URL}/livestream/ws/${this.slug}?${params.toString()}`;
      
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: ViewerWebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Viewer WebSocket error:', error);
          if (!this.isConnected) {
            reject(error);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          if (!this.isIntentionalClose) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: ViewerWebSocketMessage) {
    const listeners = this.listeners.get(message.event);
    if (listeners) {
      listeners.forEach((callback) => callback(message.data));
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emitError({ message: 'Max reconnection attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      if (!this.isIntentionalClose) {
        this.connect().catch(() => {
          this.attemptReconnect();
        });
      }
    }, delay);
  }

  private emitError(data: ViewerErrorData) {
    const listeners = this.listeners.get('error');
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  on(event: 'viewer_joined' | 'viewer_count_update' | 'error', callback: ViewerEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: 'viewer_joined' | 'viewer_count_update' | 'error', callback: ViewerEventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: unknown) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data as ViewerJoinedData | ViewerCountUpdateData | ViewerErrorData));
    }
  }

  disconnect() {
    this.isIntentionalClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }

  getConnectionState(): boolean {
    return this.isConnected;
  }
}

let viewerWsInstance: ViewerWebSocket | null = null;

export const viewerWs = {
  create(slug: string, companyId: number, name?: string): ViewerWebSocket {
    if (viewerWsInstance) {
      viewerWsInstance.disconnect();
    }
    viewerWsInstance = new ViewerWebSocket(slug, companyId, name);
    return viewerWsInstance;
  },

  getInstance(): ViewerWebSocket | null {
    return viewerWsInstance;
  },

  disconnect() {
    if (viewerWsInstance) {
      viewerWsInstance.disconnect();
      viewerWsInstance = null;
    }
  },
};

export default viewerWs;
