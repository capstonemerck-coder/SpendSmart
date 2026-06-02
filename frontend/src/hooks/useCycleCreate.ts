/**
 * useCycleCreate.ts
 *
 * Manages the state and submission logic for creating a new upload cycle.
 * Exposes a submit handler, loading state, and error state.
 * Delegates API communication to upload.service.ts.
 */
import { useCallback, useState } from 'react';
import { createCycle } from '@/services/upload.service';
import type { CycleCreatePayload, CycleSummary } from '@/utils/types';

interface UseCycleCreateReturn {
  isCreating: boolean;
  createError: string | null;
  createCycleAction: (payload: CycleCreatePayload) => Promise<CycleSummary>;
  clearCreateError: () => void;
}

/**
 * Provides a handler and state for the cycle creation flow.
 *
 * @returns {UseCycleCreateReturn} Submit handler, loading flag, and error state.
 */
export function useCycleCreate(): UseCycleCreateReturn {
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  /**
   * Calls the create cycle API and returns the created cycle.
   * Throws if the API call fails — callers handle success (e.g. close modal, refetch).
   *
   * @param {CycleCreatePayload} payload - cycle_id and optional description.
   * @returns {Promise<CycleSummary>} The newly created cycle.
   * @throws Re-throws ApiError so calling components can handle it if needed.
   */
  const createCycleAction = useCallback(
    async (payload: CycleCreatePayload): Promise<CycleSummary> => {
      setIsCreating(true);
      setCreateError(null);
      try {
        const cycle = await createCycle(payload);
        return cycle;
      } catch (err: any) {
        const msg = err?.message ?? 'Failed to create cycle.';
        setCreateError(msg);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  const clearCreateError = useCallback(() => setCreateError(null), []);

  return { isCreating, createError, createCycleAction, clearCreateError };
}
