/**
 * DonutChart.tsx
 *
 * SVG donut chart for spend distribution across categories.
 * Hovering a slice shows the category name, percentage share, and formatted
 * dollar amount in a floating tooltip. The donut center optionally displays
 * "TOTAL" with a compact-formatted spend value via the `total` prop.
 */
import { useState, useRef } from 'react';
import { fmtCompact } from '@/utils/categories';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DonutSlice {
  name: string;
  /** Percentage of total (0–100). */
  value: number;
  /** Pre-formatted dollar string for the tooltip, e.g. "$2.1M". */
  amount: string;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  /** Raw total spend in USD; formatted with fmtCompact in the donut center. */
  total?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CX = 110, CY = 110, OR = 90, IR = 56;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a data array into SVG arc path strings.
 * Starts at the 12 o'clock position and sweeps clockwise.
 */
function buildSlices(data: DonutSlice[]) {
  const sum = data.reduce((a, d) => a + d.value, 0) || 1;
  const toXY = (a: number, r: number) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });
  let cursor = -Math.PI / 2;
  return data.map((d) => {
    const angle = (d.value / sum) * 2 * Math.PI;
    const start = cursor; cursor += angle; const end = cursor;
    const s = toXY(start, OR), e = toXY(end, OR);
    const is = toXY(start, IR), ie = toXY(end, IR);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${s.x} ${s.y} A ${OR} ${OR} 0 ${large} 1 ${e.x} ${e.y} L ${ie.x} ${ie.y} A ${IR} ${IR} 0 ${large} 0 ${is.x} ${is.y} Z`;
    return { ...d, path };
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * DonutChart
 *
 * Renders an SVG donut chart for spend allocation. Hover any slice to see the
 * category name, percentage share, and dollar amount. The `total` prop drives
 * the formatted value shown in the donut center.
 *
 * @param {DonutChartProps} props
 */
export function DonutChart({ data, total }: DonutChartProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; item: DonutSlice } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const slices = buildSlices(data);

  return (
    <div className="relative flex-shrink-0">
      <svg ref={svgRef} width="220" height="220" viewBox="0 0 220 220">
        {slices.map((s, i) => (
          <path
            key={i}
            d={s.path}
            fill={s.color}
            stroke="white"
            strokeWidth="3"
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseMove={(e) => {
              const rect = svgRef.current?.getBoundingClientRect();
              if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, item: s });
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        <circle cx={CX} cy={CY} r={IR} fill="white" />
        <text x={CX} y={CY - 8} textAnchor="middle" fontSize="10" fill="#71717A" fontWeight="600" letterSpacing="1.5">
          TOTAL
        </text>
        {total != null && (
          <text x={CX} y={CY + 14} textAnchor="middle" fontSize="20" fill="#18181B" fontWeight="600"
            fontFamily="'Source Serif 4', Georgia, serif">
            {fmtCompact(total)}
          </text>
        )}
      </svg>
      {tooltip && (
        <div
          className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <div className="font-semibold">{tooltip.item.name}</div>
          <div className="text-white/70 mt-0.5">{tooltip.item.value.toFixed(1)}% · {tooltip.item.amount}</div>
        </div>
      )}
    </div>
  );
}
