/**
 * RoiComparisonChart.tsx
 *
 * Renders an SVG bar chart showing current ROI per channel.
 * Used on the Scenario Planning screen alongside SpendComparisonChart.
 * Colors are derived from getCategoryColor — no local color map.
 *
 * @param {RoiComparisonChartProps} props
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { fmtROI, getCategoryColor } from '@/utils/categories';
import type { ChannelPlanningRow } from '@/utils/types';

interface RoiComparisonChartProps {
  /** Channel planning rows — uses channel_name, current_roi, category. */
  rows: ChannelPlanningRow[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[var(--border)] rounded-lg shadow-xl px-3.5 py-3 text-[12px]">
      <p className="font-semibold text-[var(--ink-900)] mb-1">{label}</p>
      <span className="text-[var(--ink-600)]">ROI: </span>
      <span className="font-medium text-[var(--ink-900)]">{fmtROI(payload[0].value)}</span>
    </div>
  );
};

/**
 * RoiComparisonChart
 *
 * Renders a vertical bar chart of baseline ROI by channel.
 * Bars are colored by category using getCategoryColor.
 * ROI values are formatted with fmtROI.
 *
 * @param {RoiComparisonChartProps} props
 */
export function RoiComparisonChart({ rows }: RoiComparisonChartProps) {
  if (!rows.length) return null;

  const data = rows.map(r => ({
    name: r.channel_name.slice(0, 8),
    roi: r.current_roi,
    category: r.category,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtROI} tick={{ fontSize: 11, fill: 'var(--ink-500)' }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
        <Bar dataKey="roi" name="ROI" radius={[2, 2, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={getCategoryColor(entry.category)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
