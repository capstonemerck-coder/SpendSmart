/**
 * RoiComparisonChart
 *
 * Horizontal bar chart showing ROI coefficient per channel.
 * Used in the Scenario Planning screen to display baseline model ROI
 * so analysts can make informed spend allocation decisions.
 *
 * @param {RoiComparisonChartProps} props
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { fmtROI, getCategoryColor } from '@/utils/categories';

interface RoiComparisonChartProps {
  data: Array<{
    name: string;
    roi: number;
    category?: string;
  }>;
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
 * Renders a vertical bar chart of ROI by channel. Bars are colored by
 * category using getCategoryColor. ROI values are formatted with fmtROI
 * (5 decimal places when |v| < 0.01 so tiny MMM coefficients stay visible).
 *
 * @param {RoiComparisonChartProps} props
 */
export function RoiComparisonChart({ data }: RoiComparisonChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-[12.5px] text-[var(--ink-400)]">
        No channel data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--ink-500)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(t) => fmtROI(t)}
          tick={{ fontSize: 11, fill: 'var(--ink-500)' }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--surface-muted)' }} />
        <Bar dataKey="roi" name="ROI" radius={[2, 2, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={getCategoryColor(entry.category ?? entry.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
