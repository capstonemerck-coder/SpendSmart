/**
 * ScenarioOutcome.tsx — Scenario optimizer projections page.
 * API-driven via useScenarioOutcome; zero hardcoded values.
 * KPI summary, spend donut / mROI bar chart, 3-level expandable contribution table.
 */
import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Download, Search } from 'lucide-react';
import { Card, CardHeader, KpiCard, PageContainer, PageHeader, TabPills } from '@/components/shared';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { DonutChart } from '@/components/shared/charts/DonutChart';
import { OutcomeChannelRoiChart } from '@/components/shared/charts/OutcomeChannelRoiChart';
import { useScenarioOutcome } from '@/hooks/useScenarioOutcome';
import { getCategoryColor, fmtCompact, fmtROI } from '@/utils/categories';
import { exportToCSV } from '@/utils/export';

interface ScenarioOutcomeProps {
  activeScenarioId?: string | null;
}

function ChevronIcon({ open }: { open: boolean }) {
  const Icon = open ? ChevronDown : ChevronRight;
  return <Icon size={13} className="text-[var(--ink-400)]" />;
}

/**
 * ScenarioOutcome
 *
 * Optimizer projections: KPI cards, spend/mROI overview, and a sortable
 * 3-level expandable contribution table (Category → Channel → Sub-channel).
 * Shows empty, loading, and error states as appropriate.
 *
 * @param {ScenarioOutcomeProps} props
 */
