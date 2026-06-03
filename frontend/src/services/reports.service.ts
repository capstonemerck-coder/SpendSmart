/**
 * reports.service.ts
 *
 * Handles all API communication for the Reporting module.
 * Covers model summary, data history, dashboard KPIs, metadata fetching,
 * and data-fact variable discovery.
 * All responses are typed through the interfaces below.
 */
import { api } from './api-client';
import { MetaData } from '../utils/types';

export interface ModelSummaryOut {
  cycle_id: string;
  total_sales: number;
  total_spend: number;
  overall_roi: number;
  base_sales: number;
  incremental_sales: number;
  base_pct: number;
  incremental_pct: number;
  channel_calculations: Array<{
    cycle_id: string;
    channel_id: number;
    channel_name?: string;
    total_sales?: number;
    total_spend?: number;
    impactable_sales?: number;
    roi?: number;
  }>;
}

export interface DataFactRow {
  id: number;
  cycle_id: string;
  date?: string;
  category?: string;
  channel?: string;
  sub_channel?: string;
  variable?: string;
  spend?: number;
  reach?: number;
  value?: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export interface DashboardKPIs {
  total_sales: number;
  total_spend: number;
  overall_roi: number;
  scenario_count: number;
  upload_count: number;
  active_cycle_id?: string;
}

export const reportsService = {
  modelSummary: (cycleId: string) =>
    api.get<ModelSummaryOut>(`/reports/model-summary/${cycleId}`),

  dataHistory: (
    cycleId: string,
    params?: { channel?: string; category?: string; page?: number; page_size?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.channel) qs.append('channel', params.channel);
    if (params?.category) qs.append('category', params.category);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.page_size) qs.append('page_size', String(params.page_size));
    const query = qs.toString();
    return api.get<PaginatedResponse<DataFactRow>>(
      `/reports/data-history/${cycleId}${query ? `?${query}` : ''}`,
    );
  },

  dashboard: (cycleId?: string) =>
    api.get<DashboardKPIs>(`/reports/dashboard${cycleId ? `?cycle_id=${cycleId}` : ''}`),

  /**
   * Fetch all MetaData rows for cascading filter dropdowns (Market, Brand, Indication).
   * Frontend derives filtering logic from this flat list.
   *
   * @returns {Promise<MetaData[]>} Array of all metadata rows.
   * @throws Will throw if the API request fails.
   */
  metadata: () => api.get<MetaData[]>('/reports/metadata'),

  /**
   * Fetch distinct variable values from DATA_FACT for a given cycle.
   * Used to populate the searchable variable grid on the Target Variable selection screen.
   *
   * @param {string} cycleId - The cycle for which to fetch variables.
   * @returns {Promise<string[]>} Sorted array of distinct variable names.
   * @throws Will throw if the API request fails.
   */
  dataFactVariables: (cycleId: string) =>
    api.get<string[]>(`/reports/data-fact-variables/${cycleId}`),
};
