/**
 * upload.service.ts
 *
 * Handles all API communication for the Data Input module.
 * Covers cycle management, channel parameter file parsing (preview),
 * upload commit, paginated upload history, and upload deletion.
 * Also exposes the legacy DATA_FACT / MODEL_FACT upload methods.
 *
 * All responses are normalized to typed frontend models before being returned.
 */
import { api } from './api-client';
import type {
  CycleCreatePayload,
  CycleSummary,
  PaginatedUploadHistory,
  UploadHistoryParams,
  UploadHistoryRow,
  UploadPreview,
  UploadRecordSummary,
  UploadResponse,
} from '@/utils/types';

// ── Cycle management ─────────────────────────────────────────────────────────

/**
 * Fetches all planning cycles ordered by creation date descending.
 *
 * @returns {Promise<CycleSummary[]>} Full list of planning cycles.
 * @throws Will throw ApiError if the request fails.
 */
export const fetchAllCycles = (): Promise<CycleSummary[]> =>
  api.get<CycleSummary[]>('/cycles');

/**
 * Creates a new planning cycle.
 *
 * @param {CycleCreatePayload} payload - cycle_id (required) and optional description.
 * @returns {Promise<CycleSummary>} The newly created cycle.
 * @throws Will throw ApiError on validation failure (422) or conflict (409).
 */
export const createCycle = (payload: CycleCreatePayload): Promise<CycleSummary> =>
  api.post<CycleSummary>('/cycles', payload);

// ── Channel parameter parse / commit ─────────────────────────────────────────

/**
 * Sends a channel parameter file to the parse endpoint.
 *
 * The file is sent as multipart/form-data with the cycle_id.
 * Returns a structured preview of the parsed channels and subchannels.
 * The data is NOT active until commitUpload is called.
 *
 * @param {string} cycleId - Identifier of the planning cycle for this upload.
 * @param {File}   file    - The CSV or XLSX file to parse.
 * @returns {Promise<UploadPreview>} Parsed channel hierarchy plus upload_record_id.
 * @throws Will throw ApiError on validation failure (422) or if cycle not found (404).
 */
export const parseUploadFile = (cycleId: string, file: File): Promise<UploadPreview> => {
  const form = new FormData();
  form.append('file', file);
  form.append('cycle_id', cycleId);
  return api.postForm<UploadPreview>('/uploads/parse', form);
};

/**
 * Commits a parsed (pending) upload, making its channel parameters active.
 *
 * @param {number} uploadRecordId - ID returned from parseUploadFile.
 * @param {string} cycleId        - Cycle identifier (used for the request body).
 * @returns {Promise<UploadRecordSummary>} The committed upload record.
 * @throws Will throw ApiError if the record is not found or not in pending state.
 */
export const commitUpload = (
  uploadRecordId: number,
  cycleId: string,
): Promise<UploadRecordSummary> =>
  api.post<UploadRecordSummary>('/uploads/commit', {
    upload_record_id: uploadRecordId,
    cycle_id: cycleId,
  });

// ── Upload history ────────────────────────────────────────────────────────────

/**
 * Fetches paginated upload history with optional filters.
 *
 * @param {UploadHistoryParams} params - Optional cycle_id, status, upload_type, page, page_size.
 * @returns {Promise<PaginatedUploadHistory>} Paginated list of upload records.
 * @throws Will throw ApiError if the request fails.
 */
export const fetchUploadHistory = (
  params: UploadHistoryParams = {},
): Promise<PaginatedUploadHistory> => {
  const qs = new URLSearchParams();
  if (params.cycle_id) qs.set('cycle_id', params.cycle_id);
  if (params.status) qs.set('status', params.status);
  if (params.upload_type) qs.set('upload_type', params.upload_type);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.page_size != null) qs.set('page_size', String(params.page_size));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return api.get<PaginatedUploadHistory>(`/uploads${suffix}`);
};

/**
 * Deletes an upload record (Admin only).
 *
 * @param {number} uploadRecordId - ID of the upload record to delete.
 * @returns {Promise<void>}
 * @throws Will throw ApiError if not found (404) or unauthorized (403).
 */
export const deleteUploadRecord = (uploadRecordId: number): Promise<void> =>
  api.delete<void>(`/uploads/${uploadRecordId}`);

// ── Legacy DATA_FACT / MODEL_FACT uploads ─────────────────────────────────────

/**
 * Uploads a DATA_FACT CSV or XLSX file directly.
 *
 * @param {File}            file       - The file to upload.
 * @param {string}          cycleId    - Optional cycle identifier.
 * @param {number}          metadataId - Optional metadata ID for Market/Brand/Indication context.
 * @returns {Promise<UploadResponse>} Upload result with row count and any errors.
 */
export const uploadDataFact = (
  file: File,
  cycleId?: string,
  metadataId?: number,
): Promise<UploadResponse> => {
  const form = new FormData();
  form.append('file', file);
  if (cycleId) form.append('cycle_id', cycleId);
  if (metadataId) form.append('metadata_id', String(metadataId));
  return api.postForm<UploadResponse>('/uploads/data-fact', form);
};

/**
 * Uploads a MODEL_FACT CSV or XLSX file directly.
 *
 * @param {File}            file           - The file to upload.
 * @param {string}          cycleId        - Optional cycle identifier.
 * @param {string}          targetVariable - Optional target variable override.
 * @param {number}          metadataId     - Optional metadata ID for Market/Brand/Indication context.
 * @returns {Promise<UploadResponse>} Upload result with row count and any errors.
 */
export const uploadModelFact = (
  file: File,
  cycleId?: string,
  targetVariable?: string,
  metadataId?: number,
): Promise<UploadResponse> => {
  const form = new FormData();
  form.append('file', file);
  if (cycleId) form.append('cycle_id', cycleId);
  if (targetVariable) form.append('target_variable', targetVariable);
  if (metadataId) form.append('metadata_id', String(metadataId));
  return api.postForm<UploadResponse>('/uploads/model-fact', form);
};

/** @deprecated Use named exports above. Legacy uploadService object for backward compatibility. */
export const uploadService = {
  uploadDataFact,
  uploadModelFact,

  /**
   * Fetches upload history records ordered by most recent first.
   *
   * @returns {Promise<UploadHistoryRow[]>} Flat list of upload records.
   * @throws Will throw if the API request fails.
   */
  fetchUploadHistory: (): Promise<UploadHistoryRow[]> =>
    api.get<UploadHistoryRow[]>('/uploads'),

  /**
   * Fetches distinct variable values from DATA_FACT rows for a given cycle.
   * Used to populate the target variable selection step.
   *
   * @param {string} cycleId - The cycle to fetch variables for.
   * @returns {Promise<string[]>} Sorted list of distinct variable names.
   * @throws Will throw if the API request fails.
   */
  fetchDataFactVariables: (cycleId: string): Promise<string[]> =>
    api.get<string[]>(`/reports/data-fact-variables/${cycleId}`),

  list: (cycleId?: string, isDatafile?: boolean) => {
    const params = new URLSearchParams();
    if (cycleId) params.append('cycle_id', cycleId);
    if (isDatafile !== undefined) params.append('is_datafile', String(isDatafile));
    if (cycleId || isDatafile !== undefined) params.append('page', '1');
    const qs = params.toString();
    return api.get<PaginatedUploadHistory>(`/uploads${qs ? `?${qs}` : ''}`);
  },
};
