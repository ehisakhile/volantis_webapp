"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface UseLiveChatOptions {
  streamSlug?: string;
  onMessage?: (message: ChatMessage) => void;
  maxMessages?: number;
}

interface UseLiveChatReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// Placeholder for future WebSocket/Server-Sent Events implementation
export function useLiveChat(options: UseLiveChatOptions = {}) {
  const {
    streamSlug,
    onMessage,
    maxMessages = 100,
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a message to the list
  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev, message];
      // Keep only the last maxMessages
      if (newMessages.length > maxMessages) {
        return newMessages.slice(-maxMessages);
      }
      return newMessages;
    });
    onMessage?.(message);
  }, [maxMessages, onMessage]);

  // Connect to chat
  const connect = useCallback(async () => {
    if (!streamSlug) {
      setError('No stream slug provided');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Placeholder: In production, this would connect to a WebSocket server
      // const ws = new WebSocket(`wss://api.example.com/chat/${streamSlug}`);
      
      // For demo purposes, we'll simulate a connection
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsConnected(true);
      
      // Add a welcome message
      addMessage({
        id: 'system-welcome',
        username: 'System',
        message: 'Welcome to the live chat!',
        timestamp: new Date(),
        isSystem: true,
      });
    } catch (err) {
      setError('Failed to connect to chat');
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [streamSlug, addMessage]);

  // Disconnect from chat
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // Send a message
  const sendMessage = useCallback((message: string) => {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      username: 'You',
      message: message.trim(),
      timestamp: new Date(),
    };

    // In production, this would send to the WebSocket server
    addMessage(newMessage);
  }, [addMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    messages,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    connect,
    disconnect,
  };
}

export default useLiveChat;
