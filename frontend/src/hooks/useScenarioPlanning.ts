/**
 * useScenarioPlanning.ts
 *
 * Owns all server state for the Scenario Planning screen: channel rows from the
 * cycle's model summary, saved scenarios, dashboard KPIs, proposed spend / slider
 * constraint state, scenario CRUD, and optimizer run/polling.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { reportsService, type ModelSummaryOut } from '@/services/reports.service';
import { scenarioService, type ScenarioOut } from '@/services/scenarios.service';
import { useDataFactChannels } from '@/hooks/useDataFactChannels';
import type { ChannelPlanningRow, SavedScenario, SaveScenarioParams, ConstraintPayload } from '@/utils/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 3000;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseScenarioPlanningResult {
  channelRows: ChannelPlanningRow[];
  planningRows: ChannelPlanningRow[];
  /** Constraint rows for the New Scenario modal, sourced from DATA_FACT channels.
   *  Cross-references model summary for current spend/ROI. Filter to channel_id >= 0
   *  before submitting constraints (channels without a model entry have id < 0). */
  createModalRows: ChannelPlanningRow[];
  savedScenarios: SavedScenario[];
  dashboardKpis: { total_sales: number; total_spend: number; overall_roi: number };
  availableCategories: string[];
  channelIdMap: Record<string, number>;
  loadingChannels: boolean;
  loadingScenarios: boolean;
  /** True while DATA_FACT channels are being fetched for the New Scenario modal. */
  dataFactChannelsLoading: boolean;
  /** Non-null if the DATA_FACT channel fetch failed. */
  dataFactChannelsError: string | null;
  apiError: string | null;
  runningId: number | null;
  completedId: number | null;
  clearApiError: () => void;
  clearCompletedId: () => void;
  handleSliderChange: (channelId: number, min: number, max: number) => void;
  handleReset: (channelId: number) => void;
  handleResetAll: () => void;
  handleSaveScenario: (params: SaveScenarioParams) => Promise<number | null>;
  handleRunScenario: (scenarioId: number) => Promise<void>;
  handleUpdateScenario: (scenarioId: number, constraints: ConstraintPayload[]) => Promise<void>;
  loadScenarios: () => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toChannelRows(summary: ModelSummaryOut): ChannelPlanningRow[] {
  return (summary.channel_calculations ?? []).map((c, idx) => ({
    channel_id: c.channel_id ?? idx,
    channel_name: c.channel_name ?? '',
    category: c.channel_name ?? '',
    current_spend: c.total_spend ?? 0,
    proposed_spend: c.total_spend ?? 0,
    current_roi: c.roi ?? 0,
    min_spend_pct: 0,
    max_spend_pct: 0,
  }));
}

