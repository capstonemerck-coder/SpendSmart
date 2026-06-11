/**
 * OutcomeChannelRoiChart.tsx
 *
 * Horizontal bar chart for ROI or mROI values per channel.
 * Provides a category filter, an All / Top 10% / Bottom 10% performance toggle,
 * and 5-per-page pagination. Color-coded by getCategoryColor.
 *
 * Pass roi = channel.mroi from the caller to reuse this component for the mROI view.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCategoryColor, fmtROI } from '@/utils/categories';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChannelRoiEntry {
  name: string;
  category: string;
  roi: number;
}

interface OutcomeChannelRoiChartProps {
  channels: ChannelRoiEntry[];
  title?: string;
  subtitle?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PER_PAGE = 5;
type PerfFilter = 'all' | 'top10' | 'bottom10';

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * OutcomeChannelRoiChart
 *
 * Renders a ranked horizontal bar chart of channel ROI/mROI values with category
 * and performance filters plus pagination. Bars are colored by getCategoryColor.
 * The caller selects ROI vs mROI by mapping the appropriate field to `roi`.
 *
 * @param {OutcomeChannelRoiChartProps} props
 */
export function OutcomeChannelRoiChart({ channels, title, subtitle }: OutcomeChannelRoiChartProps) {
  const [catFilter, setCatFilter] = useState('all');
  const [perf, setPerf] = useState<PerfFilter>('all');
  const [page, setPage] = useState(1);

  const categories = Array.from(new Set(channels.map((c) => c.category))).sort();
  const afterCat = catFilter === 'all' ? channels : channels.filter((c) => c.category === catFilter);
  const sorted = [...afterCat].sort((a, b) => b.roi - a.roi);
  const count10 = Math.max(1, Math.ceil(sorted.length * 0.1));
  const display =
    perf === 'top10' ? sorted.slice(0, count10) :
    perf === 'bottom10' ? sorted.slice(-count10).reverse() : sorted;

  const totalPages = Math.ceil(display.length / PER_PAGE) || 1;
  const start = (page - 1) * PER_PAGE;
  const paged = display.slice(start, start + PER_PAGE);
  const maxRoi = Math.max(...display.map((d) => Math.abs(d.roi)), 0.001);

  const handleCat = (v: string) => { setCatFilter(v); setPage(1); };
  const handlePerf = (v: PerfFilter) => { setPerf(v); setPage(1); };

  return (
    <div className="flex flex-col h-full">
      {/* Header with title and controls */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          {title && <div className="text-[13px] font-semibold text-[var(--ink-900)]">{title}</div>}
          {subtitle && <div className="text-[11px] text-[var(--ink-500)] mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category dropdown */}
          <div className="relative">
            <select
              value={catFilter}
              onChange={(e) => handleCat(e.target.value)}
              className="text-[11px] text-[var(--ink-700)] border border-[var(--border)] rounded-md px-2.5 py-1.5 bg-white appearance-none pr-6 focus:outline-none hover:border-[var(--ink-400)]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
          </div>
          {/* Performance toggle */}
          <div className="inline-flex rounded-md border border-[var(--border)] overflow-hidden">
            {(['all', 'top10', 'bottom10'] as const).map((v, i) => (
              <button
                key={v}
                onClick={() => handlePerf(v)}
                className={`px-2.5 py-1.5 text-[11px] font-medium transition-colors ${i > 0 ? 'border-l border-[var(--border)]' : ''} ${perf === v ? 'bg-[var(--ink-900)] text-white' : 'bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]'}`}
              >
                {v === 'all' ? 'All' : v === 'top10' ? 'Top 10%' : 'Bottom 10%'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bar list */}
      <div className="space-y-2.5 flex-1">
        {paged.length === 0
          ? <div className="text-center py-10 text-[13px] text-[var(--ink-500)]">No channels to display.</div>
          : paged.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--ink-400)] w-5 text-right tabular-nums flex-shrink-0">{start + i + 1}</span>
              <div className="w-28 flex-shrink-0">
                <div className="text-[12px] font-medium text-[var(--ink-800)] truncate">{item.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: getCategoryColor(item.category) }} />
                  <span className="text-[10px] text-[var(--ink-400)] truncate">{item.category}</span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--surface-subtle)] h-5 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${(Math.abs(item.roi) / maxRoi) * 100}%`,
                    background: getCategoryColor(item.category),
                    opacity: perf === 'bottom10' ? 0.6 : 1,
                  }}
                />
              </div>
              <span className="text-[12px] font-semibold text-[var(--ink-900)] w-12 text-right tabular-nums flex-shrink-0">
                {fmtROI(item.roi)}
              </span>
            </div>
          ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--ink-500)]">
            {start + 1}–{Math.min(start + PER_PAGE, display.length)} of {display.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1 text-[11px] border border-[var(--border)] rounded text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-7 h-7 text-[11px] font-medium rounded transition-colors ${p === page ? 'bg-[var(--ink-900)] text-white' : 'text-[var(--ink-700)] border border-[var(--border)] hover:bg-[var(--surface-subtle)]'}`}
              >{p}</button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1 text-[11px] border border-[var(--border)] rounded text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed"
            >›</button>
          </div>
        </div>
      )}

      {/* Category legend */}
      {categories.length > 0 && (
        <div className="flex gap-3 mt-3 pt-3 border-t border-[var(--border)] flex-wrap">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: getCategoryColor(cat) }} />
              <span className="text-[10.5px] text-[var(--ink-500)]">{cat}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
