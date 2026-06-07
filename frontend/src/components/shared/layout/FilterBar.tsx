/**
 * FilterBar.tsx
 *
 * Persistent filter strip rendered in the app shell for DATA HISTORY,
 * MODEL SUMMARY, SCENARIO PLANNING, SCENARIO OUTCOME, and SCENARIO COMPARISONS tabs.
 *
 * Market, Brand, and Indication are driven by FilterContext — they share state
 * with the inline dropdowns on the Data Input page and persist across navigation.
 * Options are fetched once on FilterProvider mount (GET /reports/metadata) and
 * derived via cascading logic inside FilterContext.
 *
 * Cycle is page-local state (not in FilterContext — Data History derives cycle
 * from uploaded files). Pass `cycleOptions` as a prop to show the Cycle filter.
 * Wiring the selected cycle to DataHistory's cycle list display is pending.
 */
import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button, Select } from '@/components/shared';
import { useFilters } from '@/context/FilterContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilterBarProps {
  showScenarioFilter?: boolean;
  scenarioOptions?: string[];
  defaultScenario?: string;
  /** Optional list of cycle IDs to populate the local Cycle filter. Pass the
   *  `availableCycles` array from `useDataHistory` when the cycle filter should
   *  be shown and wired to Data History's cycle display. */
  cycleOptions?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * FilterBar
 *
 * Renders the Market → Brand → Indication cascade wired to FilterContext,
 * plus an optional local Cycle filter and an optional Scenario filter.
 * Calls FilterContext setters directly on each change (no Apply batching).
 *
 * @param {FilterBarProps} props
 */
export function FilterBar({
  showScenarioFilter,
  scenarioOptions = [],
  defaultScenario,
  cycleOptions = [],
}: FilterBarProps) {
  const { filters, options, setMarket, setBrand, setIndication } = useFilters();

  // Cycle is page-local — it doesn't exist in FilterContext because Data History
  // derives cycle from uploaded files, not a user filter selection.
  const [selectedCycle, setSelectedCycle] = useState('');
  const [scenario, setScenario] = useState(defaultScenario || scenarioOptions[0] || '');

  /**
   * Resets all FilterContext selections (cascades: clears brand, indication,
   * and metadataId automatically via FilterContext) plus the local cycle state.
   */
  const handleReset = () => {
    setMarket(null);
    setSelectedCycle('');
  };

  const hasSelection = !!filters.market || !!selectedCycle;

  return (
    <div className="bg-white border-b border-[var(--border)]">
      <div className="max-w-[1440px] mx-auto px-8 py-3">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-[var(--ink-500)] flex-shrink-0">
            <Filter size={13} />
            <span className="ui-eyebrow">Filters</span>
          </div>

          <div className="h-5 w-px bg-[var(--border)]" />

          {/* Market — options from FilterContext (GET /reports/metadata) */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-[var(--ink-500)] font-medium">Market</span>
            <Select
              value={filters.market ?? ''}
              onChange={(e) => setMarket(e.target.value || null)}
              disabled={options.marketsLoading}
              className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[110px]"
            >
              <option value="">{options.marketsLoading ? 'Loading…' : 'All Markets'}</option>
              {options.markets.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </div>

          {/* Brand — cascades from selected market via FilterContext */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-[var(--ink-500)] font-medium">Brand</span>
            <Select
              value={filters.brand ?? ''}
              onChange={(e) => setBrand(e.target.value || null)}
              disabled={!filters.market || options.brandsLoading}
              className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[110px]"
            >
              <option value="">
                {!filters.market ? 'Select market first' : options.brandsLoading ? 'Loading…' : 'All Brands'}
              </option>
              {options.brands.map((b) => <option key={b}>{b}</option>)}
            </Select>
          </div>

          {/* Indication — cascades from selected brand; setIndication resolves metadataId */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-[var(--ink-500)] font-medium">Indication</span>
            <Select
              value={filters.indication ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                const found = options.indications.find((i) => i.indication === v);
                setIndication(v || null, found?.metadata_id ?? null);
              }}
              disabled={!filters.brand || options.indicationsLoading}
              className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[140px]"
            >
              <option value="">
                {!filters.brand
                  ? 'Select brand first'
                  : options.indicationsLoading
                  ? 'Loading…'
                  : 'All Indications'}
              </option>
              {options.indications.map((i) => (
                <option key={i.indication} value={i.indication}>{i.indication}</option>
              ))}
            </Select>
          </div>

          {/* Cycle — local state; visible only when cycleOptions are provided.
              TODO: wire selectedCycle to DataHistory's cycle display once the
              prop is passed from App.tsx (requires lifting availableCycles up). */}
          {cycleOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--ink-500)] font-medium">Cycle</span>
              <Select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[110px]"
              >
                <option value="">All Cycles</option>
                {cycleOptions.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
          )}

          {/* Scenario filter — optional, shown on Scenario Outcome tab */}
          {showScenarioFilter && scenarioOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--ink-500)] font-medium">Scenario</span>
              <Select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[140px]"
              >
                {scenarioOptions.map((o) => <option key={o}>{o}</option>)}
              </Select>
            </div>
          )}

          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={!hasSelection}>
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
