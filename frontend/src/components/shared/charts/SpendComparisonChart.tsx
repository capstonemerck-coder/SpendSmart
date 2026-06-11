/**
 * SpendComparisonChart.tsx
 *
 * Renders a grouped bar chart comparing current vs proposed spend per channel.
 * Used on the Scenario Planning screen to visualise the impact of spend changes.
 * Colors are derived from getCategoryColor — no local color map.
 *
 * @param {SpendComparisonChartProps} props
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { getCategoryColor, fmtCompact, fmtExact } from '@/utils/categories';
import type { ChannelPlanningRow } from '@/utils/types';

interface SpendComparisonChartProps {
  /** Channel planning rows — uses channel_name, current_spend, proposed_spend, category. */
  rows: ChannelPlanningRow[];
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
 * Current spend bars are faded (opacity 0.35); proposed bars are solid.
 * Bar color is derived from getCategoryColor for the channel's category.
 *
 * @param {SpendComparisonChartProps} props
 */
export function SpendComparisonChart({ rows }: SpendComparisonChartProps) {
  if (!rows.length) return null;

  const data = rows.map(r => ({
    name: r.channel_name.slice(0, 8),
    current: r.current_spend,
    proposed: r.proposed_spend,
    category: r.category,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barSize={14} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
        <Legend
          iconType="square" iconSize={9}
          wrapperStyle={{ fontSize: 11, color: 'var(--ink-500)', paddingTop: 8 }}
          formatter={(value) => value === 'current' ? 'Current' : 'Proposed'}
        />
        <Bar dataKey="current" name="current" radius={[2, 2, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={`cur-${idx}`} fill={getCategoryColor(entry.category)} opacity={0.35} />
          ))}
        </Bar>
        <Bar dataKey="proposed" name="proposed" radius={[2, 2, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={`pro-${idx}`} fill={getCategoryColor(entry.category)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
