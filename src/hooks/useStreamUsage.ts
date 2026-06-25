'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessTokenFromCookie } from '@/lib/api/cookies';
import { livestreamApi } from '@/lib/api/livestream';
import type { StreamUsage, StreamUsageEventType } from '@/types/usage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-dev.volantislive.com';
const WS_BASE_URL = API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');

// Poll every 30 s when WebSocket is healthy; every 15 s when falling back
const POLL_INTERVAL_WS = 30_000;
const POLL_INTERVAL_FALLBACK = 15_000;
const WARNING_THRESHOLD = 90;

export interface UseStreamUsageOptions {
  slug: string;
  enabled: boolean;
  onLimitReached?: (usage: StreamUsage) => void;
  onWarning?: (usage: StreamUsage) => void;
  onStreamStopped?: () => void;
}

export interface UseStreamUsageResult {
  usage: StreamUsage | null;
  isWsConnected: boolean;
  isFallbackPolling: boolean;
}

export function useStreamUsage({
  slug,
  enabled,
  onLimitReached,
  onWarning,
  onStreamStopped,
}: UseStreamUsageOptions): UseStreamUsageResult {
  const [usage, setUsage] = useState<StreamUsage | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isFallbackPolling, setIsFallbackPolling] = useState(false);

  // Keep callbacks in refs so the WS handler never goes stale
  const onLimitReachedRef = useRef(onLimitReached);
  const onWarningRef = useRef(onWarning);
  const onStreamStoppedRef = useRef(onStreamStopped);
  onLimitReachedRef.current = onLimitReached;
  onWarningRef.current = onWarning;
  onStreamStoppedRef.current = onStreamStopped;

  // Tracks whether we already fired the callbacks to avoid repeat calls
  const warnedRef = useRef(false);
  const limitReachedRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const isIntentionalCloseRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT = 5;

  const applyUpdate = useCallback((data: StreamUsage) => {
    if (!isMountedRef.current) return;
    setUsage(data);

    if ((data.event === 'limit_reached' || data.has_reached_limit || data.should_stop_broadcasting) && !limitReachedRef.current) {
      limitReachedRef.current = true;
      onLimitReachedRef.current?.(data);
    } else if ((data.event === 'usage_warning' || data.should_warn) && !warnedRef.current && !limitReachedRef.current) {
      warnedRef.current = true;
      onWarningRef.current?.(data);
    }

    if (data.event === 'stream_stopped') {
      onStreamStoppedRef.current?.();
    }
  }, []);

  // REST fallback polling
  const startFallbackPolling = useCallback(() => {
    if (pollRef.current) return;
    if (!isMountedRef.current) return;

    setIsFallbackPolling(true);

    const poll = async () => {
      if (!isMountedRef.current || !slug) return;
      try {
        const data = await livestreamApi.getUsageStatus(slug, WARNING_THRESHOLD);
        applyUpdate(data);
      } catch {
        // Silently ignore — stream may have ended
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_FALLBACK);
  }, [slug, applyUpdate]);

  const stopFallbackPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsFallbackPolling(false);
  }, []);

  // Periodic REST refresh even when WebSocket is alive (keeps data fresh on reconnect)
  const startRefreshPolling = useCallback(() => {
    if (pollRef.current) return;
    const poll = async () => {
      if (!isMountedRef.current || !slug) return;
      try {
        const data = await livestreamApi.getUsageStatus(slug, WARNING_THRESHOLD);
        applyUpdate(data);
      } catch {
        // Ignore
      }
    };
    pollRef.current = setInterval(poll, POLL_INTERVAL_WS);
  }, [slug, applyUpdate]);

  const connectWebSocket = useCallback(() => {
    if (!enabled || !slug || !isMountedRef.current) return;

    const token = getAccessTokenFromCookie();
    if (!token) {
      startFallbackPolling();
      return;
    }

    isIntentionalCloseRef.current = false;
    const url = `${WS_BASE_URL}/livestreams/${encodeURIComponent(slug)}/usage/ws?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) { ws.close(); return; }
        reconnectAttemptsRef.current = 0;
        setIsWsConnected(true);
        stopFallbackPolling();
        startRefreshPolling();
      };

      ws.onmessage = (ev) => {
        try {
          const data: StreamUsage = JSON.parse(ev.data);
          applyUpdate(data);
        } catch {
          // malformed frame — ignore
        }
      };

      ws.onerror = () => {
        // onclose fires right after, handle there
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setIsWsConnected(false);
        wsRef.current = null;

        if (isIntentionalCloseRef.current) return;

        if (reconnectAttemptsRef.current < MAX_RECONNECT) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * 2 ** (reconnectAttemptsRef.current - 1), 30_000);
          reconnectTimerRef.current = setTimeout(() => {
            if (!isIntentionalCloseRef.current) connectWebSocket();
          }, delay);
        } else {
          // Give up on WS, fall back to polling
          startFallbackPolling();
        }
      };
    } catch {
      startFallbackPolling();
    }
  }, [enabled, slug, applyUpdate, startFallbackPolling, stopFallbackPolling, startRefreshPolling]);

  useEffect(() => {
    isMountedRef.current = true;
    warnedRef.current = false;
    limitReachedRef.current = false;

    if (enabled && slug) {
      connectWebSocket();
    }

    return () => {
      isMountedRef.current = false;
      isIntentionalCloseRef.current = true;

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [enabled, slug]);

  return { usage, isWsConnected, isFallbackPolling };
}
