/**
 * SpendVsSalesBarChart.tsx
 *
 * Grouped SVG bar chart showing spend (hatched fill) vs impactable sales
 * (solid fill) per category.  Colors come pre-computed from the caller via
 * the data prop — typically derived with getCategoryColor in the page.
 *
 * Two-row legend: row 1 encodes hatch=spend / solid=sales; row 2 shows a
 * color swatch per category.  Responsive via ResizeObserver.
 */
import { useRef, useState, useEffect } from 'react';
import { fmtCompact, fmtExact } from '@/utils/categories';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpendVsSalesBarChartProps {
  /** Category-level data array — one entry per category. Values in raw dollars. */
  data: Array<{
    name: string;
    /** Total spend in raw dollars */
    spend: number;
    /** Total impactable sales in raw dollars */
    sales: number;
    /** Hex color for this category */
    color: string;
  }>;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * SpendVsSalesBarChart
 *
 * Renders a two-bar grouped SVG chart of spend (hatched) vs impactable sales
 * (solid) per category.  Height tracks width via ResizeObserver at 40% ratio.
 * Axis labels use fmtCompact; hover tooltip shows exact values via fmtExact.
 *
 * @param {SpendVsSalesBarChartProps} props
 */
export function SpendVsSalesBarChart({ data }: SpendVsSalesBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 500, height: 220 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setDims({ width: w, height: Math.round(Math.max(180, w * 0.4)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-36 text-[12px] text-[var(--ink-400)]">
        No model data available. Upload MODEL_FACT first.
      </div>
    );
  }

  const { width: W, height: H } = dims;
  const PAD = { t: 14, r: 20, b: 42, l: 52 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxVal = Math.max(...data.flatMap((d) => [d.spend, d.sales])) * 1.15 || 1;
  const groupW = plotW / data.length;
  const barW = groupW * 0.27;
  const gap = groupW * 0.05;
  const toY = (v: number) => PAD.t + plotH - (v / maxVal) * plotH;
  const rawStep = maxVal / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const step = Math.ceil(rawStep / mag) * mag;
  const yTicks = Array.from({ length: 6 }, (_, i) => i * step).filter((t) => t <= maxVal * 1.2);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        <defs>
          {data.map((d) => (
            <pattern key={d.name} id={`hatch-svs-${d.name}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke={d.color} strokeWidth="2.5" />
            </pattern>
          ))}
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={toY(t)} y2={toY(t)} stroke="#F4F4F5" strokeWidth="1" />
            <text x={PAD.l - 6} y={toY(t) + 4} textAnchor="end" fontSize="9" fill="#A1A1AA">{fmtCompact(t)}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        {data.map((d, i) => {
          const cx = PAD.l + groupW * i + groupW / 2;
          const spendH = (d.spend / maxVal) * plotH;
          const salesH = (d.sales / maxVal) * plotH;
          return (
            <g key={d.name}>
              <rect x={cx - barW - gap / 2} y={toY(d.spend)} width={barW} height={spendH} fill={`url(#hatch-svs-${d.name})`} stroke={d.color} strokeWidth="1" rx="2"
                className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                onMouseMove={(e) => { const r = containerRef.current?.getBoundingClientRect(); if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${d.name} — Spend: ${fmtExact(d.spend)}` }); }}
                onMouseLeave={() => setTooltip(null)} />
              <rect x={cx + gap / 2} y={toY(d.sales)} width={barW} height={salesH} fill={d.color} rx="2"
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onMouseMove={(e) => { const r = containerRef.current?.getBoundingClientRect(); if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${d.name} — Impactable Sales: ${fmtExact(d.sales)}` }); }}
                onMouseLeave={() => setTooltip(null)} />
              <text x={cx} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#52525B" fontWeight="500">
                {d.name.length > 12 ? `${d.name.slice(0, 11)}…` : d.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend row 1 — encoding */}
      <div className="flex items-center gap-5 mt-2 px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <defs><pattern id="hatch-svs-legend" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#52525B" strokeWidth="2" /></pattern></defs>
            <rect x="1" y="1" width="12" height="12" rx="2" fill="url(#hatch-svs-legend)" stroke="#52525B" strokeWidth="1" />
          </svg>
          <span className="text-[11px] text-[var(--ink-500)]">Spend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#52525B" /></svg>
          <span className="text-[11px] text-[var(--ink-500)]">Impactable Sales</span>
        </div>
        <span className="text-[10.5px] text-[var(--ink-400)] italic">Color = category</span>
      </div>
      {/* Legend row 2 — category swatches */}
      <div className="flex items-center gap-4 mt-1.5 px-1 flex-wrap">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span className="text-[10.5px] text-[var(--ink-600)]">{d.name}</span>
          </div>
        ))}
      </div>

      {tooltip && (
        <div className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md"
          style={{ left: Math.min(tooltip.x + 12, dims.width - 210), top: Math.max(tooltip.y - 38, 4) }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
