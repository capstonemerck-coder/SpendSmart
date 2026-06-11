/**
 * scenarios.service.ts
 *
 * Handles all API communication for the Scenario Planning module.
 * Covers listing, creating, updating, deleting, running, and polling scenarios.
 * All types are defined in utils/types.ts.
 */
import { api } from './api-client';
import type {
  ScenarioOut,
  ScenarioCreate,
  ScenarioUpdate,
  ScenarioOutcomeOut,
} from '@/utils/types';

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
   * Polls optimization status for a scenario.
   * opt_status: draft | running | completed | failed
   *
   * @param {number} id - Scenario primary key.
   * @returns {Promise<{ scenario_id, opt_status, is_pending, error_message? }>}
   * @throws Will throw if the API request fails.
   */
  getStatus: (id: number) =>
    api.get<{ scenario_id: number; opt_status: string; is_pending: boolean; error_message?: string }>(
      `/scenarios/${id}/status`,
    ),

  /**
   * Submits a scenario to the optimizer.
   *
   * @param {number} id - Scenario primary key.
   * @returns {Promise<{ status, scenario_id, message }>}
   * @throws Will throw if the optimizer fails or the API request fails.
   */
  run: (id: number) =>
    api.post<{ status: string; scenario_id: number; message: string }>(
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
