//Scenario-comparison
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Star, Download, CheckCircle2, Save, Sparkles, TrendingUp } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, CardHeader, Button, Select, Field, TabPills, Badge,
} from '@/components/shared';
import type { Scenario } from '@/utils/types';

interface ScenarioComparisonProps {
  savedScenarios?: Scenario[];
}

const DEFAULT_SCENARIO_OPTIONS = [
  'Q1 2026 Baseline Plan',
  'Digital Focus Strategy',
  'Cost Reduction Plan',
  'Aggressive Growth Plan',
  'Conservative Approach',
  'Market Expansion Strategy',
];

const revenueTrendData = [
  { month: 'Jan', A: 2.1, B: 2.5, C: 1.8 },
  { month: 'Feb', A: 2.2, B: 2.7, C: 1.85 },
  { month: 'Mar', A: 2.3, B: 2.9, C: 1.95 },
  { month: 'Apr', A: 2.4, B: 3.1, C: 2.0 },
  { month: 'May', A: 2.5, B: 3.3, C: 2.1 },
  { month: 'Jun', A: 2.5, B: 3.5, C: 2.15 },
];

export default function ScenarioComparison({ savedScenarios = [] }: ScenarioComparisonProps) {
  const scenarioOptions = [
    ...DEFAULT_SCENARIO_OPTIONS,
    ...savedScenarios.map((s) => s.name).filter((n) => !DEFAULT_SCENARIO_OPTIONS.includes(n)),
  ];

  const [scenarioA, setScenarioA] = useState(scenarioOptions[0]);
  const [scenarioB, setScenarioB] = useState(scenarioOptions[1]);
  const [scenarioC, setScenarioC] = useState(scenarioOptions[2]);
  const [baselineScenario, setBaselineScenario] = useState<'A' | 'B' | 'C'>('A');
  const [savedSelection, setSavedSelection] = useState<{ a: string; b: string; c: string } | null>(null);
  const [activeView, setActiveView] = useState<'scorecard' | 'growth'>('scorecard');
  const [exportedItems, setExportedItems] = useState<Set<string>>(new Set());

  const getScenarioName = (key: 'a' | 'b' | 'c') =>
    savedSelection
      ? savedSelection[key]
      : { a: 'Scenario A', b: 'Scenario B', c: 'Scenario C' }[key];

  const markExported = (key: string) => setExportedItems((s) => new Set([...s, key]));

  const [isRunning, setIsRunning] = useState(false);
const [showCompleteModal, setShowCompleteModal] = useState(false);
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Scenario Comparisons"
        title="Compare scenarios side-by-side"
        description="Select up to three scenarios on sales, ROI and conversions. Select a benchmark to see deltas."
      />

      <div className="space-y-5">
        {/* Selectors */}
        <Card>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {(['A', 'B', 'C'] as const).map((slot) => {
                const val = slot === 'A' ? scenarioA : slot === 'B' ? scenarioB : scenarioC;
                const setVal = slot === 'A' ? setScenarioA : slot === 'B' ? setScenarioB : setScenarioC;
                const isBenchmark = baselineScenario === slot;
                return (
                  <Field
                    key={slot}
                    label={
                      <span className="flex items-center gap-2">
                        Scenario {slot}
                        <button
                          onClick={() => setBaselineScenario(slot)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border transition-colors ${
                            isBenchmark
                              ? 'bg-[var(--brand-50)] text-[var(--brand-700)] border-[var(--brand-100)]'
                              : 'bg-white text-[var(--ink-500)] border-[var(--border)] hover:border-[var(--ink-400)]'
                          }`}
                        >
                          <Star
                            size={10}
                            fill={isBenchmark ? 'currentColor' : 'none'}
                            strokeWidth={2}
                          />
                          Benchmark
                        </button>
                      </span>
                    }
                  >
                    <Select
                      value={val}
                      onChange={(e) => setVal(e.target.value)}
                      className={isBenchmark ? '!border-[var(--brand)]' : ''}
                    >
                      {scenarioOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </Select>
                  </Field>
                );
              })}
              <Button
                variant={savedSelection ? 'secondary' : 'primary'}
                leftIcon={savedSelection ? <CheckCircle2 size={14} /> : <Save size={14} />}
                onClick={() => setSavedSelection({ a: scenarioA, b: scenarioB, c: scenarioC })}
              >
                {savedSelection ? 'Saved' : 'Save selection'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Recommendation & Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="!border-[var(--brand)] bg-gradient-to-br from-[var(--brand-50)] to-white">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md bg-[var(--brand)] flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="ui-eyebrow text-[var(--brand-700)]">Recommended</div>
              </div>
              <div className="font-display text-[20px] font-semibold text-[var(--ink-900)] mb-3 tracking-tight">
                Best scenario · {getScenarioName('b')}
              </div>
              <ul className="space-y-1.5 text-[13px] text-[var(--ink-700)]">
                <li className="flex gap-2">
                  <span className="text-[var(--brand)]">•</span>
                  Highest ROI (3.8x vs 3.2x benchmark)
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--brand)]">•</span>
                  +15% revenue at only +5% spend
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--brand)]">•</span>
                  +15% conversions showing improved efficiency
                </li>
              </ul>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-md bg-[var(--surface-subtle)] flex items-center justify-center">
                  <TrendingUp size={14} className="text-[var(--ink-700)]" />
                </div>
                <div className="ui-eyebrow">Key insights</div>
              </div>
              <ul className="space-y-1.5 text-[13px] text-[var(--ink-700)]">
                <li className="flex gap-2">
                  <span className="text-[var(--ink-400)]">•</span>
                  {getScenarioName('b')} increases Digital spend leading to higher revenue
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--ink-400)]">•</span>
                  {getScenarioName('c')} reduces TV spend causing lower overall reach
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--ink-400)]">•</span>
                  Social media performs consistently better in {getScenarioName('b')}
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--ink-400)]">•</span>
                  Baseline shows steady but limited growth potential
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* View switcher */}
        <div className="flex justify-center">
          <TabPills
            value={activeView}
            onChange={setActiveView}
            options={[
              { value: 'scorecard', label: 'Scorecard' },
              { value: 'growth',    label: 'Growth chart' },
            ]}
          />
        </div>

        {/* Scorecard */}
        {activeView === 'scorecard' && (
          <Card className="ui-fade-in">
            <CardHeader
              title="Scenario scorecard"
              subtitle="Keytruda · Q4 2025"
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Download size={12} />}
                    onClick={() => markExported('scorecard')}
                  >
                    Export
                  </Button>
                  {exportedItems.has('scorecard') && (
                    <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>
                  )}
                </div>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[var(--ink-900)] text-white">
                    <th className="text-left px-5 py-3 ui-eyebrow text-white/60 font-semibold w-44">KPI</th>
                    {(['a', 'b', 'c'] as const).map((key) => (
                      <th key={key} className="text-left px-5 py-3">
                        <div className="text-[12.5px] font-semibold text-white truncate">
                          {getScenarioName(key)}
                        </div>
                        <div className="text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">
                          Scenario {key.toUpperCase()}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-[var(--ink-800)]">
                  <SectionRow>Sales</SectionRow>
                  <DataRow
                    label="Total sales"
                    a="$10.5M"
                    b={{ value: '$12.8M', delta: '+21.9%', positive: true }}
                    c={{ value: '$9.1M', delta: '-13.3%', positive: false }}
                  />
                  <DataRow
                    label="Incremental sales"
                    a="$3.2M"
                    b={{ value: '$4.1M', delta: '+$900K', positive: true }}
                    c={{ value: '$2.7M', delta: '-$500K', positive: false }}
                  />
                  <SectionRow>Efficiency</SectionRow>
                  <DataRow
                    label="ROI"
                    a="2.1x"
                    b={{ value: '2.56x', delta: '+21.9%', positive: true }}
                    c={{ value: '2.0x',  delta: '-4.8%',  positive: false }}
                  />
                  <DataRow
                    label="Total spend"
                    a="$780K"
                    b={{ value: '$820K', delta: '+5%',   positive: false }}
                    c={{ value: '$760K', delta: '-2.6%', positive: true }}
                  />
                  <SectionRow>Volume</SectionRow>
                  <DataRow
                    label="Conversions"
                    a="12,400"
                    b={{ value: '14,200', delta: '+14.5%', positive: true }}
                    c={{ value: '11,800', delta: '-4.8%',  positive: false }}
                  />
                  <DataRow
                    label="Units Sold"
                    a="2,400"
                    b={{ value: '4,100', delta: '+14.5%', positive: true }}
                    c={{ value: '1,850', delta: '-4.8%',  positive: false }}
                  />
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Growth chart */}
        {activeView === 'growth' && (
          <Card className="ui-fade-in">
            <CardHeader
              title="Growth trend comparison"
              subtitle="Monthly trajectory across all selected scenarios"
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Download size={12} />}
                    onClick={() => markExported('growth')}
                  >
                    Export
                  </Button>
                  {exportedItems.has('growth') && (
                    <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>
                  )}
                </div>
              }
            />
            <div className="p-6">
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={revenueTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                  <XAxis dataKey="month" stroke="#A1A1AA" style={{ fontSize: '12px' }} tickLine={false} axisLine={{ stroke: '#E4E4E7' }} />
                  <YAxis
                    stroke="#A1A1AA"
                    domain={[1.7, 3.6]}
                    tickLine={false}
                    axisLine={{ stroke: '#E4E4E7' }}
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Growth %', angle: -90, position: 'insideLeft', style: { fontSize: '11px', fill: '#71717A' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    formatter={(v) => `${v}%`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }} iconType="line" iconSize={20} />
                  <Line
                    type="monotone" dataKey="C" stroke="#A1A1AA" strokeWidth={2}
                    name={getScenarioName('c')} dot={{ fill: '#A1A1AA', stroke: '#fff', strokeWidth: 2, r: 4 }}
                    strokeDasharray="6 4"
                  />
                  <Line
                    type="monotone" dataKey="A" stroke="#3F3F46" strokeWidth={2}
                    name={getScenarioName('a')} dot={{ fill: '#3F3F46', stroke: '#fff', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone" dataKey="B" stroke="#00857C" strokeWidth={3}
                    name={getScenarioName('b')} dot={{ fill: '#00857C', stroke: '#fff', strokeWidth: 2, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

function SectionRow({ children }: { children: React.ReactNode }) {
  return (
    <tr className="bg-[var(--surface-muted)]">
      <td colSpan={4} className="px-5 py-2 ui-eyebrow text-[var(--ink-500)] font-semibold">
        {children}
      </td>
    </tr>
  );
}

function DataRow({
  label, a, b, c,
}: {
  label: string;
  a: string;
  b: { value: string; delta: string; positive: boolean };
  c: { value: string; delta: string; positive: boolean };
}) {
  const Cell = ({ d }: { d: { value: string; delta: string; positive: boolean } }) => (
    <td className="px-5 py-3.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium tabular-nums">{d.value}</span>
        <Badge tone={d.positive ? 'success' : 'danger'} className="!text-[10.5px]">
          {d.delta}
        </Badge>
      </div>
    </td>
  );
  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]">
      <td className="px-5 py-3.5 ui-eyebrow text-[var(--ink-500)] font-medium">{label}</td>
      <td className="px-5 py-3.5 font-medium tabular-nums">{a}</td>
      <Cell d={b} />
      <Cell d={c} />
    </tr>
  );
}
