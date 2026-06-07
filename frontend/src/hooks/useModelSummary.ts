/**
 * useModelSummary.ts
 *
 * Manages data fetching and state for the Model Summary screen.
 *
 * Fetches channel/subchannel model parameters from GET /reports/model-summary
 * using the active market, brand, and indication filter values.  A new request
 * is issued whenever any of the three filters changes.
 *
 * The hook does NOT fire the API when any filter is missing — the screen shows
 * an empty state prompting the user to complete their filter selection.
 *
 * Delegates all API communication to reportsService.fetchModelSummary.
 */
import { useState, useEffect, useCallback } from 'react';
import { reportsService } from '@/services/reports.service';
import type { ModelSummaryData } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseModelSummaryResult {
  summaryData: ModelSummaryData | null;
  isLoading: boolean;
  error: string | null;
  /** Re-issues the current fetch — useful for the ErrorState retry affordance. */
  refetch: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useModelSummary
 *
 * Fetches model summary data from the API whenever the market, brand, or
 * indication filter changes.  Skips the request when any filter is null or
 * empty; in that case summaryData is null and isLoading is false.
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
      const data = await reportsService.fetchModelSummary(
        market!,
        brand!,
        indication!,
      );
      setSummaryData(data);
    } catch {
      setError('Failed to load model summary. Please try again.');
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
