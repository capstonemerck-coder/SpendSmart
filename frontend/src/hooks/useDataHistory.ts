/**
 * useDataHistory.ts
 *
 * Manages all state for the Data History screen.
 * Handles cycle selection, KPI summary, spend/revenue trend data,
 * channel breakdown, DATA_FACT row pagination, and CSV export.
 * Delegates all API communication to reportsService.
 */
import { useState, useCallback, useEffect } from 'react';
import { reportsService } from '@/services/reports.service';
import { useFilters } from '@/context/FilterContext';
import { exportToCSV } from '@/utils/export';
import type {
  DataHistoryKPI,
  SpendTrendPoint,
  RevenueTrendPoint,
  ChannelBreakdownRow,
  DataFactRow,
} from '@/utils/types';

/**
 * useDataHistory
 *
 * Provides all state and handlers for the Data History screen.
 * Fetches available cycles on mount and auto-selects the most recent one.
 * When a cycle is selected, KPI, trend, and breakdown data are loaded in parallel.
 * Dataset rows are loaded lazily when the table is opened.
 *
 * @returns All state values and handlers required by DataHistory.tsx.
 */
export function useDataHistory() {
  const { filters } = useFilters();

  // ── Cycle selection ──────────────────────────────────────────────────────────
  const [availableCycles, setAvailableCycles] = useState<string[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // ── KPI summary ──────────────────────────────────────────────────────────────
  const [kpi, setKpi] = useState<DataHistoryKPI | null>(null);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);

  // ── Trend data ───────────────────────────────────────────────────────────────
  const [trendView, setTrendView] = useState<'spend' | 'revenue' | 'channels'>('spend');
  const [spendTrend, setSpendTrend] = useState<SpendTrendPoint[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([]);
  const [channelBreakdown, setChannelBreakdown] = useState<ChannelBreakdownRow[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  // ── Dataset table (lazy) ─────────────────────────────────────────────────────
  const [tableOpen, setTableOpen] = useState(false);
  const [rows, setRows] = useState<DataFactRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  /**
   * Selects a cycle, resets all dependent state, then fetches KPI + trend data
   * (KPI and trends are fetched in parallel for efficiency).
   *
   * @param {string} cycleId - The cycle to select.
   */
  const selectCycle = useCallback(async (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setTableOpen(false);
    setKpi(null);
    setKpiError(null);
    setSpendTrend([]);
    setRevenueTrend([]);
    setChannelBreakdown([]);
    setTrendsError(null);
    setRows([]);
    setTotal(0);
    setPageState(1);
    setRowsError(null);

    setKpiLoading(true);
    setTrendsLoading(true);

    try {
      const [kpiResult, spendResult, revenueResult, channelResult] = await Promise.all([
        reportsService.fetchKPISummary(cycleId),
        reportsService.fetchSpendTrend(cycleId),
        reportsService.fetchRevenueTrend(cycleId),
        reportsService.fetchChannelBreakdown(cycleId),
      ]);
      setKpi(kpiResult);
      setSpendTrend(spendResult);
      setRevenueTrend(revenueResult);
      setChannelBreakdown(channelResult);
    } catch {
      setKpiError('Failed to load KPI summary. Please try again.');
      setTrendsError('Failed to load trend data. Please try again.');
    } finally {
      setKpiLoading(false);
      setTrendsLoading(false);
    }
  }, []);

  /**
   * Fetches paginated DATA_FACT rows for the selected cycle.
   * Called automatically when tableOpen is true or when page/pageSize changes.
   */
  const fetchRows = useCallback(async () => {
    if (!selectedCycleId) return;
    setRowsLoading(true);
    setRowsError(null);
    try {
      const result = await reportsService.fetchDataHistory(selectedCycleId, { page, pageSize });
      setRows(result.rows);
      setTotal(result.total);
    } catch {
      setRowsError('Failed to load data rows. Please try again.');
    } finally {
      setRowsLoading(false);
    }
  }, [selectedCycleId, page, pageSize]);

  // Fetch available cycles when metadataId is set; reset all state when it changes or clears.
  useEffect(() => {
    if (!filters.metadataId) {
      setAvailableCycles([]);
      setSelectedCycleId(null);
      setKpi(null);
      setSpendTrend([]);
      setRevenueTrend([]);
      setChannelBreakdown([]);
      setRows([]);
      setTotal(0);
      setTableOpen(false);
      return;
    }

    let cancelled = false;
    setCyclesLoading(true);

    reportsService.fetchAvailableCycles(filters.metadataId)
      .then((cycles) => {
        if (!cancelled) {
          setAvailableCycles(cycles);
          setSelectedCycleId(null);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailableCycles([]);
      })
      .finally(() => {
        if (!cancelled) setCyclesLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters.metadataId]);

  // Fetch rows whenever the table is opened or pagination changes.
  useEffect(() => {
    if (tableOpen) fetchRows();
  }, [tableOpen, fetchRows]);

  /**
   * Opens the dataset table and triggers an initial row fetch.
   */
  const openTable = useCallback(() => setTableOpen(true), []);

  /**
   * Navigates to a specific page in the dataset table.
   *
   * @param {number} newPage - Target page number (1-based).
   */
  const setPage = useCallback((newPage: number) => setPageState(newPage), []);

  /**
   * Updates the dataset table page size and resets to page 1.
   *
   * @param {number} size - Number of rows per page.
   */
  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageState(1);
  }, []);

  /**
   * Exports the currently loaded dataset rows to a CSV file.
   */
  const exportRows = useCallback(() => {
    if (!rows.length) return;
    exportToCSV(
      rows as unknown as Record<string, unknown>[],
      `data-history-${selectedCycleId ?? 'export'}`,
    );
  }, [rows, selectedCycleId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    // Cycle
    availableCycles,
    cyclesLoading,
    selectedCycleId,
    selectCycle,
    // KPI
    kpi,
    kpiLoading,
    kpiError,
    // Trends
    trendView,
    setTrendView,
    spendTrend,
    revenueTrend,
    channelBreakdown,
    trendsLoading,
    trendsError,
    // Table
    tableOpen,
    openTable,
    rows,
    rowsLoading,
    rowsError,
    retryRows: fetchRows,
    total,
    totalPages,
    page,
    pageSize,
    setPage,
    setPageSize,
    exportRows,
  };
}
