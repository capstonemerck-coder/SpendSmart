/**
 * ModelSummary
 *
 * Model Insights screen: reads market/brand/indication from FilterContext,
 * fetches channel parameter data via useModelSummary, and renders KPI cards,
 * the channel performance overview (bar chart + ROI list + scatter), and the
 * three-level channel contribution detail table (Category → Channel → Subchannel).
 *
 * Pure orchestration — chart rendering is delegated to the shared chart
 * components, and the contribution table (state + rendering) lives in
 * ModelSummaryContributionTable / useContributionTable.
 */
import { useState, useMemo, useRef } from 'react';
import { PageContainer, PageHeader, Card, CardHeader, KpiCard, KpiWithTooltip, TabPills } from '@/components/shared';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { useFilters } from '@/context/FilterContext';
import { useModelSummary } from '@/hooks/useModelSummary';
import { SpendVsSalesBarChart } from '@/components/shared/charts/SpendVsSalesBarChart';
import { ChannelRoiList } from '@/components/shared/charts/ChannelRoiList';
import { SubchannelScatterChart } from '@/components/shared/charts/SubchannelScatterChart';
import { ExportDropdown } from '@/components/shared/charts/ExportDropdown';
import { ModelSummaryContributionTable } from '@/pages/ModelSummaryContributionTable';
import { getCategoryColor, fmtCompact, fmtROI } from '@/utils/categories';
import { exportToCSV, exportToPNG } from '@/utils/export';

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * ModelSummary page.
 *
 * Orchestrates filter reading, data fetching, chart data derivation, and
 * renders the three main sections: KPI cards, channel performance overview,
 * and channel contribution detail table.
 */
