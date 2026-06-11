/**
 * FilterBar.tsx
 *
 * Persistent filter strip rendered in the app shell for DATA HISTORY,
 * MODEL SUMMARY, SCENARIO PLANNING, SCENARIO OUTCOME, and SCENARIO COMPARISONS tabs.
 *
 * All four filters (Market → Brand → Indication → Cycle) are driven by FilterContext
 * and persist across navigation. Cycle options are fetched from the API when Indication
 * is selected (metadataId resolves) and the dropdown is disabled until all three upstream
 * filters are set. An optional Scenario filter is available for the Scenario Outcome tab.
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
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * FilterBar
 *
 * Renders the Market → Brand → Indication → Cycle cascade wired to FilterContext.
 * Each dropdown is disabled until its upstream selections are made. Cycle clears
 * automatically when Indication changes. An optional Scenario filter is shown on
 * the Scenario Outcome tab via the showScenarioFilter prop.
 *
 * @param {FilterBarProps} props
 */
export function FilterBar({
  showScenarioFilter,
  scenarioOptions = [],
  defaultScenario,
}: FilterBarProps) {
  const { filters, options, setMarket, setBrand, setIndication, setCycle } = useFilters();

  // Scenario is local — it only concerns Scenario Outcome's own display, not shared state.
  const [scenario, setScenario] = useState(defaultScenario || scenarioOptions[0] || '');

  /**
   * Resets all FilterContext selections. setMarket(null) cascades to clear brand,
   * indication, metadataId, and cycle automatically via FilterContext.
   */
  const handleReset = () => {
    setMarket(null);
  };

  const hasSelection = !!filters.market || !!filters.cycle;

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

          {/* Cycle — cascades from Indication via FilterContext; options fetched from
              GET /reports/cycles?metadata_id=<id> when indication is selected. */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-[var(--ink-500)] font-medium">Cycle</span>
            <Select
              value={filters.cycle ?? ''}
              onChange={(e) => setCycle(e.target.value || null)}
              disabled={!filters.indication || options.cyclesLoading}
              className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[110px]"
            >
              <option value="">
                {!filters.indication
                  ? 'Select indication first'
                  : options.cyclesLoading
                  ? 'Loading…'
                  : 'All Cycles'}
              </option>
              {options.cycles.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </div>

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
