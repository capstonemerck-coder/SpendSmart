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

// ─── Model Summary ────────────────────────────────────────────────────────────

/** Per-subchannel row returned by GET /reports/model-summary. */
export interface SubChannelSummary {
  channel: string;
  subChannel: string;
  roiCoefficient: number;
  /**
   * Actual spend from DATA_FACT (sum over cycle for this channel/subchannel).
   * Falls back to SubchannelParameter.min_spend when no DATA_FACT rows exist.
   */
  currentSpend: number;
  minSpend: number;
  maxSpend: number;
}

/** Normalized response from GET /reports/model-summary. */
export interface ModelSummaryData {
  baselineKpi: number;
  channels: SubChannelSummary[];
  cycleId: string;
  uploadedAt: string;
  /** Sum of currentSpend across all subchannels. */
  totalSpend: number;
  /** totalIncrementalSales + totalBaseSales. */
  totalSales: number;
  /** totalIncrementalSales / totalSpend; 0 when totalSpend is 0. */
  overallRoi: number;
  /** Sum of SubchannelParameter.base_sales; 0 when not from MODEL_FACT. */
  totalBaseSales: number;
  /** Sum of (currentSpend × roiCoefficient) — same value as baselineKpi. */
  totalIncrementalSales: number;
  /** totalBaseSales / totalSales × 100; 0 when totalSales is 0. */
  basePct: number;
  /** totalIncrementalSales / totalSales × 100; 100 when totalSales is 0. */
  incrementalPct: number;
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
// Scenario types
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
