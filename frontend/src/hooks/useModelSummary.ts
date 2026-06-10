/**
 * useModelSummary.ts
 *
 * Manages data fetching and loading state for the Model Summary screen.
 * Fetches model summary data via reportsService.fetchModelSummary whenever
 * the market, brand, or indication filter changes.
 *
 * The hook does NOT fire when any filter is missing — the page shows an
 * empty state prompting the user to complete their filter selection.
 * UI state (expand, sort, search) lives in the page component, not here.
 *
 * Delegates all API communication to reportsService.fetchModelSummary, which
 * normalizes the flat subchannel response into channel_level, subchannel_level,
 * and channel_calculations aggregations ready for chart consumption.
 */
import { useState, useEffect, useCallback } from 'react';
import { reportsService } from '@/services/reports.service';
import type { ModelSummaryData } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseModelSummaryResult {
  summaryData: ModelSummaryData | null;
  isLoading: boolean;
  error: string | null;
  /** Re-issues the current fetch — wired to ErrorState retry affordance. */
  refetch: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useModelSummary
 *
 * Fetches model summary data from the API whenever market, brand, or indication
 * changes. Skips the request when any filter is null or empty; in that case
 * summaryData is null and isLoading is false.
 *
 * @param {string | null} market - Selected market filter value.
 * @param {string | null} brand - Selected brand filter value.
 * @param {string | null} indication - Selected indication filter value.
 * @returns {UseModelSummaryResult} Data, loading, error, and refetch function.
 */
export function useModelSummary(
  market: string | null,
  brand: string | null,
  indication: string | null,
): UseModelSummaryResult {
  const [summaryData, setSummaryData] = useState<ModelSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtersComplete = !!market && !!brand && !!indication;

  const fetchData = useCallback(async () => {
    if (!filtersComplete) {
      setSummaryData(null);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await reportsService.fetchModelSummary(market!, brand!, indication!);
      setSummaryData(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load model summary');
      setSummaryData(null);
    } finally {
      setIsLoading(false);
    }
  }, [market, brand, indication, filtersComplete]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { summaryData, isLoading, error, refetch: fetchData };
}
