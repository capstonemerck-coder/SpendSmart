// ============================================================================
// Data Input — Cycles
// ============================================================================

export interface CycleSummary {
  cycle_id: string;
  description: string | null;
  is_active: boolean | null;
  created_by: number | null;
  created_at: string;
  updated_at: string | null;
  metadata_id: number | null;
  target_variable: string | null;
}

export interface CycleCreatePayload {
  cycle_id: string;
  description?: string;
}

// ============================================================================
// Data Input — Uploads
// ============================================================================

/** Status values used by the Upload model. */
export type UploadStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface SubchannelParam {
  subchannel_name: string;
  roi_coefficient: number;
  min_spend: number;
  max_spend: number;
}

export interface ChannelParam {
  channel_name: string;
  roi_coefficient: number;
  min_spend: number;
  max_spend: number;
  subchannels: SubchannelParam[];
}

/** Returned by POST /uploads/parse — preview before committing. */
export interface UploadPreview {
  upload_record_id: number;
  cycle_id: string;
  row_count: number;
  channels: ChannelParam[];
}

/** Single upload record from GET /uploads or GET /uploads/:id. */
export interface UploadRecordSummary {
  upload_id: number;
  cycle_id: string | null;
  is_datafile: boolean;
  upload_type: string | null;
  filename: string | null;
  file_size_bytes: number | null;
  row_count: number | null;
  status: string;
  error_message: string | null;
  uploaded_at: string;
  uploader_name: string | null;
}

