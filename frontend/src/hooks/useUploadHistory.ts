/**
 * useUploadHistory.ts
 *
 * Manages paginated fetching of upload records for the DataHistory page.
 * Exposes upload records, pagination state, filter state, and handlers
 * for changing filters and pages. Delegates API communication to upload.service.ts.
 * Re-fetches automatically when any filter or page value changes.
 */
import { useCallback, useEffect, useState } from 'react';
import { deleteUploadRecord, fetchUploadHistory } from '@/services/upload.service';
import type { PaginatedUploadHistory, UploadRecordSummary } from '@/utils/types';

const DEFAULT_PAGE_SIZE = 20;

interface UseUploadHistoryReturn {
  uploadRecords: UploadRecordSummary[];
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  total: number;
  selectedCycleId: string | null;
  selectedStatus: string | null;
  setSelectedCycleId: (id: string | null) => void;
  setSelectedStatus: (status: string | null) => void;
  setPage: (page: number) => void;
  refetchHistory: () => void;
  deleteRecord: (uploadRecordId: number) => Promise<void>;
  isDeleting: boolean;
}

/**
 * Manages paginated, filterable upload history for the DataHistory page.
 *
 * @returns {UseUploadHistoryReturn} Records, pagination metadata, filter handlers, and delete action.
 */
export function useUploadHistory(): UseUploadHistoryReturn {
  const [uploadRecords, setUploadRecords] = useState<UploadRecordSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedCycleId, setSelectedCycleIdState] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatusState] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchUploadHistory({
      cycle_id: selectedCycleId ?? undefined,
      status: selectedStatus ?? undefined,
      page: currentPage,
      page_size: DEFAULT_PAGE_SIZE,
    })
      .then((data: PaginatedUploadHistory) => {
        if (!cancelled) {
          setUploadRecords(data.records);
          setTotalPages(data.total_pages);
          setTotal(data.total);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load upload history.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedCycleId, selectedStatus, currentPage, fetchCount]);

  const setSelectedCycleId = useCallback((id: string | null) => {
    setSelectedCycleIdState(id);
    setCurrentPage(1);
  }, []);

  const setSelectedStatus = useCallback((status: string | null) => {
    setSelectedStatusState(status);
    setCurrentPage(1);
  }, []);

  const setPage = useCallback((page: number) => setCurrentPage(page), []);

  const refetchHistory = useCallback(() => setFetchCount((n) => n + 1), []);

  /**
   * Deletes an upload record and refreshes the history list on success.
   *
   * @param {number} uploadRecordId - ID of the record to delete.
   */
  const deleteRecord = useCallback(async (uploadRecordId: number): Promise<void> => {
    setIsDeleting(true);
    try {
      await deleteUploadRecord(uploadRecordId);
      refetchHistory();
    } finally {
      setIsDeleting(false);
    }
  }, [refetchHistory]);

  return {
    uploadRecords,
    isLoading,
    error,
    currentPage,
    totalPages,
    total,
    selectedCycleId,
    selectedStatus,
    setSelectedCycleId,
    setSelectedStatus,
    setPage,
    refetchHistory,
    deleteRecord,
    isDeleting,
  };
}
