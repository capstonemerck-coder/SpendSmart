/**
 * ModelSummary
 *
 * Model Insights screen: reads market/brand/indication from FilterContext,
 * fetches channel parameter data via useModelSummary, and renders KPI cards,
 * the channel performance overview (bar chart + ROI list + scatter), and the
 * three-level channel contribution detail table (Category → Channel → Subchannel).
 *
 * All data transformations live in useMemo hooks here or in the service layer.
 * Chart rendering is fully delegated to extracted chart components.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Info, Search, ChevronDown, ChevronsUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowUpDown, ListFilter } from 'lucide-react';
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
import { getCategoryColor, fmtCompact } from '@/utils/categories';
import { exportToCSV, exportToPNG } from '@/utils/export';
import type { ChannelLevelCalc, SubchannelLevelCalc, ChannelSearchResult } from '@/utils/types';

// ── Local components ──────────────────────────────────────────────────────────

/** Portal tooltip explaining the Spend vs Contribution columns in the table. */
function InfoTip() {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const show = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX - 180 });
  };
  return (
    <>
      <Info size={13} onMouseEnter={show} onMouseLeave={() => setPos(null)} className="text-white/60 hover:text-white cursor-pointer transition-colors flex-shrink-0" />
      {pos && ReactDOM.createPortal(
        <div style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 99999 }} className="w-52 bg-white border border-[var(--border)] text-[var(--ink-800)] text-[11px] rounded-lg px-3.5 py-3 leading-relaxed shadow-xl pointer-events-none">
          <p className="font-semibold text-[var(--ink-900)] mb-1">Spend vs Contribution</p>
          <p className="mb-1"><span className="font-medium">Spend %</span> — share of total marketing budget.</p>
          <p className="mb-1"><span className="font-medium">Contri %</span> — share of total impactable sales.</p>
          <p>↑ channel over-delivers vs its spend share.</p>
        </div>,
        document.body,
      )}
    </>
  );
}

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
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [catFilter, setCatFilter] = useState('all');
  const [perfFilter, setPerfFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'roi', dir: 'desc' });
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // ── Derived chart data ─────────────────────────────────────────────────────

  const barData = useMemo(() =>
    (summaryData?.channel_calculations ?? []).map((c) => ({
      name: c.channel_name ?? c.category ?? '?',
      spend: (c.total_spend ?? 0) / 1_000_000,
      sales: (c.impactable_sales ?? 0) / 1_000_000,
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

  const categoryToChannels = useMemo<Record<string, ChannelLevelCalc[]>>(() => {
    const m: Record<string, ChannelLevelCalc[]> = {};
    for (const ch of summaryData?.channel_level ?? []) {
      (m[ch.category] ??= []).push(ch);
    }
    return m;
  }, [summaryData]);

  const channelToSubchannels = useMemo<Record<string, SubchannelLevelCalc[]>>(() => {
    const m: Record<string, SubchannelLevelCalc[]> = {};
    for (const s of summaryData?.subchannel_level ?? []) {
      const key = `${s.category}\x00${s.channel_name}`;
      (m[key] ??= []).push(s);
    }
    return m;
  }, [summaryData]);

  const tableCategories = useMemo(() =>
    Array.from(new Set((summaryData?.channel_level ?? []).map((ch) => ch.category))).sort(),
    [summaryData],
  );

  const grandSpend = summaryData?.total_spend ?? 1;
  const grandSales = summaryData?.incremental_sales || summaryData?.total_sales || 1;

  const filteredCats = useMemo(() => {
    const sl = search.toLowerCase();
    return tableCategories.filter((cat) => {
      if (catFilter !== 'all' && cat !== catFilter) return false;
      const channels = categoryToChannels[cat] ?? [];
      if (sl) return channels.some((ch) => ch.channel_name.toLowerCase().includes(sl) ||
        (channelToSubchannels[`${cat}\x00${ch.channel_name}`] ?? []).some((s) => s.subchannel_name.toLowerCase().includes(sl)));
      if (perfFilter !== 'all') {
        const catSpend = channels.reduce((a, c) => a + c.total_spend, 0);
        const catSales = channels.reduce((a, c) => a + c.impactable_sales, 0);
        if (perfFilter === 'over' && catSales / grandSales <= catSpend / grandSpend) return false;
        if (perfFilter === 'under' && catSales / grandSales >= catSpend / grandSpend) return false;
      }
      return true;
    });
  }, [tableCategories, catFilter, search, perfFilter, categoryToChannels, channelToSubchannels, grandSpend, grandSales]);

  const searchResults = useMemo<ChannelSearchResult[]>(() => {
    if (!search) return [];
    const sl = search.toLowerCase();
    const results: ChannelSearchResult[] = [];
    for (const cat of tableCategories) {
      if (results.length >= 12) break;
      if (cat.toLowerCase().includes(sl)) results.push({ label: cat, catKey: cat, type: 'category' });
      for (const ch of categoryToChannels[cat] ?? []) {
        if (results.length >= 12) break;
        if (ch.channel_name.toLowerCase().includes(sl)) results.push({ label: ch.channel_name, sub: cat, catKey: cat, chKey: ch.channel_name, type: 'channel' });
        for (const s of channelToSubchannels[`${cat}\x00${ch.channel_name}`] ?? []) {
          if (results.length >= 12) break;
          if (s.subchannel_name.toLowerCase().includes(sl)) results.push({ label: s.subchannel_name, sub: `${cat} › ${ch.channel_name}`, catKey: cat, chKey: ch.channel_name, type: 'subchannel' });
        }
      }
    }
    return results;
  }, [search, tableCategories, categoryToChannels, channelToSubchannels]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (search || perfFilter !== 'all') setExpandedCats(new Set(tableCategories));
  }, [search, perfFilter]);

  useEffect(() => {
    if (expandedCats.size > 0) setExpandedChannels(new Set(
      Array.from(expandedCats).flatMap((cat) =>
        (categoryToChannels[cat] ?? []).map((ch) => `${cat}\x00${ch.channel_name}`)
      )
    ));
  }, [sortConfig]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const toggleCat = (cat: string) => setExpandedCats((s) => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  const toggleChannel = (key: string) => setExpandedChannels((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const expandAllInCat = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChannels((s) => new Set([...s, ...(categoryToChannels[cat] ?? []).map((ch) => `${cat}\x00${ch.channel_name}`)]));
  };
  const handleSort = (col: string) => setSortConfig((p) => ({ col, dir: p.col === col && p.dir === 'asc' ? 'desc' : 'asc' }));
  const markExported = (key: string) => setExportedSections((s) => new Set([...s, key]));
  const clearFilters = () => { setSearch(''); setCatFilter('all'); setPerfFilter('all'); };
  const handleSearchResult = (r: ChannelSearchResult) => {
    setExpandedCats((s) => new Set([...s, r.catKey]));
    if (r.chKey) setExpandedChannels((s) => new Set([...s, `${r.catKey}\x00${r.chKey}`]));
    setSearch(''); setShowSearch(false);
  };

  const isAnythingExpanded = expandedCats.size > 0;
  const hasActiveFilters = !!(search || catFilter !== 'all' || perfFilter !== 'all');
  const filtersComplete = !!(market && brand && indication);

  const sortVal = (ch: ChannelLevelCalc) => {
    if (sortConfig.col === 'spend') return ch.total_spend;
    if (sortConfig.col === 'sales') return ch.impactable_sales;
    return ch.roi;
  };
  const sortDir = (a: number, b: number) => sortConfig.dir === 'asc' ? a - b : b - a;
  const SortIcon = ({ col }: { col: string }) => !isAnythingExpanded ? null :
    sortConfig.col === col ? (sortConfig.dir === 'asc' ? <ArrowUpNarrowWide size={12} className="text-white flex-shrink-0" /> : <ArrowDownWideNarrow size={12} className="text-white flex-shrink-0" />) :
    <ArrowUpDown size={12} className="text-white/25 flex-shrink-0" />;

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
              <KpiCard label="Overall ROI" value={summaryData.overall_roi.toFixed(2)} sub="Incremental sales / total spend" />
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
            <Card>
              <CardHeader title="Channel contribution detail"
                actions={<ExportDropdown onCSV={() => { exportToCSV(summaryData.channel_level, 'channel-contribution'); markExported('table'); }} onPNG={() => markExported('table')} isExported={exportedSections.has('table')} />} />

              {/* Filter bar */}
              <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
                  <input type="text" placeholder="Search channels…" value={search} onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                    onFocus={() => setShowSearch(true)} onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                    className="w-full text-[12px] pl-7 pr-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-white placeholder:text-[var(--ink-400)] text-[var(--ink-800)] focus:outline-none focus:border-[var(--brand)] transition-colors" />
                  {showSearch && searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-30 overflow-hidden max-h-56 overflow-y-auto">
                      {searchResults.map((r, i) => (
                        <button key={i} onMouseDown={() => handleSearchResult(r)} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors text-left">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${r.type === 'category' ? 'bg-[var(--brand-50)] text-[var(--brand-700)]' : r.type === 'channel' ? 'bg-[var(--surface-subtle)] text-[var(--ink-600)]' : 'bg-white border border-[var(--border)] text-[var(--ink-500)]'}`}>
                            {r.type === 'category' ? 'CAT' : r.type === 'channel' ? 'CH' : 'SUB'}
                          </span>
                          <span className="font-medium truncate">{r.label}</span>
                          {r.sub && <span className="text-[10px] text-[var(--ink-400)] truncate">{r.sub}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); }}
                    className="text-[12px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-7">
                    <option value="all">All Channels</option>
                    {tableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={perfFilter} onChange={(e) => setPerfFilter(e.target.value)}
                    className="text-[12px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-7">
                    <option value="all">All Performance</option>
                    <option value="over">Over-performing ↑</option>
                    <option value="under">Under-performing ↓</option>
                  </select>
                  <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
                </div>
                <div className="flex items-center gap-1 ml-auto">
                  <button onClick={() => setExpandedCats(new Set(tableCategories))} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors"><ChevronsUpDown size={11} />Expand all</button>
                  <button onClick={() => { setExpandedCats(new Set()); setExpandedChannels(new Set()); }} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">Collapse all</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div style={{ minWidth: '680px' }}>
                  {/* Table header */}
                  <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--ink-900)]">
                    <div className="text-[10.5px] font-semibold text-white/60 uppercase tracking-[0.1em]">Channel hierarchy</div>
                    {(['spend', 'sales'] as const).map((col) => (
                      <button key={col} onClick={() => isAnythingExpanded && handleSort(col)}
                        className={`flex items-center justify-end gap-1 w-full ${isAnythingExpanded ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-60'}`}>
                        <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${sortConfig.col === col ? 'text-white' : 'text-white/60'}`}>{col === 'spend' ? 'Spend' : 'Imp. Sales'}</span>
                        <SortIcon col={col} />
                      </button>
                    ))}
                    <div className="flex items-center justify-end gap-1">
                      <InfoTip />
                      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${perfFilter !== 'all' ? 'text-white' : 'text-white/60'}`}>Spend vs Contrib</span>
                      <button onClick={() => setPerfFilter((p) => p === 'all' ? 'over' : p === 'over' ? 'under' : 'all')} className={`flex-shrink-0 rounded p-0.5 transition-all hover:bg-white/20 ${perfFilter !== 'all' ? 'text-white' : 'text-white/30'}`}><ListFilter size={13} /></button>
                    </div>
                    <button onClick={() => isAnythingExpanded && handleSort('roi')} className={`flex items-center justify-end gap-1 w-full ${isAnythingExpanded ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-60'}`}>
                      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${sortConfig.col === 'roi' ? 'text-white' : 'text-white/60'}`}>ROI</span>
                      <SortIcon col="roi" />
                    </button>
                  </div>

                  {/* Table body */}
                  <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
                    {filteredCats.length === 0 ? (
                      <div className="px-5 py-10 text-center text-[13px] text-[var(--ink-400)]">
                        No channels match your filters. <button onClick={clearFilters} className="text-[var(--brand)] hover:underline font-medium">Clear filters</button>
                      </div>
                    ) : filteredCats.map((cat) => {
                      const channels = [...(categoryToChannels[cat] ?? [])].sort((a, b) => sortDir(sortVal(a), sortVal(b)));
                      const catSpend = channels.reduce((a, c) => a + c.total_spend, 0);
                      const catSales = channels.reduce((a, c) => a + c.impactable_sales, 0);
                      const catRoi = catSpend > 0 ? catSales / catSpend : 0;
                      const spendPct = (catSpend / grandSpend) * 100;
                      const salesPct = (catSales / grandSales) * 100;
                      const catOpen = expandedCats.has(cat);
                      const color = getCategoryColor(cat);
                      return (
                        <div key={cat} className="border-b-2 border-[var(--surface-subtle)] last:border-b-0">
                          <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer border-b border-[var(--border)]" onClick={() => toggleCat(cat)}>
                            <div className="flex items-center gap-2">
                              <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform duration-150 flex-shrink-0 ${catOpen ? 'rotate-90' : ''}`} fill="none"><path d="M3 2l4 3-4 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                              <span className="text-[13px] font-bold text-[var(--ink-900)] uppercase tracking-wide">{cat}</span>
                              <span className="text-[10px] bg-[var(--surface-subtle)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--ink-500)]">{channels.length}</span>
                              {catOpen && <button onClick={(e) => expandAllInCat(cat, e)} className="text-[var(--brand)] text-[10px] hover:underline ml-1">expand all channels</button>}
                            </div>
                            <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtCompact(catSpend)}</div>
                            <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtCompact(catSales)}</div>
                            <div className="text-right text-[13px] tabular-nums font-medium">
                              <span className="text-[var(--ink-900)]">{spendPct.toFixed(1)}%</span><span className="mx-1 text-[var(--ink-400)]">vs</span><span className="font-semibold text-[var(--ink-900)]">{salesPct.toFixed(1)}%</span>
                              <span className={`ml-1 font-bold ${salesPct > spendPct ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{salesPct > spendPct ? '↑' : '↓'}</span>
                            </div>
                            <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{catRoi.toFixed(2)}</div>
                          </div>
                          {catOpen && channels.map((ch) => {
                            const chKey = `${cat}\x00${ch.channel_name}`;
                            const subs = [...(channelToSubchannels[chKey] ?? [])].sort((a, b) => sortDir(
                              sortConfig.col === 'spend' ? a.total_spend : sortConfig.col === 'sales' ? a.impactable_sales : a.roi,
                              sortConfig.col === 'spend' ? b.total_spend : sortConfig.col === 'sales' ? b.impactable_sales : b.roi,
                            ));
                            const chOpen = expandedChannels.has(chKey);
                            const chSpendPct = (ch.total_spend / grandSpend) * 100;
                            const chSalesPct = (ch.impactable_sales / grandSales) * 100;
                            return (
                              <div key={ch.channel_name}>
                                <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-2.5 bg-white border-b border-[var(--border)] hover:bg-[var(--surface-subtle)] cursor-pointer" onClick={() => toggleChannel(chKey)}>
                                  <div className="flex items-center pl-5 gap-2">
                                    {subs.length > 0 && <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform duration-150 flex-shrink-0 ${chOpen ? 'rotate-90' : ''}`} fill="none"><path d="M3 2l4 3-4 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                    <span className="text-[13px] font-semibold text-[var(--ink-800)]">{ch.channel_name}</span>
                                    {subs.length > 0 && <span className="text-[10px] bg-[var(--surface-subtle)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--ink-500)]">{subs.length}</span>}
                                  </div>
                                  <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{fmtCompact(ch.total_spend)}</div>
                                  <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{fmtCompact(ch.impactable_sales)}</div>
                                  <div className="text-right text-[12.5px] tabular-nums">
                                    <span className="text-[var(--ink-700)]">{chSpendPct.toFixed(1)}%</span><span className="mx-1 text-[var(--ink-400)]">vs</span><span className="text-[var(--ink-700)]">{chSalesPct.toFixed(1)}%</span>
                                    <span className={`ml-1 font-semibold ${chSalesPct > chSpendPct ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{chSalesPct > chSpendPct ? '↑' : '↓'}</span>
                                  </div>
                                  <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{ch.roi.toFixed(2)}</div>
                                </div>
                                {chOpen && subs.map((s) => {
                                  const subSpendPct = (s.total_spend / grandSpend) * 100;
                                  const subSalesPct = (s.impactable_sales / grandSales) * 100;
                                  return (
                                    <div key={s.subchannel_name} className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-2.5 bg-[var(--surface-muted)] border-b border-[var(--border)] last:border-b-0">
                                      <div className="flex items-center pl-11 gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                                        <span className="text-[13px] font-medium text-[var(--ink-700)]">{s.subchannel_name}</span>
                                      </div>
                                      <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-600)]">{fmtCompact(s.total_spend)}</div>
                                      <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-600)]">{fmtCompact(s.impactable_sales)}</div>
                                      <div className="text-right text-[12.5px] tabular-nums">
                                        <span className="text-[var(--ink-600)]">{subSpendPct.toFixed(1)}%</span><span className="mx-1 text-[var(--ink-400)]">vs</span><span className="text-[var(--ink-600)]">{subSalesPct.toFixed(1)}%</span>
                                        <span className={`ml-1 font-semibold ${subSalesPct > subSpendPct ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{subSalesPct > subSpendPct ? '↑' : '↓'}</span>
                                      </div>
                                      <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-600)]">{s.roi.toFixed(2)}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 text-[11px] text-[var(--ink-400)] border-t border-[var(--border)] bg-[var(--surface-muted)]">
                {hasActiveFilters ? (
                  <span>Showing filtered results · <button onClick={clearFilters} className="text-[var(--brand)] hover:underline font-medium">Clear all filters</button></span>
                ) : `Cycle: ${summaryData.cycle_id} · ${summaryData.channel_level.length} channels · ${summaryData.subchannel_level.length} subchannels · impactable sales = spend × ROI`}
              </div>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
