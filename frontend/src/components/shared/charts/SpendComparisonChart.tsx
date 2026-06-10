/**
 * SpendComparisonChart
 *
 * Grouped horizontal bar chart comparing current spend vs proposed spend
 * per channel for a scenario planning session. Expects raw dollar values.
 *
 * @param {SpendComparisonChartProps} props
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fmtCompact, fmtExact } from '@/utils/categories';

interface SpendComparisonChartProps {
  data: Array<{
    name: string;
    current: number;
    proposed: number;
  }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border)] rounded-lg shadow-xl px-3.5 py-3 text-[12px]">
      <p className="font-semibold text-[var(--ink-900)] mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.fill }} />
          <span className="text-[var(--ink-600)] capitalize">{p.name}:</span>
          <span className="font-medium text-[var(--ink-900)]">{fmtExact(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * SpendComparisonChart
 *
 * Renders a grouped bar chart showing current vs proposed spend by channel.
 * Pass raw dollar values — the chart handles compact axis formatting internally.
 *
 * @param {SpendComparisonChartProps} props
 */
export function SpendComparisonChart({ data }: SpendComparisonChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-[12.5px] text-[var(--ink-400)]">
        No channel data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barSize={14} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--ink-500)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(t) => fmtCompact(t)}
          tick={{ fontSize: 11, fill: 'var(--ink-500)' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
        <Legend
          iconType="square"
          iconSize={9}
          wrapperStyle={{ fontSize: 11, color: 'var(--ink-500)', paddingTop: 8 }}
        />
        <Bar dataKey="current" name="Current" fill="var(--ink-300)" radius={[2, 2, 0, 0]} />
        <Bar dataKey="proposed" name="Proposed" fill="var(--brand)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
