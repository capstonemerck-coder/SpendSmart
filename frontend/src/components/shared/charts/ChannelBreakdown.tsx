/**
 * ChannelBreakdown — filterable, paginated channel efficiency table for the Trends card.
 * Applies category filter → sort by ratio → performance filter → pagination.
 */
import { useState } from 'react';
import type { ChannelBreakdownRow } from '@/utils/types';

const CH_PAGE_SIZE = 10;

const CHANNEL_CATEGORIES: Record<string, 'HCP-PP' | 'HCP-NPP' | 'Consumer'> = {
  Conferences: 'HCP-PP', Field: 'HCP-PP',
  Digital: 'HCP-NPP', Social: 'HCP-NPP', Display: 'HCP-NPP', Email: 'HCP-NPP',
  Influencer: 'HCP-NPP', Webinar: 'HCP-NPP', Podcast: 'HCP-NPP', Events: 'HCP-NPP',
  TV: 'Consumer', Print: 'Consumer', OOH: 'Consumer',
  Radio: 'Consumer', 'Direct Mail': 'Consumer', Search: 'Consumer',
};

const CAT_COLORS: Record<string, string> = {
  'HCP-PP': '#00857C',
  'HCP-NPP': '#3F3F46',
  Consumer: '#A1A1AA',
};

type CategoryFilter = 'all' | 'HCP-PP' | 'HCP-NPP' | 'Consumer';
type PerfFilter = 'all' | 'top10' | 'bottom10';

/**
 * ChannelBreakdown
 *
 * Renders per-channel spend/reach bar rows with efficiency ratios and Top/Low badges.
 * All filter state is internal — consumers pass only the raw breakdown data.
 *
 * @param {{ data: ChannelBreakdownRow[] }} props
 */
