/**
 * ScenarioPlanner
 *
 * Scenario Planning screen — lets analysts create spend optimization scenarios,
 * set per-channel constraints, run the optimizer, and navigate to outcomes.
 *
 * Cycle selection lives in FilterBar/FilterContext (Market → Brand → Indication → Cycle).
 * Page owns modal/form UI state; all server state (channel rows, scenarios, dashboard KPIs,
 * optimizer run/poll, DATA_FACT channels) lives in useScenarioPlanning.
 */
import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Play, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { DualRangeSlider } from '@/components/shared/base/DualRangeSlider';
import { ScenarioInfoModal } from '@/components/shared/modals/ScenarioInfoModal';
import {
  PageContainer, PageHeader, Card, CardHeader, KpiCard,
  Button, Input, Select, Field, Modal, Badge,
} from '@/components/shared';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { SpendComparisonChart } from '@/components/shared/charts/SpendComparisonChart';
import { RoiComparisonChart } from '@/components/shared/charts/RoiComparisonChart';
import { useFilters } from '@/context/FilterContext';
import { useScenarioPlanning } from '@/hooks/useScenarioPlanning';
import { fmtCompact, fmtROI } from '@/utils/categories';
import type { ChannelPlanningRow } from '@/utils/types';

interface ScenarioPlannerProps {
  onViewOutcome: (scenarioId: string) => void;
}

// ── HelpMeChoose ──────────────────────────────────────────────────────────────

