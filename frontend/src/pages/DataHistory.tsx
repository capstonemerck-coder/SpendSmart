/**
 * DataHistory — KPI summary, trend charts, channel breakdown, and DATA_FACT
 * table for a selected cycle. Architecture: Page → useDataHistory → reportsService → API.
 */
import { useRef } from 'react';
import { Eye } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RcTooltip, ResponsiveContainer } from 'recharts';
import { PageContainer, PageHeader, Card, CardHeader, Button, Select, KpiCard, TabPills, Badge } from '@/components/shared';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { SkeletonTable } from '@/components/shared/feedback/SkeletonTable';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { ChannelBreakdown } from '@/components/shared/charts/ChannelBreakdown';
import { ExportButtons } from '@/components/shared/data/ExportButtons';
import { useDataHistory } from '@/hooks/useDataHistory';
import { useFilters } from '@/context/FilterContext';
import { exportToCSV } from '@/utils/export';

const fmt$ = (v: number) => `$${(v / 1_000_000).toFixed(2)}M`;
const fmtk = (v: number) => `${(v / 1_000).toFixed(0)}k`;
const fmtExact$ = (v: number) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtExactK = (v: number) => v.toLocaleString();

/** KPI card with an exact-value tooltip on hover (group-hover pattern from CLAUDE.md). */
function KpiTooltipCard({ label, abbr, exact }: { label: string; abbr: string; exact: string }) {
  return (
    <div className="relative group">
      <KpiCard label={label} value={abbr} />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[var(--ink-900)] text-white text-[11px] rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
        {exact}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--ink-900)]" />
      </div>
    </div>
  );
}

