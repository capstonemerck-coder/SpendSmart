/**
 * Scenarios API service.
 * Wraps /scenarios/* endpoints.
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
  list: (cycleId?: string) =>
    api.get<ScenarioOut[]>(`/scenarios${cycleId ? `?cycle_id=${cycleId}` : ''}`),

  get: (id: number) => api.get<ScenarioOut>(`/scenarios/${id}`),

  create: (body: ScenarioCreate) => api.post<ScenarioOut>('/scenarios', body),

  update: (id: number, body: Partial<ScenarioCreate>) =>
    api.patch<ScenarioOut>(`/scenarios/${id}`, body),

  delete: (id: number) => api.delete(`/scenarios/${id}`),

  run: (id: number) =>
    api.post<{ status: string; converged: boolean; outcome: Record<string, number> }>(
      `/scenarios/${id}/run`,
    ),

  getOutcome: (id: number) => api.get<ScenarioOutcomeOut>(`/scenarios/${id}/outcome`),
};
