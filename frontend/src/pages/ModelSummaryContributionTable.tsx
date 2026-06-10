/**
 * ModelSummaryContributionTable.tsx
 *
 * Channel contribution detail card for the Model Summary screen: search with
 * autocomplete, category/performance filters, and the three-level expandable
 * table (Category → Channel → Subchannel) with spend, impactable sales,
 * spend-vs-contribution share, and ROI columns.
 *
 * Page-specific component — all state and derived data live in
 * useContributionTable; this file renders only.
 */
import { useState } from 'react';
import ReactDOM from 'react-dom';
import { Info, Search, ChevronDown, ChevronsUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowUpDown, ListFilter } from 'lucide-react';
import { Card, CardHeader } from '@/components/shared';
import { ExportDropdown } from '@/components/shared/charts/ExportDropdown';
import { useContributionTable, KEY_SEP, type SortColumn, type PerfFilter } from '@/hooks/useContributionTable';
import { getCategoryColor, fmtCompact, fmtROI } from '@/utils/categories';
import type { ModelSummaryData } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ModelSummaryContributionTableProps {
  /** Full model summary response — channel_level and subchannel_level drive the table. */
  summaryData: ModelSummaryData;
  /** Called when the user picks Export CSV from the card's export dropdown. */
  onExportCSV: () => void;
  /** Called when the user picks Export PNG from the card's export dropdown. */
  onExportPNG: () => void;
  /** Shows the green "Exported" badge on the export dropdown. */
  isExported: boolean;
}

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

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ModelSummaryContributionTable
 *
 * Renders the Channel contribution detail card: filter bar (search +
 * autocomplete, category filter, performance filter, expand/collapse all),
 * the sortable dark-header table with three expandable levels, and a footer
 * showing either active-filter status or cycle info.
 *
 * @param {ModelSummaryContributionTableProps} props
 */
