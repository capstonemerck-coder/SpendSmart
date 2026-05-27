import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button, Select } from '@/components/shared';

interface FilterOption {
  label: string;
  options: string[];
  defaultValue: string;
}

interface FilterBarProps {
  filters?: FilterOption[];
  showScenarioFilter?: boolean;
  scenarioOptions?: string[];
  defaultScenario?: string;
}

const defaultFilters: FilterOption[] = [
  { label: 'Market', options: ['US', 'US Northeast', 'US Southeast', 'US West', 'US Midwest'], defaultValue: 'US' },
  { label: 'Brand',  options: ['Brand A', 'Product Alpha', 'Product Beta', 'Product Gamma'],   defaultValue: 'Brand A' },
  { label: 'Indication', options: ['All Indications', 'Type 2 Diabetes', 'Lung Cancer', 'Rheumatoid Arthritis', 'Heart Failure', 'Breast Cancer', 'COPD', 'Alzheimer\'s Disease'], defaultValue: 'All Indications' },
  { label: 'Cycle',  options: ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025', 'Q4 2025'], defaultValue: 'Q4 2025' },
];

export function FilterBar({
  filters = defaultFilters,
  showScenarioFilter,
  scenarioOptions = [],
  defaultScenario,
}: FilterBarProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(filters.map((f) => [f.label, f.defaultValue])),
  );
  const [scenario, setScenario] = useState(defaultScenario || scenarioOptions[0] || '');
  const [dirty, setDirty] = useState(false);

  return (
    <div className="bg-white border-b border-[var(--border)]">
      <div className="max-w-[1440px] mx-auto px-8 py-3">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-1.5 text-[var(--ink-500)] flex-shrink-0">
            <Filter size={13} />
            <span className="ui-eyebrow">Filters</span>
          </div>

          <div className="h-5 w-px bg-[var(--border)]" />

          {filters.map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--ink-500)] font-medium">{f.label}</span>
              <Select
                value={values[f.label]}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [f.label]: e.target.value }));
                  setDirty(true);
                }}
                className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[110px]"
              >
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
          ))}

          {showScenarioFilter && scenarioOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--ink-500)] font-medium">Scenario</span>
              <Select
                value={scenario}
                onChange={(e) => {
                  setScenario(e.target.value);
                  setDirty(true);
                }}
                className="!h-8 !py-0 !text-[12px] !pr-7 min-w-[140px]"
              >
                {scenarioOptions.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDirty(false)} disabled={!dirty}>
              Reset
            </Button>
            <Button variant="primary" size="sm" onClick={() => setDirty(false)} disabled={!dirty}>
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
