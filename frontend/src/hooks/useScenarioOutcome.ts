/**
 * useScenarioOutcome.ts
 *
 * Fetches and normalizes the optimizer result for a given scenario.
 * Maps the flat ScenarioOutcomeOut API shape to ScenarioOutcomeData,
 * deriving grouped_results from channel_results so callers can render
 * a 3-level Category → Channel → Sub-channel contribution table.
 *
 * Cancels in-flight requests on scenarioId change or component unmount.
 */
import { useState, useEffect } from 'react';
import { scenarioService } from '@/services/scenarios.service';
import type { ScenarioOutcomeOut, ScenarioOutcomeData, CategoryGroupResult } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseScenarioOutcomeResult {
  outcome: ScenarioOutcomeData | null;
  isLoading: boolean;
  error: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps the flat ScenarioOutcomeOut API response to ScenarioOutcomeData.
 * Each channel_result becomes a top-level CategoryGroupResult with an empty
 * channels array until the backend provides a real 3-level hierarchy.
 *
 * @param {ScenarioOutcomeOut} raw - Raw API response from GET /scenarios/{id}/outcome.
 * @returns {ScenarioOutcomeData} Normalized outcome with grouped_results derived.
 */
function mapToScenarioOutcomeData(raw: ScenarioOutcomeOut): ScenarioOutcomeData {
  const grouped_results: CategoryGroupResult[] = raw.channel_results.map((r) => ({
    channel_id: r.channel_id,
    channel_name: r.channel_name,
    category: r.channel_name,
    depth: 0,
    optimized_spend: r.optimized_spend,
    impactable_sales: r.impactable_sales,
    roi: r.roi,
    mroi: r.mroi,
    channels: [],
  }));
  return {
    ...raw,
    channel_results: raw.channel_results.map((r) => ({ ...r, category: r.channel_name })),
    grouped_results,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useScenarioOutcome
 *
 * Fetches scenario outcome data for the given scenarioId. Only triggers a
 * fetch when scenarioId is a valid integer string. Clears prior state on
 * scenarioId change and cancels in-flight requests on unmount.
 *
 * @param {string | null | undefined} scenarioId - Scenario ID as a string.
 * @returns {UseScenarioOutcomeResult} outcome data, loading flag, and error message.
 */
export function useScenarioOutcome(scenarioId: string | null | undefined): UseScenarioOutcomeResult {
  const [outcome, setOutcome] = useState<ScenarioOutcomeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = scenarioId != null ? parseInt(scenarioId, 10) : NaN;
    if (isNaN(id)) { setOutcome(null); setError(null); return; }
    let cancelled = false;
    setOutcome(null); setError(null); setIsLoading(true);
    scenarioService.getOutcome(id)
      .then((raw) => { if (!cancelled) { setOutcome(mapToScenarioOutcomeData(raw)); setIsLoading(false); } })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load outcome data');
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [scenarioId]);

  return { outcome, isLoading, error };
}