export interface UploadHistoryParams {
  cycle_id?: string;
  status?: string;
  upload_type?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedUploadHistory {
  records: UploadRecordSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** Error detail in upload response. */
export interface UploadError {
  field: string;
  message: string;
  row: number | null;
}

/** Response from POST /uploads/data-fact or POST /uploads/model-fact. */
export interface UploadResponse {
  upload_id: number;
  cycle_id: string | null;
  is_datafile: boolean;
  filename: string;
  row_count: number;
  status: 'success' | 'failed' | 'processing';
  errors: UploadError[];
  warnings: string[];
  message: string;
}

/** History row for upload history drawer — extended from UploadRecordSummary. */
export interface UploadHistoryRow extends UploadRecordSummary {
  // Additional computed or UI-specific fields can be added here if needed
}

/** Props for DataInput component. */
export interface DataInputProps {
  // Intentionally minimal — DataInput.tsx owns most of its internal state
  // This can be extended if parent provides initial cycle or metadata context
}

/** MetaData row for cascading filters (Market, Brand, Indication). */
export interface MetaData {
  metadata_id: number;
  region: string | null;
  market: string | null;
  currency: string | null;
  therapeutic_area: string | null;
  brand: string | null;
  indication: string | null;
}

// ── Model Summary ────────────────────────────────────────────────────────────

/** Category-level aggregation row — used for the bar chart and KPI cards. */
export interface ModelChannelCalc {
  cycle_id: string;
  /** Positional index used as a stable key; not a real DB channel_id. */
  channel_id: number;
  /** Category name doubles as channel_name at this aggregation level. */
  channel_name?: string;
  category?: string;
  total_sales?: number;
  total_spend?: number;
  impactable_sales?: number;
  roi?: number;
}

/** Channel-level aggregation (depth=1) — used for the ROI by Channel list. */
export interface ChannelLevelCalc {
  channel_name: string;
  category: string;
  total_sales: number;
  total_spend: number;
  impactable_sales: number;
  roi: number;
}

/** Subchannel-level row (depth=2) — used for the scatter chart. */
export interface SubchannelLevelCalc {
  subchannel_name: string;
  channel_name: string;
  category: string;
  total_sales: number;
  total_spend: number;
  impactable_sales: number;
  roi: number;
  saturation_pct?: number | null;
}

/**
 * Full model summary response, normalized from GET /reports/model-summary.
 * channel_calculations, channel_level, and subchannel_level are derived from
 * the flat subchannel rows returned by the API and aggregated in the service.
 */
export interface ModelSummaryData {
  cycle_id: string;
  total_sales: number;
  total_spend: number;
  overall_roi: number;
  base_sales: number;
  incremental_sales: number;
  base_pct: number;
  incremental_pct: number;
  /** Category-level aggregations — used for SpendVsSalesBarChart. */
  channel_calculations: ModelChannelCalc[];
  /** Channel-level aggregations — used for ChannelRoiList. */
  channel_level: ChannelLevelCalc[];
  /** Subchannel-level rows — used for SubchannelScatterChart and the table. */
  subchannel_level: SubchannelLevelCalc[];
}

/** Autocomplete result row for the channel contribution detail table search. */
export interface ChannelSearchResult {
  label: string;
  sub?: string;
  catKey: string;
  chKey?: string;
  type: 'category' | 'channel' | 'subchannel';
}

// ── Data History ──────────────────────────────────────────────────────────────

export interface DataHistoryKPI {
  cycle_id: string;
  total_sales: number;
  total_spend: number;
  total_reach: number;
}

export interface SpendTrendPoint { date: string; spend: number; }
export interface RevenueTrendPoint { date: string; revenue: number; }

export interface ChannelBreakdownRow {
  channel: string;
  spend: number;
  reach: number;
  ratio: number;
}

export interface DataFactRow {
  id: number;
  cycle_id: string;
  date: string | null;
  category: string | null;
  channel: string | null;
  sub_channel: string | null;
  variable: string | null;
  spend: number | null;
  reach: number | null;
  value: number | null;
  upload_id: number | null;
}

export interface DataHistoryParams {
  page: number;
  pageSize: number;
}

export interface DataHistoryPage {
  total: number;
  page: number;
  pageSize: number;
  rows: DataFactRow[];
}

// ============================================================================
// Scenario types (legacy frontend-only — kept for backward compat)
// ============================================================================

export interface Constraint {
  channel: string;
  subChannel: string;
  roi: string;
  currentSpend: string;
  minSpendPercent: number;
  maxSpendPercent: number;
}

export interface Scenario {
  id: string;
  name: string;
  type: string;
  status: string;
  constraints: Constraint[];
  categoryConstraint: string;
  isPublic?: boolean;
  targetSpend?: string;
  targetKPI?: string;
  targetValue?: string;
}

// ── Scenario Planning (API-backed) ───────────────────────────────────────────

/** A single channel row in the scenario planning table, derived from model summary. */
export interface ChannelPlanningRow {
  channel_id: number;
  channel_name: string;
  subchannel_name?: string;
  category: string;
  current_spend: number;
  proposed_spend: number;
  current_roi: number;
  /** Slider min value: percentage change allowed (-100 to 0). */
  min_spend_pct: number;
  /** Slider max value: percentage change allowed (0 to +100). */
  max_spend_pct: number;
}

/** A scenario record as returned by the API and normalized by the service. */
export interface SavedScenario {
  scenario_id: number;
  scenario_name: string;
  cycle_id?: string;
  scenario_type: string;
  is_public: boolean;
  /** Derived from is_pending: 'pending' | 'completed'. */
  opt_status: string;
  is_pending: boolean;
  category_constraint?: string;
  target_spend?: number;
  target_kpi?: string;
  target_value?: number;
  created_at: string;
  constraints: Array<{ channel_id: number; min_spend_pct: number; max_spend_pct: number }>;
}

/** Optimizer run status for a single scenario. */
export interface OptimizerStatus {
  scenario_id: number;
  opt_status: 'draft' | 'running' | 'completed' | 'failed';
  is_pending: boolean;
  error_message?: string;
}

/** Parameters passed from the page to useScenarioPlanning.handleSaveScenario. */
export interface SaveScenarioParams {
  name: string;
  scenario_type: 'Spend Based' | 'Goal Based';
  is_public: boolean;
  category_constraint?: string;
  target_spend?: number;
  target_kpi?: string;
  target_value?: number;
  constraints: ConstraintPayload[];
}

/** Channel-level constraint payload for creating or updating a scenario. */
export interface ConstraintPayload {
  channel_id: number;
  min_spend_pct: number;
  max_spend_pct: number;
}

// ============================================================================
// Auth & RBAC types
// ============================================================================

export type Role =
  | 'admin'
  | 'data scientist'
  | 'brand intelligence analyst'
  | 'leadership';

/**
 * All possible screens / modules in the app.
 * Mirrors the `Tab` union from NavBar.tsx so permissions and tabs stay aligned.
 */
export type ScreenPermission =
  | 'DATA INPUT'
  | 'DATA HISTORY'
  | 'MODEL SUMMARY'
  | 'SCENARIO PLANNING'
  | 'SCENARIO OUTCOME'
  | 'SCENARIO COMPARISONS';

export const ALL_SCREENS: ScreenPermission[] = [
  'DATA INPUT',
  'DATA HISTORY',
  'MODEL SUMMARY',
  'SCENARIO PLANNING',
  'SCENARIO OUTCOME',
  'SCENARIO COMPARISONS',
];

/**
 * User record returned by GET /api/v1/users and GET /api/v1/auth/me.
 * Field names match the backend UserOut schema exactly.
 */
export interface User {
  user_id: number;
  username: string;
  full_name: string | null;
  email: string | null;
  region: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  permissions: string[];
}
