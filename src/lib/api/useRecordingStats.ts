// React hook for recording playback and view counts
import { useState, useEffect, useCallback } from 'react';
import { recordingsApi, type RecordingStatsResponse } from './recordings';

const DEBUG = process.env.NODE_ENV !== 'production';

function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[RecordingStats]', ...args);
  }
}

export interface UseRecordingStatsOptions {
  recordingId: number;
  enabled?: boolean;
}

export interface UseRecordingStatsResult {
  replayCount: number;
  uniqueViewers: number;
  avgWatchDuration: number | null;
  completionRate: number | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useRecordingStats({
  recordingId,
  enabled = true,
}: UseRecordingStatsOptions): UseRecordingStatsResult {
  const [replayCount, setReplayCount] = useState(0);
  const [uniqueViewers, setUniqueViewers] = useState(0);
  const [avgWatchDuration, setAvgWatchDuration] = useState<number | null>(null);
  const [completionRate, setCompletionRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    if (!enabled || !recordingId) return;

    debugLog(`[STATS] Fetching stats for recording: ${recordingId}`);
    setIsLoading(true);
    
    try {
      const data = await recordingsApi.getRecordingStats(recordingId);
      debugLog('[STATS] Recording stats response:', data);
      
      setReplayCount(data.replay_count);
      setUniqueViewers(data.unique_viewers);
      setAvgWatchDuration(data.average_watch_duration_seconds);
      setCompletionRate(data.completion_rate);
      setError(null);
    } catch (err) {
      debugError('[STATS] Failed to fetch recording stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch recording stats'));
    } finally {
      setIsLoading(false);
    }
  }, [recordingId, enabled]);

  useEffect(() => {
    if (!enabled || !recordingId) return;

    debugLog(`[Init] Fetching initial stats for recording: ${recordingId}`);
    fetchStats();

    return () => {
      debugLog('[Cleanup] Cleaning up recording stats');
    };
  }, [recordingId, enabled]);

  const refresh = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  return {
    replayCount,
    uniqueViewers,
    avgWatchDuration,
    completionRate,
    isLoading,
    error,
    refresh,
  };
}

function debugError(...args: any[]) {
  if (DEBUG) {
    console.error('[RecordingStats]', ...args);
  }
}

export default useRecordingStats;