export function ChannelBreakdown({ data }: { data: ChannelBreakdownRow[] }) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [performanceFilter, setPerformanceFilter] = useState<PerfFilter>('all');
  const [channelPage, setChannelPage] = useState(1);

  const allSorted = [...data].sort((a, b) => b.ratio - a.ratio);
  const topN = Math.ceil(allSorted.length * 0.1);
  const topSet = new Set(allSorted.slice(0, topN).map((r) => r.channel));
  const bottomSet = new Set(allSorted.slice(-topN).map((r) => r.channel));

  const sorted = (categoryFilter === 'all' ? [...data] : data.filter((r) => CHANNEL_CATEGORIES[r.channel] === categoryFilter))
    .sort((a, b) => b.ratio - a.ratio);

  const perfFiltered = (() => {
    if (performanceFilter === 'all') return sorted;
    const n = Math.ceil(sorted.length * 0.1);
    return performanceFilter === 'top10' ? sorted.slice(0, n) : [...sorted].slice(-n).reverse();
  })();

  const totalPerfPages = Math.max(1, Math.ceil(perfFiltered.length / CH_PAGE_SIZE));
  const displayList = perfFiltered.slice((channelPage - 1) * CH_PAGE_SIZE, channelPage * CH_PAGE_SIZE);
  const maxSpend = Math.max(...displayList.map((r) => r.spend), 1);
  const maxReach = Math.max(...displayList.map((r) => r.reach), 1);
  const globalRank = (ch: string) => allSorted.findIndex((r) => r.channel === ch) + 1;

  const resetFilters = () => { setCategoryFilter('all'); setPerformanceFilter('all'); setChannelPage(1); };
  const handleCat = (cat: CategoryFilter) => { setCategoryFilter(cat); setChannelPage(1); };
  const handlePerf = (perf: PerfFilter) => { setPerformanceFilter(perf); setChannelPage(1); };

  return (
    <div className="space-y-3">
      {/* Filter toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={categoryFilter} onChange={(e) => handleCat(e.target.value as CategoryFilter)}
          className="appearance-none text-[11px] border border-[var(--border-strong)] rounded-md px-2.5 py-1 bg-white text-[var(--ink-700)] pr-6">
          {(['all', 'HCP-PP', 'HCP-NPP', 'Consumer'] as CategoryFilter[]).map((c) => (
            <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>
          ))}
        </select>
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          {(['all', 'top10', 'bottom10'] as PerfFilter[]).map((p) => (
            <button key={p} type="button" onClick={() => handlePerf(p)}
              className={`text-[11px] font-medium px-3 py-1 transition-colors ${performanceFilter === p ? 'bg-[var(--ink-900)] text-white' : 'bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]'}`}>
              {p === 'all' ? 'All' : p === 'top10' ? 'Top 10%' : 'Bottom 10%'}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-[var(--ink-500)]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#00857C' }} />Spend</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: '#27272A' }} />Reach</span>
        </div>
      </div>

      {/* Table */}
      {displayList.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[var(--ink-500)]">
          No channels match the current filter.{' '}
          <button type="button" onClick={resetFilters} className="text-[var(--brand)] hover:underline">Clear filters</button>
        </div>
      ) : (
        <div>
          <div className="grid gap-2 mb-1 px-2" style={{ gridTemplateColumns: '20px 140px 80px 1fr 1fr' }}>
            {['#', 'Channel', 'Ratio', 'Spend', 'Reach'].map((h) => (
              <div key={h} className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-400)]">{h}</div>
            ))}
          </div>
          <div className="divide-y divide-[var(--border)]">
            {displayList.map((row) => {
              const cat = CHANNEL_CATEGORIES[row.channel];
              const catColor = CAT_COLORS[cat] ?? '#A1A1AA';
              const isTop = topSet.has(row.channel);
              const isBottom = bottomSet.has(row.channel);
              return (
                <div key={row.channel} className={`grid gap-2 items-center px-2 py-2 rounded-md ${isTop ? 'bg-[#F0FDF4]' : isBottom ? 'bg-[#FEF2F2]' : ''}`}
                  style={{ gridTemplateColumns: '20px 140px 80px 1fr 1fr' }}>
                  <div className="text-[10px] text-[var(--ink-400)] tabular-nums">{globalRank(row.channel)}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] font-medium text-[var(--ink-900)] truncate">{row.channel}</span>
                      {isTop && <span className="text-[9px] font-bold uppercase text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1 py-0.5">Top</span>}
                      {isBottom && <span className="text-[9px] font-bold uppercase text-red-700 bg-red-100 border border-red-200 rounded px-1 py-0.5">Low</span>}
                    </div>
                    {cat && <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
                      <span className="text-[10px] text-[var(--ink-400)]">{cat}</span>
                    </div>}
                  </div>
                  <div className={`text-[12px] font-semibold tabular-nums text-right pr-4 ${isTop ? 'text-emerald-700' : isBottom ? 'text-red-600' : 'text-[var(--ink-700)]'}`}>
                    {row.ratio.toFixed(1)}x
                  </div>
                  {/* Spend bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[var(--surface-subtle)] h-4 rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${(row.spend / maxSpend) * 100}%`, backgroundColor: catColor }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-[var(--ink-500)] w-12 text-right">${(row.spend / 1000).toFixed(1)}k</span>
                  </div>
                  {/* Reach bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[var(--surface-subtle)] h-4 rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm" style={{ width: `${(row.reach / maxReach) * 100}%`, backgroundColor: '#27272A' }} />
                    </div>
                    <span className="text-[10px] tabular-nums text-[var(--ink-500)] w-12 text-right">${(row.reach / 1000).toFixed(1)}k</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPerfPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
          <p className="text-[11px] text-[var(--ink-500)]">
            Showing <span className="font-semibold text-[var(--ink-700)]">{(channelPage - 1) * CH_PAGE_SIZE + 1}–{Math.min(channelPage * CH_PAGE_SIZE, perfFiltered.length)}</span> of <span className="font-semibold text-[var(--ink-700)]">{perfFiltered.length}</span> channels
          </p>
          <div className="flex gap-1">
            <button type="button" disabled={channelPage === 1} onClick={() => setChannelPage((p) => p - 1)}
              className="px-2.5 h-7 text-[11px] rounded-md border border-[var(--border-strong)] bg-white text-[var(--ink-700)] hover:border-[var(--ink-400)] disabled:opacity-40 disabled:cursor-not-allowed">
              Previous
            </button>
            <button type="button" disabled={channelPage === totalPerfPages} onClick={() => setChannelPage((p) => p + 1)}
              className="px-2.5 h-7 text-[11px] rounded-md border border-[var(--border-strong)] bg-white text-[var(--ink-700)] hover:border-[var(--ink-400)] disabled:opacity-40 disabled:cursor-not-allowed">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
