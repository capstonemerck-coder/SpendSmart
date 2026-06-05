/**
 * DataInputTargetVariableStep.tsx
 *
 * Target variable selection step for the Data Input upload flow.
 * Renders a searchable grid of predefined and data-derived variable options.
 * Supports custom variable entry when search has no match in the list.
 * Used exclusively by DataInputContent.tsx during the target-variable stage.
 */
import React from 'react';
import { Sparkles, Search, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/shared';
import type { TVOption } from '@/hooks/useDataInputUpload';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DataInputTargetVariableStepProps {
  targetVariable: string;
  setTargetVariable: (v: string) => void;
  tvSearch: string;
  setTvSearch: (v: string) => void;
  filteredTVOptions: TVOption[];
  allTVOptions: TVOption[];
  cycleId: string;
  onConfirm: () => void;
  onSkip: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * DataInputTargetVariableStep
 *
 * Renders the target variable selection step. Shows a search input, a scrollable
 * options grid (with "From data" badges on data-derived options), a custom entry
 * option when search has no match, an info banner, and confirm/skip actions.
 *
 * @param {DataInputTargetVariableStepProps} props
 */
export function DataInputTargetVariableStep({
  targetVariable, setTargetVariable, tvSearch, setTvSearch,
  filteredTVOptions, allTVOptions, cycleId, onConfirm, onSkip,
}: DataInputTargetVariableStepProps) {
  const customValue = tvSearch.toLowerCase().replace(/\s+/g, '_');

  return (
    <div className="px-6 py-8">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-[var(--ink-900)] mb-1">Select the target variable</h3>
            <p className="text-[12.5px] text-[var(--ink-500)] leading-relaxed">
              This is the business outcome column that your MMM model predicts — the variable that
              links your raw data to the model coefficients.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
          <input
            value={tvSearch}
            onChange={(e) => setTvSearch(e.target.value)}
            placeholder="Search variables…"
            className="ui-input w-full !pl-9"
            autoFocus
          />
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-1 gap-2 mb-4 max-h-[320px] overflow-y-auto pr-1">
          {filteredTVOptions.map((opt) => {
            const selected = targetVariable === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTargetVariable(opt.value)}
                className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${
                  selected
                    ? 'border-[var(--brand)] bg-[var(--brand-50)] shadow-sm'
                    : 'border-[var(--border)] hover:border-[var(--ink-400)] bg-white'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 mt-0.5 ${selected ? 'border-[var(--brand)]' : 'border-[var(--border-strong)]'}`}>
                  {selected && <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-semibold ${selected ? 'text-[var(--brand-700)]' : 'text-[var(--ink-900)]'} flex items-center gap-2`}>
                    {opt.label}
                    <code className="text-[11px] font-normal text-[var(--ink-400)] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded">
                      {opt.value}
                    </code>
                    {opt.fromData && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 border border-emerald-200 rounded px-1 py-0.5 flex-shrink-0">
                        From data
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-[var(--ink-500)] mt-0.5">{opt.desc}</div>
                </div>
              </button>
            );
          })}

          {/* Custom value option — shown only when search text has no match */}
          {tvSearch && !allTVOptions.some((o) => o.value === customValue) && (
            <button
              type="button"
              onClick={() => setTargetVariable(customValue)}
              className={`flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-all ${
                targetVariable === customValue
                  ? 'border-[var(--brand)] bg-[var(--brand-50)]'
                  : 'border-dashed border-[var(--border-strong)] hover:border-[var(--brand)] bg-white'
              }`}
            >
              <span className="w-4 h-4 rounded-full border-[1.5px] border-[var(--border-strong)] flex items-center justify-center flex-shrink-0 mt-0.5">
                {targetVariable === customValue && <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />}
              </span>
              <div>
                <div className="text-[13px] font-semibold text-[var(--ink-900)]">
                  Use custom:{' '}
                  <code className="text-[var(--brand-700)] bg-[var(--brand-50)] px-1.5 py-0.5 rounded text-[12px]">
                    {customValue}
                  </code>
                </div>
                <div className="text-[11.5px] text-[var(--ink-500)] mt-0.5">Use this column name from your data file</div>
              </div>
            </button>
          )}
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg mb-5 text-[12px] text-blue-700">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>
            This will be saved as <strong>target_variable</strong> on cycle <strong>{cycleId}</strong> and used
            by the optimizer as the KPI to maximise.
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            disabled={!targetVariable}
            onClick={onConfirm}
            leftIcon={<ChevronRight size={14} />}
            className="flex-1 justify-center"
          >
            Confirm & continue to model upload
          </Button>
          <Button variant="secondary" onClick={onSkip}>Skip</Button>
        </div>
      </div>
    </div>
  );
}