export default function ScenarioOutcome({ activeScenarioId }: ScenarioOutcomeProps) {
  const { outcome, isLoading, error } = useScenarioOutcome(activeScenarioId);
  const [expandedCats, setExpandedCats] = useState(new Set<number>());
  const [expandedChannels, setExpandedChannels] = useState(new Set<string>());
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<'spend' | 'sales' | 'roi' | 'mroi'>('roi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [overviewTab, setOverviewTab] = useState<'spend' | 'mroi'>('spend');

  const totalSpend = outcome?.channel_results.reduce((a, r) => a + (r.optimized_spend ?? 0), 0) ?? 0;
  const pieData = useMemo(() => (outcome?.channel_results ?? []).map((r) => ({
    name: r.channel_name ?? '',
    value: totalSpend > 0 ? ((r.optimized_spend ?? 0) / totalSpend) * 100 : 0,
    amount: fmtCompact(r.optimized_spend ?? 0),
    color: getCategoryColor(r.category ?? r.channel_name ?? ''),
  })), [outcome, totalSpend]);
  const mroiChannels = useMemo(() => (outcome?.channel_results ?? []).map((r) => ({
    name: r.channel_name ?? '',
    category: r.category ?? r.channel_name ?? '',
    roi: r.mroi ?? 0,
  })), [outcome]);
  const filteredGroups = useMemo(() => {
    const groups = outcome?.grouped_results ?? [];
    const filtered = search
      ? groups.filter((g) => (g.channel_name ?? '').toLowerCase().includes(search.toLowerCase()))
      : groups;
    return [...filtered].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortCol) {
        case 'spend': return dir * ((a.optimized_spend ?? 0) - (b.optimized_spend ?? 0));
        case 'sales': return dir * ((a.impactable_sales ?? 0) - (b.impactable_sales ?? 0));
        case 'mroi':  return dir * ((a.mroi ?? 0) - (b.mroi ?? 0));
        default:      return dir * ((a.roi ?? 0) - (b.roi ?? 0));
      }
    });
  }, [outcome, search, sortCol, sortDir]);

  const toggleCat = (id: number) =>
    setExpandedCats((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCh = (key: string) =>
    setExpandedChannels((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const handleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };
  const handleExport = () => exportToCSV(
    (outcome?.channel_results ?? []).map((r) => ({
      Channel: r.channel_name ?? '', Spend: r.optimized_spend ?? 0,
      Impactable_Sales: r.impactable_sales ?? 0, ROI: r.roi ?? 0, MROI: r.mroi ?? 0,
    })),
    `scenario-${activeScenarioId}-outcome`,
  );

  if (!activeScenarioId) return <PageContainer><EmptyState title="No scenario selected" message="Select a scenario from Scenario Planning to view outcome projections." /></PageContainer>;
  if (isLoading) return <PageContainer><LoadingState message="Loading outcome projections…" /></PageContainer>;
  if (error) return <PageContainer><ErrorState title="Outcome unavailable" message={error} /></PageContainer>;
  if (!outcome) return <PageContainer><EmptyState title="No outcome data" message="Run the optimizer on this scenario to generate projections." /></PageContainer>;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Scenario Projections"
        title={outcome.scenario_name ?? `Scenario ${outcome.scenario_id}`}
        description="Optimized channel allocation and projected KPI performance."
        actions={
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-subtle)] transition-colors">
            <Download size={13} /> Export CSV
          </button>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Total Sales" value={fmtCompact(outcome.total_sales ?? 0)} />
        <KpiCard label="Total Spend" value={fmtCompact(outcome.total_spend ?? 0)} />
        <KpiCard label="Impactable Sales" value={fmtCompact(outcome.impactable_sales ?? 0)} />
        <KpiCard label="ROI" value={fmtROI(outcome.roi ?? 0)} />
        <KpiCard label="mROI" value={fmtROI(outcome.mroi ?? 0)} />
        <KpiCard label="Channels" value={String(outcome.channel_results.length)} />
      </div>
      <Card className="mb-5">
        <CardHeader title="Channel Overview" subtitle="Spend and return performance by channel"
          actions={<TabPills value={overviewTab} onChange={setOverviewTab} options={[{ value: 'spend', label: 'Spend Allocation' }, { value: 'mroi', label: 'Channel ROI' }]} />}
        />
        <div className="px-6 py-5 flex gap-8 min-h-[260px]">
          {overviewTab === 'spend' ? (
            <>
              <DonutChart data={pieData} total={totalSpend} />
              <div className="flex-1 grid grid-cols-2 gap-2 content-center">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[12px] text-[var(--ink-700)] truncate">{d.name}</span>
                    <span className="ml-auto text-[12px] font-semibold tabular-nums text-[var(--ink-900)] pl-2">{d.amount}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1">
              <OutcomeChannelRoiChart channels={mroiChannels} title="mROI by Channel" subtitle="Marginal return on investment" />
            </div>
          )}
        </div>
      </Card>
      <Card>
        <CardHeader title="Channel Contribution" subtitle="Category → Channel → Sub-channel breakdown"
          actions={
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search channels…"
                className="border border-[var(--border)] rounded-lg h-8 pl-8 pr-3 text-[12px] bg-white text-[var(--ink-700)] placeholder:text-[var(--ink-400)] focus:outline-none focus:border-[var(--brand)] w-48" />
            </div>
          }
        />
        <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-2.5 bg-[var(--surface-subtle)] border-y border-[var(--border)]">
          <div className="ui-eyebrow text-[var(--ink-500)] font-semibold">Channel</div>
          {(['spend', 'sales', 'roi', 'mroi'] as const).map((col) => (
            <button key={col} onClick={() => handleSort(col)}
              className="flex items-center justify-end gap-1 ui-eyebrow text-[var(--ink-500)] font-semibold hover:text-[var(--ink-800)]">
              {col === 'spend' ? 'Spend' : col === 'sales' ? 'Sales' : col.toUpperCase()}
              {sortCol === col && <span className="text-[9px]">{sortDir === 'desc' ? '▼' : '▲'}</span>}
            </button>
          ))}
        </div>
        <div className="divide-y divide-[var(--border)]">
          {filteredGroups.length === 0
            ? <div className="px-6 py-10 text-center text-[13px] text-[var(--ink-500)]">No channels match your search.</div>
            : filteredGroups.map((cat) => {
                const catOpen = expandedCats.has(cat.channel_id);
                const color = getCategoryColor(cat.category ?? cat.channel_name ?? '');
                return (
                  <div key={cat.channel_id}>
                    <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-3.5 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer"
                      onClick={() => toggleCat(cat.channel_id)}>
                      <div className="flex items-center gap-2">
                        <ChevronIcon open={catOpen} />
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[13px] font-bold text-[var(--ink-900)] uppercase tracking-wide">{cat.channel_name ?? cat.category}</span>
                      </div>
                      <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtCompact(cat.optimized_spend ?? 0)}</div>
                      <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtCompact(cat.impactable_sales ?? 0)}</div>
                      <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtROI(cat.roi ?? 0)}</div>
                      <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{fmtROI(cat.mroi ?? 0)}</div>
                    </div>
                    {catOpen && cat.channels.map((ch) => {
                      const key = `${cat.channel_id}-${ch.channel_id}`;
                      const chOpen = expandedChannels.has(key);
                      return (
                        <div key={key}>
                          <div className={`grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-3 bg-white border-t border-[var(--border)] ${ch.sub_channels.length ? 'cursor-pointer hover:bg-[var(--surface-muted)]' : ''}`}
                            onClick={() => ch.sub_channels.length && toggleCh(key)}>
                            <div className="flex items-center gap-3 pl-6">
                              {ch.sub_channels.length ? <ChevronIcon open={chOpen} /> : <span className="w-[10px]" />}
                              <span className="text-[13px] font-medium text-[var(--ink-700)]">{ch.channel_name}</span>
                            </div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{fmtCompact(ch.optimized_spend ?? 0)}</div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{fmtCompact(ch.impactable_sales ?? 0)}</div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{fmtROI(ch.roi ?? 0)}</div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{fmtROI(ch.mroi ?? 0)}</div>
                          </div>
                          {chOpen && ch.sub_channels.map((sub, si) => (
                            <div key={si} className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-2.5 bg-[var(--surface-subtle)] border-t border-[var(--border)]">
                              <div className="flex items-center pl-14">
                                <span className="w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0" style={{ background: color }} />
                                <span className="text-[12.5px] text-[var(--ink-500)]">{sub.name}</span>
                              </div>
                              <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-400)]">{fmtCompact(sub.optimized_spend ?? 0)}</div>
                              <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-400)]">{fmtCompact(sub.impactable_sales ?? 0)}</div>
                              <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{fmtROI(sub.roi ?? 0)}</div>
                              <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-400)]">{fmtROI(sub.mroi ?? 0)}</div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
        </div>
        <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface-subtle)]">
          <span className="text-[11.5px] text-[var(--ink-500)]">{filteredGroups.length} of {outcome.grouped_results.length} channel groups</span>
        </div>
      </Card>
    </PageContainer>
  );
}
