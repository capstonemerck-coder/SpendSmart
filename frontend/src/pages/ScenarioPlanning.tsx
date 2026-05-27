//scenarioPlanning
import React, { useState, useEffect } from 'react';
import { Info, Plus, Search, Play, Edit2, Eye, ChevronRight, Save, Check, X } from 'lucide-react';
import { DualRangeSlider } from '@/components/shared/base/DualRangeSlider';
import { ScenarioInfoModal } from '@/components/shared/modals/ScenarioInfoModal';
import { DuplicateNameModal } from '@/components/shared/modals/DuplicateNameModal';
import {
  PageContainer, PageHeader, Card, CardHeader, KpiCard, Button, Input, Select,
  Field, SectionTitle, Modal, Badge, StatusDot,
} from '@/components/shared';
import type { Scenario, Constraint } from '@/utils/types';

const CATEGORY_CHANNELS: Record<string, Record<string, string[]>> = {
  'HCP NPP': {
    'Events': ['Speaker Programs', 'Conferences'],
    'Digital': ['Email Campaigns', 'Webinars'],
    'Print': ['Journal Ads', 'Magazine Ads'],
  },
  'HCP PP': {
    'Field Marketing': ['Rep Visits', 'Samples'],
    'Digital': ['Social Media', 'Display Ads'],
  },
  'CONSUMER': {
    'TV': ['Cable', 'Broadcast'],
    'Digital': ['Search', 'Social Media'],
    'Print': ['Newspaper', 'Magazine'],
  },
};

const categories = ['HCP NPP', 'HCP PP', 'CONSUMER'];

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  'HCP NPP': '#10b981',    // green
  'HCP PP': '#6b7280',     // grey
  'CONSUMER': '#1f2937',   // black
};

interface ScenarioPlannerProps {
  savedScenarios: Scenario[];
  setSavedScenarios: (scenarios: Scenario[]) => void;
  onViewOutcome: (scenarioId: string) => void;
}