function toSavedScenario(s: ScenarioOut): SavedScenario {
  return {
    scenario_id: s.scenario_id,
    scenario_name: s.scenario_name,
    cycle_id: s.cycle_id,
    scenario_type: s.scenario_type,
    is_public: s.is_public,
    opt_status: s.is_pending ? 'pending' : 'completed',
    is_pending: s.is_pending,
    category_constraint: s.category_constraint,
    target_spend: s.target_spend,
    target_kpi: s.target_kpi,
    target_value: s.target_value,
    created_at: s.created_at,
    constraints: s.constraints.map((c) => ({ channel_id: c.channel_id, min_spend_pct: c.min_spend_pct, max_spend_pct: c.max_spend_pct })),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useScenarioPlanning
 *
 * @param {string | null} cycleId - Active cycle; null until the page selects one.
 * @returns {UseScenarioPlanningResult}
 */
export function useScenarioPlanning(cycleId: string | null): UseScenarioPlanningResult {
  const [channelRows, setChannelRows] = useState<ChannelPlanningRow[]>([]);
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>([]);
  const [dashboardKpis, setDashboardKpis] = useState({ total_sales: 0, total_spend: 0, overall_roi: 0 });
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [runningId, setRunningId] = useState<number | null>(null);
  const [completedId, setCompletedId] = useState<number | null>(null);
  const [proposedSpend, setProposedSpend] = useState<Record<number, number>>({});
  const [sliderPcts, setSliderPcts] = useState<Record<number, { min: number; max: number }>>({});
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      setChannelRows([]); setSavedScenarios([]);
      setDashboardKpis({ total_sales: 0, total_spend: 0, overall_roi: 0 });
      setProposedSpend({}); setSliderPcts({});
      return;
    }
    const load = async () => {
      setLoadingChannels(true);
      try {
        const [summary, kpis] = await Promise.all([reportsService.modelSummary(cycleId), reportsService.dashboard(cycleId)]);
        setChannelRows(toChannelRows(summary));
        setDashboardKpis({ total_sales: kpis.total_sales, total_spend: kpis.total_spend, overall_roi: kpis.overall_roi });
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

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const planningRows: ChannelPlanningRow[] = channelRows.map((r) => ({
    ...r,
    proposed_spend: proposedSpend[r.channel_id] ?? r.current_spend,
    min_spend_pct: sliderPcts[r.channel_id]?.min ?? 0,
    max_spend_pct: sliderPcts[r.channel_id]?.max ?? 0,
  }));

  const availableCategories = [...new Set(channelRows.map((r) => r.category))].sort();
  const channelIdMap: Record<string, number> = Object.fromEntries(channelRows.map((r) => [r.channel_name, r.channel_id]));

  // DATA_FACT channels for the New Scenario modal — authoritative list of channels
  // that have actual uploaded raw data for this cycle.
  const { channels: dataFactChannels, channelsLoading: dataFactChannelsLoading, channelsError: dataFactChannelsError } = useDataFactChannels(cycleId);

  // Constraint rows for the create modal: DATA_FACT channels cross-referenced with model
  // summary rows to provide current spend/ROI display values. Channels that have no model
  // summary entry receive a negative sentinel ID and are filtered out before submission.
  const createModalRows: ChannelPlanningRow[] = useMemo(() =>
    dataFactChannels.map((channel, idx) => {
      const modelRow = channelRows.find((r) => r.channel_name === channel);
      const cid = modelRow?.channel_id ?? (-(idx + 1));
      return {
        channel_id: cid,
        channel_name: channel,
        category: modelRow?.category ?? channel,
        current_spend: modelRow?.current_spend ?? 0,
        proposed_spend: proposedSpend[cid] ?? (modelRow?.current_spend ?? 0),
        current_roi: modelRow?.current_roi ?? 0,
        min_spend_pct: sliderPcts[cid]?.min ?? 0,
        max_spend_pct: sliderPcts[cid]?.max ?? 0,
      };
    }),
    [dataFactChannels, channelRows, proposedSpend, sliderPcts],
  );

  const handleSliderChange = (id: number, min: number, max: number) =>
    setSliderPcts((p) => ({ ...p, [id]: { min, max } }));

  const handleReset = (id: number) => {
    setProposedSpend((p) => { const n = { ...p }; delete n[id]; return n; });
    setSliderPcts((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  const handleResetAll = () => { setProposedSpend({}); setSliderPcts({}); };

  const handleSaveScenario = async (params: SaveScenarioParams): Promise<number | null> => {
    try {
      const res = await scenarioService.create({
        scenario_name: params.name,
        cycle_id: cycleId ?? undefined,
        scenario_type: params.scenario_type,
        is_public: params.is_public,
        category_constraint: params.category_constraint,
        target_spend: params.target_spend,
        target_kpi: params.target_kpi,
        target_value: params.target_value,
        constraints: params.constraints,
      });
      await loadScenarios();
      return res.scenario_id;
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to save scenario');
      return null;
    }
  };

  const handleRunScenario = async (scenarioId: number): Promise<void> => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setRunningId(scenarioId);
    try {
      await scenarioService.run(scenarioId);
      const poll = async () => {
        try {
          const sc = await scenarioService.get(scenarioId);
          if (!sc.is_pending) { setRunningId(null); setCompletedId(scenarioId); await loadScenarios(); }
          else { pollRef.current = setTimeout(poll, POLL_INTERVAL); }
        } catch { setRunningId(null); setApiError('Optimizer status check failed'); }
      };
      pollRef.current = setTimeout(poll, POLL_INTERVAL);
    } catch (err) {
      setRunningId(null);
      setApiError(err instanceof Error ? err.message : 'Failed to run optimizer');
    }
  };

  const handleUpdateScenario = async (id: number, constraints: ConstraintPayload[]): Promise<void> => {
    try {
      await scenarioService.update(id, { constraints });
      await loadScenarios();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to update scenario');
    }
  };

  return {
    channelRows, planningRows, createModalRows, savedScenarios, dashboardKpis,
    availableCategories, channelIdMap,
    loadingChannels, loadingScenarios,
    dataFactChannelsLoading, dataFactChannelsError,
    apiError, runningId, completedId,
    clearApiError: () => setApiError(null),
    clearCompletedId: () => setCompletedId(null),
    handleSliderChange, handleReset, handleResetAll,
    handleSaveScenario, handleRunScenario, handleUpdateScenario, loadScenarios,
  };
}
