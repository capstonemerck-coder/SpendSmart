//data-history
import { useState, useRef } from 'react';
import { FileSpreadsheet, Download, Eye, Image, ChevronDown } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from 'recharts';
import {
  PageContainer, PageHeader, Card, CardHeader, KpiCard, Button, Badge,
} from '@/components/shared';

// ── Types & constants ─────────────────────────────────────────────────────────

type DataRow = {
  date: string; variable: string; segment: string;
  spend: number; reach: number; value: number;
  unit?: number; channel: string; sub_channel: string; category: string;
  cycle_id?: string; upload_id?: string; region?: string; product?: string;
};

const PAGE_SIZE = 10;
const CH_PAGE_SIZE = 10;

const channels = [
  'Digital', 'TV', 'Print', 'Events', 'Field',
  'Social', 'Search', 'Display', 'Email', 'Podcast',
  'OOH', 'Radio', 'Influencer', 'Webinar', 'Direct Mail',
];

const mockData: DataRow[] = Array.from({ length: 25 }).map((_, i) => ({
  date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
  variable: 'Sales', segment: 'Oncology',
  spend: Math.floor(Math.random() * 10000),
  reach: Math.floor(Math.random() * 50000),
  value: Math.floor(Math.random() * 100000),
  unit: Math.floor(Math.random() * 50000),
  channel: ['Digital', 'TV', 'Events'][i % 3],
  sub_channel: 'Social', category: 'Media',
}));

const mockData2: DataRow[] = Array.from({ length: 60 }).map((_, i) => ({
  cycle_id: `${i + 1}`,
  date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
  variable: 'Sales', segment: 'Oncology',
  spend: Math.floor(Math.random() * 10000) + 1000,
  reach: Math.floor(Math.random() * 50000) + 5000,
  value: Math.floor(Math.random() * 100000),
  channel: channels[i % channels.length],
  sub_channel: 'Social',
  region: ['NA', 'EU', 'APAC'][i % 3],
  product: ['Keytruda', 'Opdivo'][i % 2],
  category: 'Media',
}));

const dataset = Array.from({ length: 25 }, (_, i) => ({
  cycle_id: `CYC_${i + 1}`,
  date: `2025-01-${String((i % 30) + 1).padStart(2, '0')}`,
  variable: `VAR_${(i % 5) + 1}`,
  segment: `SEG_${(i % 3) + 1}`,
  spend: Math.floor(Math.random() * 1000),
  reach: Math.floor(Math.random() * 5000),
  value: Math.floor(Math.random() * 2000),
  channel: ['Meta', 'Google', 'TikTok', 'LinkedIn'][i % 4],
  sub_channel: ['Paid', 'Organic', 'Display'][i % 3],
  upload_id: `UUID-${i + 1000}`,
}));

// ── Category definitions for channel breakdown ────────────────────────────────

// AFTER
type ChannelCategory = 'HCP-PP' | 'HCP-NPP' | 'Consumer';

const CHANNEL_CATEGORIES: Record<string, ChannelCategory> = {
  // HCP-PP — personal promotion / face-to-face
  Conferences: 'HCP-PP', Field: 'HCP-PP',

  // HCP-NPP — non-personal promotion / digital HCP
  Digital: 'HCP-NPP', Social: 'HCP-NPP', Display: 'HCP-NPP',
  Email: 'HCP-NPP', Influencer: 'HCP-NPP', Webinar: 'HCP-NPP',
  Podcast: 'HCP-NPP', Events: 'HCP-NPP',

  // Consumer — mass/DTC channels
  TV: 'Consumer', Print: 'Consumer', OOH: 'Consumer',
  Radio: 'Consumer', 'Direct Mail': 'Consumer', Search: 'Consumer',
};

const CAT_COLORS: Record<ChannelCategory | string, string> = {
  'HCP-PP':  '#00857C',
  'HCP-NPP': '#3F3F46',
  Consumer:  '#A1A1AA',
};

// ── Export buttons ────────────────────────────────────────────────────────────

