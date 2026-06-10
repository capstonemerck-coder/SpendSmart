/**
 * scenarios.service.ts
 *
 * Handles all API communication for the Scenario Planning module.
 * Covers listing, creating, updating, deleting, running, and fetching
 * outcomes for optimization scenarios. All methods return typed responses
 * exactly as the backend sends them — normalization happens in the hook.
 */
import { api } from './api-client';

export interface ConstraintIn {
  channel_id: number;
  min_spend_pct: number;
  max_spend_pct: number;
}

export interface ScenarioCreate {
  scenario_name: string;
  cycle_id?: string;
  scenario_type: 'Spend Based' | 'Goal Based';
  is_public?: boolean;
  category_constraint?: string;
  target_spend?: number;
  target_kpi?: string;
  target_value?: number;
  constraints?: ConstraintIn[];
}

/** Partial update payload — all fields optional. */
export type ScenarioUpdate = Partial<ScenarioCreate>;

export interface ScenarioOut {
  scenario_id: number;
  scenario_name: string;
  cycle_id?: string;
  scenario_type: string;
  is_public: boolean;
  target_spend?: number;
  target_kpi?: string;
  target_value?: number;
  is_pending: boolean;
  category_constraint?: string;
  created_at: string;
  updated_at: string;
  constraints: ConstraintIn[];
}

export interface ScenarioOutcomeOut {
  scenario_id: number;
  scenario_name?: string;
  scenario_type?: string;
  total_sales?: number;
  total_spend?: number;
  impactable_sales?: number;
  roi?: number;
  mroi?: number;
  channel_results: Array<{
    channel_id: number;
    channel_name?: string;
    optimized_spend?: number;
    impactable_sales?: number;
    roi?: number;
    mroi?: number;
  }>;
}

export const scenarioService = {
  /**
   * Lists all scenarios, optionally filtered to a specific cycle.
   *
   * @param {string} [cycleId] - Cycle to scope the list to.
   * @returns {Promise<ScenarioOut[]>} All matching scenario records.
   * @throws Will throw if the API request fails.
   */
  list: (cycleId?: string) =>
    api.get<ScenarioOut[]>(`/scenarios${cycleId ? `?cycle_id=${cycleId}` : ''}`),

  /**
   * Fetches a single scenario by ID, including its constraints.
   *
   * @param {number} id - Scenario primary key.
   * @returns {Promise<ScenarioOut>} The scenario record.
   * @throws Will throw if the scenario does not exist or the request fails.
   */
  get: (id: number) => api.get<ScenarioOut>(`/scenarios/${id}`),

  /**
   * Creates a new scenario with optional channel constraints.
   *
   * @param {ScenarioCreate} body - Scenario definition including constraints.
   * @returns {Promise<ScenarioOut>} The persisted scenario record.
   * @throws Will throw if validation fails or the API request fails.
   */
  create: (body: ScenarioCreate) => api.post<ScenarioOut>('/scenarios', body),

  /**
   * Partially updates an existing scenario (name, visibility, constraints, etc.).
   *
   * @param {number} id - Scenario primary key.
   * @param {ScenarioUpdate} body - Fields to update — all optional.
   * @returns {Promise<ScenarioOut>} The updated scenario record.
   * @throws Will throw if the scenario does not exist or the request fails.
   */
  update: (id: number, body: ScenarioUpdate) =>
    api.patch<ScenarioOut>(`/scenarios/${id}`, body),

  /**
   * Deletes a scenario and all associated constraints and outcomes.
   *
   * @param {number} id - Scenario primary key.
   * @returns {Promise<void>}
   * @throws Will throw if the scenario does not exist or the request fails.
   */
  delete: (id: number) => api.delete(`/scenarios/${id}`),

  /**
   * Submits a scenario to the optimizer. The call is synchronous — the
   * optimizer runs in-process and returns once complete. Poll GET /scenarios/{id}
   * to track is_pending → false.
   *
   * @param {number} id - Scenario primary key.
   * @returns {Promise<{ status: string; converged: boolean; outcome: Record<string, number> }>}
   * @throws Will throw if the optimizer fails or the API request fails.
   */
  run: (id: number) =>
    api.post<{ status: string; converged: boolean; outcome: Record<string, number> }>(
      `/scenarios/${id}/run`,
    ),

  /**
   * Fetches the optimizer outcome for a completed scenario.
   * Only call after is_pending is false.
   *
   * @param {number} id - Scenario primary key.
   * @returns {Promise<ScenarioOutcomeOut>} Optimized channel allocations and KPIs.
   * @throws Will throw if no outcome exists or the API request fails.
   */
  getOutcome: (id: number) => api.get<ScenarioOutcomeOut>(`/scenarios/${id}/outcome`),
};
