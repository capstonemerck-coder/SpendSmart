/**
 * useDataFactChannels.ts
 *
 * Fetches distinct DATA_FACT channel names for a given cycle.
 * Used by useScenarioPlanning to populate the channel constraint list in the
 * New Scenario modal with channels that have actual uploaded raw data.
 *
 * Clears and re-fetches whenever cycleId changes.
 */
import { useState, useEffect } from 'react';
import { reportsService } from '@/services/reports.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseDataFactChannelsResult {
  channels: string[];
  channelsLoading: boolean;
  channelsError: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useDataFactChannels
 *
 * Returns the sorted list of distinct channel names present in DATA_FACT for
 * the given cycle. Loading and error states are exposed so callers can render
 * appropriate feedback.
 *
 * @param {string | null} cycleId - The active cycle; null resets the channel list.
 * @returns {UseDataFactChannelsResult} channels, channelsLoading, channelsError.
 */
export function useDataFactChannels(cycleId: string | null): UseDataFactChannelsResult {
  const [channels, setChannels] = useState<string[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  useEffect(() => {
    if (!cycleId) {
      setChannels([]);
      setChannelsError(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setChannelsLoading(true);
      setChannelsError(null);
      try {
        const result = await reportsService.fetchChannelsForCycle(cycleId);
        if (!cancelled) setChannels(result);
      } catch (err) {
        if (!cancelled) {
          setChannelsError(err instanceof Error ? err.message : 'Failed to load channels');
          setChannels([]);
        }
      } finally {
        if (!cancelled) setChannelsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cycleId]);

  return { channels, channelsLoading, channelsError };
}
