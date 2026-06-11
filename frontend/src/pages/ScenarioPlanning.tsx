/**
 * ScenarioPlanning.tsx
 *
 * Scenario Planning page — allows analysts to configure spend constraints
 * per channel, save scenarios, run the optimizer, and view results.
 * All server state is managed by useScenarioPlanning.
 * This page manages only UI state: modals, form fields, search, filters.
 */
import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Play, Eye, Pencil, RefreshCw, Loader2, CheckCircle, Download } from 'lucide-react';
import { DualRangeSlider } from '@/components/shared/base/DualRangeSlider';
import { ScenarioInfoModal } from '@/components/shared/modals/ScenarioInfoModal';
import { DuplicateNameModal } from '@/components/shared/modals/DuplicateNameModal';
import {
  PageContainer, PageHeader, Card, CardHeader, KpiCard, KpiWithTooltip,
  Button, Input, Select, Field, Modal, Badge,
} from '@/components/shared';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { SpendComparisonChart } from '@/components/shared/charts/SpendComparisonChart';
import { RoiComparisonChart } from '@/components/shared/charts/RoiComparisonChart';
import { useFilters } from '@/context/FilterContext';
import { useScenarioPlanning } from '@/hooks/useScenarioPlanning';
import { fmtCompact, fmtExact, fmtROI } from '@/utils/categories';
import { exportToCSV } from '@/utils/export';
import type { ChannelPlanningRow } from '@/utils/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Maps an optimizer opt_status value to the correct Badge tone.
 * draft → neutral, running → warning, completed → success, failed → danger
 */
function resolveStatusTone(s: string): 'neutral' | 'warning' | 'success' | 'danger' {
  if (s === 'completed') return 'success';
  if (s === 'running') return 'warning';
  if (s === 'failed') return 'danger';
  return 'neutral';
}

