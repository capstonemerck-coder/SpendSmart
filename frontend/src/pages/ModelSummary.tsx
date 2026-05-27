//Model-Summary
import { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { Download, CheckCircle2, Search, ChevronDown, ChevronsUpDown, Info, ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowUpDown, ListFilter } from "lucide-react";
import {
  PageContainer,
  PageHeader,
  Card,
  CardHeader,
  KpiCard,
  Button,
  TabPills,
  Badge,
} from '@/components/shared';

const Chevron = ({
  open,
  className = "",
  style,
}: {
  open: boolean;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    className={`transition-transform duration-150 flex-shrink-0 ${open ? "rotate-90" : ""} ${className}`}
    style={style}
    fill="none"
  >
    <path
      d="M3 2l4 3-4 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const hierarchicalData = [
  {
    name: "HCP-PP",
    spend: 48,
    contribution: 54,
    roi: "3.5",
    channels: [
      {
        name: "Digital",
        spend: 28,
        contribution: 32,
        roi: "4.1",
        subchannels: [
          { name: "Display", spend: 12, contribution: 14, roi: "4.3" },
          { name: "Social", spend: 10, contribution: 12, roi: "4.5" },
          { name: "Video", spend: 6, contribution: 6, roi: "3.2" },
        ],
      },
      {
        name: "Search",
        spend: 20,
        contribution: 22,
        roi: "3.2",
        subchannels: [
          { name: "Brand", spend: 8, contribution: 10, roi: "3.8" },
          { name: "Generic", spend: 12, contribution: 12, roi: "2.9" },
        ],
      },
      {
        name: "Events",
        spend: 6,
        contribution: 7,
        roi: "3.6",
        subchannels: [
          { name: "Conferences", spend: 3, contribution: 4, roi: "3.9" },
          { name: "Workshops", spend: 3, contribution: 3, roi: "3.2" },
        ],
      },
      {
        name: "Email",
        spend: 5,
        contribution: 6,
        roi: "4.0",
        subchannels: [
          { name: "Newsletters", spend: 3, contribution: 4, roi: "4.2" },
          { name: "Campaigns", spend: 2, contribution: 2, roi: "3.7" },
        ],
      },
      {
        name: "Field Marketing",
        spend: 7,
        contribution: 6,
        roi: "2.8",
        subchannels: [
          { name: "Rep Visits", spend: 4, contribution: 3, roi: "2.5" },
          { name: "Samples", spend: 3, contribution: 3, roi: "3.0" },
        ],
      },
    ],
  },
  {
    name: "HCP-NPP",
    spend: 42,
    contribution: 38,
    roi: "2.3",
    channels: [
      {
        name: "TV",
        spend: 42,
        contribution: 38,
        roi: "2.3",
        subchannels: [
          { name: "Cable", spend: 25, contribution: 22, roi: "2.1" },
          { name: "Broadcast", spend: 17, contribution: 16, roi: "2.6" },
        ],
      },
    ],
  },
  {
    name: "Consumers",
    spend: 10,
    contribution: 8,
    roi: "1.5",
    channels: [
      {
        name: "Others",
        spend: 10,
        contribution: 8,
        roi: "1.5",
        subchannels: [
          { name: "Print", spend: 5, contribution: 4, roi: "1.3" },
          { name: "Radio", spend: 3, contribution: 3, roi: "1.8" },
          { name: "OOH", spend: 2, contribution: 1, roi: "1.1" },
        ],
      },
    ],
  },
];

const CAT_COLORS: Record<string, string> = {
  "HCP-PP": "#00857C",
  "HCP-NPP": "#3F3F46",
  Consumers: "#A1A1AA",
};

// All subchannels flat with category for scatter
const allSubchannels = hierarchicalData.flatMap((cat) =>
  cat.channels.flatMap((ch) =>
    ch.subchannels.map((sub) => ({
      name: sub.name,
      channel: ch.name,
      category: cat.name,
      spend: parseFloat(((sub.spend / 100) * 10).toFixed(2)),
      sales: parseFloat(((sub.contribution / 100) * 2.9).toFixed(2)),
      roi: sub.roi,
    }))
  )
);

// Generate 40 channels for ROI analysis with varied performance
const generateChannelsForROI = () => {
  const baseChannels = [
    // HCP-PP channels (15)
    { name: "Digital Display", category: "HCP-PP", roi: 4.3 },
    { name: "Social Media", category: "HCP-PP", roi: 4.5 },
    { name: "Video Ads", category: "HCP-PP", roi: 3.2 },
    { name: "Brand Search", category: "HCP-PP", roi: 3.8 },
    { name: "Generic Search", category: "HCP-PP", roi: 2.9 },
    { name: "Conferences", category: "HCP-PP", roi: 3.9 },
    { name: "Workshops", category: "HCP-PP", roi: 3.2 },
    { name: "Email Newsletters", category: "HCP-PP", roi: 4.2 },
    { name: "Email Campaigns", category: "HCP-PP", roi: 3.7 },
    { name: "Rep Visits", category: "HCP-PP", roi: 2.5 },
    { name: "Medical Samples", category: "HCP-PP", roi: 3.0 },
    { name: "Programmatic", category: "HCP-PP", roi: 3.6 },
    { name: "Native Ads", category: "HCP-PP", roi: 3.4 },
    { name: "Influencer", category: "HCP-PP", roi: 4.1 },
    { name: "Webinars", category: "HCP-PP", roi: 3.8 },

    // HCP-NPP channels (12)
    { name: "Cable TV", category: "HCP-NPP", roi: 2.1 },
    { name: "Broadcast TV", category: "HCP-NPP", roi: 2.6 },
    { name: "Streaming Video", category: "HCP-NPP", roi: 2.8 },
    { name: "Connected TV", category: "HCP-NPP", roi: 2.4 },
    { name: "Online Video", category: "HCP-NPP", roi: 2.7 },
    { name: "Pre-roll Ads", category: "HCP-NPP", roi: 2.3 },
    { name: "Mid-roll Ads", category: "HCP-NPP", roi: 2.2 },
    { name: "Sponsored Content", category: "HCP-NPP", roi: 2.5 },
    { name: "Display Banners", category: "HCP-NPP", roi: 2.0 },
    { name: "Mobile Ads", category: "HCP-NPP", roi: 2.4 },
    { name: "Tablet Ads", category: "HCP-NPP", roi: 2.3 },
    { name: "Desktop Display", category: "HCP-NPP", roi: 2.1 },

    // Consumers channels (13)
    { name: "Print Magazines", category: "Consumers", roi: 1.3 },
    { name: "Print Newspapers", category: "Consumers", roi: 1.4 },
    { name: "Radio Spots", category: "Consumers", roi: 1.8 },
    { name: "Radio Sponsorship", category: "Consumers", roi: 1.6 },
    { name: "Billboard OOH", category: "Consumers", roi: 1.1 },
    { name: "Transit OOH", category: "Consumers", roi: 1.2 },
    { name: "Direct Mail", category: "Consumers", roi: 1.5 },
    { name: "Catalogs", category: "Consumers", roi: 1.4 },
    { name: "Flyers", category: "Consumers", roi: 1.3 },
    { name: "In-store Display", category: "Consumers", roi: 1.7 },
    { name: "Coupons", category: "Consumers", roi: 1.9 },
    { name: "Loyalty Programs", category: "Consumers", roi: 1.8 },
    { name: "Promotional Events", category: "Consumers", roi: 1.6 },
  ];

  return baseChannels;
};

const allChannelsFlat = generateChannelsForROI();

// ── Grouped Bar Chart — Solid (Sales) vs Outlined (Spend) ────────────────────
function GroupedBarChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 500, height: 240 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setDims({ width: w, height: Math.round(Math.max(200, w * 0.4)) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: W, height: H } = dims;
  const PAD = { t: 16, r: 20, b: 44, l: 52 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const data = hierarchicalData.map((cat) => ({
    name: cat.name,
    spend: parseFloat(((cat.spend / 100) * 10).toFixed(2)),
    sales: parseFloat(((cat.contribution / 100) * 12.8).toFixed(2)),
    color: CAT_COLORS[cat.name],
  }));

  const maxVal = Math.max(...data.flatMap((d) => [d.spend, d.sales])) * 1.15;
  const groupW = plotW / data.length;
  const barW = groupW * 0.28;
  const gap = groupW * 0.05;
  const toY = (v: number) => PAD.t + plotH - (v / maxVal) * plotH;
  const yTicks = [0, 2, 4, 6, 8];

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <defs>
          {data.map((d) => (
            <pattern key={`hatch-${d.name}`} id={`hatch-${d.name}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke={d.color} strokeWidth="2.5" />
            </pattern>
          ))}
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={toY(t)} y2={toY(t)} stroke="#F4F4F5" strokeWidth="1" />
            <text x={PAD.l - 6} y={toY(t) + 4} textAnchor="end" fontSize="9" fill="#A1A1AA">${t}M</text>
          </g>
        ))}
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />

        {data.map((d, i) => {
          const groupCx = PAD.l + groupW * i + groupW / 2;
          const spendX = groupCx - barW - gap / 2;
          const salesX = groupCx + gap / 2;
          const spendH = (d.spend / maxVal) * plotH;
          const salesH = (d.sales / maxVal) * plotH;

          return (
            <g key={d.name}>
              {/* Spend bar — hatched */}
              <rect
                x={spendX} y={toY(d.spend)} width={barW} height={spendH}
                fill={`url(#hatch-${d.name})`} stroke={d.color} strokeWidth="1" rx="2"
                className="cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                onMouseMove={(e) => {
                  const r = containerRef.current?.getBoundingClientRect();
                  if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${d.name} — Spend: $${d.spend}M` });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              {/* Sales bar — solid fill */}
              <rect
                x={salesX} y={toY(d.sales)} width={barW} height={salesH}
                fill={d.color} rx="2"
                className="cursor-pointer transition-opacity hover:opacity-80"
                onMouseMove={(e) => {
                  const r = containerRef.current?.getBoundingClientRect();
                  if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${d.name} — Sales: $${d.sales}M` });
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              {/* Category label */}
              <text x={groupCx} y={H - PAD.b + 14} textAnchor="middle" fontSize="10" fill="#52525B" fontWeight="500">{d.name}</text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-2 px-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14">
            <defs><pattern id="hatch-legend" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="4" stroke="#52525B" strokeWidth="2"/></pattern></defs>
            <rect x="1" y="1" width="12" height="12" rx="2" fill="url(#hatch-legend)" stroke="#52525B" strokeWidth="1"/>
          </svg>
          <span className="text-[11px] text-[var(--ink-500)]">Spend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 14 14"><rect x="1" y="1" width="12" height="12" rx="2" fill="#52525B"/></svg>
          <span className="text-[11px] text-[var(--ink-500)]">Impactable Sales</span>
        </div>
        <span className="text-[10.5px] text-[var(--ink-400)]">· Bar color matches category</span>
      </div>

      {tooltip && (
        <div
          className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md"
          style={{ left: Math.min(tooltip.x + 12, dims.width - 180), top: Math.max(tooltip.y - 36, 4) }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ── Top / Bottom Channels with Pagination ────────────────────────────────────
function TopBottomChannels() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<"all" | "top10" | "bottom10">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter by category
  const categoryFiltered = categoryFilter === "all"
    ? allChannelsFlat
    : allChannelsFlat.filter((ch) => ch.category === categoryFilter);

  // Sort by ROI descending
  const sorted = [...categoryFiltered].sort((a, b) => b.roi - a.roi);

  // Apply top/bottom 10% filter
  let displayList = sorted;
  if (performanceFilter === "top10") {
    const top10Count = Math.ceil(sorted.length * 0.1);
    displayList = sorted.slice(0, top10Count);
  } else if (performanceFilter === "bottom10") {
    const bottom10Count = Math.ceil(sorted.length * 0.1);
    displayList = sorted.slice(-bottom10Count).reverse();
  }

  // Pagination
  const totalPages = Math.ceil(displayList.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedList = displayList.slice(startIdx, endIdx);

  // Reset page when filters change
  const handleCategoryChange = (cat: string) => {
    setCategoryFilter(cat);
    setCurrentPage(1);
  };

  const handlePerformanceChange = (perf: "all" | "top10" | "bottom10") => {
    setPerformanceFilter(perf);
    setCurrentPage(1);
  };

  const maxRoi = sorted[0]?.roi || 1;

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[13px] font-semibold text-[var(--ink-900)]">Channels by ROI</span>

        {/* Category filter */}
        <div className="relative ml-auto">
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="text-[11px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-6"
          >
            <option value="all">All Categories</option>
            <option value="HCP-PP">HCP-PP</option>
            <option value="HCP-NPP">HCP-NPP</option>
            <option value="Consumers">Consumers</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
        </div>

        {/* Top/Bottom 10% toggle */}
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          <button
            onClick={() => handlePerformanceChange("all")}
            className={`px-3 py-1 text-[11px] font-medium transition-colors ${performanceFilter === "all" ? "bg-[var(--ink-900)] text-white" : "bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]"}`}
          >
            All
          </button>
          <button
            onClick={() => handlePerformanceChange("top10")}
            className={`px-3 py-1 text-[11px] font-medium transition-colors border-l border-[var(--border)] ${performanceFilter === "top10" ? "bg-[var(--ink-900)] text-white" : "bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]"}`}
          >
            Top 10%
          </button>
          <button
            onClick={() => handlePerformanceChange("bottom10")}
            className={`px-3 py-1 text-[11px] font-medium transition-colors border-l border-[var(--border)] ${performanceFilter === "bottom10" ? "bg-[var(--ink-900)] text-white" : "bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]"}`}
          >
            Bottom 10%
          </button>
        </div>
      </div>

      {/* Channel list */}
      <div className="space-y-2.5 flex-1 mb-4">
        {paginatedList.map((item, i) => {
          const globalIndex = startIdx + i + 1;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[11px] text-[var(--ink-400)] w-5 text-right tabular-nums flex-shrink-0">{globalIndex}</span>
              <div className="w-32 flex-shrink-0">
                <div className="text-[12px] font-medium text-[var(--ink-800)] truncate">{item.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[item.category] }} />
                  <span className="text-[10px] text-[var(--ink-400)]">{item.category}</span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--surface-subtle)] h-5 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${(item.roi / maxRoi) * 100}%`,
                    background: CAT_COLORS[item.category],
                    opacity: performanceFilter === "bottom10" ? 0.6 : 1,
                  }}
                />
              </div>
              <span className="text-[12px] font-semibold text-[var(--ink-900)] w-8 text-right tabular-nums flex-shrink-0">{item.roi.toFixed(1)}</span>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--ink-500)]">
            Showing {startIdx + 1}-{Math.min(endIdx, displayList.length)} of {displayList.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-[11px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                  page === currentPage
                    ? "bg-[var(--ink-900)] text-white"
                    : "text-[var(--ink-700)] border border-[var(--border)] hover:bg-[var(--surface-subtle)]"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-[11px] font-medium text-[var(--ink-700)] border border-[var(--border)] rounded hover:bg-[var(--surface-subtle)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scatter Chart — now uses subchannels ──────────────────────────────────────
function ScatterChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 600, height: 240 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: (typeof allSubchannels)[0] } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setDims({ width: w, height: Math.round(Math.max(200, w * 0.24)) });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: W, height: H } = dims;
  const PAD = { t: 20, r: 24, b: 44, l: 60 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;
  const maxSpend = 2.5, maxSales = 1.5;
  const toX = (v: number) => PAD.l + (v / maxSpend) * plotW;
  const toY = (v: number) => PAD.t + plotH - (v / maxSales) * plotH;
  const avgRatio = allSubchannels.reduce((a, d) => a + d.sales / d.spend, 0) / allSubchannels.length;
  const yTicks = [0, 0.5, 1.0, 1.5];
  const xTicks = [0, 0.5, 1.0, 1.5, 2.0, 2.5];
  const DOT_R = 6;

  const handleMouseMove = (e: React.MouseEvent<SVGCircleElement>, d: (typeof allSubchannels)[0]) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, d });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ display: "block", width: "100%", height: "auto" }}>
        {yTicks.map((t) => {
          const y = toY(t);
          return (
            <g key={`y${t}`}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#F4F4F5" strokeWidth="1" />
              <text x={PAD.l - 8} y={t === 0 ? y - 4 : y + 4} textAnchor="end" fontSize="9" fill="#A1A1AA">${t}M</text>
            </g>
          );
        })}
        {xTicks.map((t) => (
          <g key={`x${t}`}>
            <line x1={toX(t)} x2={toX(t)} y1={PAD.t} y2={H - PAD.b} stroke="#F4F4F5" strokeWidth="1" />
            <text x={toX(t)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#A1A1AA">${t}M</text>
          </g>
        ))}
        <line x1={PAD.l} x2={W - PAD.r} y1={H - PAD.b} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke="#D4D4D8" strokeWidth="1" />
        <text x={PAD.l + plotW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#71717A" fontWeight="500">Spend ($M)</text>
        <text x={16} y={PAD.t + plotH / 2} textAnchor="middle" fontSize="10" fill="#71717A" fontWeight="500" transform={`rotate(-90, 16, ${PAD.t + plotH / 2})`}>Impactable Sales ($M)</text>
        {(() => {
          const lineEndX = Math.min(maxSales / avgRatio, maxSpend * 0.88);
          const lineEndY = lineEndX * avgRatio;
          return (
            <>
              <line x1={toX(0)} y1={toY(0)} x2={toX(lineEndX)} y2={toY(lineEndY)} stroke="#00857C" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.5" />
              <text x={toX(lineEndX) - 6} y={toY(lineEndY) - 6} fontSize="9.5" fill="#00857C" textAnchor="end" fontWeight="500">avg efficiency</text>
            </>
          );
        })()}
        {allSubchannels.map((d, i) => (
          <circle key={i} cx={toX(d.spend)} cy={toY(d.sales)} r={DOT_R} fill={CAT_COLORS[d.category]} stroke="white" strokeWidth="2" style={{ cursor: "pointer" }} onMouseMove={(e) => handleMouseMove(e, d)} onMouseLeave={() => setTooltip(null)} />
        ))}
      </svg>
      {tooltip && (
        <div
          className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md"
          style={{ left: Math.min(Math.max(tooltip.x + 14, 0), dims.width - 180), top: Math.max(tooltip.y - 80, 4) }}
        >
          <div className="font-semibold mb-1">{tooltip.d.name}</div>
          <div className="text-white/70">Channel: {tooltip.d.channel}</div>
          <div className="text-white/70">Category: {tooltip.d.category}</div>
          <div className="text-white/70">Spend: ${tooltip.d.spend}M</div>
          <div className="text-white/70">Sales: ${tooltip.d.sales}M</div>
          <div className="text-white/70">ROI: {tooltip.d.roi}</div>
        </div>
      )}
    </div>
  );
}

// ── Info tooltip ──────────────────────────────────────────────────────────────
function InfoTip() {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const show = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX - 180 });
  };
  const hide = () => setPos(null);
  return (
    <>
      <Info size={13} onMouseEnter={show} onMouseLeave={hide} className="text-white/60 hover:text-white cursor-pointer transition-colors flex-shrink-0" />
      {pos && typeof document !== "undefined" && ReactDOM.createPortal(
        <div style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 99999 }} className="w-52 bg-white border border-[var(--border)] text-[var(--ink-800)] text-[11px] rounded-lg px-3.5 py-3 leading-relaxed shadow-xl pointer-events-none">
          <p className="font-semibold text-[var(--ink-900)] mb-1">Spend vs Contribution</p>
          <p className="mb-1"><span className="font-medium text-[var(--ink-900)]">Spend %</span> — share of total marketing budget.</p>
          <p className="mb-1"><span className="font-medium text-[var(--ink-900)]">Contri %</span> — share of total incremental sales.</p>
          <p>↑ channel over-delivers vs its spend share.</p>
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Export button ─────────────────────────────────────────────────────────────
function ExportButton({ withDropdown = false, onExport, isExported }: { withDropdown?: boolean; onExport: () => void; isExported: boolean }) {
  const [open, setOpen] = useState(false);
  const btnClass = "flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-700)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 transition-colors bg-white";

  if (!withDropdown) {
    return (
      <div className="flex items-center gap-2">
        <button className={btnClass} onClick={onExport}><Download size={12} className="text-[var(--ink-400)]" />Export</button>
        {isExported && <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button className={btnClass} onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}>
          <Download size={12} className="text-[var(--ink-400)]" />
          Export
          <svg width="10" height="10" viewBox="0 0 10 10" className="ml-0.5 text-[var(--ink-400)]"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] z-20 overflow-hidden">
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors" onClick={() => { onExport(); setOpen(false); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              Export PNG
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]" onClick={() => { onExport(); setOpen(false); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              Export CSV
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]" onClick={() => { onExport(); setOpen(false); }}>
              <Download size={12} className="text-[var(--ink-400)]" />Export both
            </button>
          </div>
        )}
      </div>
      {isExported && <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>}
    </div>
  );
}

// ── Table Filter Bar ──────────────────────────────────────────────────────────
function TableFilterBar({
  search, setSearch,
  categoryFilter, setCategoryFilter,
  performanceFilter, setPerformanceFilter,
  onExpandAll, onCollapseAll,
}: {
  search: string; setSearch: (v: string) => void;
  categoryFilter: string; setCategoryFilter: (v: string) => void;
  performanceFilter: string; setPerformanceFilter: (v: string) => void;
  onExpandAll: () => void; onCollapseAll: () => void;
}) {
  const selectClass = "text-[12px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-7 relative";

  return (
    <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[160px] max-w-[240px]">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
        <input
          type="text"
          placeholder="Search channels..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-[12px] pl-7 pr-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-white placeholder:text-[var(--ink-400)] text-[var(--ink-800)] focus:outline-none focus:border-[var(--brand)] transition-colors"
        />
      </div>
      <div className="relative">
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectClass}>
          <option value="all">All Categories</option>
          {hierarchicalData.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
      </div>
      <div className="relative">
        <select value={performanceFilter} onChange={(e) => setPerformanceFilter(e.target.value)} className={selectClass}>
          <option value="all">All Performance</option>
          <option value="over">Over-performing ↑</option>
          <option value="under">Under-performing ↓</option>
        </select>
        <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={onExpandAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">
          <ChevronsUpDown size={11} />Expand all
        </button>
        <button onClick={onCollapseAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">
          Collapse all
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ModelSummary() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [overviewTab, setOverviewTab] = useState<"spend-channels" | "efficiency">("spend-channels");
  const [exportedItems, setExportedItems] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [performanceFilter, setPerformanceFilter] = useState("all");

  const [sortConfig, setSortConfig] = useState<{ col: string; dir: "asc" | "desc" }>({ col: "roi", dir: "desc" });

  const handleSort = (col: string) => {
    setSortConfig((prev) =>
      prev.col === col && prev.dir === "asc"
        ? { col, dir: "desc" }
        : { col, dir: prev.col === col ? "asc" : "desc" }
    );
  };

  const isSortAsc = (col: string) => sortConfig.col === col && sortConfig.dir === "asc";
  const isSortActive = (col: string) => sortConfig.col === col;
  const isAnythingExpanded = expandedCategories.size > 0;

  const sortVal = (row: any, col: string) => {
    if (col === "spend") return row.spend;
    if (col === "sales") return (row.contribution / 100) * 2.9;
    if (col === "contrib") return row.contribution;
    if (col === "roi") return parseFloat(row.roi);
    return 0;
  };

  const sortRows = <T,>(rows: T[]) =>
    [...rows].sort((a, b) => {
      const v = sortVal(a, sortConfig.col) - sortVal(b, sortConfig.col);
      return sortConfig.dir === "asc" ? v : -v;
    });

  const markExported = (key: string) => setExportedItems((s) => new Set([...s, key]));
  const toggleCategory = (n: string) => {
    const next = new Set(expandedCategories);
    next.has(n) ? next.delete(n) : next.add(n);
    setExpandedCategories(next);
  };
  const toggleChannel = (k: string) => {
    const next = new Set(expandedChannels);
    next.has(k) ? next.delete(k) : next.add(k);
    setExpandedChannels(next);
  };

  const handleExpandAll = () => {
    setExpandedCategories(new Set(hierarchicalData.map((c) => c.name)));
    setExpandedChannels(new Set(hierarchicalData.flatMap((cat) => cat.channels.map((ch) => `${cat.name}-${ch.name}`))));
  };
  const handleCollapseAll = () => {
    setExpandedCategories(new Set());
    setExpandedChannels(new Set());
  };

  const searchLower = search.toLowerCase();
  const filteredData = hierarchicalData
    .filter((cat) => categoryFilter === "all" || cat.name === categoryFilter)
    .map((cat) => {
      const filteredChannels = cat.channels
        .filter((ch) => {
          const nameMatch = !search || ch.name.toLowerCase().includes(searchLower) || ch.subchannels?.some((s) => s.name.toLowerCase().includes(searchLower));
          const perfMatch = performanceFilter === "all" || (performanceFilter === "over" ? ch.contribution > ch.spend : performanceFilter === "under" ? ch.contribution < ch.spend : true);
          return nameMatch && perfMatch;
        })
        .map((ch) => ({
          ...ch,
          subchannels: ch.subchannels?.filter((s) => !search || s.name.toLowerCase().includes(searchLower) || ch.name.toLowerCase().includes(searchLower)),
        }));
      const sortedChannels = sortRows(filteredChannels).map((ch) => ({
        ...ch,
        subchannels: sortRows(ch.subchannels || []),
      }));
      return { ...cat, channels: sortedChannels };
    })
    .filter((cat) => {
      const catNameMatch = !search || cat.name.toLowerCase().includes(searchLower) || cat.channels.length > 0;
      const perfMatch = performanceFilter === "all" || cat.channels.length > 0;
      return catNameMatch && perfMatch;
    });

  // Filters — expand categories and channels so matching rows are visible
  useEffect(() => {
    if (search || performanceFilter !== "all") {
      setExpandedCategories(new Set(filteredData.map((c) => c.name)));
      setExpandedChannels(new Set(filteredData.flatMap((cat) => cat.channels.map((ch) => `${cat.name}-${ch.name}`))));
    }
  }, [search, performanceFilter, categoryFilter]);

  // Sort — only expand categories, channels stay collapsed for progressive disclosure
  useEffect(() => {
    setExpandedCategories(new Set(hierarchicalData.map((c) => c.name)));
    setExpandedChannels(new Set()); // keep channels collapsed
  }, [sortConfig]);

  const hasActiveFilters = search || categoryFilter !== "all" || performanceFilter !== "all";

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Model Insights"
        title="Current performance"
        description="Channel-level spend, contribution and ROI based on uploaded model outputs."
      />

      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-stretch">
          <KpiCard label="Total sales" value="$12.8M" className="lg:col-span-1 h-full" />
          <KpiCard label="Total spend" value="$10.0M" className="lg:col-span-1 h-full" />
          <KpiCard label="Overall ROI" value="2.56"  className="lg:col-span-1 h-full" />
          <Card className="lg:col-span-3 !rounded-lg !shadow-none px-5 py-4 flex flex-col justify-center">
            <div className="ui-eyebrow mb-2.5">Base vs incremental split</div>
            <div className="w-full h-7 flex overflow-hidden rounded-md">
              <div className="bg-[var(--ink-900)] flex items-center justify-center text-[11px] text-white font-medium" style={{ width: "67%" }}>Base 67%</div>
              <div className="bg-[var(--brand)] flex items-center justify-center text-[11px] text-white font-medium" style={{ width: "33%" }}>Inc 33%</div>
            </div>
            <div className="flex justify-between text-[11.5px] text-[var(--ink-500)] mt-2">
              <span><span className="font-semibold text-[var(--ink-900)] tabular-nums">$8.6M</span> base</span>
              <span><span className="font-semibold text-[var(--ink-900)] tabular-nums">$4.2M</span> incremental</span>
            </div>
          </Card>
        </div>

        {/* Overview */}
        <Card>
          <CardHeader
            title="Channel performance overview"
            actions={
              <div className="flex items-center gap-2">
                <TabPills
                  value={overviewTab}
                  onChange={setOverviewTab}
                  options={[
                    { value: "spend-channels", label: "Spend & Channels" },
                    { value: "efficiency", label: "Subchannel Efficiency" },
                  ]}
                />
                <ExportButton withDropdown onExport={() => markExported("overview")} isExported={exportedItems.has("overview")} />
              </div>
            }
          />

          {overviewTab === "spend-channels" && (
            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 ui-fade-in">
              {/* Left — Grouped bar chart */}
              <div>
                <div className="text-[13px] font-semibold text-[var(--ink-900)] mb-1">Spend vs impactable sales by category</div>
                <div className="text-[11.5px] text-[var(--ink-500)] mb-4">Compare budget allocation against impactable sales per category</div>
                <GroupedBarChart />
              </div>

              {/* Right — Top / Bottom 5 */}
              <div className="lg:border-l lg:border-[var(--border)] lg:pl-8">
                <TopBottomChannels />
              </div>
            </div>
          )}

          {overviewTab === "efficiency" && (
            <div className="px-6 py-5 ui-fade-in">
              <div className="mb-3">
                <div className="text-[13px] font-semibold text-[var(--ink-900)] mb-1">Subchannel efficiency — spend vs impactable sales</div>
                <div className="text-[11.5px] text-[var(--ink-500)]">Subchannels above the line of average efficiency deliver more sales per dollar spent</div>
              </div>
              <ScatterChart />
              <div className="flex gap-5 mt-3 pt-3 border-t border-[var(--border)] flex-wrap">
                {Object.entries(CAT_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-[11.5px] text-[var(--ink-700)]">{name}</span>
                  </div>
                ))}
                <span className="text-[11px] text-[var(--ink-400)] ml-2">· Hover dots for details</span>
              </div>
            </div>
          )}
        </Card>

        {/* Channel contribution detail */}
        <Card>
          <CardHeader
            title="Channel contribution detail"
            actions={
              <ExportButton onExport={() => markExported("detail")} isExported={exportedItems.has("detail")} />
            }
          />

          <TableFilterBar
            search={search} setSearch={setSearch}
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            performanceFilter={performanceFilter} setPerformanceFilter={setPerformanceFilter}
            onExpandAll={handleExpandAll}
            onCollapseAll={handleCollapseAll}
          />

          <div className="overflow-x-auto" style={{ overflowX: "auto", overflowY: "visible" }}>
            <div style={{ minWidth: "700px" }}>
              <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--ink-900)]" style={{ overflow: "visible" }}>
                <div className="text-[10.5px] font-semibold text-white/60 uppercase tracking-[0.1em]">Channel hierarchy</div>
                {(["spend", "sales"] as const).map((col) => {
                  const label = col === "spend" ? "Spend" : "Impactable Sales";
                  return (
                    <button key={col} onClick={() => isAnythingExpanded && handleSort(col)} className={`flex items-center justify-end gap-1 w-full transition-all ${isAnythingExpanded ? "cursor-pointer hover:text-white" : "cursor-default opacity-60"}`}>
                      <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${isSortActive(col) ? "text-white" : "text-white/60"}`}>{label}</span>
                      {isAnythingExpanded && (isSortAsc(col) ? <ArrowUpNarrowWide size={12} className="text-white flex-shrink-0" /> : isSortActive(col) ? <ArrowDownWideNarrow size={12} className="text-white flex-shrink-0" /> : <ArrowUpDown size={12} className="text-white/25 flex-shrink-0" />)}
                    </button>
                  );
                })}
                <div className="flex items-center justify-end gap-1">
                  <InfoTip />
                  <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${performanceFilter !== "all" ? "text-white" : "text-white/60"}`}>Spend vs Contribution</span>
                  <button onClick={() => setPerformanceFilter((p) => p === "all" ? "over" : p === "over" ? "under" : "all")} className={`flex-shrink-0 rounded p-0.5 transition-all hover:bg-white/20 ${performanceFilter !== "all" ? "text-white" : "text-white/30 hover:text-white/70"}`} title={performanceFilter === "all" ? "Filter by performance" : performanceFilter === "over" ? "Over-performing — click for under" : "Under-performing — click to clear"}>
                    <ListFilter size={13} />
                  </button>
                </div>
                <button onClick={() => isAnythingExpanded && handleSort("roi")} className={`flex items-center justify-end gap-1 w-full transition-all ${isAnythingExpanded ? "cursor-pointer hover:text-white" : "cursor-default opacity-60"}`}>
                  <span className={`text-[10.5px] font-semibold uppercase tracking-[0.1em] ${isSortActive("roi") ? "text-white" : "text-white/60"}`}>ROI</span>
                  {isAnythingExpanded && (isSortAsc("roi") ? <ArrowUpNarrowWide size={12} className="text-white flex-shrink-0" /> : isSortActive("roi") ? <ArrowDownWideNarrow size={12} className="text-white flex-shrink-0" /> : <ArrowUpDown size={12} className="text-white/25 flex-shrink-0" />)}
                </button>
              </div>

              <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
                {filteredData.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13px] text-[var(--ink-400)]">
                    No channels match your filters.{" "}
                    <button onClick={() => { setSearch(""); setCategoryFilter("all"); setPerformanceFilter("all"); }} className="text-[var(--brand)] hover:underline font-medium">Clear filters</button>
                  </div>
                ) : (
                  filteredData.map((category, ci) => {
                    const catOpen = expandedCategories.has(category.name);
                    const catBetter = category.contribution > category.spend;
                    return (
                      <div key={ci} className="border-b-2 border-[var(--surface-subtle)] last:border-b-0">
                        <div className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-3 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer border-b border-[var(--border)]" onClick={() => toggleCategory(category.name)}>
                          <div className="flex items-center gap-2">
                            <Chevron open={catOpen} className="" style={{ color: CAT_COLORS[category.name] || "#D4D4D8" }} />
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[category.name] || "#D4D4D8" }} />
                            <span className="text-[13px] font-bold text-[var(--ink-900)] uppercase tracking-wide">{category.name}</span>
                            {catOpen && (
                              <button className="ml-2 text-[10px] text-[var(--ink-400)] hover:text-[var(--brand)] underline underline-offset-2 font-medium transition-colors" onClick={(e) => { e.stopPropagation(); setExpandedChannels((prev) => new Set([...prev, ...category.channels.map((ch) => `${category.name}-${ch.name}`)])); }}>
                                expand all channels
                              </button>
                            )}
                          </div>
                          <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">${((category.spend / 100) * 10).toFixed(1)}M</div>
                          <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">${((category.contribution / 100) * 2.9).toFixed(2)}M</div>
                          <div className="text-right text-[13px] tabular-nums font-medium">
                            <span className="text-[var(--ink-900)]">{category.spend}%</span>
                            <span className="mx-1 text-[var(--ink-400)]">vs</span>
                            <span className="text-[var(--ink-900)] font-semibold">{category.contribution}%</span>
                            <span className={`ml-1 font-bold ${catBetter ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{catBetter ? "↑" : "↓"}</span>
                          </div>
                          <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{category.roi}</div>
                        </div>

                        {catOpen && category.channels.map((channel, chi) => {
                          const key = `${category.name}-${channel.name}`;
                          const chOpen = expandedChannels.has(key);
                          const hasSubs = channel.subchannels?.length > 0;
                          const chBetter = channel.contribution > channel.spend;
                          return (
                            <div key={chi} className="border-b border-[var(--border)] last:border-b-0">
                              <div className={`grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-2.5 bg-white ${hasSubs ? "cursor-pointer hover:bg-[var(--surface-muted)]" : ""}`} onClick={() => hasSubs && toggleChannel(key)}>
                                <div className="flex items-center gap-2 pl-5">
                                  {hasSubs ? <Chevron open={chOpen} className="" style={{ color: CAT_COLORS[category.name] || "#D4D4D8" }} /> : <span className="w-[10px] flex-shrink-0" />}
                                  <span className="text-[13px] font-semibold text-[var(--ink-800)]">{channel.name}</span>
                                </div>
                                <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">${((channel.spend / 100) * 10).toFixed(1)}M</div>
                                <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">${((channel.contribution / 100) * 2.9).toFixed(2)}M</div>
                                <div className="text-right text-[12.5px] tabular-nums">
                                  <span className="text-[var(--ink-700)]">{channel.spend}%</span>
                                  <span className="mx-1 text-[var(--ink-400)]">vs</span>
                                  <span className="text-[var(--ink-700)]">{channel.contribution}%</span>
                                  <span className={`ml-1 font-semibold ${chBetter ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{chBetter ? "↑" : "↓"}</span>
                                </div>
                                <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{channel.roi}</div>
                              </div>
                              {chOpen && hasSubs && channel.subchannels.map((sub, si) => {
                                const subBetter = sub.contribution > sub.spend;
                                return (
                                  <div key={si} className="grid grid-cols-[2.5fr_1fr_1fr_1.2fr_80px] px-5 py-2 bg-[var(--surface-muted)] border-t border-[var(--border)]">
                                    <div className="flex items-center pl-11">
                                      <span className="w-1.5 h-1.5 rounded-full mr-2.5 flex-shrink-0" style={{ background: CAT_COLORS[category.name] || "#D4D4D8" }} />
                                      <span className="text-[12.5px] text-[var(--ink-700)] font-medium">{sub.name}</span>
                                    </div>
                                    <div className="text-right text-[12px] tabular-nums text-[var(--ink-500)]">${((sub.spend / 100) * 10).toFixed(2)}M</div>
                                    <div className="text-right text-[12px] tabular-nums text-[var(--ink-500)]">${((sub.contribution / 100) * 2.9).toFixed(2)}M</div>
                                    <div className="text-right text-[12px] tabular-nums text-[var(--ink-500)]">
                                      <span>{sub.spend}%</span>
                                      <span className="mx-1 text-[var(--ink-400)]">vs</span>
                                      <span>{sub.contribution}%</span>
                                      <span className={`ml-1 ${sub.contribution > sub.spend ? "text-[var(--success)]" : sub.contribution < sub.spend ? "text-[var(--danger)]" : "text-[var(--ink-400)]"}`}>{sub.contribution > sub.spend ? "↑" : sub.contribution < sub.spend ? "↓" : "–"}</span>
                                    </div>
                                    <div className="text-right text-[12px] tabular-nums text-[var(--ink-500)]">{sub.roi}</div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-3 text-[11px] text-[var(--ink-400)] border-t border-[var(--border)] bg-[var(--surface-muted)]">
            {hasActiveFilters ? (
              <span>Showing filtered results · <button onClick={() => { setSearch(""); setCategoryFilter("all"); setPerformanceFilter("all"); }} className="text-[var(--brand)] hover:underline font-medium">Clear all filters</button></span>
            ) : (
              "Spend and impactable sales derived from model output"
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}