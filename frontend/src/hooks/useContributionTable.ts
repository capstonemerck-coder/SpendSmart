/**
 * useContributionTable.ts
 *
 * Manages all UI state and derived data for the Channel contribution detail
 * table on the Model Summary screen: search with autocomplete, category and
 * performance filters, column sorting, and two-level expand state
 * (Category → Channel → Subchannel).
 *
 * Does not fetch data — operates purely on the channel/subchannel rows passed
 * in from useModelSummary via the page. Rendering lives in
 * ModelSummaryContributionTable.tsx. Does not handle API communication.
 */
import { useState, useEffect, useMemo } from 'react';
import type { ChannelLevelCalc, SubchannelLevelCalc, ChannelSearchResult } from '@/utils/types';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Separator for composite category+channel keys — cannot appear in names. */
export const KEY_SEP = '\x00';

const MAX_SEARCH_RESULTS = 12;

// ── Types ─────────────────────────────────────────────────────────────────────

export type SortColumn = 'spend' | 'sales' | 'roi';
export type PerfFilter = 'all' | 'over' | 'under';

export interface SortConfig {
  col: SortColumn;
  dir: 'asc' | 'desc';
}

export interface UseContributionTableResult {
  /** Search input text. */
  search: string;
  setSearch: (v: string) => void;
  /** Whether the autocomplete dropdown is visible. */
  showSearch: boolean;
  setShowSearch: (v: boolean) => void;
  /** Active category filter ('all' = no filter). */
  catFilter: string;
  setCatFilter: (v: string) => void;
  /** Over/under-performing filter. */
  perfFilter: PerfFilter;
  setPerfFilter: (v: PerfFilter | ((p: PerfFilter) => PerfFilter)) => void;
  /** Current sort column and direction. */
  sortConfig: SortConfig;
  expandedCats: Set<string>;
  expandedChannels: Set<string>;
  /** Channels grouped by category name. */
  categoryToChannels: Record<string, ChannelLevelCalc[]>;
  /** Subchannels grouped by `${category}${KEY_SEP}${channel}` key. */
  channelToSubchannels: Record<string, SubchannelLevelCalc[]>;
  /** Distinct sorted category names for the dropdown. */
  tableCategories: string[];
  /** Categories that pass the active search/category/performance filters. */
  filteredCats: string[];
  /** Autocomplete results derived from the search input (max 12). */
  searchResults: ChannelSearchResult[];
  isAnythingExpanded: boolean;
  hasActiveFilters: boolean;
  toggleCat: (cat: string) => void;
  toggleChannel: (key: string) => void;
  /** Expands every channel inside a category (inline link on category rows). */
  expandAllInCat: (cat: string, e: React.MouseEvent) => void;
  expandAll: () => void;
  collapseAll: () => void;
  /** Toggles sort on a column — asc on first click, then flips direction. */
  handleSort: (col: SortColumn) => void;
  clearFilters: () => void;
  /** Expands the rows matching a clicked autocomplete result. */
  handleSearchResult: (r: ChannelSearchResult) => void;
  /** Returns channels sorted by the active sort column/direction. */
  sortChannels: (channels: ChannelLevelCalc[]) => ChannelLevelCalc[];
  /** Returns subchannels sorted by the active sort column/direction. */
  sortSubchannels: (subs: SubchannelLevelCalc[]) => SubchannelLevelCalc[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useContributionTable
 *
 * Derives grouping maps, filtered category list, and autocomplete results from
 * channel/subchannel rows, and owns the table's search/filter/sort/expand state.
 *
 * @param {ChannelLevelCalc[]} channelLevel - Channel-level rows from the model summary.
 * @param {SubchannelLevelCalc[]} subchannelLevel - Subchannel-level rows from the model summary.
 * @param {number} grandSpend - Total spend denominator for spend-share %.
 * @param {number} grandSales - Total impactable sales denominator for contribution %.
 * @returns {UseContributionTableResult} Table state, derived data, and handlers.
 */
export function useContributionTable(
  channelLevel: ChannelLevelCalc[],
  subchannelLevel: SubchannelLevelCalc[],
  grandSpend: number,
  grandSales: number,
): UseContributionTableResult {
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [catFilter, setCatFilter] = useState('all');
  const [perfFilter, setPerfFilter] = useState<PerfFilter>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ col: 'roi', dir: 'desc' });
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());

  // ── Derived grouping maps ──────────────────────────────────────────────────

  const categoryToChannels = useMemo<Record<string, ChannelLevelCalc[]>>(() => {
    const m: Record<string, ChannelLevelCalc[]> = {};
    for (const ch of channelLevel) (m[ch.category] ??= []).push(ch);
    return m;
  }, [channelLevel]);

  const channelToSubchannels = useMemo<Record<string, SubchannelLevelCalc[]>>(() => {
    const m: Record<string, SubchannelLevelCalc[]> = {};
    for (const s of subchannelLevel) (m[`${s.category}${KEY_SEP}${s.channel_name}`] ??= []).push(s);
    return m;
  }, [subchannelLevel]);

  const tableCategories = useMemo(
    () => Array.from(new Set(channelLevel.map((ch) => ch.category))).sort(),
    [channelLevel],
  );

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredCats = useMemo(() => {
    const sl = search.toLowerCase();
    return tableCategories.filter((cat) => {
      if (catFilter !== 'all' && cat !== catFilter) return false;
      const channels = categoryToChannels[cat] ?? [];
      if (sl) return channels.some((ch) => ch.channel_name.toLowerCase().includes(sl) ||
        (channelToSubchannels[`${cat}${KEY_SEP}${ch.channel_name}`] ?? []).some((s) => s.subchannel_name.toLowerCase().includes(sl)));
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
      if (results.length >= MAX_SEARCH_RESULTS) break;
      if (cat.toLowerCase().includes(sl)) results.push({ label: cat, catKey: cat, type: 'category' });
      for (const ch of categoryToChannels[cat] ?? []) {
        if (results.length >= MAX_SEARCH_RESULTS) break;
        if (ch.channel_name.toLowerCase().includes(sl)) results.push({ label: ch.channel_name, sub: cat, catKey: cat, chKey: ch.channel_name, type: 'channel' });
        for (const s of channelToSubchannels[`${cat}${KEY_SEP}${ch.channel_name}`] ?? []) {
          if (results.length >= MAX_SEARCH_RESULTS) break;
          if (s.subchannel_name.toLowerCase().includes(sl)) results.push({ label: s.subchannel_name, sub: `${cat} › ${ch.channel_name}`, catKey: cat, chKey: ch.channel_name, type: 'subchannel' });
        }
      }
    }
    return results;
  }, [search, tableCategories, categoryToChannels, channelToSubchannels]);

  // ── Effects ────────────────────────────────────────────────────────────────

  // Auto-expand all categories while searching or perf-filtering so matches are visible.
  useEffect(() => {
    if (search || perfFilter !== 'all') setExpandedCats(new Set(tableCategories));
  }, [search, perfFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sorting implies comparing children — expand all channels of open categories.
  useEffect(() => {
    if (expandedCats.size > 0) setExpandedChannels(new Set(
      Array.from(expandedCats).flatMap((cat) =>
        (categoryToChannels[cat] ?? []).map((ch) => `${cat}${KEY_SEP}${ch.channel_name}`)),
    ));
  }, [sortConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────────

  const toggleCat = (cat: string) => setExpandedCats((s) => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  const toggleChannel = (key: string) => setExpandedChannels((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const expandAllInCat = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedChannels((s) => new Set([...s, ...(categoryToChannels[cat] ?? []).map((ch) => `${cat}${KEY_SEP}${ch.channel_name}`)]));
  };
  const expandAll = () => setExpandedCats(new Set(tableCategories));
  const collapseAll = () => { setExpandedCats(new Set()); setExpandedChannels(new Set()); };
  const handleSort = (col: SortColumn) => setSortConfig((p) => ({ col, dir: p.col === col && p.dir === 'asc' ? 'desc' : 'asc' }));
  const clearFilters = () => { setSearch(''); setCatFilter('all'); setPerfFilter('all'); };
  const handleSearchResult = (r: ChannelSearchResult) => {
    setExpandedCats((s) => new Set([...s, r.catKey]));
    if (r.chKey) setExpandedChannels((s) => new Set([...s, `${r.catKey}${KEY_SEP}${r.chKey}`]));
    setSearch('');
    setShowSearch(false);
  };

  // ── Sorting helpers ────────────────────────────────────────────────────────

  const cmp = (a: number, b: number) => (sortConfig.dir === 'asc' ? a - b : b - a);
  const pick = (row: { total_spend: number; impactable_sales: number; roi: number }) =>
    sortConfig.col === 'spend' ? row.total_spend : sortConfig.col === 'sales' ? row.impactable_sales : row.roi;
  const sortChannels = (channels: ChannelLevelCalc[]) => [...channels].sort((a, b) => cmp(pick(a), pick(b)));
  const sortSubchannels = (subs: SubchannelLevelCalc[]) => [...subs].sort((a, b) => cmp(pick(a), pick(b)));

  return {
    search, setSearch, showSearch, setShowSearch,
    catFilter, setCatFilter, perfFilter, setPerfFilter,
    sortConfig, expandedCats, expandedChannels,
    categoryToChannels, channelToSubchannels, tableCategories, filteredCats, searchResults,
    isAnythingExpanded: expandedCats.size > 0,
    hasActiveFilters: !!(search || catFilter !== 'all' || perfFilter !== 'all'),
    toggleCat, toggleChannel, expandAllInCat, expandAll, collapseAll,
    handleSort, clearFilters, handleSearchResult, sortChannels, sortSubchannels,
  };
}
