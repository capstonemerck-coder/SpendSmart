/**
 * useScenarioPlanning.ts
 *
 * Manages all server state for the Scenario Planning screen.
 * Handles loading channel rows from model summary channel_calculations,
 * dashboard KPIs, and saved scenarios from the API.
 * Owns the optimizer run + polling loop (3s interval via recursive setTimeout).
 * Owns proposed spend and slider state per channel row.
 * Does not manage create-modal UI state or form field values — those stay in the page.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { reportsService } from '@/services/reports.service';
import { scenarioService } from '@/services/scenarios.service';
import type {
  ChannelPlanningRow, SavedScenario, SaveScenarioParams,
  ScenarioOut, ConstraintIn, DashboardKPIs,
} from '@/utils/types';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Milliseconds between optimizer status polls. */
const POLL_INTERVAL_MS = 3_000;

/** Message interval for the rotating progress text in milliseconds. */
const MESSAGE_INTERVAL_MS = 2_000;

/** Rotating status messages shown while the optimizer is running. */
const OPTIMIZER_MESSAGES = [
  'Optimizer is running in the background…',
  'Generating optimized allocation…',
  'Processing scenario constraints…',
  'Computing optimized outcome…',
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a raw ScenarioOut API response to the SavedScenario UI shape.
 * Derives opt_status from is_pending when the API does not return it directly.
 */
function toSavedScenario(s: ScenarioOut): SavedScenario {
  return {
    scenario_id: s.scenario_id,
    scenario_name: s.scenario_name,
    cycle_id: s.cycle_id,
    scenario_type: s.scenario_type,
    is_public: s.is_public,
    opt_status: s.is_pending ? 'draft' : 'completed',
    is_pending: s.is_pending,
    category_constraint: s.category_constraint,
    target_spend: s.target_spend,
    target_kpi: s.target_kpi,
    target_value: s.target_value,
    created_at: s.created_at,
    constraints: s.constraints,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useScenarioPlanning
 *
 * @param {string | null} cycleId - Active cycle; null until the page selects one.
 * @returns All server state and handlers for the Scenario Planning screen.
 */
export function useScenarioPlanning(cycleId: string | null) {
  const [channelRows, setChannelRows] = useState<ChannelPlanningRow[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [dashboardKpis, setDashboardKpis] = useState<DashboardKPIs | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [completedId, setCompletedId] = useState<number | null>(null);
  const [progressText, setProgressText] = useState<string>(OPTIMIZER_MESSAGES[0]);
  const [proposedSpend, setProposedSpend] = useState<Record<number, number>>({});
  const [sliderPcts, setSliderPcts] = useState<Record<number, { min: number; max: number }>>({});

  /**
   * Refreshes the saved scenarios list from the API.
   */
  const loadScenarios = useCallback(async () => {
    if (!cycleId) return;
    setLoadingScenarios(true);
    try {
      setSavedScenarios((await scenarioService.list(cycleId)).map(toSavedScenario));
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to load scenarios');
    } finally {
      setLoadingScenarios(false);
    }
  }, [cycleId]);

  useEffect(() => {
    if (!cycleId) {
      setChannelRows([]); setSavedScenarios([]); setDashboardKpis(null);
      setProposedSpend({}); setSliderPcts({});
      return;
    }
    const load = async () => {
      setLoadingChannels(true);
      try {
        const [summary, kpis] = await Promise.all([
          reportsService.modelSummary(cycleId),
          reportsService.dashboard(cycleId),
        ]);
        const rows = (summary.channel_calculations ?? []).map((c, idx) => ({
          channel_id: c.channel_id ?? idx,
          channel_name: c.channel_name ?? '',
          category: c.category ?? c.channel_name ?? '',
          current_spend: c.total_spend ?? 0,
          proposed_spend: c.total_spend ?? 0,
          current_roi: c.roi ?? 0,
          min_spend_pct: 0,
          max_spend_pct: 0,
        }));
        setChannelRows(rows);
        setDashboardKpis(kpis);
        setProposedSpend({}); setSliderPcts({});
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Failed to load cycle data');
      } finally {
        setLoadingChannels(false);
      }
      await loadScenarios();
    };
    load();
  }, [cycleId, loadScenarios]);

  /** Channel rows with current proposed spend and slider pcts merged in. */
  const planningRows = useMemo(() =>
    channelRows.map(r => ({
      ...r,
      proposed_spend: proposedSpend[r.channel_id] ?? r.current_spend,
      min_spend_pct: sliderPcts[r.channel_id]?.min ?? 0,
      max_spend_pct: sliderPcts[r.channel_id]?.max ?? 0,
    })),
    [channelRows, proposedSpend, sliderPcts],
  );

  /** Distinct sorted category names derived from loaded channel rows. */
  const availableCategories = useMemo(
    () => [...new Set(channelRows.map(r => r.category))].sort(),
    [channelRows],
  );

  const channelIdMap = useMemo(
    () => Object.fromEntries(channelRows.map(r => [r.channel_name, r.channel_id])),
    [channelRows],
  );

  // ── Polling ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!runningId) return;
    let cancelled = false;
    let msgIdx = 0;
    const msgTimer = setInterval(() => {
      msgIdx = (msgIdx + 1) % OPTIMIZER_MESSAGES.length;
      setProgressText(OPTIMIZER_MESSAGES[msgIdx]);
    }, MESSAGE_INTERVAL_MS);

    const poll = async () => {
      if (cancelled) return;
      try {
        const status = await scenarioService.getStatus(runningId);
        if (status.opt_status === 'completed') {
          clearInterval(msgTimer);
          setSavedScenarios(prev =>
            prev.map(s => s.scenario_id === runningId ? { ...s, opt_status: 'completed', is_pending: false } : s)
          );
          setCompletedId(runningId);
          setRunningId(null);
        } else if (status.opt_status === 'failed') {
          clearInterval(msgTimer);
          setSavedScenarios(prev =>
            prev.map(s => s.scenario_id === runningId ? { ...s, opt_status: 'failed', is_pending: false } : s)
          );
          setApiError('Optimization failed. Please try running again.');
          setRunningId(null);
        } else {
          if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch {
        if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    setTimeout(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(msgTimer); };
  }, [runningId]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /**
   * Updates the slider min/max pcts for a channel row.
   */
  const handleSliderChange = (channelId: number, min: number, max: number) =>
    setSliderPcts(p => ({ ...p, [channelId]: { min, max } }));

  /**
   * Resets a single channel row to its original spend and zeroes its slider.
   */
  const handleReset = (channelId: number) => {
    setProposedSpend(p => { const n = { ...p }; delete n[channelId]; return n; });
    setSliderPcts(p => { const n = { ...p }; delete n[channelId]; return n; });
  };

  /**
   * Resets all channel rows to original spend values and zeroes all sliders.
   */
  const handleResetAll = () => { setProposedSpend({}); setSliderPcts({}); };

  /**
   * Saves a new scenario via the API.
   * Appends the result to savedScenarios and returns the new scenario_id.
   * Returns null and sets apiError on failure.
   */
  const handleSaveScenario = async (params: SaveScenarioParams): Promise<number | null> => {
    try {
      const res = await scenarioService.create({
        scenario_name: params.scenarioName,
        cycle_id: params.cycleId,
        scenario_type: params.scenarioType,
        is_public: params.isPublic,
        category_constraint: params.selectedCategories.length > 0
          ? params.selectedCategories.join(',') : undefined,
        target_spend: params.scenarioType === 'Spend Based'
          ? (parseFloat(params.targetSpend) || undefined) : undefined,
        target_kpi: params.scenarioType === 'Goal Based' ? params.targetKPI : undefined,
        target_value: params.scenarioType === 'Goal Based'
          ? (parseFloat(params.targetValue) || undefined) : undefined,
        constraints: params.constraintRows.map(r => ({
          channel_id: r.channel_id,
          min_spend_pct: r.min_spend_pct,
          max_spend_pct: r.max_spend_pct,
        })),
      });
      await loadScenarios();
      return res.scenario_id;
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to save scenario');
      return null;
    }
  };

  /**
   * Triggers the optimizer for a saved scenario and starts the polling loop.
   */
  const handleRunScenario = async (scenarioId: number): Promise<void> => {
    setSavedScenarios(prev =>
      prev.map(s => s.scenario_id === scenarioId ? { ...s, opt_status: 'running', is_pending: true } : s)
    );
    setRunningId(scenarioId);
    setProgressText(OPTIMIZER_MESSAGES[0]);
    try {
      await scenarioService.run(scenarioId);
    } catch (err) {
      setRunningId(null);
      setSavedScenarios(prev =>
        prev.map(s => s.scenario_id === scenarioId ? { ...s, opt_status: 'failed', is_pending: false } : s)
      );
      setApiError(err instanceof Error ? err.message : 'Failed to start optimizer');
    }
  };

  /**
   * Updates an existing scenario's constraints via the API.
   */
  const handleUpdateScenario = async (scenarioId: number, constraints: ConstraintIn[]): Promise<void> => {
    try {
      await scenarioService.update(scenarioId, { constraints });
      await loadScenarios();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to update scenario');
    }
  };

  return {
    channelRows, planningRows, availableCategories, channelIdMap,
    savedScenarios, setSavedScenarios, dashboardKpis,
    loadingChannels, loadingScenarios, apiError,
    runningId, progressText, completedId,
    clearApiError: () => setApiError(null),
    clearCompletedId: () => setCompletedId(null),
    handleSliderChange, handleReset, handleResetAll,
    handleSaveScenario, handleRunScenario, handleUpdateScenario,
    loadScenarios,
  };
}