/** Recharts line chart for a single spend or revenue trend series. */
function TrendChart({ data, dataKey }: { data: any[]; dataKey: string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <RcTooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E4E4E7', borderRadius: '8px', fontSize: '12px' }} />
        <Line type="monotone" dataKey={dataKey} stroke="#00857C" strokeWidth={2} dot={{ fill: '#00857C', stroke: '#fff', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const TREND_OPTIONS = [
  { value: 'spend' as const, label: 'Spend trend' },
  { value: 'revenue' as const, label: 'Revenue trend' },
  { value: 'channels' as const, label: 'Channel breakdown' },
];

const TABLE_COLS = ['Cycle', 'Date', 'Variable', 'Category', 'Spend', 'Reach', 'Value', 'Channel', 'Sub-channel', 'Upload'];

/**
 * DataHistory
 *
 * Orchestrates cycle selection, KPI display, trend charts, channel breakdown,
 * and the lazy-loaded DATA_FACT dataset table.
 */
export default function DataHistory() {
  const h = useDataHistory();
  const { filters } = useFilters();
  const tableRef = useRef<HTMLDivElement>(null);

  const handleViewData = () => {
    h.openTable();
    setTimeout(() => tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Data History"
        title="Historical performance"
        description="Review aggregated sales, spend and reach metrics across the active cycle."
        actions={<Button variant="primary" leftIcon={<Eye size={14} />} onClick={handleViewData}>View data</Button>}
      />

      {/* Cycle selector — only shown once Market / Brand / Indication are selected */}
      {filters.metadataId && (
        <div className="flex items-center gap-3 mb-5">
          <Select value={h.selectedCycleId ?? ''} onChange={(e) => { if (e.target.value) h.selectCycle(e.target.value); }} className="!h-9 !text-[12.5px] min-w-[180px]">
            <option value="">{h.cyclesLoading ? 'Loading cycles…' : 'Select a cycle'}</option>
            {h.availableCycles.map((id) => <option key={id} value={id}>{id}</option>)}
          </Select>
          {!h.cyclesLoading && <span className="text-[12px] text-[var(--ink-500)]">{h.availableCycles.length} cycle{h.availableCycles.length !== 1 ? 's' : ''} available</span>}
        </div>
      )}

      {!filters.metadataId && (
        <Card className="mb-5">
          <div className="px-6 py-8 text-center text-[13px] text-[var(--ink-500)]">Select a Market, Brand, and Indication above to view available cycles.</div>
        </Card>
      )}

      {filters.metadataId && !h.selectedCycleId && !h.cyclesLoading && (
        <Card className="mb-5">
          <div className="px-6 py-8 text-center text-[13px] text-[var(--ink-500)]">Select a cycle above to view KPI summary.</div>
        </Card>
      )}

      {/* KPI Cards */}
      {h.selectedCycleId && (
        <div className="mb-5">
          {h.kpiLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <div key={i} className="ui-card !rounded-lg !shadow-none px-5 py-4 h-[90px] animate-pulse bg-[var(--surface-muted)]" />)}
            </div>
          ) : h.kpiError ? (
            <ErrorState message={h.kpiError} onRetry={() => h.selectCycle(h.selectedCycleId!)} />
          ) : h.kpi ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KpiTooltipCard label="Total Sales" abbr={fmt$(h.kpi.total_sales)} exact={fmtExact$(h.kpi.total_sales)} />
              <KpiTooltipCard label="Total Spend" abbr={fmt$(h.kpi.total_spend)} exact={fmtExact$(h.kpi.total_spend)} />
              <KpiTooltipCard label="Total Reach" abbr={fmtk(h.kpi.total_reach)} exact={fmtExactK(h.kpi.total_reach)} />
            </div>
          ) : null}
        </div>
      )}

      {/* Trends Card */}
      {h.selectedCycleId && (
        <Card className="mb-5">
          <CardHeader title="Trends" actions={<TabPills value={h.trendView} onChange={h.setTrendView} options={TREND_OPTIONS} />} />
          {h.trendsLoading ? (
            <div className="px-6 py-10"><LoadingState /></div>
          ) : h.trendsError ? (
            <div className="px-6 py-6"><ErrorState message={h.trendsError} onRetry={() => h.selectCycle(h.selectedCycleId!)} /></div>
          ) : (
            <div className="px-6 py-5">
              {h.trendView === 'spend' && (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--ink-900)]">Total spend trend</p>
                      <p className="text-[12px] text-[var(--ink-500)]">Daily spend aggregated across all channels</p>
                    </div>
                    <ExportButtons showPNG onExportCSV={() => exportToCSV(h.spendTrend as any[], 'spend-trend')} />
                  </div>
                  <TrendChart data={h.spendTrend} dataKey="spend" />
                </>
              )}
              {h.trendView === 'revenue' && (
                <>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[14px] font-semibold text-[var(--ink-900)]">Total revenue trend</p>
                      <p className="text-[12px] text-[var(--ink-500)]">Daily revenue aggregated across all channels</p>
                    </div>
                    <ExportButtons showPNG onExportCSV={() => exportToCSV(h.revenueTrend as any[], 'revenue-trend')} />
                  </div>
                  <TrendChart data={h.revenueTrend} dataKey="revenue" />
                </>
              )}
              {h.trendView === 'channels' && <ChannelBreakdown data={h.channelBreakdown} />}
            </div>
          )}
        </Card>
      )}

      {/* Dataset Table (lazy) */}
      {h.tableOpen && (
        <div ref={tableRef}>
          <Card>
            <CardHeader
              title={<span className="font-mono text-[13px]">DATA_FACT_HISTORICAL</span>}
              subtitle={`${h.total} rows · paginated`}
              actions={<ExportButtons onExportCSV={h.exportRows} />}
            />
            {h.rowsLoading && <SkeletonTable rows={10} columns={10} />}
            {h.rowsError && !h.rowsLoading && <div className="p-6"><ErrorState message={h.rowsError} onRetry={h.retryRows} /></div>}
            {!h.rowsLoading && !h.rowsError && h.rows.length === 0 && <EmptyState title="No DATA_FACT rows" message="No rows found for this cycle." />}
            {!h.rowsLoading && !h.rowsError && h.rows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)] sticky top-0">
                    <tr>{TABLE_COLS.map((col) => <th key={col} className="px-4 py-2.5 text-left ui-eyebrow text-[var(--ink-500)] font-semibold whitespace-nowrap">{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {h.rows.map((row) => (
                      <tr key={row.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]">
                        <td className="px-4 py-2.5 text-[var(--ink-900)] font-medium">{row.cycle_id}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.date ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)]">{row.variable ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)]">{row.category ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.spend != null ? `$${row.spend.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.reach?.toLocaleString() ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.value?.toLocaleString() ?? '—'}</td>
                        <td className="px-4 py-2.5">{row.channel ? <Badge tone="neutral" className="!text-[10.5px]">{row.channel}</Badge> : '—'}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)]">{row.sub_channel ?? '—'}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-500)] font-mono text-[11px]">{row.upload_id ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!h.rowsLoading && h.totalPages > 1 && (
              <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] rounded-b-[12px] flex items-center justify-between">
                <p className="text-[12px] text-[var(--ink-500)]">
                  Showing <span className="font-semibold text-[var(--ink-700)]">{h.total > 0 ? (h.page - 1) * h.pageSize + 1 : 0}–{Math.min(h.page * h.pageSize, h.total)}</span> of <span className="font-semibold text-[var(--ink-700)]">{h.total}</span>
                </p>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(h.totalPages, 7) }, (_, i) => i + 1).map((pg) => (
                    <button key={pg} type="button" onClick={() => h.setPage(pg)} className={`min-w-[32px] h-8 px-2.5 text-[12px] rounded-md border transition-colors ${pg === h.page ? 'bg-[var(--brand)] text-white border-[var(--brand)]' : 'bg-white text-[var(--ink-700)] border-[var(--border-strong)] hover:border-[var(--ink-400)]'}`}>{pg}</button>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
