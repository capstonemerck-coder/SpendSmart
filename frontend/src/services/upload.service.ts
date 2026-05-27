/**
 * File upload service.
 * Wraps /uploads/* endpoints for DATA_FACT and MODEL_FACT ingestion.
 */
import { api } from './api-client';

export interface UploadResponse {
  upload_id: number;
  cycle_id?: string;
  is_datafile: boolean;
  filename: string;
  row_count: number;
  status: 'success' | 'failed' | 'processing';
  errors: Array<{ field: string; message: string; row?: number }>;
  warnings: string[];
  message: string;
}

export interface UploadOut {
  upload_id: number;
  cycle_id?: string;
  is_datafile: boolean;
  filename?: string;
  file_size_bytes?: number;
  row_count?: number;
  status: string;
  error_message?: string;
  uploaded_at: string;
}

export const uploadService = {
  uploadDataFact: (file: File, cycleId?: string): Promise<UploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    if (cycleId) form.append('cycle_id', cycleId);
    return api.postForm<UploadResponse>('/uploads/data-fact', form);
  },

  uploadModelFact: (
    file: File,
    cycleId?: string,
    targetVariable?: string,
  ): Promise<UploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    if (cycleId) form.append('cycle_id', cycleId);
    if (targetVariable) form.append('target_variable', targetVariable);
    return api.postForm<UploadResponse>('/uploads/model-fact', form);
  },

  list: (cycleId?: string, isDatafile?: boolean): Promise<UploadOut[]> => {
    const params = new URLSearchParams();
    if (cycleId) params.append('cycle_id', cycleId);
    if (isDatafile !== undefined) params.append('is_datafile', String(isDatafile));
    const qs = params.toString();
    return api.get<UploadOut[]>(`/uploads${qs ? `?${qs}` : ''}`);
  },
};
