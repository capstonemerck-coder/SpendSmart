/**
 * ChannelRoiList.tsx
 *
 * Paginated horizontal-bar ranking of channels by ROI coefficient.
 * Supports filtering by category (dropdown) and top/bottom 10% performance
 * toggle.  Each row shows rank, channel name, category dot, proportional bar,
 * and ROI value.  Colors are derived from getCategoryColor — no color prop needed.
 *
 * Pagination uses getPaginationRange (ellipsis-aware) so Previous/Next are
 * always visible regardless of page count.
 */
import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCategoryColor, fmtROI } from '@/utils/categories';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChannelRoiListProps {
  /** Channel entries to display — each has name, category, and roi. */
  channels: Array<{ name: string; category: string; roi: number }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PER_PAGE = 5;

/**
 * getPaginationRange
 *
 * Returns page numbers and ellipsis markers for an ellipsis-aware paginator.
 * Always includes page 1, last page, current page, and ±1 neighbour.
 *
 * @param {number} current - Active page (1-indexed).
 * @param {number} total   - Total page count.
 * @returns {(number | '...')[]} Ordered array with page numbers and ellipsis marks.
 */
function getPaginationRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current]);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | '...')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) result.push('...');
    result.push(p);
    prev = p;
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ChannelRoiList
 *
 * Paginated horizontal-bar ranking of channels by ROI.  Category filter and
 * top/bottom 10% toggle both reset the page to 1 when changed.
 * Colors are resolved via getCategoryColor — no external color map needed.
 *
 * @param {ChannelRoiListProps} props
 */
export function ChannelRoiList({ channels }: ChannelRoiListProps) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [perfFilter, setPerfFilter] = useState<'all' | 'top10' | 'bottom10'>('all');
  const [page, setPage] = useState(1);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(channels.map((c) => c.category))).sort(),
    [channels],
  );

  const filtered = useMemo(() => {
    const base = categoryFilter === 'all' ? channels : channels.filter((c) => c.category === categoryFilter);
    const sorted = [...base].sort((a, b) => b.roi - a.roi);
    if (perfFilter === 'top10') return sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.1)));
    if (perfFilter === 'bottom10') return sorted.slice(-Math.max(1, Math.ceil(sorted.length * 0.1))).reverse();
    return sorted;
  }, [channels, categoryFilter, perfFilter]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const startIdx = (page - 1) * PER_PAGE;
  const visible = filtered.slice(startIdx, startIdx + PER_PAGE);
  const maxRoi = filtered[0]?.roi || 1;

  const setFilter = (cat: string) => { setCategoryFilter(cat); setPage(1); };
  const setPerf = (p: 'all' | 'top10' | 'bottom10') => { setPerfFilter(p); setPage(1); };

  if (!channels.length) {
    return (
      <div className="flex items-center justify-center h-36 text-[12px] text-[var(--ink-400)]">
        No channel data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[13px] font-semibold text-[var(--ink-900)]">Channels by ROI</span>
        <div className="relative ml-auto">
          <select value={categoryFilter} onChange={(e) => setFilter(e.target.value)}
            className="text-[11px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-6">
            <option value="all">All Categories</option>
            {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
        </div>
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          {(['all', 'top10', 'bottom10'] as const).map((v, i) => (
            <button key={v} onClick={() => setPerf(v)}
              className={`px-3 py-1 text-[11px] font-medium transition-colors ${i > 0 ? 'border-l border-[var(--border)]' : ''} ${perfFilter === v ? 'bg-[var(--ink-900)] text-white' : 'bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]'}`}>
              {v === 'all' ? 'All' : v === 'top10' ? 'Top 10%' : 'Bottom 10%'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 flex-1 mb-4">
        {visible.map((item, i) => {
          const color = getCategoryColor(item.category);
          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--ink-400)] w-5 text-right tabular-nums flex-shrink-0">{startIdx + i + 1}</span>
              <div className="w-32 flex-shrink-0">
                <div className="text-[12px] font-medium text-[var(--ink-800)] truncate">{item.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[10px] text-[var(--ink-400)]">{item.category}</span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--surface-subtle)] h-5 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-500"
                  style={{ width: `${(item.roi / maxRoi) * 100}%`, background: color, opacity: perfFilter === 'bottom10' ? 0.6 : 1 }} />
              </div>
              <span className="text-[12px] font-semibold text-[var(--ink-900)] w-12 text-right tabular-nums flex-shrink-0">{fmtROI(item.roi)}</span>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--ink-500)]">
            {startIdx + 1}–{Math.min(startIdx + PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-2 py-1 text-[11px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Previous
            </button>
            {getPaginationRange(page, totalPages).map((p, i) =>
              p === '...' ? (
                <span key={`ell-${i}`} className="px-1 text-[11px] text-[var(--ink-400)]">…</span>
              ) : (
                <button key={p} onClick={() => setPage(Number(p))}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${p === page ? 'bg-[var(--ink-900)] text-white' : 'text-[var(--ink-700)] border border-[var(--border)] hover:bg-[var(--surface-subtle)]'}`}>
                  {p}
                </button>
              )
            )}
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${page === totalPages ? 'border border-[var(--border)] text-[var(--ink-400)] opacity-40 cursor-not-allowed' : 'bg-[var(--ink-900)] text-white hover:opacity-80'}`}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