function HelpMeChoose({ onSelect, onClose }: { onSelect: (t: 'Spend Based' | 'Goal Based') => void; onClose: () => void }) {
  const [q1, setQ1] = useState<'fixed' | 'flexible' | null>(null);
  const [q2, setQ2] = useState<'maximize' | 'target' | null>(null);
  const rec: 'Spend Based' | 'Goal Based' | null =
    q1 === 'fixed' ? 'Spend Based'
    : q1 === 'flexible' && q2 === 'maximize' ? 'Spend Based'
    : q1 === 'flexible' && q2 === 'target' ? 'Goal Based'
    : null;
  const opt = (a: boolean) => `flex-1 py-2 px-3 rounded-md text-[12.5px] border transition-colors ${a ? 'bg-[var(--ink-900)] text-white border-[var(--ink-900)]' : 'border-[var(--border)] hover:bg-[var(--surface-subtle)]'}`;
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[var(--ink-900)]">Help me choose</p>
        <button onClick={onClose} className="text-[11.5px] text-[var(--ink-400)] hover:text-[var(--ink-700)]">← Back</button>
      </div>
      <div className="space-y-2">
        <p className="text-[13px] font-medium">1. Do you have a fixed budget?</p>
        <div className="flex gap-2">
          <button onClick={() => { setQ1('fixed'); setQ2(null); }} className={opt(q1 === 'fixed')}>Yes, it's fixed</button>
          <button onClick={() => setQ1('flexible')} className={opt(q1 === 'flexible')}>No, it's flexible</button>
        </div>
      </div>
      {q1 === 'flexible' && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium">2. Primary objective?</p>
          <div className="flex gap-2">
            <button onClick={() => setQ2('maximize')} className={opt(q2 === 'maximize')}>Maximize return on spend</button>
            <button onClick={() => setQ2('target')} className={opt(q2 === 'target')}>Hit a specific target</button>
          </div>
        </div>
      )}
      {rec && (
        <div className="border-t border-[var(--border)] pt-4 space-y-3">
          <p className="text-[13px] font-semibold">We recommend: {rec}</p>
          <p className="text-[12.5px] text-[var(--ink-600)]">
            {rec === 'Spend Based' ? 'You have a defined budget and want the best return from it.' : 'You have a revenue target and want the most efficient path to it.'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => { onSelect(rec); onClose(); }} className="flex-1 bg-[var(--brand)] text-white py-2 rounded-md text-[12.5px] font-medium">Use {rec}</button>
            <button onClick={() => { onSelect(rec === 'Spend Based' ? 'Goal Based' : 'Spend Based'); onClose(); }} className="flex-1 border border-[var(--border-strong)] py-2 rounded-md text-[12.5px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)]">
              Use {rec === 'Spend Based' ? 'Goal Based' : 'Spend Based'} instead
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ChannelPlanningTable ──────────────────────────────────────────────────────

function ChannelPlanningTable({ rows, editable = false, onSliderChange }: {
  rows: ChannelPlanningRow[];
  editable?: boolean;
  onSliderChange?: (channelId: number, min: number, max: number) => void;
}) {
  if (!rows.length) return <p className="text-[12.5px] text-[var(--ink-400)] py-4 text-center">No channels loaded for this cycle.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead><tr className="bg-[var(--surface-muted)]">
          {['Channel', 'Current Spend', 'ROI', 'Min %', 'Range', 'Max %'].map((h, i) => (
            <th key={h} className={`px-4 py-2.5 ui-eyebrow text-[var(--ink-500)] ${i > 0 ? 'text-right' : 'text-left'} ${i === 4 ? '!text-left w-72' : ''}`}>{h}</th>
          ))}
        </tr></thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map((r) => (
            <tr key={r.channel_id} className="hover:bg-[var(--surface-muted)]">
              <td className="px-4 py-2.5 font-medium text-[var(--ink-900)]">{r.channel_name}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{fmtCompact(r.current_spend)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{fmtROI(r.current_roi)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{r.min_spend_pct}%</td>
              <td className="px-4 py-2.5">
                <DualRangeSlider minValue={r.min_spend_pct} maxValue={r.max_spend_pct}
                  onChange={editable && onSliderChange ? (mn, mx) => onSliderChange(r.channel_id, mn, mx) : undefined}
                  disabled={!editable} />
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{r.max_spend_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

/**
 * ScenarioPlanner page.
 *
 * Orchestrates cycle selection, create/view/edit modal states, and renders
 * the KPI cards, channel overview charts, and saved scenarios list.
 *
 * @param {ScenarioPlannerProps} props
 */
export default function ScenarioPlanner({ onViewOutcome }: ScenarioPlannerProps) {
  const { filters } = useFilters();

  // Cycle selection lives in FilterBar/FilterContext — the four-step cascade
  // (Market → Brand → Indication → Cycle) is the single source of truth.
  const cycleId = filters.cycle;

  const hook = useScenarioPlanning(cycleId);

  const [createOpen, setCreateOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [doneId, setDoneId] = useState<number | null>(null);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioType, setScenarioType] = useState<'Spend Based' | 'Goal Based'>('Spend Based');
  const [targetSpend, setTargetSpend] = useState('');
  const [targetKpi, setTargetKpi] = useState('Incremental Sales');
  const [targetValue, setTargetValue] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [infoType, setInfoType] = useState<'Spend Based' | 'Goal Based' | null>(null);

  const viewingScenario = hook.savedScenarios.find((s) => s.scenario_id === viewingId) ?? null;

  const filteredScenarios = useMemo(() =>
    hook.savedScenarios.filter((s) =>
      s.scenario_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterType === 'All' || s.scenario_type === filterType),
    ),
    [hook.savedScenarios, searchQuery, filterType],
  );

  useEffect(() => {
    if (hook.completedId) { setDoneId(hook.completedId); setShowSuccess(true); hook.clearCompletedId(); }
  }, [hook.completedId]);

  const openCreate = () => {
    setScenarioName(''); setScenarioType('Spend Based'); setTargetSpend('');
    setTargetKpi('Incremental Sales'); setTargetValue(''); setIsPublic(true);
    hook.handleResetAll(); setShowHelp(false); setCreateOpen(true);
  };

  const handleSaveCreate = async () => {
    // Use createModalRows (DATA_FACT channels) as the constraint source.
    // Filter out sentinel IDs (< 0) assigned to channels with no model summary entry.
    const constraints = hook.createModalRows
      .filter((r) => r.channel_id >= 0)
      .map((r) => ({ channel_id: r.channel_id, min_spend_pct: r.min_spend_pct, max_spend_pct: r.max_spend_pct }));
    const id = await hook.handleSaveScenario({
      name: scenarioName.trim() || `Scenario ${hook.savedScenarios.length + 1}`,
      scenario_type: scenarioType,
      is_public: isPublic,
      target_spend: scenarioType === 'Spend Based' ? (parseFloat(targetSpend) || undefined) : undefined,
      target_kpi: scenarioType === 'Goal Based' ? targetKpi : undefined,
      target_value: scenarioType === 'Goal Based' ? (parseFloat(targetValue) || undefined) : undefined,
      constraints,
    });
    if (id !== null) setCreateOpen(false);
  };

  const handleEditSave = async () => {
    if (!viewingScenario) return;
    await hook.handleUpdateScenario(viewingScenario.scenario_id,
      hook.planningRows.map((r) => ({ channel_id: r.channel_id, min_spend_pct: r.min_spend_pct, max_spend_pct: r.max_spend_pct })),
    );
    setEditMode(false);
  };

  const visBtn = (active: boolean, label: string) => (
    <button onClick={() => setIsPublic(label === 'Public')}
      className={`px-3 py-1.5 rounded-md text-[12.5px] border transition-colors ${active ? 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand)]' : 'border-[var(--border)] text-[var(--ink-600)] hover:bg-[var(--surface-subtle)]'}`}>
      {label}
    </button>
  );

  return (
    <PageContainer>
      <PageHeader eyebrow="Scenario Planning" title="Build & optimize scenarios"
        description="Create spend scenarios, set channel constraints, and run the optimizer."
      />

      {hook.apiError && (
        <div className="mb-5 flex items-center gap-2 text-[12px] px-3 py-2 rounded-md border text-red-700 bg-red-50 border-red-200 w-fit">
          {hook.apiError}
          <button onClick={hook.clearApiError} className="ml-1 font-bold text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {!cycleId ? (
        <EmptyState title="Select a cycle" message="Use the filter bar above to select Market → Brand → Indication → Cycle." />
      ) : hook.loadingChannels ? (
        <LoadingState message="Loading cycle data…" />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Sales" value={fmtCompact(hook.dashboardKpis.total_sales)} />
            <KpiCard label="Total Spend" value={fmtCompact(hook.dashboardKpis.total_spend)} />
            <KpiCard label="Overall ROI" value={fmtROI(hook.dashboardKpis.overall_roi)} />
            <KpiCard label="Active Cycle" value={cycleId} />
          </div>

          {hook.channelRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card>
                <CardHeader title="Spend comparison" subtitle="Current vs proposed by channel" />
                <div className="px-6 pb-5">
                  <SpendComparisonChart data={hook.planningRows.map((r) => ({ name: r.channel_name, current: r.current_spend, proposed: r.proposed_spend }))} />
                </div>
              </Card>
              <Card>
                <CardHeader title="Channel ROI" subtitle="Baseline ROI coefficient per channel" />
                <div className="px-6 pb-5">
                  <RoiComparisonChart data={hook.channelRows.map((r) => ({ name: r.channel_name, roi: r.current_roi, category: r.category }))} />
                </div>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader title="Saved scenarios"
              subtitle={`${hook.savedScenarios.length} scenario${hook.savedScenarios.length !== 1 ? 's' : ''}`}
              actions={<>
                <button onClick={hook.loadScenarios} className="p-1.5 rounded hover:bg-[var(--surface-subtle)] text-[var(--ink-400)]" title="Refresh"><RefreshCw size={14} /></button>
                <Button size="sm" leftIcon={<Plus size={13} />} onClick={openCreate}>New scenario</Button>
              </>}
            />
            <div className="px-6 pb-2 flex gap-2">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
                <Input className="pl-8 h-8 text-[12.5px]" placeholder="Search…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              <Select className="h-8 text-[12.5px]" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <option value="All">All types</option>
                <option value="Spend Based">Spend Based</option>
                <option value="Goal Based">Goal Based</option>
              </Select>
            </div>
            {hook.loadingScenarios ? <LoadingState message="Loading scenarios…" />
              : filteredScenarios.length === 0
                ? <EmptyState title="No scenarios yet" message="Create a scenario to start optimizing channel spend." />
                : (
                  <div className="divide-y divide-[var(--border)]">
                    {filteredScenarios.map((s) => (
                      <div key={s.scenario_id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-[var(--surface-muted)]">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--ink-900)] truncate">{s.scenario_name}</p>
                          <p className="text-[11.5px] text-[var(--ink-500)] mt-0.5">{s.scenario_type} · {new Date(s.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge tone={s.is_pending ? 'warning' : 'success'}>{s.is_pending ? 'Pending' : 'Complete'}</Badge>
                        {s.is_public && <Badge tone="brand">Public</Badge>}
                        <div className="flex items-center gap-1.5">
                          {hook.runningId === s.scenario_id
                            ? <span className="flex items-center gap-1.5 text-[12px] text-[var(--brand)]"><Loader2 size={13} className="animate-spin" />Running…</span>
                            : <Button size="sm" variant="secondary" leftIcon={<Play size={12} />} onClick={() => hook.handleRunScenario(s.scenario_id)} disabled={!!hook.runningId}>Run</Button>
                          }
                          <Button size="sm" variant="ghost" leftIcon={<ChevronRight size={13} />} onClick={() => { setViewingId(s.scenario_id); setEditMode(false); }}>View</Button>
                          {!s.is_pending && <Button size="sm" variant="ghost" onClick={() => onViewOutcome(String(s.scenario_id))}>Outcome</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )
            }
          </Card>
        </div>
      )}

      {/* Create modal — footer has Reset Constraints (clears sliders) + Save.
          The × button in the modal header (rendered by Modal) closes the modal. */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New scenario" size="xl"
        footer={<>
          <Button variant="secondary" onClick={hook.handleResetAll}>Reset Constraints</Button>
          <Button onClick={handleSaveCreate}>Save scenario</Button>
        </>}
      >
        {showHelp ? <HelpMeChoose onSelect={(t) => setScenarioType(t)} onClose={() => setShowHelp(false)} /> : (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Scenario name"><Input placeholder="e.g. Q3 optimized spend" value={scenarioName} onChange={(e) => setScenarioName(e.target.value)} /></Field>
              <Field label="Type">
                <div className="flex items-center gap-2">
                  <Select value={scenarioType} onChange={(e) => setScenarioType(e.target.value as 'Spend Based' | 'Goal Based')}>
                    <option value="Spend Based">Spend Based</option>
                    <option value="Goal Based">Goal Based</option>
                  </Select>
                  <button onClick={() => setShowHelp(true)} className="text-[11.5px] text-[var(--brand)] hover:underline whitespace-nowrap">Help me choose</button>
                  <button onClick={() => setInfoType(scenarioType)} className="text-[11.5px] text-[var(--ink-400)] hover:text-[var(--ink-700)] whitespace-nowrap">What's this?</button>
                </div>
              </Field>
            </div>
            {scenarioType === 'Spend Based'
              ? <Field label="Target spend ($)" hint="Total budget to allocate across all channels"><Input type="number" placeholder="0.00" value={targetSpend} onChange={(e) => setTargetSpend(e.target.value)} /></Field>
              : <div className="grid grid-cols-2 gap-4">
                  <Field label="Target KPI"><Select value={targetKpi} onChange={(e) => setTargetKpi(e.target.value)}><option>Incremental Sales</option><option>Total Sales</option><option>ROI</option></Select></Field>
                  <Field label="Target value"><Input type="number" placeholder="0.00" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} /></Field>
                </div>
            }
            <Field label="Visibility"><div className="flex gap-2">{visBtn(isPublic, 'Public')}{visBtn(!isPublic, 'Private')}</div></Field>
            <div>
              <p className="ui-eyebrow text-[var(--ink-500)] mb-2.5">Channel constraints</p>
              {hook.dataFactChannelsLoading ? (
                <LoadingState message="Loading channel data…" />
              ) : hook.dataFactChannelsError || hook.createModalRows.length === 0 ? (
                <EmptyState
                  title="No channel data"
                  message="No channel data found for the selected cycle. Upload a DATA_FACT file first."
                />
              ) : (
                <ChannelPlanningTable rows={hook.createModalRows} editable onSliderChange={hook.handleSliderChange} />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* View / Edit modal */}
      <Modal open={viewingId !== null} onClose={() => { setViewingId(null); setEditMode(false); }}
        title={viewingScenario?.scenario_name ?? ''} size="xl"
        subtitle={viewingScenario ? `${viewingScenario.scenario_type} · ${new Date(viewingScenario.created_at).toLocaleDateString()}` : undefined}
        footer={editMode
          ? <><Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button><Button onClick={handleEditSave}>Save changes</Button></>
          : <><Button variant="secondary" onClick={() => { setViewingId(null); setEditMode(false); }}>Close</Button><Button variant="secondary" onClick={() => setEditMode(true)}>Edit constraints</Button></>
        }
      >
        {viewingScenario && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <KpiCard label="Type" value={viewingScenario.scenario_type} />
              <KpiCard label="Status" value={viewingScenario.is_pending ? 'Pending' : 'Completed'} />
              {viewingScenario.target_spend && <KpiCard label="Target Spend" value={fmtCompact(viewingScenario.target_spend)} />}
            </div>
            <div>
              <p className="ui-eyebrow text-[var(--ink-500)] mb-2.5">Channel constraints</p>
              <ChannelPlanningTable
                rows={editMode ? hook.planningRows : hook.channelRows.map((r) => {
                  const c = viewingScenario.constraints.find((x) => x.channel_id === r.channel_id);
                  return { ...r, min_spend_pct: c?.min_spend_pct ?? 0, max_spend_pct: c?.max_spend_pct ?? 0 };
                })}
                editable={editMode}
                onSliderChange={hook.handleSliderChange}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Success modal */}
      <Modal open={showSuccess} onClose={() => setShowSuccess(false)} title="Optimization complete" size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowSuccess(false)}>Close</Button>{doneId && <Button onClick={() => { setShowSuccess(false); onViewOutcome(String(doneId)); }}>View outcome</Button>}</>}
      >
        <div className="p-6 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 text-green-600 text-xl font-bold">✓</div>
          <p className="text-[14px] font-semibold text-[var(--ink-900)]">Optimizer finished</p>
          <p className="text-[12.5px] text-[var(--ink-500)]">View the outcome to see optimized channel allocations and projected KPIs.</p>
        </div>
      </Modal>

      {infoType && <ScenarioInfoModal type={infoType} onClose={() => setInfoType(null)} />}
    </PageContainer>
  );
}
