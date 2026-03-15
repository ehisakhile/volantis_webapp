// React hook for real-time viewer count with WebSocket + polling fallback
import { useState, useEffect, useCallback, useRef } from 'react';
import { livestreamApi } from './livestream';
import { debug } from 'console';

const DEBUG = process.env.NODE_ENV !== 'production';

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[ViewerCount]', ...args);
  }
}

function debugError(...args: any[]) {
  if (DEBUG) {
    console.error('[ViewerCount]', ...args);
  }
}

export interface UseViewerCountOptions {
  slug: string;
  companyId: number;
  pollingInterval?: number;
  enabled?: boolean;
}

export interface UseViewerCountResult {
  viewerCount: number;
  totalViews: number;
  peakViewers: number;
  isLive: boolean;
  isConnected: boolean;
  isPolling: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DEFAULT_POLLING_INTERVAL = 10000;

export function useViewerCount({
  slug,
  companyId,
  pollingInterval = DEFAULT_POLLING_INTERVAL,
  enabled = true,
}: UseViewerCountOptions): UseViewerCountResult {
  const [viewerCount, setViewerCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const wsRef = useRef<any>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const statsPollingRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollCountRef = useRef(0);

  const fetchViewerCount = useCallback(async () => {
    debugLog(`[REST] Fetching realtime stats for: ${slug}, companyId: ${companyId}`);
    try {
      // Use getRealtimeStats which includes total_views
      const data = await livestreamApi.getRealtimeStats(slug);
      debugLog(`[REST] Realtime stats response:`, data);
      setViewerCount(data.viewer_count);
      setIsLive(data.is_active);
      setTotalViews(data.total_views);
      setPeakViewers(data.peak_viewers);
      setError(null);
      debugLog(`[REST] Updated viewer count: ${data.viewer_count}, total views: ${data.total_views}, peak viewers: ${data.peak_viewers}`);
    } catch (err) {
      debugError('[REST] Failed to fetch realtime stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch realtime stats'));
    }
  }, [slug, companyId]);

  const fetchRealtimeStats = useCallback(async () => {
    pollCountRef.current += 1;
    debugLog(`[POLL] Fetching realtime stats (poll #${pollCountRef.current}) for: ${slug}`);
    try {
      const data = await livestreamApi.getRealtimeStats(slug);
      debugLog(`[POLL] Realtime stats response:`, data);
      setViewerCount(data.viewer_count);
      setIsLive(data.is_active);
      setTotalViews(data.total_views);
      setPeakViewers(data.peak_viewers);
      setError(null);
    } catch (err) {
      debugError('[POLL] Failed to fetch realtime stats:', err);
    }
  }, [slug]);

  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      debugLog('[POLL] Polling already running, skipping start');
      return;
    }
    
    debugLog(`[POLL] Starting polling every ${pollingInterval}ms`);
    setIsPolling(true);
    fetchRealtimeStats();
    
    pollingRef.current = setInterval(() => {
      fetchRealtimeStats();
    }, pollingInterval);
  }, [pollingInterval, fetchRealtimeStats]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      debugLog('[POLL] Stopping polling');
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPolling(false);
  }, []);

  // Separate polling for stats (total_views, peak_viewers) that runs even when WebSocket is connected
  const startStatsPolling = useCallback(() => {
    if (statsPollingRef.current) {
      debugLog('[STATS_POLL] Stats polling already running, skipping start');
      return;
    }
    
    // Poll for stats (including total_views) at a slower interval (every 30s or 3x the polling interval)
    const statsInterval = Math.max(pollingInterval * 3, 30000);
    debugLog(`[STATS_POLL] Starting stats polling every ${statsInterval}ms`);
    
    statsPollingRef.current = setInterval(() => {
      fetchRealtimeStats();
    }, statsInterval);
  }, [pollingInterval, fetchRealtimeStats]);

  const stopStatsPolling = useCallback(() => {
    if (statsPollingRef.current) {
      debugLog('[STATS_POLL] Stopping stats polling');
      clearInterval(statsPollingRef.current);
      statsPollingRef.current = null;
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    if (!enabled || !slug || !companyId) {
      debugLog('[WS] Skipping connect - not enabled or missing params');
      return;
    }

    debugLog(`[WS] Connecting to: /livestream/ws/${slug}?company_id=${companyId}`);

    try {
      const { ViewerWebSocket } = await import('./viewer-websocket');
      
      if (wsRef.current) {
        debugLog('[WS] Disconnecting existing WebSocket');
        wsRef.current.disconnect();
      }

      const ws = new ViewerWebSocket(slug, companyId);
      wsRef.current = ws;

      ws.on('viewer_joined' as any, (data: any) => {
        debugLog('[WS] Received viewer_joined event:', data);
        setViewerCount(data.viewer_count);
        setIsConnected(true);
        setIsPolling(false);
      });

      ws.on('viewer_count_update' as any, (data: any) => {
        debugLog('[WS] Received viewer_count_update event:', data);
        setViewerCount(data.count);
      });

      ws.on('error' as any, (data: any) => {
        debugError('[WS] WebSocket error:', data);
        setIsConnected(false);
        startPolling();
      });

      await ws.connect();
      debugLog('[WS] WebSocket connected successfully');
      setIsConnected(true);
      setIsPolling(false);
      // Start stats polling for total_views even when WebSocket is connected
      startStatsPolling();
    } catch (err) {
      debugError('[WS] WebSocket connection failed:', err);
      setIsConnected(false);
      startPolling();
    }
  }, [slug, companyId, enabled, startPolling, startStatsPolling]);

  const handleVisibilityChange = useCallback(() => {
    debugLog('[Visibility] Document visibility changed:', document.visibilityState);
    if (document.visibilityState === 'visible' && !isConnected && enabled) {
      debugLog('[Visibility] Tab became visible, reconnecting...');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 1000);
    }
  }, [isConnected, enabled, connectWebSocket]);

  useEffect(() => {
    if (!enabled || !slug || !companyId) {
      debugLog('[Init] Not enabled or missing params, skipping');
      return;
    }

    debugLog(`[Init] Starting viewer count for: ${slug}, companyId: ${companyId}`);
    fetchViewerCount();
    connectWebSocket();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      debugLog('[Cleanup] Cleaning up viewer count');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
      stopStatsPolling();
      
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [slug, companyId, enabled]);

  useEffect(() => {
    if (!isConnected && enabled && !isPolling && slug && companyId) {
      debugLog('[Reconnect] Connection lost, scheduling reconnect in 5s');
      const reconnectDelay = setTimeout(() => {
        connectWebSocket();
      }, 5000);
      
      return () => clearTimeout(reconnectDelay);
    }
  }, [isConnected, enabled, slug, companyId, connectWebSocket, isPolling]);

  const refresh = useCallback(async () => {
    debugLog('[Refresh] Manual refresh triggered');
    await fetchViewerCount();
  }, [fetchViewerCount]);

  return {
    viewerCount,
    totalViews,
    peakViewers,
    isLive,
    isConnected,
    isPolling,
    error,
    refresh,
  };
}

export default useViewerCount;
