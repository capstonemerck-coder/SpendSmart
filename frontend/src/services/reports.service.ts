/**
 * reports.service.ts
 *
 * Handles all API communication for the Reporting module.
 * Covers model summary (channel parameter based), data history, dashboard KPIs,
 * metadata fetching, data-fact variable discovery, and all Data History screen
 * endpoints (cycle listing, KPI summary, spend/revenue trends, channel breakdown).
 * All responses are typed and normalized to camelCase before being returned to hooks.
 */
import { api } from './api-client';
import type {
  MetaData,
  ModelSummaryData,
  DataHistoryKPI,
  SpendTrendPoint,
  RevenueTrendPoint,
  ChannelBreakdownRow,
  DataHistoryParams,
  DataHistoryPage,
} from '../utils/types';

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
  /**
   * Fetches model summary data for the given market, brand, and indication.
   *
   * Calls GET /reports/model-summary with the three filter query params.
   * Normalizes the API's snake_case subchannel fields to camelCase before
   * returning. Returns null when the API signals no data exists for the filters.
   *
   * @param {string} market - Market name from META_DATA.
   * @param {string} brand - Brand name from META_DATA.
   * @param {string} indication - Indication name from META_DATA.
   * @returns {Promise<ModelSummaryData | null>} Normalized summary or null.
   * @throws Will throw if the API request fails.
   */
  fetchModelSummary: async (
    market: string,
    brand: string,
    indication: string,
  ): Promise<ModelSummaryData | null> => {
    const qs = new URLSearchParams({ market, brand, indication });
    const envelope = await api.get<{
      success: boolean;
      data: {
        baseline_kpi: number;
        channels: Array<{
          channel: string;
          sub_channel: string;
          roi_coefficient: number;
          current_spend: number;
          min_spend: number;
          max_spend: number;
        }>;
        cycle_id: string;
        uploaded_at: string;
        total_spend: number;
        total_sales: number;
        overall_roi: number;
        total_base_sales: number;
        total_incremental_sales: number;
        base_pct: number;
        incremental_pct: number;
      } | null;
      message: string;
    }>(`/reports/model-summary?${qs}`);

    if (!envelope.data) return null;

    return {
      baselineKpi: envelope.data.baseline_kpi,
      channels: envelope.data.channels.map((ch) => ({
        channel: ch.channel,
        subChannel: ch.sub_channel,
        roiCoefficient: ch.roi_coefficient,
        currentSpend: ch.current_spend,
        minSpend: ch.min_spend,
        maxSpend: ch.max_spend,
      })),
      cycleId: envelope.data.cycle_id,
      uploadedAt: envelope.data.uploaded_at,
      totalSpend: envelope.data.total_spend,
      totalSales: envelope.data.total_sales,
      overallRoi: envelope.data.overall_roi,
      totalBaseSales: envelope.data.total_base_sales,
      totalIncrementalSales: envelope.data.total_incremental_sales,
      basePct: envelope.data.base_pct,
      incrementalPct: envelope.data.incremental_pct,
    };
  },

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

  /**
   * Fetch available cycle IDs, most recent first.
   * Used to populate the cycle selector on the Data History screen.
   *
   * @param {number | null} metadataId - Optional metadata context filter.
   * @returns {Promise<string[]>} Ordered list of cycle ID strings.
   * @throws Will throw if the API request fails.
   */
  fetchAvailableCycles: (metadataId: number | null = null): Promise<string[]> => {
    const qs = metadataId != null ? `?metadata_id=${metadataId}` : '';
    return api.get<string[]>(`/reports/cycles${qs}`);
  },

  /**
   * Fetch KPI summary (total sales, spend, reach) for a cycle.
   *
   * @param {string} cycleId - The cycle to summarize.
   * @returns {Promise<DataHistoryKPI>} Aggregated KPI totals.
   * @throws Will throw if the API request fails.
   */
  fetchKPISummary: (cycleId: string): Promise<DataHistoryKPI> =>
    api.get<DataHistoryKPI>(`/reports/kpi-summary/${cycleId}`),

  /**
   * Fetch daily spend trend data for a cycle.
   * Each point represents total spend across all channels for that date.
   *
   * @param {string} cycleId - The cycle to fetch trend for.
   * @returns {Promise<SpendTrendPoint[]>} Chronologically ordered spend points.
   * @throws Will throw if the API request fails.
   */
  fetchSpendTrend: (cycleId: string): Promise<SpendTrendPoint[]> =>
    api.get<SpendTrendPoint[]>(`/reports/spend-trend/${cycleId}`),

  /**
   * Fetch daily revenue trend data for a cycle.
   * Each point represents total value (sales) across all channels for that date.
   *
   * @param {string} cycleId - The cycle to fetch trend for.
   * @returns {Promise<RevenueTrendPoint[]>} Chronologically ordered revenue points.
   * @throws Will throw if the API request fails.
   */
  fetchRevenueTrend: (cycleId: string): Promise<RevenueTrendPoint[]> =>
    api.get<RevenueTrendPoint[]>(`/reports/revenue-trend/${cycleId}`),

  /**
   * Fetch channel spend vs reach breakdown for a cycle.
   * Returns rows sorted by efficiency ratio (reach/spend) descending.
   *
   * @param {string} cycleId - The cycle to analyze.
   * @returns {Promise<ChannelBreakdownRow[]>} Per-channel breakdown sorted by ratio desc.
   * @throws Will throw if the API request fails.
   */
  fetchChannelBreakdown: (cycleId: string): Promise<ChannelBreakdownRow[]> =>
    api.get<ChannelBreakdownRow[]>(`/reports/channel-breakdown/${cycleId}`),

  /**
   * Fetch paginated DATA_FACT rows for a cycle.
   * Normalizes the API's snake_case pagination keys to camelCase.
   *
   * @param {string} cycleId - The cycle to query.
   * @param {DataHistoryParams} params - Pagination parameters (page, pageSize).
   * @returns {Promise<DataHistoryPage>} Paginated result with normalized row array.
   * @throws Will throw if the API request fails.
   */
  fetchDataHistory: (cycleId: string, params: DataHistoryParams): Promise<DataHistoryPage> => {
    const qs = new URLSearchParams({
      page: String(params.page),
      page_size: String(params.pageSize),
    });
    return api
      .get<{ total: number; page: number; page_size: number; items: any[] }>(
        `/reports/data-history/${cycleId}?${qs}`,
      )
      .then((raw) => ({
        total: raw.total,
        page: raw.page,
        pageSize: raw.page_size,
        rows: raw.items,
      }));
  },
};