function ExportButtons({ showPNG = false }: { showPNG?: boolean }) {
  const [open, setOpen] = useState(false);
  const btnClass =
    'flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-700)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 transition-colors bg-white';

  if (!showPNG) {
    return (
      <button className={btnClass}>
        <Download size={12} className="text-[var(--ink-400)]" />
        Export
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        className={btnClass}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      >
        <Download size={12} className="text-[var(--ink-400)]" />
        Export
        <svg width="10" height="10" viewBox="0 0 10 10" className="ml-0.5 text-[var(--ink-400)]">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] z-20 overflow-hidden">
          <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors">
            <Image size={12} className="text-[var(--ink-400)]" /> Export PNG
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]">
            <FileSpreadsheet size={12} className="text-[var(--ink-400)]" /> Export CSV
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]">
            <Download size={12} className="text-[var(--ink-400)]" /> Export both
          </button>
        </div>
      )}
    </div>
  );
}

// ── Channel Breakdown panel ───────────────────────────────────────────────────

function ChannelBreakdown({ data }: { data: { channel: string; spend: number; reach: number; ratio: number }[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'top10' | 'bottom10'>('all');
  const [channelPage, setChannelPage] = useState(1);

  // 1. Category filter
  const categoryFiltered =
    categoryFilter === 'all'
      ? data
      : data.filter((d) => CHANNEL_CATEGORIES[d.channel] === categoryFilter);

  // 2. Already sorted desc by ratio from parent; re-sort after category filter
  const sorted = [...categoryFiltered].sort((a, b) => b.ratio - a.ratio);

  // 3. Top / bottom 10% slice
let displayList = sorted;

if (performanceFilter === 'top10') {
  const top10Count = Math.ceil(sorted.length * 0.1);
  displayList = sorted.slice(0, top10Count);
} else if (performanceFilter === 'bottom10') {
  const bottom10Count = Math.ceil(sorted.length * 0.1);
  displayList = sorted.slice(-bottom10Count).reverse();
}

// 4. Pagination
const totalPages = Math.ceil(displayList.length / CH_PAGE_SIZE);

const safePage =
  totalPages === 0
    ? 1
    : Math.min(channelPage, totalPages);

const pagedData = displayList.slice(
  (safePage - 1) * CH_PAGE_SIZE,
  safePage * CH_PAGE_SIZE
);
  const maxSpend = Math.max(...pagedData.map((d) => d.spend), 1);
  const maxReach = Math.max(...pagedData.map((d) => d.reach), 1);

  // For badge labels — computed against the full sorted list (all categories)
  const allSorted = [...data].sort((a, b) => b.ratio - a.ratio);
  const topCutoff = Math.max(1, Math.ceil(allSorted.length * 0.1));
  const bottomCutoff = Math.floor(allSorted.length * 0.9);
  const topSet = new Set(allSorted.slice(0, topCutoff).map((d) => d.channel));
  const bottomSet = new Set(allSorted.slice(bottomCutoff).map((d) => d.channel));

  const handleCategoryChange = (v: string) => { setCategoryFilter(v); setChannelPage(1); };
  const handlePerformanceChange = (v: 'all' | 'top10' | 'bottom10') => { setPerformanceFilter(v); setChannelPage(1); };

  const selectClass =
    'text-[11px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-6';

  return (
    <div className="ui-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[var(--ink-900)] mb-0.5">Spend vs reach per channel</p>
          <p className="text-[11px] text-[var(--ink-500)]">Sorted by reach/spend ratio</p>
        </div>
        <ExportButtons showPNG />
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Category dropdown */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={selectClass}
          >
            <option value="all">All Categories</option>
            <option value="HCP-PP">HCP-PP</option>
            <option value="HCP-NPP">HCP-NPP</option>
            <option value="Consumer">Consumer</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
        </div>

        {/* All / Top 10% / Bottom 10% toggle */}
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
  <button
    onClick={() => handlePerformanceChange('all')}
    className={`px-3 py-1 text-[11px] font-medium transition-colors ${
      performanceFilter === 'all'
        ? 'bg-[var(--ink-900)] text-white'
        : 'bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]'
    }`}
  >
    All
  </button>

  <button
    onClick={() => handlePerformanceChange('top10')}
    className={`px-3 py-1 text-[11px] font-medium transition-colors border-l border-[var(--border)] ${
      performanceFilter === 'top10'
        ? 'bg-[var(--ink-900)] text-white'
        : 'bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]'
    }`}
  >
    Top 10%
  </button>

  <button
    onClick={() => handlePerformanceChange('bottom10')}
    className={`px-3 py-1 text-[11px] font-medium transition-colors border-l border-[var(--border)] ${
      performanceFilter === 'bottom10'
        ? 'bg-[var(--ink-900)] text-white'
        : 'bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]'
    }`}
  >
    Bottom 10%
  </button>
</div>

        {/* Legend */}
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#00857C' }} /> Spend
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--ink-500)]">
            <span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#27272A' }} /> Reach
          </span>
        </div>
      </div>

      {/* Table */}
      {displayList.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[var(--ink-400)]">
          No channels match the current filter.{' '}
          <button
            onClick={() => { setCategoryFilter('all'); setPerformanceFilter('all'); }}
            className="text-[var(--brand)] hover:underline font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="w-full">
          {/* Column headers */}
          <div className="grid items-center mb-1 px-2" style={{ gridTemplateColumns: '20px 140px 80px 1fr 1fr' }}>
            <span />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-400)]">Channel</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-400)] text-right pr-4">Ratio</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-400)] pl-3">Spend</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-400)] pl-3">Reach</span>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {pagedData.map(({ channel, spend, reach, ratio }, idx) => {
              const globalRank = (safePage - 1) * CH_PAGE_SIZE + idx + 1;
              const isTop = topSet.has(channel);
              const isBot = bottomSet.has(channel);
              const rowBg = isTop ? 'bg-[#F0FDF4]' : isBot ? 'bg-[#FEF2F2]' : 'bg-transparent';
              const spendPct = (spend / maxSpend) * 100;
              const reachPct = (reach / maxReach) * 100;
              const catKey = CHANNEL_CATEGORIES[channel] as string | undefined;
              const barColor = catKey ? CAT_COLORS[catKey] : '#00857C';

              return (
                <div
                  key={channel}
                  className={`grid items-center py-2.5 px-2 rounded-md transition-colors ${rowBg} hover:brightness-95`}
                  style={{ gridTemplateColumns: '20px 140px 80px 1fr 1fr' }}
                >
                  {/* Rank */}
                  <span className="text-[10px] text-[var(--ink-400)] tabular-nums text-right pr-1">{globalRank}</span>

                  {/* Channel name + badge */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isTop && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1 py-0.5">Top</span>
                    )}
                    {isBot && (
                      <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-red-700 bg-red-100 border border-red-200 rounded px-1 py-0.5">Low</span>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[12px] font-medium text-[var(--ink-900)] truncate">{channel}</span>
                      {catKey && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[catKey] }} />
                          <span className="text-[10px] text-[var(--ink-400)]">{catKey}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ratio */}
                  <div className="text-right pr-4">
                    <span className={`text-[12px] font-semibold tabular-nums ${
                      isTop ? 'text-emerald-700' : isBot ? 'text-red-600' : 'text-[var(--ink-700)]'
                    }`}>
                      {ratio.toFixed(1)}x
                    </span>
                  </div>

                  {/* Spend bar */}
                  <div className="pl-3 pr-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 bg-[var(--surface-subtle)] rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-300"
                          style={{
                            width: `${spendPct}%`,
                            backgroundColor: barColor,
                            opacity: performanceFilter === 'bottom10' ? 0.6 : 1,
                          }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-[var(--ink-500)] w-12 text-right shrink-0">
                        ${(spend / 1000).toFixed(1)}k
                      </span>
                    </div>
                  </div>

                  {/* Reach bar */}
                  <div className="pl-3 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-4 bg-[var(--surface-subtle)] rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm transition-all duration-300"
                          style={{ width: `${reachPct}%`, backgroundColor: '#27272A' }}
                        />
                      </div>
                      <span className="text-[10px] tabular-nums text-[var(--ink-500)] w-12 text-right shrink-0">
                        {(reach / 1000).toFixed(1)}k
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {displayList.length > 0 && totalPages > 1 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-[12px] text-[var(--ink-500)]">
            Showing{' '}
            <span className="font-semibold text-[var(--ink-700)]">
              {(safePage - 1) * CH_PAGE_SIZE + 1}–{Math.min(safePage * CH_PAGE_SIZE, displayList.length)}
            </span>{' '}
            of <span className="font-semibold text-[var(--ink-700)]">{displayList.length}</span> channels
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChannelPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-2 py-1 text-[11px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setChannelPage(page)}
                className={`min-w-[32px] h-8 px-2.5 text-[12px] rounded-md border transition-colors ${
                  page === safePage
                    ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                    : 'bg-white text-[var(--ink-700)] border-[var(--border-strong)] hover:border-[var(--ink-400)]'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setChannelPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-2 py-1 text-[11px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chart height constant ─────────────────────────────────────────────────────
const CHART_H = 280;

// ── Main component ────────────────────────────────────────────────────────────

export default function DataHistory() {
  const [tableOpen, setTableOpen] = useState(false);
  const [trendView, setTrendView] = useState<'spend' | 'revenue' | 'channels'>('spend');
  const [currentPage, setCurrentPage] = useState(1);

  const datasetRef = useRef<HTMLDivElement | null>(null);

  const totalPages = Math.ceil(dataset.length / PAGE_SIZE);
  const paginatedData = dataset.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const spendTrendData = Object.values(
    mockData.reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = { date: row.date, spend: 0 };
      acc[row.date].spend += row.spend;
      return acc;
    }, {} as Record<string, { date: string; spend: number }>),
  ).sort((a, b) => a.date.localeCompare(b.date));

  const revenueTrendData = Object.values(
    mockData.reduce((acc, row) => {
      if (!acc[row.date]) acc[row.date] = { date: row.date, revenue: 0 };
      acc[row.date].revenue += row.value;
      return acc;
    }, {} as Record<string, { date: string; revenue: number }>),
  ).sort((a, b) => a.date.localeCompare(b.date));

  const channelCompareData = channels.map((ch) => {
    const rows = mockData2.filter((r) => r.channel === ch);
    const spend = rows.reduce((s, r) => s + r.spend, 0);
    const reach = rows.reduce((s, r) => s + r.reach, 0);
    const ratio = spend > 0 ? reach / spend : 0;
    return { channel: ch, spend, reach, ratio };
  }).sort((a, b) => b.ratio - a.ratio);

  const totalSales = mockData.reduce((sum, r) => sum + r.value, 0);
  const totalSpend = mockData.reduce((sum, r) => sum + r.spend, 0);
  const totalUnits = mockData.reduce((sum, r) => sum + r.reach, 0);

  const tooltipStyle = {
    backgroundColor: '#fff',
    border: '1px solid #E4E4E7',
    borderRadius: '8px',
    fontSize: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Data History"
        title="Historical performance"
        description="Review aggregated sales, spend and reach metrics across the active cycle."
        actions={
          <Button
            variant="primary"
            leftIcon={<Eye size={14} />}
            onClick={() => {
              setTableOpen(true);
              setTimeout(() => {
                datasetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 100);
            }}
          >
            View data
          </Button>
        }
      />

      <div className="space-y-5">
        {/* ── KPI Summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiCard label="Total Sales" value={`$${(totalSales / 1_000_000).toFixed(2)}M`} />
          <KpiCard label="Total Spend" value={`$${(totalSpend / 1_000_000).toFixed(2)}M`} />
          <KpiCard label="Total Units" value={`${(totalUnits / 1_000).toFixed(0)}K`} />
        </div>

        {/* ── Trends ── */}
        <Card>
          <CardHeader
            title="Trends"
            actions={
              <div className="flex items-center gap-1.5 border border-[var(--border-strong)] rounded-lg p-0.5 bg-[var(--surface-subtle)]">
                {(['spend', 'revenue', 'channels'] as const).map((view) => (
                  <button
                    key={view}
                    onClick={() => setTrendView(view)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
                      trendView === view
                        ? 'bg-white text-[var(--ink-900)] shadow-[var(--shadow-sm)]'
                        : 'text-[var(--ink-500)] hover:text-[var(--ink-700)]'
                    }`}
                  >
                    {view === 'spend' ? 'Spend trend' : view === 'revenue' ? 'Revenue trend' : 'Channel breakdown'}
                  </button>
                ))}
              </div>
            }
          />

          <div className="p-6">
            {/* ── Spend Trend ── */}
            {trendView === 'spend' && (
              <div className="ui-fade-in">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--ink-900)] mb-0.5">Total spend trend</p>
                    <p className="text-[11px] text-[var(--ink-500)]">Daily spend aggregated across all channels</p>
                  </div>
                  <ExportButtons showPNG />
                </div>
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <LineChart data={spendTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                    <XAxis dataKey="date" stroke="#A1A1AA" style={{ fontSize: '11px' }} tickLine={false} axisLine={{ stroke: '#E4E4E7' }} />
                    <YAxis stroke="#A1A1AA" style={{ fontSize: '11px' }} tickLine={false} axisLine={{ stroke: '#E4E4E7' }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v}`, 'Spend']} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="spend" stroke="#00857C" strokeWidth={2} dot={{ fill: '#00857C', stroke: '#fff', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Revenue Trend ── */}
            {trendView === 'revenue' && (
              <div className="ui-fade-in">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--ink-900)] mb-0.5">Total revenue trend</p>
                    <p className="text-[11px] text-[var(--ink-500)]">Daily revenue aggregated across all channels</p>
                  </div>
                  <ExportButtons showPNG />
                </div>
                <ResponsiveContainer width="100%" height={CHART_H}>
                  <LineChart data={revenueTrendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                    <XAxis dataKey="date" stroke="#A1A1AA" style={{ fontSize: '11px' }} tickLine={false} axisLine={{ stroke: '#E4E4E7' }} />
                    <YAxis stroke="#A1A1AA" style={{ fontSize: '11px' }} tickLine={false} axisLine={{ stroke: '#E4E4E7' }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`$${v}`, 'Revenue']} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#00857C" strokeWidth={2} dot={{ fill: '#00857C', stroke: '#fff', strokeWidth: 2, r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ── Channel Breakdown ── */}
            {trendView === 'channels' && (
              <ChannelBreakdown data={channelCompareData} />
            )}
          </div>
        </Card>

        {/* ── Dataset Table ── */}
        {tableOpen && (
          <div ref={datasetRef}>
            <Card>
              <CardHeader
                title="DATA_FACT_HISTORICAL"
                subtitle={`${dataset.length} rows · paginated`}
                actions={
                  <div className="flex items-center gap-2">
                    <ExportButtons />
                  </div>
                }
              />

              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                    <tr>
                      {['cycle_id', 'date', 'variable', 'segment', 'spend', 'reach', 'value', 'channel', 'sub_channel', 'upload_id'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left ui-eyebrow text-[var(--ink-500)] font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, i) => (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition-colors">
                        <td className="px-4 py-2.5 text-[var(--ink-900)] font-medium">{row.cycle_id}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.date}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)]">{row.variable}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)]">{row.segment}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.spend}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.reach}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)] tabular-nums">{row.value}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone="neutral" className="!text-[10.5px]">{row.channel}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-[var(--ink-700)]">{row.sub_channel}</td>
                        <td className="px-4 py-2.5 text-[var(--ink-500)] font-mono text-[11px]">{row.upload_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] rounded-b-[12px] flex items-center justify-between">
                <p className="text-[12px] text-[var(--ink-500)]">
                  Showing{' '}
                  <span className="font-semibold text-[var(--ink-700)]">
                    {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, dataset.length)}
                  </span>{' '}
                  of <span className="font-semibold text-[var(--ink-700)]">{dataset.length}</span>
                </p>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`min-w-[32px] h-8 px-2.5 text-[12px] rounded-md border transition-colors ${
                        currentPage === i + 1
                          ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                          : 'bg-white text-[var(--ink-700)] border-[var(--border-strong)] hover:border-[var(--ink-400)]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  );
}