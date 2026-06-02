/**
 * useUploadActions.ts
 *
 * Manages the two-step upload flow: parse (preview) and commit (persist).
 * Exposes handlers for triggering each step, the preview data returned
 * from parsing, and loading/error state for each action independently.
 * The upload_record_id returned by parseFile is stored internally and
 * passed automatically to confirmUpload — the caller does not manage it.
 * Delegates all API communication to upload.service.ts.
 */
import { useCallback, useState } from 'react';
import { commitUpload, parseUploadFile } from '@/services/upload.service';
import type { UploadPreview, UploadRecordSummary } from '@/utils/types';

interface UseUploadActionsReturn {
  previewData: UploadPreview | null;
  committedRecord: UploadRecordSummary | null;
  isParsing: boolean;
  isCommitting: boolean;
  parseError: string | null;
  commitError: string | null;
  parseFile: (cycleId: string, file: File) => Promise<void>;
  confirmUpload: (cycleId: string) => Promise<void>;
  resetUpload: () => void;
}

/**
 * Provides handlers and state for the two-step channel parameter upload flow.
 *
 * @returns {UseUploadActionsReturn} Parse and commit handlers, preview data, and state flags.
 */
export function useUploadActions(): UseUploadActionsReturn {
  const [previewData, setPreviewData] = useState<UploadPreview | null>(null);
  const [committedRecord, setCommittedRecord] = useState<UploadRecordSummary | null>(null);
  const [uploadRecordId, setUploadRecordId] = useState<number | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  /**
   * Calls the parse endpoint and stores the returned preview data.
   * The upload_record_id is retained internally for use during confirmUpload.
   *
   * @param {string} cycleId - Planning cycle to associate this upload with.
   * @param {File}   file    - The CSV or XLSX file to parse.
   */
  const parseFile = useCallback(async (cycleId: string, file: File): Promise<void> => {
    setIsParsing(true);
    setParseError(null);
    setPreviewData(null);
    setCommittedRecord(null);
    setUploadRecordId(null);

    try {
      const data = await parseUploadFile(cycleId, file);
      setPreviewData(data);
      setUploadRecordId(data.upload_record_id);
    } catch (err: any) {
      setParseError(err?.message ?? 'Failed to parse file.');
    } finally {
      setIsParsing(false);
    }
  }, []);

  /**
   * Calls the commit endpoint using the upload_record_id from the prior parse call.
   * On success, sets committedRecord and clears the preview.
   *
   * @param {string} cycleId - Planning cycle (required by the commit request body).
   */
  const confirmUpload = useCallback(async (cycleId: string): Promise<void> => {
    if (uploadRecordId == null) return;

    setIsCommitting(true);
    setCommitError(null);

    try {
      const record = await commitUpload(uploadRecordId, cycleId);
      setCommittedRecord(record);
      setPreviewData(null);
      setUploadRecordId(null);
    } catch (err: any) {
      setCommitError(err?.message ?? 'Failed to commit upload.');
    } finally {
      setIsCommitting(false);
    }
  }, [uploadRecordId]);

  /**
   * Resets all upload state — called after a successful commit or when the user
   * wants to start a new upload.
   */
  const resetUpload = useCallback((): void => {
    setPreviewData(null);
    setCommittedRecord(null);
    setUploadRecordId(null);
    setParseError(null);
    setCommitError(null);
  }, []);

  return {
    previewData,
    committedRecord,
    isParsing,
    isCommitting,
    parseError,
    commitError,
    parseFile,
    confirmUpload,
    resetUpload,
  };
}
