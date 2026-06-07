/**
 * ModelSummary
 *
 * Read-only view of the MMM channel/subchannel parameter data uploaded during
 * Data Input.  Surfaces ROI coefficients, spend bounds, and a calculated
 * baseline KPI (sum of min_spend × roi_coefficient across all subchannels)
 * so users understand the model foundation before running scenarios.
 *
 * Filter state (market, brand, indication) is read from FilterContext — the
 * FilterBar in AppShell writes to that context.  A new API call is issued
 * whenever any filter changes.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import {
  Download, CheckCircle2, Search, ChevronDown, ChevronsUpDown,
  Info, ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowUpDown, ListFilter,
} from 'lucide-react';
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  KpiCard,
  Button,
  TabPills,
  Badge,
} from '@/components/shared';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { useFilters } from '@/context/FilterContext';
import { useModelSummary } from '@/hooks/useModelSummary';
import type { SubChannelSummary } from '@/utils/types';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fixed palette assigned to channels in order of appearance. */
const CHANNEL_COLORS = [
  '#00857C', '#3F3F46', '#A1A1AA', '#0EA5E9', '#F59E0B',
  '#EF4444', '#8B5CF6', '#10B981', '#F97316', '#6366F1',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Format a numeric dollar value as $X.XM / $X.XK / $X. */
function formatMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChartChannel {
  name: string;
  /** Spend in $M */
  spend: number;
  /** Projected impactable sales in $M = spend × roi */
  sales: number;
  color: string;
}

interface ChartSubchannel {
  name: string;
  category: string;
  roi: number;
}

interface ScatterSubchannel {
  name: string;
  channel: string;
  category: string;
  /** Spend in $M */
  spend: number;
  /** Projected sales in $M */
  sales: number;
  roi: string;
}

// ── Chevron ───────────────────────────────────────────────────────────────────

const Chevron = ({
  open,
  className = '',
  style,
}: {
  open: boolean;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    className={`transition-transform duration-150 flex-shrink-0 ${open ? 'rotate-90' : ''} ${className}`}
    style={style}
    fill="none"
  >
    <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Grouped Bar Chart ─────────────────────────────────────────────────────────

/**
 * GroupedBarChart
 *
 * Renders spend (hatched) vs projected impactable sales (solid) per channel.
 * Each channel is a group; values are in $M on the y-axis.
 *
 * @param {{ channels: ChartChannel[] }} props
 */
function GroupedBarChart({ channels }: { channels: ChartChannel[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 500, height: 240 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setDims({ width: w, height: Math.round(Math.max(200, w * 0.4)) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[12px] text-[var(--ink-400)]">
        No channel data available
      </div>
    );
  }

  const { width: W, height: H } = dims;
  const PAD = { t: 16, r: 20, b: 44, l: 52 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const maxVal = Math.max(...channels.flatMap((d) => [d.spend, d.sales])) * 1.15 || 1;
  const groupW = plotW / channels.length;
  const barW = groupW * 0.28;
  const gap = groupW * 0.05;
  const toY = (v: number) => PAD.t + plotH - (v / maxVal) * plotH;

  // Compute readable y-axis ticks from maxVal
  const tickCount = 5;
  const rawStep = maxVal / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const tickStep = Math.ceil(rawStep / magnitude) * magnitude;
  const yTicks = Array.from({ length: tickCount + 1 }, (_, i) => i * tickStep).filter((t) => t <= maxVal * 1.2);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        <defs>
          {channels.map((d) => (
            <pattern key={`hatch-${d.name}`} id={`hatch-${d.name}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke={d.color} strokeWidth="2.5" />
            </pattern>
          ))}
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={toY(t)} y2={toY(t)} stroke="#F4F4F5" strokeWidth="1" />
            <text x={PAD.l - 6} y={toY(t) + 4} textAnchor="end" fontSize="9" fill="#A1A1AA">
              {t >= 1 ? `$${t.toFixed(0)}M` : `$${(t * 1000).toFixed(0)}K`}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />

        {channels.map((d, i) => {
          const groupCx = PAD.l + groupW * i + groupW / 2;
          const spendX = groupCx - barW - gap / 2;
          const salesX = groupCx + gap / 2;
          const spendH = (d.spend / maxVal) * plotH;
          const salesH = (d.sales / maxVal) * plotH;

          return (
            <g key={d.name}>
              <rect
                x={spendX} y={toY(d.spend)} width={barW} height={spendH}
                fill={`url(#hatch-${d.name})`} stroke={d.color} strokeWidth="1" rx="2"
                className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                onMouseMove={(e) => {
                  const r = containerRef.current?.getBoundingClientRect();
                  if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${d.name} — Spend: ${formatMoney(d.spend * 1_000_000)}` });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              <rect
                x={salesX} y={toY(d.sales)} width={barW} height={salesH}
                fill={d.color} rx="2"
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseMove={(e) => {
                  const r = containerRef.current?.getBoundingClientRect();
                  if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${d.name} — Proj. Sales: ${formatMoney(d.sales * 1_000_000)}` });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              <text
                x={groupCx} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#52525B" fontWeight="500"
                style={{ fontSize: channels.length > 6 ? '8px' : '9px' }}
              >
                {d.name.length > 12 ? `${d.name.slice(0, 11)}…` : d.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-5 mt-2 px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <defs><pattern id="hatch-legend" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#52525B" strokeWidth="2" /></pattern></defs>
            <rect x="1" y="1" width="12" height="12" rx="2" fill="url(#hatch-legend)" stroke="#52525B" strokeWidth="1" />
          </svg>
          <span className="text-[11px] text-[var(--ink-500)]">Min Spend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#52525B" /></svg>
          <span className="text-[11px] text-[var(--ink-500)]">Projected Sales</span>
        </div>
        <span className="text-[10.5px] text-[var(--ink-400)]">· Bar color matches channel</span>
      </div>

      {tooltip && (
        <div
          className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md"
          style={{ left: Math.min(tooltip.x + 12, dims.width - 200), top: Math.max(tooltip.y - 36, 4) }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ── Top / Bottom Channels ─────────────────────────────────────────────────────

/**
 * TopBottomChannels
 *
 * Paginated horizontal bar list of subchannels ranked by ROI coefficient.
 * Supports category (channel) filtering and top/bottom 10% views.
 *
 * @param {{ subchannels: ChartSubchannel[]; channelColors: Record<string, string> }} props
 */
function TopBottomChannels({
  subchannels,
  channelColors,
}: {
  subchannels: ChartSubchannel[];
  channelColors: Record<string, string>;
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'top10' | 'bottom10'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const uniqueChannels = useMemo(
    () => Array.from(new Set(subchannels.map((s) => s.category))).sort(),
    [subchannels],
  );

  const categoryFiltered = categoryFilter === 'all'
    ? subchannels
    : subchannels.filter((s) => s.category === categoryFilter);

  const sorted = [...categoryFiltered].sort((a, b) => b.roi - a.roi);

  let displayList = sorted;
  if (performanceFilter === 'top10') {
    const count = Math.ceil(sorted.length * 0.1);
    displayList = sorted.slice(0, count);
  } else if (performanceFilter === 'bottom10') {
    const count = Math.ceil(sorted.length * 0.1);
    displayList = sorted.slice(-count).reverse();
  }

  const totalPages = Math.ceil(displayList.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedList = displayList.slice(startIdx, startIdx + itemsPerPage);
  const maxRoi = sorted[0]?.roi || 1;

  const handleCategoryChange = (cat: string) => { setCategoryFilter(cat); setCurrentPage(1); };
  const handlePerformanceChange = (perf: 'all' | 'top10' | 'bottom10') => { setPerformanceFilter(perf); setCurrentPage(1); };

  if (subchannels.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[12px] text-[var(--ink-400)]">
        No subchannel data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[13px] font-semibold text-[var(--ink-900)]">Subchannels by ROI</span>

        <div className="relative ml-auto">
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="text-[11px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-6"
          >
            <option value="all">All Channels</option>
            {uniqueChannels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
        </div>

        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          {(['all', 'top10', 'bottom10'] as const).map((v, i) => (
            <button
              key={v}
              onClick={() => handlePerformanceChange(v)}
              className={`px-3 py-1 text-[11px] font-medium transition-colors ${i > 0 ? 'border-l border-[var(--border)]' : ''} ${performanceFilter === v ? 'bg-[var(--ink-900)] text-white' : 'bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]'}`}
            >
              {v === 'all' ? 'All' : v === 'top10' ? 'Top 10%' : 'Bottom 10%'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 flex-1 mb-4">
        {paginatedList.map((item, i) => {
          const color = channelColors[item.category] ?? '#A1A1AA';
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--ink-400)] w-5 text-right tabular-nums flex-shrink-0">
                {startIdx + i + 1}
              </span>
              <div className="w-32 flex-shrink-0">
                <div className="text-[12px] font-medium text-[var(--ink-800)] truncate">{item.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[10px] text-[var(--ink-400)]">{item.category}</span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--surface-subtle)] h-5 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${(item.roi / maxRoi) * 100}%`,
                    background: color,
                    opacity: performanceFilter === 'bottom10' ? 0.6 : 1,
                  }}
                />
              </div>
              <span className="text-[12px] font-semibold text-[var(--ink-900)] w-8 text-right tabular-nums flex-shrink-0">
                {item.roi.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--ink-500)]">
            Showing {startIdx + 1}–{Math.min(startIdx + itemsPerPage, displayList.length)} of {displayList.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-[11px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${page === currentPage ? 'bg-[var(--ink-900)] text-white' : 'text-[var(--ink-700)] border border-[var(--border)] hover:bg-[var(--surface-subtle)]'}`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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

// ── Scatter Chart ─────────────────────────────────────────────────────────────

/**
 * ScatterChart
 *
 * Plots subchannels as dots with min_spend on x-axis and projected impactable
 * sales on y-axis.  A dashed line shows average efficiency (sales/spend ratio).
 * Dots above the line over-perform; dots below under-perform.
 *
 * @param {{ subchannels: ScatterSubchannel[]; channelColors: Record<string, string> }} props
 */
function ScatterChart({
  subchannels,
  channelColors,
}: {
  subchannels: ScatterSubchannel[];
  channelColors: Record<string, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 600, height: 240 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: ScatterSubchannel } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setDims({ width: w, height: Math.round(Math.max(200, w * 0.24)) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (subchannels.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[12px] text-[var(--ink-400)]">
        No subchannel data available
      </div>
    );
  }

  const { width: W, height: H } = dims;
  const PAD = { t: 20, r: 24, b: 44, l: 60 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const maxSpend = Math.max(...subchannels.map((s) => s.spend)) * 1.15 || 1;
  const maxSales = Math.max(...subchannels.map((s) => s.sales)) * 1.15 || 1;

  const toX = (v: number) => PAD.l + (v / maxSpend) * plotW;
  const toY = (v: number) => PAD.t + plotH - (v / maxSales) * plotH;

  const avgRatio = subchannels.length > 0
    ? subchannels.reduce((a, d) => a + (d.spend > 0 ? d.sales / d.spend : 0), 0) / subchannels.length
    : 0;

  // Generate readable axis ticks
  const xStep = maxSpend / 4;
  const yStep = maxSales / 4;
  const xTicks = Array.from({ length: 5 }, (_, i) => i * xStep);
  const yTicks = Array.from({ length: 5 }, (_, i) => i * yStep);

  const DOT_R = 6;

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', width: '100%', height: 'auto' }}>
        {yTicks.map((t) => {
          const y = toY(t);
          return (
            <g key={`y${t}`}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#F4F4F5" strokeWidth="1" />
              <text x={PAD.l - 8} y={t === 0 ? y - 4 : y + 4} textAnchor="end" fontSize="9" fill="#A1A1AA">
                {t >= 1 ? `$${t.toFixed(1)}M` : `$${(t * 1000).toFixed(0)}K`}
              </text>
            </g>
          );
        })}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={toX(t)} x2={toX(t)} y1={PAD.t} y2={H - PAD.b} stroke="#F4F4F5" strokeWidth="1" />
            <text x={toX(t)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#A1A1AA">
              {t >= 1 ? `$${t.toFixed(1)}M` : `$${(t * 1000).toFixed(0)}K`}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <text x={PAD.l + plotW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#71717A" fontWeight="500">Min Spend ($M)</text>
        <text x={16} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="10" fill="#71717A" fontWeight="500" transform={`rotate(-90, 16, ${PAD.t + plotH / 2})`}>Projected Sales ($M)</text>

        {avgRatio > 0 && (() => {
          const lineEndX = Math.min(maxSales / avgRatio, maxSpend * 0.88);
          const lineEndY = lineEndX * avgRatio;
          return (
            <>
              <line x1={toX(0)} y1={toY(0)} x2={toX(lineEndX)} y2={toY(lineEndY)} stroke="#00857C" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
              <text x={toX(lineEndX) - 6} y={toY(lineEndY) - 6} fontSize="9.5" fill="#00857C" textAnchor="end" fontWeight="500">avg efficiency</text>
            </>
          );
        })()}

        {subchannels.map((d, i) => (
          <circle
            key={i}
            cx={toX(d.spend)} cy={toY(d.sales)} r={DOT_R}
            fill={channelColors[d.category] ?? '#A1A1AA'}
            stroke="white" strokeWidth="2"
            style={{ cursor: 'pointer' }}
            onMouseMove={(e) => {
              const rect = containerRef.current?.getBoundingClientRect();
              if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, d });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md"
          style={{ left: Math.min(Math.max(tooltip.x + 14, 0), dims.width - 200), top: Math.max(tooltip.y - 80, 4) }}
        >
          <div className="font-semibold mb-1">{tooltip.d.name}</div>
          <div className="text-white/70">Channel: {tooltip.d.channel}</div>
          <div className="text-white/70">Min Spend: {formatMoney(tooltip.d.spend * 1_000_000)}</div>
          <div className="text-white/70">Proj. Sales: {formatMoney(tooltip.d.sales * 1_000_000)}</div>
          <div className="text-white/70">ROI: {tooltip.d.roi}</div>
        </div>
      )}
    </div>
  );
}

// ── Info Tip ──────────────────────────────────────────────────────────────────

function InfoTip() {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const show = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX - 180 });
  };
  const hide = () => setPos(null);
  return (
    <>
      <Info size={13} onMouseEnter={show} onMouseLeave={hide} className="text-white/60 hover:text-white cursor-pointer transition-colors flex-shrink-0" />
      {pos && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 99999 }} className="w-52 bg-white border border-[var(--border)] text-[var(--ink-800)] text-[11px] rounded-lg px-3.5 py-3 leading-relaxed shadow-xl pointer-events-none">
          <p className="font-semibold text-[var(--ink-900)] mb-1">Spend vs Contribution</p>
          <p className="mb-1"><span className="font-medium text-[var(--ink-900)]">Spend %</span> — share of total min spend budget.</p>
          <p className="mb-1"><span className="font-medium text-[var(--ink-900)]">Contri %</span> — share of total projected incremental sales.</p>
          <p>↑ channel over-delivers vs its spend share.</p>
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Export Button ─────────────────────────────────────────────────────────────

function ExportButton({
  withDropdown = false,
  onExport,
  isExported,
}: {
  withDropdown?: boolean;
  onExport: () => void;
  isExported: boolean;
}) {
  const [open, setOpen] = useState(false);
  const btnClass = 'flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-700)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 transition-colors bg-white';

  if (!withDropdown) {
    return (
      <div className="flex items-center gap-2">
        <button className={btnClass} onClick={onExport}><Download size={12} className="text-[var(--ink-400)]" />Export</button>
        {isExported && <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button className={btnClass} onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}>
          <Download size={12} className="text-[var(--ink-400)]" />
          Export
          <svg width="10" height="10" viewBox="0 0 10 10" className="ml-0.5 text-[var(--ink-400)]"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] z-20 overflow-hidden">
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors" onClick={() => { onExport(); setOpen(false); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              Export PNG
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]" onClick={() => { onExport(); setOpen(false); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              Export CSV
            </button>
          </div>
        )}
      </div>
      {isExported && <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>}
    </div>
  );
}

// ── Table Filter Bar ──────────────────────────────────────────────────────────

function TableFilterBar({
  search, setSearch,
  categoryFilter, setCategoryFilter,
  performanceFilter, setPerformanceFilter,
  categories,
  onExpandAll, onCollapseAll,
}: {
  search: string; setSearch: (v: string) => void;
  categoryFilter: string; setCategoryFilter: (v: string) => void;
  performanceFilter: string; setPerformanceFilter: (v: string) => void;
  categories: string[];
  onExpandAll: () => void; onCollapseAll: () => void;
}) {
  const selectClass = 'text-[12px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-7 relative';

  return (
    <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px] max-w-[240px]">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
        <input
          type="text"
          placeholder="Search channels…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-[12px] pl-7 pr-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-white placeholder:text-[var(--ink-400)] text-[var(--ink-800)] focus:outline-none focus:border-[var(--brand)] transition-colors"
        />
      </div>
      <div className="relative">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
          <option value="all">All Channels</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
      </div>
      <div className="relative">
        <select value={performanceFilter} onChange={(e) => setPerformanceFilter(e.target.value)} className={selectClass}>
          <option value="all">All Performance</option>
          <option value="over">Over-performing ↑</option>
          <option value="under">Under-performing ↓</option>
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={onExpandAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">
          <ChevronsUpDown size={11} />Expand all
        </button>
        <button onClick={onCollapseAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">
          Collapse all
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * ModelSummary
 *
 * Reads market/brand/indication from FilterContext, fetches channel parameter
 * data from GET /reports/model-summary, and renders the full model insights
 * screen with KPI cards, channel performance charts, and a hierarchical
 * channel/subchannel table.
 */
export default function ModelSummary() {
  const { filters } = useFilters();
  const { market, brand, indication } = filters;

  const { summaryData, isLoading, error, refetch } = useModelSummary(market, brand, indication);

  // UI state
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [overviewTab, setOverviewTab] = useState<'spend-channels' | 'efficiency'>('spend-channels');
  const [exportedItems, setExportedItems] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'roi', dir: 'desc' });

  // ── Derived data from API response ──────────────────────────────────────────

  /**
   * Group subchannels by channel name.  Each entry holds the aggregated totals
   * for that channel plus its subchannel list.
   */
  const channelGroups = useMemo(() => {
    if (!summaryData) return [];

    const map = new Map<string, { subchannels: SubChannelSummary[]; totalSpend: number; totalSales: number }>();
    for (const sub of summaryData.channels) {
      if (!map.has(sub.channel)) map.set(sub.channel, { subchannels: [], totalSpend: 0, totalSales: 0 });
      const entry = map.get(sub.channel)!;
      entry.subchannels.push(sub);
      entry.totalSpend += sub.currentSpend;
      entry.totalSales += sub.currentSpend * sub.roiCoefficient;
    }

    return Array.from(map.entries()).map(([name, data], idx) => ({
      name,
      totalSpend: data.totalSpend,
      totalSales: data.totalSales,
      avgRoi: data.totalSpend > 0 ? data.totalSales / data.totalSpend : 0,
      color: CHANNEL_COLORS[idx % CHANNEL_COLORS.length],
      subchannels: data.subchannels,
    }));
  }, [summaryData]);

  /** Color map keyed by channel name — passed to chart components. */
  const channelColorMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    channelGroups.forEach((ch) => { m[ch.name] = ch.color; });
    return m;
  }, [channelGroups]);

  const grandTotalSpend = useMemo(
    () => channelGroups.reduce((a, ch) => a + ch.totalSpend, 0),
    [channelGroups],
  );
  const grandTotalSales = useMemo(
    () => channelGroups.reduce((a, ch) => a + ch.totalSales, 0),
    [channelGroups],
  );

  /** Data for GroupedBarChart — channel level, values in $M. */
  const chartChannels = useMemo<ChartChannel[]>(() =>
    channelGroups.map((ch) => ({
      name: ch.name,
      spend: ch.totalSpend / 1_000_000,
      sales: ch.totalSales / 1_000_000,
      color: ch.color,
    })),
    [channelGroups],
  );

  /** Data for TopBottomChannels — subchannel ROI ranking. */
  const chartSubchannels = useMemo<ChartSubchannel[]>(() =>
    (summaryData?.channels ?? []).map((s) => ({
      name: s.subChannel,
      category: s.channel,
      roi: s.roiCoefficient,
    })),
    [summaryData],
  );

  /** Data for ScatterChart — subchannel spend vs projected sales. */
  const chartScatter = useMemo<ScatterSubchannel[]>(() =>
    (summaryData?.channels ?? []).map((s) => ({
      name: s.subChannel,
      channel: s.channel,
      category: s.channel,
      spend: s.currentSpend / 1_000_000,
      sales: (s.currentSpend * s.roiCoefficient) / 1_000_000,
      roi: s.roiCoefficient.toFixed(2),
    })),
    [summaryData],
  );

  const channelNames = useMemo(() => channelGroups.map((ch) => ch.name), [channelGroups]);

  // ── Table helpers ───────────────────────────────────────────────────────────

  const handleSort = (col: string) => {
    setSortConfig((prev) =>
      prev.col === col && prev.dir === 'asc'
        ? { col, dir: 'desc' }
        : { col, dir: prev.col === col ? 'asc' : 'desc' },
    );
  };
  const isSortAsc = (col: string) => sortConfig.col === col && sortConfig.dir === 'asc';
  const isSortActive = (col: string) => sortConfig.col === col;
  const isAnythingExpanded = expandedChannels.size > 0;

  const sortVal = (ch: typeof channelGroups[0], col: string): number => {
    if (col === 'spend') return ch.totalSpend;
    if (col === 'sales') return ch.totalSales;
    if (col === 'contrib') return grandTotalSpend > 0 ? (ch.totalSales / grandTotalSales) - (ch.totalSpend / grandTotalSpend) : 0;
    if (col === 'roi') return ch.avgRoi;
    return 0;
  };

  const sortSubchannel = (sub: SubChannelSummary, col: string): number => {
    if (col === 'spend') return sub.currentSpend;
    if (col === 'sales') return sub.currentSpend * sub.roiCoefficient;
    if (col === 'roi') return sub.roiCoefficient;
    return 0;
  };

  const toggleChannel = (name: string) => {
    const next = new Set(expandedChannels);
    next.has(name) ? next.delete(name) : next.add(name);
    setExpandedChannels(next);
  };

  const handleExpandAll = () => setExpandedChannels(new Set(channelGroups.map((ch) => ch.name)));
  const handleCollapseAll = () => setExpandedChannels(new Set());

  const markExported = (key: string) => setExportedItems((s) => new Set([...s, key]));

  // Auto-expand when search or performance filter is active
  useEffect(() => {
    if (search || performanceFilter !== 'all') {
      setExpandedChannels(new Set(channelGroups.map((ch) => ch.name)));
    }
  }, [search, performanceFilter, categoryFilter]);

  // Expand channels when sort changes
  useEffect(() => {
    setExpandedChannels(new Set(channelGroups.map((ch) => ch.name)));
  }, [sortConfig]);

  // ── Filtered + sorted table data ────────────────────────────────────────────

  const searchLower = search.toLowerCase();

  const filteredChannels = useMemo(() => {
    const spendShare = (ch: typeof channelGroups[0]) =>
      grandTotalSpend > 0 ? (ch.totalSpend / grandTotalSpend) * 100 : 0;
    const salesShare = (ch: typeof channelGroups[0]) =>
      grandTotalSales > 0 ? (ch.totalSales / grandTotalSales) * 100 : 0;

    return channelGroups
      .filter((ch) => {
        if (categoryFilter !== 'all' && ch.name !== categoryFilter) return false;
        const nameMatch = !search ||
          ch.name.toLowerCase().includes(searchLower) ||
          ch.subchannels.some((s) => s.subChannel.toLowerCase().includes(searchLower));
        if (!nameMatch) return false;
        if (performanceFilter === 'over' && salesShare(ch) <= spendShare(ch)) return false;
        if (performanceFilter === 'under' && salesShare(ch) >= spendShare(ch)) return false;
        return true;
      })
      .sort((a, b) => {
        const v = sortVal(a, sortConfig.col) - sortVal(b, sortConfig.col);
        return sortConfig.dir === 'asc' ? v : -v;
      })
      .map((ch) => ({
        ...ch,
        subchannels: [...ch.subchannels]
          .filter((s) => !search || s.subChannel.toLowerCase().includes(searchLower) || ch.name.toLowerCase().includes(searchLower))
          .sort((a, b) => {
            const v = sortSubchannel(a, sortConfig.col) - sortSubchannel(b, sortConfig.col);
            return sortConfig.dir === 'asc' ? v : -v;
          }),
      }));
  }, [channelGroups, categoryFilter, search, performanceFilter, sortConfig, grandTotalSpend, grandTotalSales]);

  const hasActiveFilters = search || categoryFilter !== 'all' || performanceFilter !== 'all';
  const filtersComplete = !!market && !!brand && !!indication;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Model Insights"
        title="Current performance"
        description="Channel-level spend, contribution and ROI based on uploaded channel parameters."
      />

      <div className="space-y-5">
        {/* Loading */}
        {isLoading && <LoadingState message="Loading model summary…" />}

        {/* Error */}
        {!isLoading && error && (
          <ErrorState
            title="Failed to load model data"
            message={error}
            onRetry={refetch}
          />
        )}

        {/* No filters selected */}
        {!isLoading && !error && !filtersComplete && (
          <EmptyState
            title="Select filters to continue"
            message="Choose a Market, Brand, and Indication from the filter bar above to load model summary data."
          />
        )}

        {/* Filters complete but no data */}
        {!isLoading && !error && filtersComplete && !summaryData && (
          <EmptyState
            title="No model data found"
            message="No channel parameters have been uploaded for the selected market, brand, and indication. Use Data Input to upload a channel parameter file."
          />
        )}

        {/* Data loaded */}
        {!isLoading && !error && summaryData && (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-stretch">
              <KpiCard
                label="Baseline KPI"
                value={formatMoney(summaryData.baselineKpi)}
              />
              <KpiCard
                label="Total spend"
                value={formatMoney(summaryData.totalSpend)}
              />
              <KpiCard
                label="Overall ROI"
                value={summaryData.overallRoi.toFixed(2)}
              />
              <Card className="lg:col-span-3 !rounded-lg !shadow-none px-5 py-4 flex flex-col justify-center">
                <div className="ui-eyebrow mb-2.5">Spend vs projected sales split</div>
                <div className="w-full h-7 flex overflow-hidden rounded-md">
                  {channelGroups.length > 0 ? channelGroups.map((ch, i) => {
                    const pct = grandTotalSpend > 0 ? (ch.totalSpend / grandTotalSpend) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center text-[11px] text-white font-medium overflow-hidden"
                        style={{ width: `${pct}%`, background: ch.color, minWidth: pct > 5 ? undefined : 0 }}
                        title={`${ch.name}: ${pct.toFixed(1)}%`}
                      >
                        {pct > 8 ? `${pct.toFixed(0)}%` : ''}
                      </div>
                    );
                  }) : (
                    <div className="flex-1 bg-[var(--surface-subtle)] flex items-center justify-center text-[11px] text-[var(--ink-400)]">—</div>
                  )}
                </div>
                <div className="flex justify-between text-[11.5px] text-[var(--ink-500)] mt-2">
                  <span>Cycle: <span className="font-semibold text-[var(--ink-900)] font-mono">{summaryData.cycleId}</span></span>
                  <span>{channelGroups.length} channel{channelGroups.length !== 1 ? 's' : ''} · {summaryData.channels.length} subchannel{summaryData.channels.length !== 1 ? 's' : ''}</span>
                </div>
              </Card>
            </div>

            {/* Channel performance overview */}
            <Card>
              <CardHeader
                title="Channel performance overview"
                actions={
                  <div className="flex items-center gap-2">
                    <TabPills
                      value={overviewTab}
                      onChange={setOverviewTab}
                      options={[
                        { value: 'spend-channels', label: 'Spend & Channels' },
                        { value: 'efficiency', label: 'Subchannel Efficiency' },
                      ]}
                    />
                    <ExportButton withDropdown onExport={() => markExported('overview')} isExported={exportedItems.has('overview')} />
                  </div>
                }
              />

              {overviewTab === 'spend-channels' && (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 ui-fade-in">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--ink-900)] mb-1">Min spend vs projected sales by channel</div>
                    <div className="text-[11.5px] text-[var(--ink-500)] mb-4">Compare configured minimum spend allocation against projected impactable sales per channel</div>
                    <GroupedBarChart channels={chartChannels} />
                  </div>
                  <div className="lg:border-l lg:border-[var(--border)] lg:pl-8">
                    <TopBottomChannels subchannels={chartSubchannels} channelColors={channelColorMap} />
                  </div>
                </div>
              )}

              {overviewTab === 'efficiency' && (
                <div className="px-6 py-5 ui-fade-in">
                  <div className="mb-3">
                    <div className="text-[13px] font-semibold text-[var(--ink-900)] mb-1">Subchannel efficiency — min spend vs projected sales</div>
                    <div className="text-[11.5px] text-[var(--ink-500)]">Subchannels above the average efficiency line deliver more projected sales per dollar of min spend</div>
                  </div>
                  <ScatterChart subchannels={chartScatter} channelColors={channelColorMap} />
                  <div className="flex gap-5 mt-3 pt-3 border-t border-[var(--border)] flex-wrap">
                    {channelGroups.map((ch) => (
                      <div key={ch.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: ch.color }} />
                        <span className="text-[11.5px] text-[var(--ink-700)]">{ch.name}</span>
                      </div>
                    ))}
                    <span className="text-[11px] text-[var(--ink-400)] ml-2">· Hover dots for details</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Channel contribution detail table */}
            <Card>
              <CardHeader
                title="Channel contribution detail"
                actions={
                  <ExportButton onExport={() => markExported('detail')} isExported={exportedItems.has('detail')} />
                }
              />

              <TableFilterBar
                search={search} setSearch={setSearch}
                categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
                performanceFilter={performanceFilter} setPerformanceFilter={setPerformanceFilter}
                categories={channelNames}
                onExpandAll={handleExpandAll}
                onCollapseAll={handleCollapseAll}
              />

              <div className="overflow-x-auto" style={{ overflowX: 'auto', overflowY: 'visible' }}>
                <div style={{ minWidth: '700px' }}>
                  {/* Table header */}
                  <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--ink-900)]">
                    <div className="text-[10.5px] font-semibold text-white/60 uppercase tracking-[0.1em]">Channel hierarchy</div>
                    {(['spend', 'sales'] as const).map((col) => {
                      const label = col === 'spend' ? 'Min Spend' : 'Proj. Sales';
                      return (
                        <button
                          key={col}
                          onClick={() => isAnythingExpanded && handleSort(col)}
                          className={`flex items-center justify-end gap-1 w-full transition-all ${isAnythingExpanded ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-60'}`}
                        >
                          <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${isSortActive(col) ? 'text-white' : 'text-white/60'}`}>{label}</span>
                          {isAnythingExpanded && (isSortAsc(col) ? <ArrowUpNarrowWide size={12} className="text-white flex-shrink-0" /> : isSortActive(col) ? <ArrowDownWideNarrow size={12} className="text-white flex-shrink-0" /> : <ArrowUpDown size={12} className="text-white/25 flex-shrink-0" />)}
                        </button>
                      );
                    })}
                    <div className="flex items-center justify-end gap-1">
                      <InfoTip />
                      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${performanceFilter !== 'all' ? 'text-white' : 'text-white/60'}`}>Spend vs Contribution</span>
                      <button
                        onClick={() => setPerformanceFilter((p) => p === 'all' ? 'over' : p === 'over' ? 'under' : 'all')}
                        className={`flex-shrink-0 rounded p-0.5 transition-all hover:bg-white/20 ${performanceFilter !== 'all' ? 'text-white' : 'text-white/30 hover:text-white/70'}`}
                      >
                        <ListFilter size={13} />
                      </button>
                    </div>
                    <button
                      onClick={() => isAnythingExpanded && handleSort('roi')}
                      className={`flex items-center justify-end gap-1 w-full transition-all ${isAnythingExpanded ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-60'}`}
                    >
                      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${isSortActive('roi') ? 'text-white' : 'text-white/60'}`}>ROI</span>
                      {isAnythingExpanded && (isSortAsc('roi') ? <ArrowUpNarrowWide size={12} className="text-white flex-shrink-0" /> : isSortActive('roi') ? <ArrowDownWideNarrow size={12} className="text-white flex-shrink-0" /> : <ArrowUpDown size={12} className="text-white/25 flex-shrink-0" />)}
                    </button>
                  </div>

                  {/* Table body */}
                  <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
                    {filteredChannels.length === 0 ? (
                      <div className="px-5 py-10 text-center text-[13px] text-[var(--ink-400)]">
                        No channels match your filters.{' '}
                        <button
                          onClick={() => { setSearch(''); setCategoryFilter('all'); setPerformanceFilter('all'); }}
                          className="text-[var(--brand)] hover:underline font-medium"
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      filteredChannels.map((channel, ci) => {
                        const chOpen = expandedChannels.has(channel.name);
                        const spendPct = grandTotalSpend > 0 ? (channel.totalSpend / grandTotalSpend) * 100 : 0;
                        const salesPct = grandTotalSales > 0 ? (channel.totalSales / grandTotalSales) * 100 : 0;
                        const chBetter = salesPct > spendPct;

                        return (
                          <div key={ci} className="border-b-2 border-[var(--surface-subtle)] last:border-b-0">
                            {/* Channel row */}
                            <div
                              className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer border-b border-[var(--border)]"
                              onClick={() => toggleChannel(channel.name)}
                            >
                              <div className="flex items-center gap-2">
                                <Chevron open={chOpen} style={{ color: channel.color }} />
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: channel.color }} />
                                <span className="text-[13px] font-bold text-[var(--ink-900)] uppercase tracking-wide">{channel.name}</span>
                              </div>
                              <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{formatMoney(channel.totalSpend)}</div>
                              <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{formatMoney(channel.totalSales)}</div>
                              <div className="text-right text-[13px] tabular-nums font-medium">
                                <span className="text-[var(--ink-900)]">{spendPct.toFixed(1)}%</span>
                                <span className="mx-1 text-[var(--ink-400)]">vs</span>
                                <span className="text-[var(--ink-900)] font-semibold">{salesPct.toFixed(1)}%</span>
                                <span className={`ml-1 font-bold ${chBetter ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                  {chBetter ? '↑' : '↓'}
                                </span>
                              </div>
                              <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{channel.avgRoi.toFixed(2)}</div>
                            </div>

                            {/* Subchannel rows */}
                            {chOpen && channel.subchannels.map((sub, si) => {
                              const subSpendPct = grandTotalSpend > 0 ? (sub.currentSpend / grandTotalSpend) * 100 : 0;
                              const subSalesPct = grandTotalSales > 0 ? ((sub.currentSpend * sub.roiCoefficient) / grandTotalSales) * 100 : 0;
                              const subBetter = subSalesPct > subSpendPct;

                              return (
                                <div
                                  key={si}
                                  className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-2.5 bg-white border-b border-[var(--border)] last:border-b-0"
                                >
                                  <div className="flex items-center pl-5 gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: channel.color }} />
                                    <span className="text-[13px] font-semibold text-[var(--ink-800)]">{sub.subChannel}</span>
                                  </div>
                                  <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{formatMoney(sub.currentSpend)}</div>
                                  <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{formatMoney(sub.currentSpend * sub.roiCoefficient)}</div>
                                  <div className="text-right text-[12.5px] tabular-nums">
                                    <span className="text-[var(--ink-700)]">{subSpendPct.toFixed(1)}%</span>
                                    <span className="mx-1 text-[var(--ink-400)]">vs</span>
                                    <span className="text-[var(--ink-700)]">{subSalesPct.toFixed(1)}%</span>
                                    <span className={`ml-1 font-semibold ${subBetter ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                                      {subBetter ? '↑' : '↓'}
                                    </span>
                                  </div>
                                  <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{sub.roiCoefficient.toFixed(2)}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 text-[11px] text-[var(--ink-400)] border-t border-[var(--border)] bg-[var(--surface-muted)]">
                {hasActiveFilters ? (
                  <span>
                    Showing filtered results ·{' '}
                    <button
                      onClick={() => { setSearch(''); setCategoryFilter('all'); setPerformanceFilter('all'); }}
                      className="text-[var(--brand)] hover:underline font-medium"
                    >
                      Clear all filters
                    </button>
                  </span>
                ) : (
                  `Current spend from DATA_FACT · projected sales = spend × ROI · ${summaryData.channels.length} subchannels`
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