export default function ModelSummary() {
  const { filters } = useFilters();
  const { market, brand, indication } = filters;
  const { summaryData, isLoading, error, refetch } = useModelSummary(market, brand, indication);
  const chartRef = useRef<HTMLDivElement>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [overviewTab, setOverviewTab] = useState<'spend-channels' | 'efficiency'>('spend-channels');
  const [exportedSections, setExportedSections] = useState<Set<string>>(new Set());

  // ── Derived chart data ─────────────────────────────────────────────────────

  const barData = useMemo(() =>
    (summaryData?.channel_calculations ?? []).map((c) => ({
      name: c.channel_name ?? c.category ?? '?',
      spend: c.total_spend ?? 0,
      sales: c.impactable_sales ?? 0,
      color: getCategoryColor(c.channel_name ?? c.category ?? '?'),
    })),
    [summaryData],
  );

  const roiList = useMemo(() =>
    (summaryData?.channel_level ?? []).map((ch) => ({
      name: ch.channel_name, category: ch.category, roi: ch.roi,
    })),
    [summaryData],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const markExported = (key: string) => setExportedSections((s) => new Set([...s, key]));

  const filtersComplete = !!(market && brand && indication);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader eyebrow="Model Insights" title="Current performance"
        description="Channel-level spend, contribution and ROI based on uploaded channel parameters." />

      <div className="space-y-5">
        {isLoading && <LoadingState message="Loading model summary…" />}
        {!isLoading && error && <ErrorState title="Failed to load model data" message={error} onRetry={refetch} />}
        {!isLoading && !error && !filtersComplete && <EmptyState title="Select filters to continue" message="Choose a Market, Brand, and Indication from the filter bar above." />}
        {!isLoading && !error && filtersComplete && !summaryData && <EmptyState title="No model data found" message="No channel parameters have been uploaded for the selected filters. Use Data Input to upload a channel parameter file." />}

        {!isLoading && !error && summaryData && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-stretch">
              <KpiWithTooltip label="Total Sales" value={fmtCompact(summaryData.total_sales)} sub={`Base: ${fmtCompact(summaryData.base_sales)}`} tooltip="Total sales = base sales + incremental sales driven by media spend." />
              <KpiWithTooltip label="Total Spend" value={fmtCompact(summaryData.total_spend)} tooltip="Sum of current spend across all channels and subchannels for this cycle." />
              <KpiCard label="Overall ROI" value={fmtROI(summaryData.overall_roi)} sub="Incremental sales / total spend" />
              <Card className="lg:col-span-3 !rounded-lg !shadow-none px-5 py-4 flex flex-col justify-center">
                <div className="ui-eyebrow mb-2.5">Base vs incremental split</div>
                <div className="w-full h-7 flex overflow-hidden rounded-md">
                  <div className="flex items-center justify-center text-[11px] text-white font-medium" style={{ width: `${summaryData.base_pct}%`, background: 'var(--ink-900)' }} title={`Base: ${summaryData.base_pct.toFixed(1)}%`}>
                    {summaryData.base_pct > 12 ? `${summaryData.base_pct.toFixed(0)}%` : ''}
                  </div>
                  <div className="flex items-center justify-center text-[11px] text-white font-medium flex-1" style={{ background: 'var(--brand)' }} title={`Inc: ${summaryData.incremental_pct.toFixed(1)}%`}>
                    {summaryData.incremental_pct > 8 ? `${summaryData.incremental_pct.toFixed(0)}%` : ''}
                  </div>
                </div>
                <div className="flex justify-between text-[11px] text-[var(--ink-500)] mt-2">
                  <span>Base <span className="font-semibold text-[var(--ink-900)]">{fmtCompact(summaryData.base_sales)}</span></span>
                  <span>Incremental <span className="font-semibold text-[var(--ink-900)]">{fmtCompact(summaryData.incremental_sales)}</span></span>
                </div>
              </Card>
            </div>

            {/* Channel performance overview */}
            <Card>
              <CardHeader title="Channel performance overview"
                actions={<TabPills value={overviewTab} onChange={setOverviewTab} options={[{ value: 'spend-channels', label: 'Spend & Channels' }, { value: 'efficiency', label: 'Subchannel Efficiency' }]} />} />

              {overviewTab === 'spend-channels' && (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 ui-fade-in" ref={chartRef}>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[13px] font-semibold text-[var(--ink-900)]">Spend vs impactable sales by category</div>
                      <ExportDropdown onCSV={() => { exportToCSV(barData, 'category-spend-sales'); markExported('bar'); }} onPNG={() => { exportToPNG(chartRef.current, 'category-spend-sales'); markExported('bar'); }} isExported={exportedSections.has('bar')} />
                    </div>
                    <div className="text-[11.5px] text-[var(--ink-500)] mb-4">Compare budget allocation against impactable sales per category</div>
                    <SpendVsSalesBarChart data={barData} />
                  </div>
                  <div className="lg:border-l lg:border-[var(--border)] lg:pl-8">
                    <div className="flex items-center justify-end mb-4">
                      <ExportDropdown onCSV={() => { exportToCSV(roiList, 'channels-by-roi'); markExported('roi'); }} onPNG={() => { exportToPNG(chartRef.current, 'channels-by-roi'); markExported('roi'); }} isExported={exportedSections.has('roi')} />
                    </div>
                    <ChannelRoiList channels={roiList} />
                  </div>
                </div>
              )}

              {overviewTab === 'efficiency' && (
                <div className="px-6 py-5 ui-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-[13px] font-semibold text-[var(--ink-900)] mb-1">Subchannel efficiency — spend vs impactable sales</div>
                      <div className="text-[11.5px] text-[var(--ink-500)]">Subchannels above the avg efficiency line deliver more impactable sales per dollar of spend</div>
                    </div>
                    <ExportDropdown onCSV={() => { exportToCSV(summaryData.subchannel_level, 'subchannel-efficiency'); markExported('scatter'); }} onPNG={() => { exportToPNG(chartRef.current, 'subchannel-efficiency'); markExported('scatter'); }} isExported={exportedSections.has('scatter')} />
                  </div>
                  <SubchannelScatterChart subchannels={summaryData.subchannel_level} />
                </div>
              )}
            </Card>

            {/* Channel contribution detail table */}
            <ModelSummaryContributionTable
              summaryData={summaryData}
              onExportCSV={() => { exportToCSV(summaryData.channel_level, 'channel-contribution'); markExported('table'); }}
              onExportPNG={() => markExported('table')}
              isExported={exportedSections.has('table')}
            />
          </>
        )}
      </div>
    </PageContainer>
  );
}