/** Maps an optimizer opt_status value to a human-readable display label. */
function resolveStatusLabel(s: string): string {
  if (s === 'completed') return 'Completed';
  if (s === 'running') return 'Running';
  if (s === 'failed') return 'Failed';
  return 'Draft';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HelpMeChoose({ onSelect, onClose }: { onSelect: (t: 'Spend Based' | 'Goal Based') => void; onClose: () => void }) {
  const [q1, setQ1] = useState<'fixed' | 'flexible' | null>(null);
  const [q2, setQ2] = useState<'maximize' | 'target' | null>(null);
  const rec: 'Spend Based' | 'Goal Based' | null = q1 === 'fixed' ? 'Spend Based' : q1 === 'flexible' && q2 === 'maximize' ? 'Spend Based' : q1 === 'flexible' && q2 === 'target' ? 'Goal Based' : null;
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
          <p className="text-[12.5px] text-[var(--ink-600)]">{rec === 'Spend Based' ? 'You have a defined budget and want the best return from it.' : 'You have a revenue target and want the most efficient path to it.'}</p>
          <div className="flex gap-2">
            <button onClick={() => { onSelect(rec); onClose(); }} className="flex-1 bg-[var(--brand)] text-white py-2 rounded-md text-[12.5px] font-medium">Use {rec}</button>
            <button onClick={() => { onSelect(rec === 'Spend Based' ? 'Goal Based' : 'Spend Based'); onClose(); }} className="flex-1 border border-[var(--border-strong)] py-2 rounded-md text-[12.5px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)]">Use {rec === 'Spend Based' ? 'Goal Based' : 'Spend Based'} instead</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelPlanningTable({ rows, editable = false, onSliderChange }: { rows: ChannelPlanningRow[]; editable?: boolean; onSliderChange?: (id: number, min: number, max: number) => void; }) {
  if (!rows.length) return <p className="text-[12.5px] text-[var(--ink-400)] py-4 text-center">No channels loaded for this cycle.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead><tr className="bg-[var(--surface-muted)]">{['Channel', 'Current Spend', 'ROI', 'Min %', 'Range', 'Max %'].map((h, i) => <th key={h} className={`px-4 py-2.5 ui-eyebrow text-[var(--ink-500)] ${i > 0 ? 'text-right' : 'text-left'} ${i === 4 ? '!text-left w-72' : ''}`}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-[var(--border)]">
          {rows.map(r => (
            <tr key={r.channel_id} className="hover:bg-[var(--surface-muted)]">
              <td className="px-4 py-2.5 font-medium text-[var(--ink-900)]">{r.channel_name}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{fmtCompact(r.current_spend)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{fmtROI(r.current_roi)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{r.min_spend_pct}%</td>
              <td className="px-4 py-2.5"><DualRangeSlider minValue={r.min_spend_pct} maxValue={r.max_spend_pct} onChange={editable && onSliderChange ? (mn, mx) => onSliderChange(r.channel_id, mn, mx) : undefined} disabled={!editable} /></td>
              <td className="px-4 py-2.5 text-right tabular-nums text-[var(--ink-700)]">{r.max_spend_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface ScenarioPlannerProps {
  onViewOutcome: (scenarioId: string) => void;
}

/**
 * ScenarioPlanner page.
 * Orchestrates cycle selection, create/view/edit modal states, and renders
 * KPI cards, channel overview charts, and the saved scenarios list.
 *
 * @param {ScenarioPlannerProps} props
 */
export default function ScenarioPlanner({ onViewOutcome }: ScenarioPlannerProps) {
  const { filters } = useFilters();
  const cycleId = filters.cycle;
  const hook = useScenarioPlanning(cycleId);

  const [createOpen, setCreateOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioType, setScenarioType] = useState<'Spend Based' | 'Goal Based'>('Spend Based');
  const [targetSpend, setTargetSpend] = useState('');
  const [targetKPI, setTargetKPI] = useState('Incremental Sales');
  const [targetValue, setTargetValue] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [scenarioSaved, setScenarioSaved] = useState(false);
  const [pendingScenarioId, setPendingScenarioId] = useState<number | null>(null);
  const [infoModalType, setInfoModalType] = useState<'Spend Based' | 'Goal Based' | null>(null);
  const [duplicateNameError, setDuplicateNameError] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All types');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const viewingScenario = hook.savedScenarios.find(s => s.scenario_id === viewingId) ?? null;

  /** Rows filtered to selected categories for the create modal constraints table. */
  const modalConstraintRows = useMemo(() => {
    if (selectedCategories.length === 0) return hook.planningRows;
    return hook.planningRows.filter(r => selectedCategories.includes(r.category));
  }, [hook.planningRows, selectedCategories]);

  /** Scenario list filtered by search query and type filter. */
  const filteredScenarios = useMemo(() =>
    hook.savedScenarios.filter(s =>
      s.scenario_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (filterType === 'All types' || s.scenario_type === filterType)
    ),
    [hook.savedScenarios, searchQuery, filterType],
  );

  useEffect(() => { if (hook.completedId) setShowSuccessModal(true); }, [hook.completedId]);

  const openCreate = () => {
    setScenarioName(''); setScenarioType('Spend Based'); setTargetSpend('');
    setTargetKPI('Incremental Sales'); setTargetValue(''); setIsPublic(true);
    setSelectedCategories([]); setScenarioSaved(false); setPendingScenarioId(null);
    hook.handleResetAll(); setShowHelp(false); setCreateOpen(true);
  };

  /**
   * Validates the scenario name for duplicates, then delegates to the hook.
   * Sets duplicateNameError when a name collision is detected.
   */
  const handleSaveScenario = async () => {
    const name = scenarioName.trim() || `Scenario ${hook.savedScenarios.length + 1}`;
    if (hook.savedScenarios.some(s => s.scenario_name.toLowerCase() === name.toLowerCase())) {
      setDuplicateNameError(name); return;
    }
    const id = await hook.handleSaveScenario({ scenarioName: name, cycleId: cycleId!, scenarioType, isPublic, selectedCategories, targetSpend, targetKPI, targetValue, constraintRows: modalConstraintRows });
    if (id) { setPendingScenarioId(id); setScenarioSaved(true); }
  };

  const handleEditSave = async () => {
    if (!viewingScenario) return;
    await hook.handleUpdateScenario(viewingScenario.scenario_id,
      hook.planningRows.map(r => ({ channel_id: r.channel_id, min_spend_pct: r.min_spend_pct, max_spend_pct: r.max_spend_pct })));
    setEditMode(false);
  };

  const kpis = hook.dashboardKpis;
  const visBtn = (active: boolean, label: string) => (
    <button onClick={() => setIsPublic(label === 'Public')} className={`px-3 py-1.5 rounded-md text-[12.5px] border transition-colors ${active ? 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand)]' : 'border-[var(--border)] text-[var(--ink-600)] hover:bg-[var(--surface-subtle)]'}`}>{label}</button>
  );

  return (
    <PageContainer>
      <PageHeader eyebrow="Scenario Builder" title="Plan & optimise your spend"
        description="Create spend scenarios, set channel constraints, and run the optimizer."
        actions={<>
          <button onClick={() => exportToCSV(hook.planningRows as any[], 'scenario-plan')} className="flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-subtle)] transition-colors"><Download size={13} /> Export plan</button>
          <Button leftIcon={<Plus size={13} />} onClick={openCreate} disabled={!cycleId}>New scenario</Button>
        </>}
      />

      {hook.apiError && (
        <div className="mb-5 flex items-center gap-2 text-[12px] px-3 py-2 rounded-md border text-red-700 bg-red-50 border-red-200 w-fit">
          {hook.apiError}<button onClick={hook.clearApiError} className="ml-1 font-bold text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {!cycleId ? (
        <div className="flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-md border text-blue-700 bg-blue-50 border-blue-100 w-fit mb-5">Select a cycle from the filter bar above to begin.</div>
      ) : hook.loadingChannels ? <LoadingState message="Loading cycle data…" /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiWithTooltip label="Total Sales" value={fmtCompact(kpis?.total_sales ?? 0)} tooltip={`Exact: ${fmtExact(kpis?.total_sales ?? 0)}`} />
            <KpiWithTooltip label="Impactable Sales" value={fmtCompact(kpis?.impactable_sales ?? 0)} tooltip={`Exact: ${fmtExact(kpis?.impactable_sales ?? 0)}`} />
            <KpiCard label="Overall ROI" value={fmtROI(kpis?.overall_roi ?? 0)} sub="Impactable sales / total spend" />
            <KpiCard label="Total Spend" value={fmtCompact(kpis?.total_spend ?? 0)} />
          </div>

          {hook.channelRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card><CardHeader title="Spend comparison" subtitle="Current vs proposed by channel" /><div className="px-6 pb-5"><SpendComparisonChart rows={hook.planningRows} /></div></Card>
              <Card><CardHeader title="Channel ROI" subtitle="Baseline ROI coefficient per channel" /><div className="px-6 pb-5"><RoiComparisonChart rows={hook.channelRows} /></div></Card>
            </div>
          )}

          <Card>
            <CardHeader title="Saved scenarios" subtitle={`${hook.savedScenarios.length} scenario${hook.savedScenarios.length !== 1 ? 's' : ''}`}
              actions={<>
                <button onClick={hook.loadScenarios} className="p-1.5 rounded hover:bg-[var(--surface-subtle)] text-[var(--ink-400)]" title="Refresh"><RefreshCw size={14} /></button>
                <Button size="sm" leftIcon={<Plus size={13} />} onClick={openCreate}>New scenario</Button>
              </>}
            />
            <div className="px-6 pb-2 flex gap-2">
              <div className="relative flex-1 max-w-xs"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" /><Input className="pl-8 h-8 text-[12.5px]" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
              <Select className="h-8 text-[12.5px]" value={filterType} onChange={e => setFilterType(e.target.value)}><option value="All types">All types</option><option value="Spend Based">Spend Based</option><option value="Goal Based">Goal Based</option></Select>
            </div>
            {hook.runningId && (
              <div className="mx-6 mb-3 flex items-center gap-3 text-[12px] text-[var(--brand-700)]">
                <Loader2 size={13} className="animate-spin flex-shrink-0" />{hook.progressText}
                <div className="flex-1 h-1.5 bg-[var(--surface-subtle)] rounded-full overflow-hidden"><div className="h-full bg-[var(--brand)] rounded-full" style={{ animation: 'progressSlide 2s ease-in-out infinite' }} /></div>
              </div>
            )}
            {hook.loadingScenarios ? <LoadingState message="Loading scenarios…" />
              : filteredScenarios.length === 0
                ? <EmptyState title="No scenarios yet" message="Create a scenario to start optimizing channel spend." />
                : <div className="divide-y divide-[var(--border)]">
                    {filteredScenarios.map(s => (
                      <div key={s.scenario_id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-[var(--surface-muted)]">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--ink-900)] truncate">{s.scenario_name}</p>
                          <p className="text-[11.5px] text-[var(--ink-500)] mt-0.5">{s.scenario_type} · {new Date(s.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge tone={resolveStatusTone(s.opt_status)}>{resolveStatusLabel(s.opt_status)}</Badge>
                        {s.is_public && <Badge tone="brand">Public</Badge>}
                        <div className="flex items-center gap-1.5">
                          {hook.runningId === s.scenario_id
                            ? <span className="flex items-center gap-1.5 text-[12px] text-[var(--brand)]"><Loader2 size={13} className="animate-spin" />Running…</span>
                            : ['draft', 'failed'].includes(s.opt_status) && <Button size="sm" variant="secondary" leftIcon={<Play size={12} />} onClick={() => hook.handleRunScenario(s.scenario_id)} disabled={!!hook.runningId}>Run</Button>
                          }
                          {s.opt_status === 'completed' && <Button size="sm" variant="ghost" onClick={() => onViewOutcome(String(s.scenario_id))}>View Outcome</Button>}
                          <button onClick={() => { setViewingId(s.scenario_id); setEditMode(false); }} className="p-1.5 rounded hover:bg-[var(--surface-subtle)] text-[var(--ink-400)]"><Eye size={14} /></button>
                          <button onClick={() => { setViewingId(s.scenario_id); setEditMode(true); }} className="p-1.5 rounded hover:bg-[var(--surface-subtle)] text-[var(--ink-400)]"><Pencil size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
            }
          </Card>
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Scenario" size="xl"
        headerActions={<div className="flex gap-1">{visBtn(isPublic, 'Public')}{visBtn(!isPublic, 'Private')}</div>}
        footer={<><Button variant="secondary" onClick={hook.handleResetAll}>Reset constraints</Button><Button variant="secondary" onClick={handleSaveScenario} disabled={scenarioSaved}>Save scenario</Button><Button onClick={() => pendingScenarioId && hook.handleRunScenario(pendingScenarioId)} disabled={!scenarioSaved || !!hook.runningId}>Run scenario</Button></>}
      >
        {showHelp ? <HelpMeChoose onSelect={t => setScenarioType(t)} onClose={() => setShowHelp(false)} /> : (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <Field label="01 Scenario name *"><Input placeholder="e.g. Q3 optimized spend" value={scenarioName} onChange={e => setScenarioName(e.target.value)} /></Field>
              <Field label="02 Category">
                <div className="flex flex-wrap gap-1.5 mt-1">{hook.availableCategories.map(cat => <button key={cat} onClick={() => setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])} className={`px-2.5 py-1 rounded-md text-[12px] border transition-colors ${selectedCategories.includes(cat) ? 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand)]' : 'border-[var(--border)] hover:border-[var(--ink-400)]'}`}>{cat}</button>)}</div>
              </Field>
              <Field label="03 Scenario type">
                <div className="flex items-center gap-2">
                  <Select value={scenarioType} onChange={e => setScenarioType(e.target.value as 'Spend Based' | 'Goal Based')}><option value="Spend Based">Spend Based</option><option value="Goal Based">Goal Based</option></Select>
                  <button onClick={() => setShowHelp(true)} className="text-[11.5px] text-[var(--brand)] hover:underline whitespace-nowrap">Help me choose</button>
                  <button onClick={() => setInfoModalType(scenarioType)} className="text-[11.5px] text-[var(--ink-400)] hover:text-[var(--ink-700)] whitespace-nowrap">What's this?</button>
                </div>
              </Field>
            </div>
            <div className="border border-[var(--border)] rounded-lg p-4">
              <p className="ui-eyebrow text-[var(--ink-500)] mb-3">04 Target goal *</p>
              {scenarioType === 'Spend Based'
                ? <Field label="Total spend ($)" hint="Total budget to allocate across all channels"><Input type="number" placeholder="0.00" value={targetSpend} onChange={e => setTargetSpend(e.target.value)} /></Field>
                : <div className="grid grid-cols-2 gap-4"><Field label="Target KPI"><Select value={targetKPI} onChange={e => setTargetKPI(e.target.value)}><option>Incremental Sales</option><option>Total Sales</option><option>ROI</option></Select></Field><Field label="Target value"><Input type="number" placeholder="0.00" value={targetValue} onChange={e => setTargetValue(e.target.value)} /></Field></div>
              }
            </div>
            <div>
              <p className="ui-eyebrow text-[var(--ink-500)] mb-2.5">05 Channel & sub-channel constraints</p>
              <ChannelPlanningTable rows={modalConstraintRows} editable onSliderChange={hook.handleSliderChange} />
            </div>
          </div>
        )}
      </Modal>

      {/* View / Edit modal */}
      <Modal open={viewingId !== null} onClose={() => { setViewingId(null); setEditMode(false); }} title={viewingScenario?.scenario_name ?? ''} size="xl"
        subtitle={viewingScenario ? `${viewingScenario.scenario_type} · ${new Date(viewingScenario.created_at).toLocaleDateString()}` : undefined}
        footer={editMode
          ? <><Button variant="secondary" onClick={() => setEditMode(false)}>Cancel</Button><Button onClick={handleEditSave}>Save changes</Button></>
          : <><Button variant="secondary" onClick={() => { setViewingId(null); setEditMode(false); }}>Close</Button><Button variant="secondary" onClick={() => setEditMode(true)}>Edit constraints</Button>{viewingScenario?.opt_status === 'completed' && <Button onClick={() => { setViewingId(null); onViewOutcome(String(viewingId)); }}>View Outcome</Button>}</>
        }
      >
        {viewingScenario && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <KpiCard label="Type" value={viewingScenario.scenario_type} />
              <KpiCard label="Status" value={resolveStatusLabel(viewingScenario.opt_status)} />
              {viewingScenario.target_spend && <KpiCard label="Target Spend" value={fmtCompact(viewingScenario.target_spend)} />}
            </div>
            <div>
              <p className="ui-eyebrow text-[var(--ink-500)] mb-2.5">Channel constraints</p>
              <ChannelPlanningTable rows={editMode ? hook.planningRows : hook.channelRows.map(r => { const c = viewingScenario.constraints.find(x => x.channel_id === r.channel_id); return { ...r, min_spend_pct: c?.min_spend_pct ?? 0, max_spend_pct: c?.max_spend_pct ?? 0 }; })} editable={editMode} onSliderChange={hook.handleSliderChange} />
            </div>
          </div>
        )}
      </Modal>

      {/* Success modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto text-green-600"><CheckCircle size={24} /></div>
            <p className="text-[16px] font-semibold text-[var(--ink-900)]">Optimization Complete</p>
            <p className="text-[13px] text-[var(--ink-500)]">View the outcome to see optimized channel allocations and projected KPIs.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="secondary" onClick={() => { setShowSuccessModal(false); hook.clearCompletedId(); }}>Close</Button>
              <Button onClick={() => { setShowSuccessModal(false); hook.clearCompletedId(); if (hook.completedId) onViewOutcome(String(hook.completedId)); }}>View Outcome</Button>
            </div>
          </div>
        </div>
      )}

      {infoModalType && <ScenarioInfoModal type={infoModalType === 'Spend Based' ? 'SPEND BASED' : 'GOAL BASED'} onClose={() => setInfoModalType(null)} />}
      {duplicateNameError && <DuplicateNameModal scenarioName={duplicateNameError} onClose={() => setDuplicateNameError(null)} />}

      <style>{`@keyframes progressSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
    </PageContainer>
  );
}
