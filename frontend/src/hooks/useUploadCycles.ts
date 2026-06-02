/**
 * useUploadCycles.ts
 *
 * Manages fetching and local state for upload cycles (planning periods).
 * Exposes the full cycle list, loading state, error state, and a
 * refetch function. Used by the DataInput page to populate the cycle selector.
 * Delegates all API communication to upload.service.ts.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchAllCycles } from '@/services/upload.service';
import type { CycleSummary } from '@/utils/types';

interface UseUploadCyclesReturn {
  cycles: CycleSummary[];
  isLoading: boolean;
  error: string | null;
  refetchCycles: () => void;
}

/**
 * Fetches all planning cycles and manages their loading state.
 *
 * @returns {UseUploadCyclesReturn} Cycles list, loading/error state, and a refetch handler.
 */
export function useUploadCycles(): UseUploadCyclesReturn {
  const [cycles, setCycles] = useState<CycleSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchAllCycles()
      .then((data) => {
        if (!cancelled) setCycles(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load cycles.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [fetchCount]);

  const refetchCycles = useCallback(() => setFetchCount((n) => n + 1), []);

  return { cycles, isLoading, error, refetchCycles };
}
