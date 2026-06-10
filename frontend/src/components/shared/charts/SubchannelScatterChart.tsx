/**
 * SubchannelScatterChart.tsx
 *
 * SVG scatter chart — each subchannel is a dot plotted by total_spend (x-axis)
 * vs impactable_sales (y-axis) in $M.  A dashed "avg efficiency" line shows the
 * average impactable_sales/spend ratio.  Dots above the line over-perform.
 * Colors are resolved via getCategoryColor per subchannel category.
 */
import { useRef, useState, useEffect } from 'react';
import { getCategoryColor, fmtCompact, fmtExact, fmtROI } from '@/utils/categories';
import type { SubchannelLevelCalc } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubchannelScatterChartProps {
  /** Subchannel rows from the model summary response. */
  subchannels: SubchannelLevelCalc[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * SubchannelScatterChart
 *
 * Responsive scatter chart of subchannels by spend vs impactable sales.
 * Filters out points where both spend and impactable_sales are zero.
 * Shows a category legend and hover tooltip with full subchannel details.
 *
 * @param {SubchannelScatterChartProps} props
 */
export function SubchannelScatterChart({ subchannels }: SubchannelScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 600, height: 240 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: SubchannelLevelCalc } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setDims({ width: w, height: Math.round(Math.max(200, w * 0.24)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = subchannels.filter((s) => !(s.total_spend === 0 && s.impactable_sales === 0));
  const categories = Array.from(new Set(points.map((s) => s.category))).sort();

  if (!points.length) {
    return (
      <div className="flex items-center justify-center h-36 text-[12px] text-[var(--ink-400)]">
        No subchannel data. Upload MODEL_FACT with sub_channel data.
      </div>
    );
  }

  const { width: W, height: H } = dims;
  const PAD = { t: 20, r: 24, b: 44, l: 60 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxSpend = Math.max(...points.map((s) => s.total_spend / 1_000_000)) * 1.15 || 1;
  const maxSales = Math.max(...points.map((s) => s.impactable_sales / 1_000_000)) * 1.15 || 1;
  const toX = (v: number) => PAD.l + (v / maxSpend) * plotW;
  const toY = (v: number) => PAD.t + plotH - (v / maxSales) * plotH;
  const avgRatio = points.reduce((a, s) => a + (s.total_spend > 0 ? (s.impactable_sales / s.total_spend) : 0), 0) / points.length;
  const xTicks = Array.from({ length: 5 }, (_, i) => (i * maxSpend) / 4);
  const yTicks = Array.from({ length: 5 }, (_, i) => (i * maxSales) / 4);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 'auto' }}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={toY(t)} y2={toY(t)} stroke="#F4F4F5" strokeWidth="1" />
            <text x={PAD.l - 8} y={t === 0 ? toY(t) - 4 : toY(t) + 4} textAnchor="end" fontSize="9" fill="#A1A1AA">{fmtCompact(t * 1_000_000)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={toX(t)} x2={toX(t)} y1={PAD.t} y2={H - PAD.b} stroke="#F4F4F5" strokeWidth="1" />
            <text x={toX(t)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#A1A1AA">{fmtCompact(t * 1_000_000)}</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <text x={PAD.l + plotW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#71717A" fontWeight="500">Spend ($M)</text>
        <text x={14} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="10" fill="#71717A" fontWeight="500" transform={`rotate(-90,14,${PAD.t + plotH / 2})`}>Impactable Sales ($M)</text>
        {avgRatio > 0 && (() => {
          const endX = Math.min(maxSales / avgRatio, maxSpend * 0.88);
          return (
            <>
              <line x1={toX(0)} y1={toY(0)} x2={toX(endX)} y2={toY(endX * avgRatio)} stroke="#00857C" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
              <text x={toX(endX) - 6} y={toY(endX * avgRatio) - 6} fontSize="9.5" fill="#00857C" textAnchor="end" fontWeight="500">avg efficiency</text>
            </>
          );
        })()}
        {points.map((s, i) => (
          <circle key={i} cx={toX(s.total_spend / 1_000_000)} cy={toY(s.impactable_sales / 1_000_000)} r={6}
            fill={getCategoryColor(s.category)} stroke="white" strokeWidth="2" style={{ cursor: 'pointer' }}
            onMouseMove={(e) => { const r = containerRef.current?.getBoundingClientRect(); if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, d: s }); }}
            onMouseLeave={() => setTooltip(null)} />
        ))}
      </svg>

      <div className="flex gap-5 mt-3 pt-3 border-t border-[var(--border)] flex-wrap">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: getCategoryColor(cat) }} />
            <span className="text-[11.5px] text-[var(--ink-700)]">{cat}</span>
          </div>
        ))}
        <span className="text-[11px] text-[var(--ink-400)] ml-2">· Hover dots for details</span>
      </div>

      {tooltip && (
        <div className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md"
          style={{ left: Math.min(Math.max(tooltip.x + 14, 0), dims.width - 220), top: Math.max(tooltip.y - 92, 4) }}>
          <div className="font-semibold mb-1">{tooltip.d.subchannel_name}</div>
          <div className="text-white/70">Channel: {tooltip.d.channel_name}</div>
          <div className="text-white/70">Category: {tooltip.d.category}</div>
          <div className="text-white/70">Spend: {fmtExact(tooltip.d.total_spend)}</div>
          <div className="text-white/70">Imp. Sales: {fmtExact(tooltip.d.impactable_sales)}</div>
          <div className="text-white/70">ROI: {fmtROI(tooltip.d.roi)}</div>
          {tooltip.d.saturation_pct != null && (
            <div className="text-white/70">Saturation: {tooltip.d.saturation_pct.toFixed(1)}%</div>
          )}
        </div>
      )}
    </div>
  );
}