// ── Help Me Choose widget ─────────────────────────────────────────────────────
function HelpMeChoose({ onSelect, onClose }: { onSelect: (t: 'SPEND BASED' | 'GOAL BASED') => void; onClose: () => void }) {
  const [q1, setQ1] = useState<'fixed' | 'flexible' | null>(null);
  const [q2, setQ2] = useState<'maximize' | 'target' | null>(null);

  const recommendation: 'SPEND BASED' | 'GOAL BASED' | null =
    q1 === 'fixed' ? 'SPEND BASED'
    : q1 === 'flexible' && q2 === 'maximize' ? 'SPEND BASED'
    : q1 === 'flexible' && q2 === 'target' ? 'GOAL BASED'
    : null;

  const reset = () => { setQ1(null); setQ2(null); };

  const optBtn = (active: boolean) =>
    `flex-1 py-2 px-4 rounded-md text-[12.5px] transition-colors border ${
      active ? 'bg-[var(--ink-900)] text-white border-[var(--ink-900)]' : 'border-[var(--border)] hover:bg-[var(--surface-subtle)]'
    }`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-[var(--ink-900)] text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold flex-shrink-0">?</div>
          <span className="text-[12px] font-semibold text-[var(--ink-900)]">Help me choose</span>
        </div>
        <button onClick={onClose} className="text-[11px] text-[var(--ink-400)] hover:text-[var(--ink-700)]">← Back</button>
      </div>

      {/* Q1 */}
      <div className="space-y-2.5">
        <p className="text-[13px] font-medium text-[var(--ink-900)]">1. Do you have a fixed budget for this cycle?</p>
        <div className="flex gap-2">
          <button onClick={() => { setQ1('fixed'); setQ2(null); }} className={optBtn(q1 === 'fixed')}>Yes, budget is fixed</button>
          <button onClick={() => setQ1('flexible')} className={optBtn(q1 === 'flexible')}>No, it's flexible</button>
        </div>
      </div>

      {/* Q2 — only when flexible */}
      {q1 === 'flexible' && (
        <div className="space-y-2.5">
          <p className="text-[13px] font-medium text-[var(--ink-900)]">2. What's your primary objective?</p>
          <div className="flex gap-2">
            <button onClick={() => setQ2('maximize')} className={optBtn(q2 === 'maximize')}>Maximize return on a set spend</button>
            <button onClick={() => setQ2('target')} className={optBtn(q2 === 'target')}>Hit a specific sales target</button>
          </div>
        </div>
      )}

      {/* Recommendation */}
      {recommendation && (
        <div className="border-t border-[var(--border)] pt-4 space-y-3">
          <p className="ui-eyebrow text-[var(--ink-500)]">We recommend</p>
          <div>
            <p className="text-[14px] font-semibold text-[var(--ink-900)] mb-1">
              {recommendation === 'SPEND BASED' ? 'Spend Based' : 'Goal Based'}
            </p>
            <p className="text-[12.5px] text-[var(--ink-600)] leading-relaxed">
              {recommendation === 'SPEND BASED'
                ? 'You have a defined budget and want the best return from it. Spend Based lets you set the total and the optimizer distributes it across channels for maximum impact.'
                : 'You have a revenue target in mind. Goal Based works backward from the sales number to find the most efficient minimum spend to get there.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { onSelect(recommendation); onClose(); }}
              className="flex-1 bg-[var(--brand)] hover:bg-[var(--brand-600)] text-white py-2 px-4 rounded-md text-[12.5px] font-medium transition-colors"
            >
              Use {recommendation === 'SPEND BASED' ? 'Spend Based' : 'Goal Based'}
            </button>
            <button
              onClick={() => { onSelect(recommendation === 'SPEND BASED' ? 'GOAL BASED' : 'SPEND BASED'); onClose(); }}
              className="flex-1 border border-[var(--border-strong)] py-2 px-4 rounded-md text-[12.5px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors"
            >
              Use {recommendation === 'SPEND BASED' ? 'Goal Based' : 'Spend Based'} instead
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ScenarioPlanner({
  savedScenarios, setSavedScenarios, onViewOutcome,
}: ScenarioPlannerProps) {
  const [createScenarioOpen, setCreateScenarioOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioType, setScenarioType] = useState('SPEND BASED');
  const [targetSpend, setTargetSpend] = useState('0.00');
  const [targetKPI, setTargetKPI] = useState('Incremental Sales');
  const [targetValue, setTargetValue] = useState('0.00');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['CONSUMER']);
  const [editSelectedCategories, setEditSelectedCategories] = useState<string[]>([]);
  const [viewingScenario, setViewingScenario] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [infoModalType, setInfoModalType] = useState<'SPEND BASED' | 'GOAL BASED' | null>(null);
  const [showHelpMeChoose, setShowHelpMeChoose] = useState(false);
  const [duplicateNameError, setDuplicateNameError] = useState<string | null>(null);
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All types');

  // ── Save-before-run gate ──────────────────────────────────────────────────
  const [scenarioSaved, setScenarioSaved] = useState(false);
  const [pendingScenarioId, setPendingScenarioId] = useState<string | null>(null);
  const [editScenarioSaved, setEditScenarioSaved] = useState(false);

  // Public toggle state (ON = public, OFF = private/creator only)
  const [isPublic, setIsPublic] = useState(true);

  // Optimizer execution state
  const [optimizerRunning, setOptimizerRunning] = useState(false);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedScenarioId, setCompletedScenarioId] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('Optimizer is running in the background…');

  // Generate constraints from selected categories - one row per subchannel
  const generateConstraintsFromCategories = (cats: string[]): Array<Constraint> => {
    const result: Array<Constraint> = [];
    cats.forEach((cat) => {
      const channels = CATEGORY_CHANNELS[cat];
      if (channels) {
        Object.entries(channels).forEach(([channel, subChannels]) => {
          // Create a separate row for each subchannel
          subChannels.forEach((subChannel) => {
            result.push({
              channel,
              subChannel,
              roi: 'x.x',
              currentSpend: '$xxxxx',
              minSpendPercent: 0,
              maxSpendPercent: 0,
            });
          });
        });
      }
    });
    return result;
  };

  // Toggle category selection for create mode
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  // Toggle category selection for edit mode
  const toggleEditCategory = (cat: string) => {
    setEditSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  // Update constraints when selected categories change (create mode)
  useEffect(() => {
    if (!viewingScenario) {
      setConstraints(generateConstraintsFromCategories(selectedCategories));
    }
  }, [selectedCategories, viewingScenario]);

  // Update constraints when edit categories change (edit mode)
  useEffect(() => {
    if (viewingScenario && editMode && editSelectedCategories.length > 0) {
      const fullConstraints = generateConstraintsFromCategories(editSelectedCategories);
      // Try to preserve existing values where possible
      const scenario = savedScenarios.find((s) => s.id === viewingScenario);
      if (scenario) {
        const merged = fullConstraints.map((fc) => {
          const saved = scenario.constraints?.find(
            (sc) => sc.channel === fc.channel && sc.subChannel === fc.subChannel
          );
          return saved ? { ...fc, ...saved } : fc;
        });
        setConstraints(merged);
      } else {
        setConstraints(fullConstraints);
      }
    }
  }, [editSelectedCategories, viewingScenario, editMode]);

  const filteredScenarios = savedScenarios.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All types' || s.type === filterType;
    const notFailed = s.status !== 'Failed';
    return matchesSearch && matchesType && notFailed;
  });

  const getCurrentScenario = () => savedScenarios.find((s) => s.id === viewingScenario);

  const handleMinSpendChange = (i: number, v: string) => {
    const num = parseInt(v) || 0;
    const updated = [...constraints];
    updated[i].minSpendPercent = Math.max(-100, Math.min(0, num));
    setConstraints(updated);
  };
  const handleMaxSpendChange = (i: number, v: string) => {
    const num = parseInt(v) || 0;
    const updated = [...constraints];
    updated[i].maxSpendPercent = Math.max(0, Math.min(100, num));
    setConstraints(updated);
  };

  // Save scenario directly with public flag
  const handleSaveScenario = () => {
    const name = scenarioName.trim() || `Scenario ${savedScenarios.length + 1}`;
    const isDuplicate = savedScenarios.some((s) => s.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) { setDuplicateNameError(name); return; }

    const id = `scenario_${Date.now()}`;
    const newScenario: Scenario = {
      id,
      name,
      type: scenarioType === 'SPEND BASED' ? 'Spend Based' : 'Goal Based',
      status: 'Pending',
      isPublic,
      constraints: constraints.map((c) => ({
        channel: c.channel,
        subChannel: c.subChannel,
        roi: c.roi,
        currentSpend: c.currentSpend,
        minSpendPercent: c.minSpendPercent,
        maxSpendPercent: c.maxSpendPercent,
      })),
      categoryConstraint: selectedCategories.join(', '),
      ...(scenarioType === 'SPEND BASED' ? { targetSpend } : { targetKPI, targetValue }),
    };
    setSavedScenarios([...savedScenarios, newScenario]);
    setPendingScenarioId(id);
    setScenarioSaved(true);
  };

  // Run scenario from saved list
  const handleRunScenarioFromList = (scenarioId: string) => {
    if (optimizerRunning) return; // Prevent multiple runs

    setOptimizerRunning(true);
    setRunningScenarioId(scenarioId);

    // Rotating progress text
    const progressMessages = [
      '⚙️ Optimizer is running in the background…',
      '⚙️ Generating optimized allocation…',
      '⚙️ Processing scenario constraints…',
      '⚙️ Computing optimized outcome…',
    ];
    let messageIndex = 0;

    const textInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % progressMessages.length;
      setProgressText(progressMessages[messageIndex]);
    }, 2000);

    // Simulate optimizer execution (4 seconds)
    setTimeout(() => {
      clearInterval(textInterval);
      setSavedScenarios(
        savedScenarios.map((s) => s.id === scenarioId ? { ...s, status: 'Success' } : s)
      );
      setOptimizerRunning(false);
      setRunningScenarioId(null);
      setCompletedScenarioId(scenarioId);
      setShowSuccessModal(true);
      setProgressText('⚙️ Optimizer is running in the background…');
    }, 4000);
  };

  // Save the edited scenario directly
  const handleSaveEditedScenario = () => {
    setSavedScenarios(
      savedScenarios.map((s) => s.id === viewingScenario ? {
        ...s,
        status: 'Pending',
        categoryConstraint: editSelectedCategories.join(', '),
        constraints: constraints.map(c => ({
          channel: c.channel,
          subChannel: c.subChannel,
          roi: c.roi,
          currentSpend: c.currentSpend,
          minSpendPercent: c.minSpendPercent,
          maxSpendPercent: c.maxSpendPercent,
        }))
      } : s)
    );
    setViewingScenario(null);
    setEditMode(false);
    setViewMode(false);
    setEditScenarioSaved(false);
    setEditSelectedCategories([]);
  };

  // Run scenario — only callable after save
  const handleRunScenario = () => {
    if (!scenarioSaved || !pendingScenarioId || optimizerRunning) return;

    const scenarioId = pendingScenarioId;
    resetCreateModal(); // Close modal first

    setOptimizerRunning(true);
    setRunningScenarioId(scenarioId);

    // Rotating progress text
    const progressMessages = [
      '⚙️ Optimizer is running in the background…',
      '⚙️ Generating optimized allocation…',
      '⚙️ Processing scenario constraints…',
      '⚙️ Computing optimized outcome…',
    ];
    let messageIndex = 0;

    const textInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % progressMessages.length;
      setProgressText(progressMessages[messageIndex]);
    }, 2000);

    // Simulate optimizer execution (4 seconds)
    setTimeout(() => {
      clearInterval(textInterval);
      setSavedScenarios(
        savedScenarios.map((s) => s.id === scenarioId ? { ...s, status: 'Success' } : s)
      );
      setOptimizerRunning(false);
      setRunningScenarioId(null);
      setCompletedScenarioId(scenarioId);
      setShowSuccessModal(true);
      setProgressText('⚙️ Optimizer is running in the background…');
    }, 4000);
  };

  const resetCreateModal = () => {
    setScenarioName('');
    setTargetSpend('0.00');
    setTargetValue('0.00');
    setSelectedCategories(['CONSUMER']);
    setConstraints(generateConstraintsFromCategories(['CONSUMER']));
    setScenarioSaved(false);
    setPendingScenarioId(null);
    setCreateScenarioOpen(false);
    setShowHelpMeChoose(false);
    setIsPublic(true); // Reset to default
  };

  const handleRunEditedScenario = () => {
    const current = getCurrentScenario();
    if (current) {
      const isDuplicate = savedScenarios.some(
        (s) => s.id !== current.id && s.name.toLowerCase() === current.name.toLowerCase(),
      );
      if (isDuplicate) { setDuplicateNameError(current.name); return; }
    }
    setEditMode(false);
    setViewingScenario(null);
  };

  const updateScenarioField = (field: string, value: string) => {
    setSavedScenarios(
      savedScenarios.map((s) => (s.id === viewingScenario ? { ...s, [field]: value } : s)),
    );
  };

  const statusTone = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (status === 'Success') return 'success';
    if (status === 'Failed') return 'danger';
    if (status === 'Pending') return 'warning';
    return 'neutral';
  };


  const current = getCurrentScenario();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Scenario Builder"
        title="Plan & optimize your spend"
        description="Design spend-based or goal-based scenarios with channel-level constraints."
        actions={
          <Button variant="primary" leftIcon={<Plus size={14} />} onClick={() => setCreateScenarioOpen(true)}>
            New scenario
          </Button>
        }
      />

      {/* Current State KPIs */}
      <Card className="mb-5">
        <CardHeader title="Current state" subtitle="Baseline metrics for the active cycle" />
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total sales',         value: '$1' },
              { label: 'Impactable sales',    value: '$1' },
              { label: 'Incremental sales',   value: '$1' },
              { label: 'Spend / sales ratio', value: '0.5' },
            ].map((k) => <KpiCard key={k.label} label={k.label} value={k.value} />)}
          </div>
        </div>
      </Card>

      {/* Scenarios List */}
      <Card>
        <CardHeader
          title="Saved scenarios"
          actions={
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
                <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search…" className="!pl-8 !h-9 w-56 !text-[12.5px]" />
              </div>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="!h-9 !text-[12.5px]">
                <option>All types</option>
                <option>Spend Based</option>
                <option>Goal Based</option>
              </Select>
            </div>
          }
        />

        {/* Optimizer Progress Indicator */}
        {optimizerRunning && (
          <div className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--brand-50)]/30 via-[var(--brand-50)]/10 to-transparent animate-[fadeIn_0.3s_ease-out]">
            <div className="space-y-3">
              {/* Progress Text */}
              <div className="flex items-center gap-2.5 text-[12.5px] text-[var(--brand-700)] font-medium">
                <div className="w-1 h-1 rounded-full bg-[var(--brand)] animate-pulse" />
                <span className="animate-[textPulse_2s_ease-in-out_infinite]">{progressText}</span>
              </div>

              {/* Ultra-thin Progress Line */}
              <div className="relative h-[2px] bg-[var(--ink-100)] rounded-full overflow-hidden shadow-inner">
                {/* Animated Gradient Glow Bar */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand)]/20 via-[var(--brand)] to-[var(--brand-600)] animate-[progressSlide_4s_cubic-bezier(0.4,0,0.2,1)_forwards]">
                  {/* Shimmer Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
                  {/* Glow Effect */}
                  <div className="absolute inset-0 blur-[2px] bg-gradient-to-r from-transparent via-[var(--brand)] to-[var(--brand-600)] opacity-60" />
                </div>
              </div>
            </div>
          </div>
        )}

        {filteredScenarios.length > 0 ? (
          <div className="divide-y divide-[var(--border)]">
            {filteredScenarios.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--surface-muted)] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="text-[14px] font-semibold text-[var(--ink-900)]">{s.name}</span>
                    <Badge tone="neutral" className="!text-[10px]">{s.type}</Badge>
                    <Badge tone={statusTone(s.status)} icon={<StatusDot status={s.status} />}>{s.status}</Badge>
                  </div>
                  <div className="text-[11.5px] text-[var(--ink-500)]">
                    {s.categoryConstraint} ·{' '}
                    {s.type === 'Spend Based' ? `Target spend $${s.targetSpend}` : `${s.targetKPI} = $${s.targetValue}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {s.status === 'Pending' && (
                    <button
                      onClick={() => handleRunScenarioFromList(s.id)}
                      disabled={optimizerRunning}
                      className={`p-2 rounded-md transition-all flex items-center gap-1.5 ${
                        optimizerRunning && runningScenarioId === s.id
                          ? 'bg-[var(--brand-600)] text-white cursor-wait'
                          : optimizerRunning
                          ? 'bg-[var(--ink-200)] text-[var(--ink-400)] cursor-not-allowed'
                          : 'bg-[var(--brand)] text-white hover:bg-[var(--brand-600)]'
                      }`}
                      title={optimizerRunning ? 'Optimizer running...' : 'Run scenario'}
                    >
                      {optimizerRunning && runningScenarioId === s.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-[11px] font-medium">Running…</span>
                        </>
                      ) : (
                        <Play size={14} />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setViewingScenario(s.id);
                      setEditMode(false);
                      setViewMode(true);
                      // Initialize edit categories in case user switches to edit
                      if (s.categoryConstraint) {
                        const cats = s.categoryConstraint.split(', ');
                        setEditSelectedCategories(cats);
                      }
                    }}
                    className="p-2 rounded-md border border-[var(--border)] text-[var(--ink-700)] hover:bg-[var(--surface-muted)] transition-colors"
                    title="View scenario"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setViewingScenario(s.id);
                      setEditMode(true);
                      setViewMode(false);
                      // Load categories and constraints for editing
                      if (s.categoryConstraint) {
                        const cats = s.categoryConstraint.split(', ');
                        setEditSelectedCategories(cats);
                        const fullConstraints = generateConstraintsFromCategories(cats);
                        const merged = fullConstraints.map((fc) => {
                          const saved = s.constraints?.find((sc) => sc.channel === fc.channel && sc.subChannel === fc.subChannel);
                          return saved ? { ...fc, ...saved } : fc;
                        });
                        setConstraints(merged);
                      }
                    }}
                    className="p-2 rounded-md border border-[var(--border)] text-[var(--ink-700)] hover:bg-[var(--surface-muted)] transition-colors"
                    title="Edit scenario"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-14 text-[13px] text-[var(--ink-400)]">No scenarios match your filters.</div>
        )}
      </Card>

      {/* ── Create New Scenario Modal ── */}
      <Modal
        open={createScenarioOpen && !viewingScenario}
        onClose={resetCreateModal}
        size="xl"
        title="New scenario"
        subtitle="Configure your scenario, then save and run to generate optimized output"
        headerActions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--ink-600)]">Public</span>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                isPublic ? 'bg-[var(--brand)]' : 'bg-[var(--ink-300)]'
              }`}
              aria-label="Toggle public access"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  isPublic ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        }
        footer={
          <>
            <Button variant="secondary" onClick={resetCreateModal}>Cancel</Button>
            <Button
              variant="secondary"
              leftIcon={<Save size={13} />}
              onClick={handleSaveScenario}
              disabled={scenarioSaved}
            >
              {scenarioSaved ? 'Saved ✓' : 'Save scenario'}
            </Button>
            <Button
              variant="primary"
              onClick={handleRunScenario}
              leftIcon={<Play size={13} />}
              disabled={!scenarioSaved}
            >
              Run scenario
            </Button>
          </>
        }
      >
        <div className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Name */}
            <Card className="!shadow-none !rounded-lg">
              <div className="p-4">
                <SectionTitle number={1}>Scenario name *</SectionTitle>
                <Input value={scenarioName} onChange={(e) => { setScenarioName(e.target.value); }} placeholder="e.g. Q1 2026 baseline" />
              </div>
            </Card>

            {/* Category */}
            <Card className="!shadow-none !rounded-lg">
              <div className="p-4">
                <SectionTitle number={2}>Category</SectionTitle>
                <div className="space-y-1.5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    const color = CATEGORY_COLORS[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`w-full text-left px-3 py-2 rounded-md text-[12.5px] transition-colors border flex items-center gap-2 ${
                          isSelected ? 'text-white border-[var(--brand)]' : 'bg-white text-[var(--ink-700)] border-[var(--border)] hover:border-[var(--ink-400)]'
                        }`}
                        style={isSelected ? { backgroundColor: color } : {}}
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0`}
                          style={isSelected ? { backgroundColor: '#fff', borderColor: '#fff' } : { backgroundColor: '#fff', borderColor: 'var(--border-strong)' }}
                        >
                          {isSelected && <Check size={12} style={{ color }} />}
                        </div>
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>

            {/* Type */}
            <Card className="!shadow-none !rounded-lg">
              <div className="p-4">
                <SectionTitle number={3}>Scenario type</SectionTitle>
                <div className="space-y-2">
                  {(['SPEND BASED', 'GOAL BASED'] as const).map((type) => {
                    const selected = scenarioType === type;
                    return (
                      <label key={type} className={`flex items-center gap-2.5 px-3 py-2 rounded-md border cursor-pointer transition-colors ${selected ? 'border-[var(--brand)] bg-[var(--brand-50)]' : 'border-[var(--border)] hover:border-[var(--ink-400)]'}`}>
                        <span className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${selected ? 'border-[var(--brand)]' : 'border-[var(--border-strong)]'}`}>
                          {selected && <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />}
                        </span>
                        <input type="radio" checked={selected} onChange={() => { setScenarioType(type); }} className="hidden" />
                        <span className={`text-[12.5px] flex-1 ${selected ? 'font-semibold text-[var(--brand-700)]' : 'text-[var(--ink-800)]'}`}>
                          {type === 'SPEND BASED' ? 'Spend based' : 'Goal based'}
                        </span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setInfoModalType(type); }} className="text-[var(--ink-400)] hover:text-[var(--ink-700)]">
                          <Info size={14} />
                        </button>
                      </label>
                    );
                  })}
                  <button onClick={() => setShowHelpMeChoose(true)} className="text-[11.5px] text-[var(--brand)] hover:text-[var(--brand-700)] font-medium mt-1 underline decoration-dotted underline-offset-4">
                    Help me choose →
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Target Goal */}
          <Card className="!shadow-none !rounded-lg">
            <div className="p-4">
              <SectionTitle number={4}>Target goal *</SectionTitle>
              {scenarioType === 'SPEND BASED' ? (
                <Field label="Total target spend *" className="max-w-md">
                  <Input value={`$ ${targetSpend}`} onChange={(e) => { setTargetSpend(e.target.value.replace('$ ', '')); }} />
                </Field>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-w-2xl">
                  <Field label="Target KPI *">
                    <Select value={targetKPI} onChange={(e) => { setTargetKPI(e.target.value); }}>
                      <option>Incremental Sales</option>
                      <option>ROI</option>
                      <option>Revenue</option>
                    </Select>
                  </Field>
                  <Field label="Target value *">
                    <Input value={`$ ${targetValue}`} onChange={(e) => { setTargetValue(e.target.value.replace('$ ', '')); }} />
                  </Field>
                </div>
              )}
            </div>
          </Card>

          {/* Channel Constraints */}
          <Card className="!shadow-none !rounded-lg">
            <div className="p-4">
              <SectionTitle number={5}>Channel & sub-channel constraints</SectionTitle>
              <ConstraintsTable
                rows={constraints} editable
                onMinChange={handleMinSpendChange}
                onMaxChange={handleMaxSpendChange}
                onSliderChange={(i, min, max) => {
                  const updated = [...constraints];
                  updated[i].minSpendPercent = min;
                  updated[i].maxSpendPercent = max;
                  setConstraints(updated);
                }}
              />
            </div>
          </Card>
        </div>
      </Modal>

      {/* ── View / Edit Scenario Modal ── */}
      <Modal
        open={!!viewingScenario}
        onClose={() => {
          setViewingScenario(null);
          setEditMode(false);
          setViewMode(false);
          setEditScenarioSaved(false);
          setEditSelectedCategories([]);
        }}
        size="xl"
        title={current ? `Scenario · ${current.name}` : ''}
        subtitle={current?.type}
        footer={
          editMode ? (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setEditMode(false);
                  setViewMode(true);
                  setEditScenarioSaved(false);
                  setEditSelectedCategories([]);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                leftIcon={<Save size={13} />}
                onClick={handleSaveEditedScenario}
              >
                Save scenario
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => {
                  setViewingScenario(null);
                  setViewMode(false);
                  setEditSelectedCategories([]);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (viewingScenario) {
                    onViewOutcome(viewingScenario);
                    setViewingScenario(null);
                    setViewMode(false);
                    setEditSelectedCategories([]);
                  }
                }}
              >
                View Scenario Outcome
              </Button>
            </>
          )
        }
      >
        {current && (
          <div className="px-6 py-6 space-y-5">
            {/* Public/Private Status */}
            <div className="flex items-center gap-2 pb-4 border-b border-[var(--border)]">
              <span className="text-[12px] text-[var(--ink-600)]">This scenario is</span>
              <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded ${
                current.isPublic !== false
                  ? 'bg-[var(--brand-50)] text-[var(--brand-700)]'
                  : 'bg-[var(--surface-subtle)] text-[var(--ink-900)]'
              }`}>
                {current.isPublic !== false ? 'Public' : 'Private'}
              </span>
              <span className="text-[11px] text-[var(--ink-500)]">
                {current.isPublic !== false
                  ? '• Anyone can view or edit'
                  : '• Only you can access'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="!shadow-none !rounded-lg">
                <div className="p-4">
                  <SectionTitle number={1}>Scenario setup</SectionTitle>
                  <div className="space-y-3">
                    <Field label="Scenario name">
                      {editMode ? (
                        <Input value={current.name || ''} onChange={(e) => updateScenarioField('name', e.target.value)} />
                      ) : (
                        <div className="text-[13px] text-[var(--ink-700)] py-2">{current.name}</div>
                      )}
                    </Field>
                    <div className="text-[11.5px] text-[var(--ink-500)]">Type: {current.type}</div>
                  </div>
                </div>
              </Card>

              <Card className="!shadow-none !rounded-lg">
                <div className="p-4">
                  <SectionTitle number={2}>Category constraints</SectionTitle>
                  <div className="space-y-1.5">
                    {editMode ? (
                      categories.map((cat) => {
                        const isSelected = editSelectedCategories.includes(cat);
                        const color = CATEGORY_COLORS[cat];
                        return (
                          <button
                            key={cat}
                            onClick={() => toggleEditCategory(cat)}
                            className={`w-full text-left px-3 py-2 rounded-md text-[12.5px] transition-colors border flex items-center gap-2 ${
                              isSelected ? 'text-white border-[var(--brand)]' : 'bg-white text-[var(--ink-700)] border-[var(--border)] hover:border-[var(--ink-400)]'
                            }`}
                            style={isSelected ? { backgroundColor: color } : {}}
                          >
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0`}
                              style={isSelected ? { backgroundColor: '#fff', borderColor: '#fff' } : { backgroundColor: '#fff', borderColor: 'var(--border-strong)' }}
                            >
                              {isSelected && <Check size={12} style={{ color }} />}
                            </div>
                            {cat}
                          </button>
                        );
                      })
                    ) : (
                      current.categoryConstraint && current.categoryConstraint.split(', ').map((cat) => {
                        const color = CATEGORY_COLORS[cat];
                        return (
                          <div key={cat} className="text-white px-3 py-2 rounded-md text-[12.5px] font-medium" style={{ backgroundColor: color }}>
                            {cat}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </Card>

              <Card className="!shadow-none !rounded-lg">
                <div className="p-4">
                  <SectionTitle number={3}>Optimization goal</SectionTitle>
                  {current.type === 'Spend Based' ? (
                    <Field label="Total target spend">
                      {editMode ? (
                        <Input value={current.targetSpend || ''} onChange={(e) => updateScenarioField('targetSpend', e.target.value)} />
                      ) : (
                        <div className="text-[13px] text-[var(--ink-700)] py-2">${current.targetSpend}</div>
                      )}
                    </Field>
                  ) : (
                    <div className="space-y-3">
                      <Field label="Target KPI">
                        {editMode ? (
                          <Select value={current.targetKPI || ''} onChange={(e) => updateScenarioField('targetKPI', e.target.value)}>
                            <option>Incremental Sales</option>
                            <option>ROI</option>
                            <option>Revenue</option>
                          </Select>
                        ) : (
                          <div className="text-[13px] text-[var(--ink-700)] py-2">{current.targetKPI}</div>
                        )}
                      </Field>
                      <Field label="Target value">
                        {editMode ? (
                          <Input value={current.targetValue || ''} onChange={(e) => updateScenarioField('targetValue', e.target.value)} />
                        ) : (
                          <div className="text-[13px] text-[var(--ink-700)] py-2">${current.targetValue}</div>
                        )}
                      </Field>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <Card className="!shadow-none !rounded-lg">
              <div className="p-4">
                <SectionTitle number={4}>Channel & sub-channel constraints</SectionTitle>
                <ConstraintsTable
                  rows={editMode ? constraints : (current.constraints || [])}
                  editable={editMode}
                  onMinChange={(i, v) => {
                    const num = parseInt(v) || 0;
                    const updated = [...constraints];
                    updated[i].minSpendPercent = Math.max(-100, Math.min(0, num));
                    setConstraints(updated);
                  }}
                  onMaxChange={(i, v) => {
                    const num = parseInt(v) || 0;
                    const updated = [...constraints];
                    updated[i].maxSpendPercent = Math.max(0, Math.min(100, num));
                    setConstraints(updated);
                  }}
                  onSliderChange={(i, min, max) => {
                    const updated = [...constraints];
                    updated[i].minSpendPercent = min;
                    updated[i].maxSpendPercent = max;
                    setConstraints(updated);
                  }}
                />
              </div>
            </Card>

          </div>
        )}
      </Modal>

      {infoModalType && <ScenarioInfoModal type={infoModalType} onClose={() => setInfoModalType(null)} />}
      {showHelpMeChoose && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-[var(--shadow-lg)] w-full max-w-md">
            <div className="ui-card-header">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[var(--ink-900)] text-white text-[11px] font-bold flex items-center justify-center">?</div>
                <p className="text-[14px] font-semibold text-[var(--ink-900)]">Help me choose</p>
              </div>
              <button onClick={() => setShowHelpMeChoose(false)} className="text-[var(--ink-400)] hover:text-[var(--ink-700)] text-[18px] leading-none">×</button>
            </div>
            <div className="p-6">
              <HelpMeChoose
                onSelect={(t) => { setScenarioType(t); setShowHelpMeChoose(false); }}
                onClose={() => setShowHelpMeChoose(false)}
              />
            </div>
          </div>
        </div>
      )}
      {duplicateNameError && <DuplicateNameModal scenarioName={duplicateNameError} onClose={() => setDuplicateNameError(null)} />}

      {/* Optimizer Success Modal */}
      {showSuccessModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-md animate-[fadeIn_0.3s_ease-out]"
          onClick={() => {
            setShowSuccessModal(false);
            setCompletedScenarioId(null);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.15)] w-full max-w-md animate-[scaleIn_0.4s_cubic-bezier(0.16,1,0.3,1)] border border-[var(--border)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Content */}
            <div className="px-6 py-8 text-center">
              {/* Success Icon */}
              <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 via-green-500 to-green-600 flex items-center justify-center mb-5 shadow-[0_8px_24px_rgba(16,185,129,0.4)] animate-[bounceIn_0.6s_cubic-bezier(0.16,1,0.3,1)] relative">
                <Check size={34} className="text-white drop-shadow-md" strokeWidth={3} />
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 opacity-30 blur-md animate-pulse" />
              </div>

              {/* Title */}
              <h3 className="text-[19px] font-semibold text-[var(--ink-900)] mb-2.5">
                Optimizer Run Completed
              </h3>

              {/* Subtitle */}
              <p className="text-[13px] text-[var(--ink-600)] leading-relaxed mb-6 max-w-sm mx-auto">
                Your scenario outcome has been successfully generated and is ready for analysis.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <Button
                  variant="primary"
                  onClick={() => {
                    setShowSuccessModal(false);
                    if (completedScenarioId) {
                      onViewOutcome(completedScenarioId);
                    }
                  }}
                  className="w-full !py-3 !text-[14px] !font-semibold shadow-sm hover:shadow-md transition-shadow"
                  leftIcon={<ChevronRight size={16} />}
                >
                  View Outcome
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowSuccessModal(false);
                    setCompletedScenarioId(null);
                  }}
                  className="w-full !py-2.5 !text-[13px]"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes progressSlide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0%);
          }
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes textPulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes bounceIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </PageContainer>
  );
}

// ── Constraints table ─────────────────────────────────────────────────────────
function ConstraintsTable({ rows, editable, onMinChange, onMaxChange, onSliderChange }: {
  rows: Constraint[]; editable: boolean;
  onMinChange: (i: number, v: string) => void;
  onMaxChange: (i: number, v: string) => void;
  onSliderChange: (i: number, min: number, max: number) => void;
}) {
  // Helper to find category for a channel+subchannel combination
  const getCategoryForConstraint = (channel: string, subChannel: string): string | null => {
    for (const [category, channels] of Object.entries(CATEGORY_CHANNELS)) {
      if (channels[channel]?.includes(subChannel)) {
        return category;
      }
    }
    return null;
  };

  // Group constraints by channel
  const groupedByChannel: Record<string, Constraint[]> = {};
  rows.forEach((constraint) => {
    if (!groupedByChannel[constraint.channel]) {
      groupedByChannel[constraint.channel] = [];
    }
    groupedByChannel[constraint.channel].push(constraint);
  });

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full text-[13px] min-w-[800px]">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {['Channel', 'Sub-channel', 'ROI', 'Current spend', 'Min %', 'Range', 'Max %'].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 ui-eyebrow text-[var(--ink-500)] font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedByChannel).map(([channel, subChannels], channelIdx) => {
            // Get category color for this channel (using first subchannel to determine)
            const category = subChannels.length > 0 ? getCategoryForConstraint(channel, subChannels[0].subChannel) : null;
            const categoryColor = category ? CATEGORY_COLORS[category] : 'transparent';

            return (
              <React.Fragment key={channel}>
                {subChannels.map((c, subIdx) => {
                  const originalIndex = rows.findIndex(
                    (r) => r.channel === c.channel && r.subChannel === c.subChannel
                  );
                  return (
                    <tr key={`${c.channel}-${c.subChannel}-${subIdx}`} className="border-b border-[var(--border)] last:border-0">
                      {/* Only show channel name on first subchannel row */}
                      {subIdx === 0 ? (
                        <td
                          rowSpan={subChannels.length}
                          className="px-4 py-3 text-[var(--ink-900)] font-semibold border-r border-[var(--border)] bg-[var(--surface-muted)] align-top"
                          style={{ borderLeft: `4px solid ${categoryColor}` }}
                        >
                          {channel}
                        </td>
                      ) : null}
                    <td className="px-4 py-3 text-[var(--ink-700)] pl-6">{c.subChannel}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--ink-700)]">{c.roi}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--ink-700)]">{c.currentSpend}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Input type="number" value={c.minSpendPercent} disabled={!editable} onChange={(e) => onMinChange(originalIndex, e.target.value)} className="!w-16 text-center !py-1 !px-2" min="-100" max="0" />
                        <span className="text-[11px] text-[var(--ink-500)]">%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <DualRangeSlider minValue={c.minSpendPercent} maxValue={c.maxSpendPercent} disabled={!editable} onChange={(min, max) => onSliderChange(originalIndex, min, max)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Input type="number" value={c.maxSpendPercent} disabled={!editable} onChange={(e) => onMaxChange(originalIndex, e.target.value)} className="!w-16 text-center !py-1 !px-2" min="0" max="100" />
                        <span className="text-[11px] text-[var(--ink-500)]">%</span>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}