export function ModelSummaryContributionTable({ summaryData, onExportCSV, onExportPNG, isExported }: ModelSummaryContributionTableProps) {
  const grandSpend = summaryData.total_spend || 1;
  const grandSales = summaryData.incremental_sales || summaryData.total_sales || 1;
  const t = useContributionTable(summaryData.channel_level, summaryData.subchannel_level, grandSpend, grandSales);

  const SortIcon = ({ col }: { col: SortColumn }) => !t.isAnythingExpanded ? null :
    t.sortConfig.col === col ? (t.sortConfig.dir === 'asc' ? <ArrowUpNarrowWide size={12} className="text-white flex-shrink-0" /> : <ArrowDownWideNarrow size={12} className="text-white flex-shrink-0" />) :
    <ArrowUpDown size={12} className="text-white/25 flex-shrink-0" />;

  return (
    <Card>
      <CardHeader title="Channel contribution detail"
        actions={<ExportDropdown onCSV={onExportCSV} onPNG={onExportPNG} isExported={isExported} />} />

      {/* Filter bar */}
      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
          <input type="text" placeholder="Search channels…" value={t.search} onChange={(e) => { t.setSearch(e.target.value); t.setShowSearch(true); }}
            onFocus={() => t.setShowSearch(true)} onBlur={() => setTimeout(() => t.setShowSearch(false), 150)}
            className="w-full text-[12px] pl-7 pr-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-white placeholder:text-[var(--ink-400)] text-[var(--ink-800)] focus:outline-none focus:border-[var(--brand)] transition-colors" />
          {t.showSearch && t.searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-lg shadow-lg z-30 overflow-hidden max-h-56 overflow-y-auto">
              {t.searchResults.map((r, i) => (
                <button key={i} onMouseDown={() => t.handleSearchResult(r)} className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors text-left">
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
          <select value={t.catFilter} onChange={(e) => t.setCatFilter(e.target.value)}
            className="text-[12px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-7">
            <option value="all">All Categories</option>
            {t.tableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
        </div>
        <div className="relative">
          <select value={t.perfFilter} onChange={(e) => t.setPerfFilter(e.target.value as PerfFilter)}
            className="text-[12px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-7">
            <option value="all">All Performance</option>
            <option value="over">Over-performing ↑</option>
            <option value="under">Under-performing ↓</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={t.expandAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors"><ChevronsUpDown size={11} />Expand all</button>
          <button onClick={t.collapseAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">Collapse all</button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: '680px' }}>
          {/* Table header */}
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--ink-900)]">
            <div className="text-[10.5px] font-semibold text-white/60 uppercase tracking-[0.1em]">Channel hierarchy</div>
            {(['spend', 'sales'] as const).map((col) => (
              <button key={col} onClick={() => t.isAnythingExpanded && t.handleSort(col)}
                className={`flex items-center justify-end gap-1 w-full ${t.isAnythingExpanded ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-60'}`}>
                <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${t.sortConfig.col === col ? 'text-white' : 'text-white/60'}`}>{col === 'spend' ? 'Spend' : 'Imp. Sales'}</span>
                <SortIcon col={col} />
              </button>
            ))}
            <div className="flex items-center justify-end gap-1">
              <InfoTip />
              <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${t.perfFilter !== 'all' ? 'text-white' : 'text-white/60'}`}>Spend vs Contrib</span>
              <button onClick={() => t.setPerfFilter((p) => p === 'all' ? 'over' : p === 'over' ? 'under' : 'all')} className={`flex-shrink-0 rounded p-0.5 transition-all hover:bg-white/20 ${t.perfFilter !== 'all' ? 'text-white' : 'text-white/30'}`}><ListFilter size={13} /></button>
            </div>
            <button onClick={() => t.isAnythingExpanded && t.handleSort('roi')} className={`flex items-center justify-end gap-1 w-full ${t.isAnythingExpanded ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-60'}`}>
              <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${t.sortConfig.col === 'roi' ? 'text-white' : 'text-white/60'}`}>ROI</span>
              <SortIcon col="roi" />
            </button>
          </div>

          {/* Table body */}
          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            {t.filteredCats.length === 0 ? (
              <div className="px-5 py-10 text-center text-[13px] text-[var(--ink-400)]">
                No channels match your filters. <button onClick={t.clearFilters} className="text-[var(--brand)] hover:underline font-medium">Clear filters</button>
              </div>
            ) : t.filteredCats.map((cat) => {
              const channels = t.sortChannels(t.categoryToChannels[cat] ?? []);
              const catSpend = channels.reduce((a, c) => a + c.total_spend, 0);
              const catSales = channels.reduce((a, c) => a + c.impactable_sales, 0);
              const catRoi = catSpend > 0 ? catSales / catSpend : 0;
              const spendPct = (catSpend / grandSpend) * 100;
              const salesPct = (catSales / grandSales) * 100;
              const catOpen = t.expandedCats.has(cat);
              const color = getCategoryColor(cat);
              return (
                <div key={cat} className="border-b-2 border-[var(--surface-subtle)] last:border-b-0">
                  <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer border-b border-[var(--border)]" onClick={() => t.toggleCat(cat)}>
                    <div className="flex items-center gap-2">
                      <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform duration-150 flex-shrink-0 ${catOpen ? 'rotate-90' : ''}`} fill="none"><path d="M3 2l4 3-4 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[13px] font-bold text-[var(--ink-900)] uppercase tracking-wide">{cat}</span>
                      <span className="text-[10px] bg-[var(--surface-subtle)] border border-[var(--border)] px-1.5 py-0.5 rounded text-[var(--ink-500)]">{channels.length}</span>
                      {catOpen && <button onClick={(e) => t.expandAllInCat(cat, e)} className="text-[var(--brand)] text-[10px] hover:underline ml-1">expand all channels</button>}
                    </div>
                    <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtCompact(catSpend)}</div>
                    <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtCompact(catSales)}</div>
                    <div className="text-right text-[13px] tabular-nums font-medium">
                      <span className="text-[var(--ink-900)]">{spendPct.toFixed(1)}%</span><span className="mx-1 text-[var(--ink-400)]">vs</span><span className="font-semibold text-[var(--ink-900)]">{salesPct.toFixed(1)}%</span>
                      <span className={`ml-1 font-bold ${salesPct > spendPct ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{salesPct > spendPct ? '↑' : '↓'}</span>
                    </div>
                    <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtROI(catRoi)}</div>
                  </div>
                  {catOpen && channels.map((ch) => {
                    const chKey = `${cat}${KEY_SEP}${ch.channel_name}`;
                    const subs = t.sortSubchannels(t.channelToSubchannels[chKey] ?? []);
                    const chOpen = t.expandedChannels.has(chKey);
                    const chSpendPct = (ch.total_spend / grandSpend) * 100;
                    const chSalesPct = (ch.impactable_sales / grandSales) * 100;
                    return (
                      <div key={ch.channel_name}>
                        <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-2.5 bg-white border-b border-[var(--border)] hover:bg-[var(--surface-subtle)] cursor-pointer" onClick={() => t.toggleChannel(chKey)}>
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
                          <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{fmtROI(ch.roi)}</div>
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
                              <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-600)]">{fmtROI(s.roi)}</div>
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
        {t.hasActiveFilters ? (
          <span>Showing filtered results · <button onClick={t.clearFilters} className="text-[var(--brand)] hover:underline font-medium">Clear all filters</button></span>
        ) : `Cycle: ${summaryData.cycle_id} · ${summaryData.channel_level.length} channels · ${summaryData.subchannel_level.length} subchannels · impactable sales = spend × ROI`}
      </div>
    </Card>
  );
}
