//Scenario outcome
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Download, CheckCircle2, Search, ChevronsUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow, ArrowUpDown } from 'lucide-react';
import { PageContainer, PageHeader, Card, CardHeader, KpiCard, Button, Badge, TabPills } from '@/components/shared';
import type { Scenario } from '@/utils/types';

const CAT_COLORS: Record<string, string> = {
  'HCP-PP':  '#00857C',
  'HCP-NPP': '#3F3F46',
  Consumer:  '#A1A1AA',
};

const kpis = [
  { label: 'Scenario type',     value: 'Spend-based', sub: 'Q1 2025 Optimization', isMeta: true },
  { label: 'Total sales',       value: '$12.8M' },
  { label: 'Total spend',       value: '$5.0M'  },
  { label: 'Incremental Sales', value: '$5.1M'  },
  { label: 'Overall ROI',       value: '2.56', emphasis: true },
  { label: 'Overall MROI',      value: '1.82', emphasis: true },
];

const pieData = [
  { name: 'HCP-PP',   value: 42, amount: '$2,100K', color: CAT_COLORS['HCP-PP']  },
  { name: 'HCP-NPP',  value: 38, amount: '$1,900K', color: CAT_COLORS['HCP-NPP'] },
  { name: 'Consumer', value: 20, amount: '$1,000K', color: CAT_COLORS['Consumer']},
];

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

    // Consumer channels (13)
    { name: "Print Magazines", category: "Consumer", roi: 1.3 },
    { name: "Print Newspapers", category: "Consumer", roi: 1.4 },
    { name: "Radio Spots", category: "Consumer", roi: 1.8 },
    { name: "Radio Sponsorship", category: "Consumer", roi: 1.6 },
    { name: "Billboard OOH", category: "Consumer", roi: 1.1 },
    { name: "Transit OOH", category: "Consumer", roi: 1.2 },
    { name: "Direct Mail", category: "Consumer", roi: 1.5 },
    { name: "Catalogs", category: "Consumer", roi: 1.4 },
    { name: "Flyers", category: "Consumer", roi: 1.3 },
    { name: "In-store Display", category: "Consumer", roi: 1.7 },
    { name: "Coupons", category: "Consumer", roi: 1.9 },
    { name: "Loyalty Programs", category: "Consumer", roi: 1.8 },
    { name: "Promotional Events", category: "Consumer", roi: 1.6 },
  ];

  return baseChannels;
};

const allChannelsForROI = generateChannelsForROI();

// Subchannels flat with mRoi for chart
const allSubchannels = [
  { name: 'Email Campaigns', channel: 'Digital', category: 'HCP-NPP', mRoi: 2.1 },
  { name: 'Speaker Programs', channel: 'Events', category: 'HCP-NPP', mRoi: 1.7 },
  { name: 'Search', channel: 'Search', category: 'CONSUMER', mRoi: 2.3 },
  { name: 'TV Broadcast', channel: 'TV', category: 'CONSUMER', mRoi: 1.9 },
  { name: 'TV Cable', channel: 'TV', category: 'CONSUMER', mRoi: 1.6 },
  { name: 'Conferences', channel: 'Conferences', category: 'HCP-PP', mRoi: 1.4 },
  { name: 'Display', channel: 'Digital', category: 'HCP-NPP', mRoi: 1.8 },
  { name: 'Social', channel: 'Digital', category: 'HCP-NPP', mRoi: 2.0 },
  { name: 'Brand Search', channel: 'Search', category: 'CONSUMER', mRoi: 1.5 },
  { name: 'Workshops', channel: 'Events', category: 'HCP-NPP', mRoi: 1.3 },
  { name: 'Print', channel: 'Others', category: 'CONSUMER', mRoi: 1.1 },
  { name: 'Radio', channel: 'Others', category: 'CONSUMER', mRoi: 1.2 },
];

const tableData = [
  {
    name: 'HCP-PP', spend: '$2,100K', impSales: '$3,780K', roi: '2.1', mRoi: '1.5',
    channels: [
      { name: 'Conferences', spend: '$900K', impSales: '$1,530K', roi: '2.0', mRoi: '1.4', subchannels: [] },
    ],
  },
  {
    name: 'HCP-NPP', spend: '$1,900K', impSales: '$3,200K', roi: '2.5', mRoi: '1.8',
    channels: [
      { name: 'Events',  spend: '$800K', impSales: '$1,520K', roi: '2.3', mRoi: '1.6',
        subchannels: [{ name: 'Speaker Programs', spend: '$400K', impSales: '$800K', roi: '2.4', mRoi: '1.7' }] },
      { name: 'Digital', spend: '$600K', impSales: '$1,320K', roi: '2.6', mRoi: '1.9',
        subchannels: [{ name: 'Email Campaigns',  spend: '$300K', impSales: '$720K', roi: '2.9', mRoi: '2.1' }] },
    ],
  },
  {
    name: 'CONSUMER', spend: '$1,000K', impSales: '$2,300K', roi: '2.7', mRoi: '2.0',
    channels: [
      { name: 'TV',     spend: '$400K', impSales: '$880K', roi: '2.6', mRoi: '1.9', subchannels: [] },
      { name: 'Search', spend: '$300K', impSales: '$750K', roi: '3.0', mRoi: '2.3', subchannels: [] },
    ],
  },
];

// ── Export dropdown ───────────────────────────────────────────────────────────
function ExportDropdown() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-700)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 transition-colors bg-white">
        <Download size={12} className="text-[var(--ink-400)]" />Export
        <svg width="10" height="10" viewBox="0 0 10 10" className="ml-0.5 text-[var(--ink-400)]"><path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] z-20 overflow-hidden">
          <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>Export PNG
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Export CSV
          </button>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]">
            <Download size={12} className="text-[var(--ink-400)]" />Export both
          </button>
        </div>
      )}
    </div>
  );
}

// ── Donut ─────────────────────────────────────────────────────────────────────
function DonutChart() {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; item: typeof pieData[0] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const cx = 110, cy = 110, outerR = 90, innerR = 56;
  const total = pieData.reduce((a, c) => a + c.value, 0);
  let cumAngle = -Math.PI / 2;
  const polarToXY = (a: number, r: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  const slices = pieData.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const start = cumAngle; cumAngle += angle; const end = cumAngle;
    const s = polarToXY(start, outerR), e = polarToXY(end, outerR);
    const is = polarToXY(start, innerR), ie = polarToXY(end, innerR);
    const large = angle > Math.PI ? 1 : 0;
    return { ...d, path: `M ${s.x} ${s.y} A ${outerR} ${outerR} 0 ${large} 1 ${e.x} ${e.y} L ${ie.x} ${ie.y} A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y} Z` };
  });
  return (
    <div className="relative flex-shrink-0">
      <svg ref={svgRef} width="220" height="220" viewBox="0 0 220 220">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="3"
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseMove={(e) => { const r = svgRef.current?.getBoundingClientRect(); if (r) setTooltip({ x: e.clientX - r.left, y: e.clientY - r.top, item: s }); }}
            onMouseLeave={() => setTooltip(null)} />
        ))}
        <circle cx={cx} cy={cy} r={innerR} fill="white" />
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill="#71717A" fontWeight="500" letterSpacing="1">TOTAL</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="22" fill="#18181B" fontWeight="600" fontFamily="Source Serif 4, Georgia, serif">$5.0M</text>
      </svg>
      {tooltip && (
        <div className="absolute z-20 bg-[var(--ink-900)] text-white text-[11px] px-3 py-2 shadow-lg pointer-events-none whitespace-nowrap rounded-md" style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}>
          <div className="font-semibold">{tooltip.item.name}</div>
          <div className="text-white/70 mt-0.5">{tooltip.item.value}% · {tooltip.item.amount}</div>
        </div>
      )}
    </div>
  );
}

// ── Top/Bottom channels bar with Pagination ──────────────────────────────────
function TopChannelsChart() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<"all" | "top10" | "bottom10">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Filter by category
  const categoryFiltered = categoryFilter === "all"
    ? allChannelsForROI
    : allChannelsForROI.filter((ch) => ch.category === categoryFilter);

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
            <option value="Consumer">Consumer</option>
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
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CAT_COLORS[item.category] || '#A1A1AA' }} />
                  <span className="text-[10px] text-[var(--ink-400)]">{item.category}</span>
                </div>
              </div>
              <div className="flex-1 bg-[var(--surface-subtle)] h-5 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${(item.roi / maxRoi) * 100}%`,
                    background: CAT_COLORS[item.category] || '#A1A1AA',
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

// ── MROI Subchannel Chart ─────────────────────────────────────────────────────
// ── MROI Subchannel Chart ─────────────────────────────────────────────────────
function MroiSubchannelChart() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [performanceFilter, setPerformanceFilter] = useState<"all" | "top10" | "bottom10">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [channelSearch, setChannelSearch] = useState("");
  const [channelDropdownOpen, setChannelDropdownOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const channelDropdownRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 5;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (channelDropdownRef.current && !channelDropdownRef.current.contains(e.target as Node)) {
        setChannelDropdownOpen(false);
        setChannelSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Unique channels list from data
  const allChannelNames = Array.from(new Set(allSubchannels.map((s) => s.channel))).sort();

  // Filtered channel suggestions based on search
  const filteredChannelSuggestions = allChannelNames.filter((ch) =>
    ch.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const getCatColor = (name: string) => {
    const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    return CAT_COLORS[name] || CAT_COLORS[normalized] || "#A1A1AA";
  };

  // Apply filters
  const filtered = allSubchannels.filter((s) => {
    const matchCat = categoryFilter === "all" || s.category === categoryFilter;
    const matchChannel = selectedChannel === "all" || s.channel === selectedChannel;
    return matchCat && matchChannel;
  });

  // Sort by mRoi descending
  const sorted = [...filtered].sort((a, b) => b.mRoi - a.mRoi);

  // Apply top/bottom 10%
  let displayList = sorted;
  if (performanceFilter === "top10") {
    const count = Math.max(1, Math.ceil(sorted.length * 0.1));
    displayList = sorted.slice(0, count);
  } else if (performanceFilter === "bottom10") {
    const count = Math.max(1, Math.ceil(sorted.length * 0.1));
    displayList = sorted.slice(-count).reverse();
  }

  const maxMroi = displayList[0]?.mRoi || 1;

  // Pagination
  const totalPages = Math.ceil(displayList.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedList = displayList.slice(startIdx, startIdx + itemsPerPage);

  const resetPage = () => setCurrentPage(1);

  const handleCategoryChange = (val: string) => { setCategoryFilter(val); resetPage(); };
  const handlePerformanceChange = (val: "all" | "top10" | "bottom10") => { setPerformanceFilter(val); resetPage(); };
  const handleChannelSelect = (ch: string) => {
    setSelectedChannel(ch);
    setChannelDropdownOpen(false);
    setChannelSearch("");
    resetPage();
  };

  const selectedChannelLabel = selectedChannel === "all" ? "All Channels" : selectedChannel;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[13px] font-semibold text-[var(--ink-900)]">Subchannels by MROI</span>
        <span className="text-[11px] text-[var(--ink-400)] ml-1">— best places for the next dollar</span>

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
            <option value="CONSUMER">Consumer</option>
          </select>
          <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
        </div>

        {/* Channel filter — searchable dropdown */}
        <div className="relative" ref={channelDropdownRef}>
          <button
            onClick={() => { setChannelDropdownOpen((o) => !o); setChannelSearch(""); }}
            className="flex items-center gap-1.5 text-[11px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1 bg-white hover:border-[var(--ink-400)] transition-colors focus:outline-none"
          >
            <span className={selectedChannel !== "all" ? "text-[var(--ink-900)] font-medium" : ""}>
              {selectedChannelLabel}
            </span>
            <ChevronDown size={10} className={`text-[var(--ink-400)] transition-transform ${channelDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {channelDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] z-30 overflow-hidden">
              {/* Search input */}
              <div className="px-2.5 pt-2.5 pb-1.5 border-b border-[var(--border)]">
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search channels…"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    className="w-full text-[11px] pl-6 pr-2.5 py-1.5 border border-[var(--border-strong)] rounded-md bg-white placeholder:text-[var(--ink-400)] text-[var(--ink-800)] focus:outline-none focus:border-[var(--brand)] transition-colors"
                  />
                </div>
              </div>

              {/* Options list */}
              <div className="max-h-44 overflow-y-auto py-1">
                {!channelSearch && (
                  <button
                    onClick={() => handleChannelSelect("all")}
                    className={`flex items-center justify-between w-full px-3 py-1.5 text-[11.5px] transition-colors ${
                      selectedChannel === "all"
                        ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium"
                        : "text-[var(--ink-700)] hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    All Channels
                    {selectedChannel === "all" && <CheckCircle2 size={11} className="text-[var(--brand)]" />}
                  </button>
                )}
                {filteredChannelSuggestions.length > 0 ? (
                  filteredChannelSuggestions.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => handleChannelSelect(ch)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-[11.5px] transition-colors ${
                        selectedChannel === ch
                          ? "bg-[var(--brand-50)] text-[var(--brand-700)] font-medium"
                          : "text-[var(--ink-700)] hover:bg-[var(--surface-subtle)]"
                      }`}
                    >
                      {ch}
                      {selectedChannel === ch && <CheckCircle2 size={11} className="text-[var(--brand)]" />}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-[11px] text-[var(--ink-400)] text-center">No channels found</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top/Bottom 10% toggle */}
        <div className="flex rounded-md border border-[var(--border)] overflow-hidden">
          {(["all", "top10", "bottom10"] as const).map((val, i) => (
            <button
              key={val}
              onClick={() => handlePerformanceChange(val)}
              className={`px-3 py-1 text-[11px] font-medium transition-colors ${i > 0 ? "border-l border-[var(--border)]" : ""} ${
                performanceFilter === val ? "bg-[var(--ink-900)] text-white" : "bg-white text-[var(--ink-500)] hover:text-[var(--ink-800)]"
              }`}
            >
              {val === "all" ? "All" : val === "top10" ? "Top 10%" : "Bottom 10%"}
            </button>
          ))}
        </div>
      </div>

      {/* Bar list */}
      <div className="space-y-2.5 flex-1 mb-4">
        {paginatedList.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-[var(--ink-400)]">No subchannels match your filters.</div>
        ) : (
          paginatedList.map((item, i) => {
            const globalIndex = startIdx + i + 1;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--ink-400)] w-5 text-right tabular-nums flex-shrink-0">{globalIndex}</span>
                <div className="w-32 flex-shrink-0">
                  <div className="text-[12px] font-medium text-[var(--ink-800)] truncate">{item.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: getCatColor(item.category) }} />
                    <span className="text-[10px] text-[var(--ink-400)] truncate">{item.channel}</span>
                  </div>
                </div>
                <div className="flex-1 bg-[var(--surface-subtle)] h-5 rounded-sm overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{
                      width: `${(item.mRoi / maxMroi) * 100}%`,
                      background: getCatColor(item.category),
                      opacity: performanceFilter === "bottom10" ? 0.6 : 1,
                    }}
                  />
                </div>
                <span className="text-[12px] font-semibold text-[var(--ink-900)] w-8 text-right tabular-nums flex-shrink-0">
                  {item.mRoi.toFixed(1)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--ink-500)]">
            Showing {startIdx + 1}–{Math.min(startIdx + itemsPerPage, displayList.length)} of {displayList.length}
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

      {/* Legend */}
      <div className="flex gap-5 mt-4 pt-3 border-t border-[var(--border)] flex-wrap">
        {Object.entries(CAT_COLORS).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            <span className="text-[10.5px] text-[var(--ink-500)]">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Chevron ───────────────────────────────────────────────────────────────────
const ChevronIcon = ({ open, className = '', style }: { open: boolean; className?: string; style?: React.CSSProperties }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform duration-150 flex-shrink-0 ${open ? 'rotate-90' : ''} ${className}`} style={style} fill="none">
    <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Main ──────────────────────────────────────────────────────────────────────
interface ScenarioOutcomeProps {
  savedScenarios: Scenario[];
  activeScenarioId?: string | null;
}

export default function ScenarioOutcome({ savedScenarios, activeScenarioId }: ScenarioOutcomeProps) {
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [overviewTab, setOverviewTab] = useState<'spend-channels' | 'mroi'>('spend-channels');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedChannels, setExpandedChannels] = useState<Set<string>>(new Set());
  const [exportedContribution, setexportedContribution] = useState<Set<string>>(new Set());
  const activeScenario = savedScenarios.find((s) => s.id === activeScenarioId);

  const getCatColor = (name: string) => {
    const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    return CAT_COLORS[name] || CAT_COLORS[normalized] || '#D4D4D8';
  };

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'roi', dir: 'desc' });

  const handleSort = (col: string) => {
    setSortConfig((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === 'desc' ? 'asc' : 'desc' }
        : { col, dir: 'desc' }
    );
  };

  const sortVal = (row: any, col: string) => {
    if (col === 'spend') return parseFloat(row.spend.replace(/[^0-9.]/g, ''));
    if (col === 'impSales') return parseFloat(row.impSales.replace(/[^0-9.]/g, ''));
    if (col === 'roi') return parseFloat(row.roi);
    if (col === 'mRoi') return parseFloat(row.mRoi);
    return 0;
  };

  const sortRows = <T,>(rows: T[]) =>
    [...rows].sort((a, b) => {
      const v = sortVal(a, sortConfig.col) - sortVal(b, sortConfig.col);
      return sortConfig.dir === 'asc' ? v : -v;
    });

  const toggleCat = (n: string) => { const next = new Set(expandedCats); next.has(n) ? next.delete(n) : next.add(n); setExpandedCats(next); };
  const toggleCh = (k: string) => { const next = new Set(expandedChannels); next.has(k) ? next.delete(k) : next.add(k); setExpandedChannels(next); };

  const handleExpandAll = () => {
    setExpandedCats(new Set(tableData.map((c) => c.name)));
    setExpandedChannels(new Set(tableData.flatMap((cat) => cat.channels.map((ch) => `${cat.name}-${ch.name}`))));
  };
  const handleCollapseAll = () => {
    setExpandedCats(new Set());
    setExpandedChannels(new Set());
  };

  const isAnythingExpanded = expandedCats.size > 0;
  const isSortAsc = (col: string) => sortConfig.col === col && sortConfig.dir === 'asc';
  const isSortActive = (col: string) => sortConfig.col === col;

  const searchLower = search.toLowerCase();
  const filteredData = tableData
    .filter((cat) => categoryFilter === 'all' || cat.name.toUpperCase() === categoryFilter.toUpperCase())
    .map((cat) => {
      let channels = cat.channels
        .filter((ch) => {
          const nameMatch = !search || ch.name.toLowerCase().includes(searchLower) || ch.subchannels?.some((s) => s.name.toLowerCase().includes(searchLower));
          return nameMatch;
        })
        .map((ch) => ({
          ...ch,
          subchannels: ch.subchannels?.filter((s) => !search || s.name.toLowerCase().includes(searchLower) || ch.name.toLowerCase().includes(searchLower)),
        }));
      channels = sortRows(channels);
      channels = channels.map((ch) => ({ ...ch, subchannels: sortRows(ch.subchannels || []) }));
      return { ...cat, channels };
    })
    .filter((cat) => !search || cat.name.toLowerCase().includes(searchLower) || cat.channels.length > 0);

  // Search — expand categories and channels so matches are visible
  useEffect(() => {
    if (search) {
      setExpandedCats(new Set(filteredData.map((c) => c.name)));
      setExpandedChannels(new Set(filteredData.flatMap((cat) => cat.channels.map((ch) => `${cat.name}-${ch.name}`))));
    }
  }, [search, categoryFilter]);

  // Sort — only expand categories, channels stay collapsed (progressive disclosure)
  useEffect(() => {
    setExpandedCats(new Set(tableData.map((c) => c.name)));
    setExpandedChannels(new Set()); // keep channels collapsed
  }, [sortConfig]);

  const hasActiveFilters = search || categoryFilter !== 'all';

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Scenario Projections"
        title={activeScenario?.name || 'Q1 2025 Optimization'}
        description="Optimized allocation, projected impact, and channel-level breakdown."
      />

      <div className="space-y-5">
        {/* KPIs — now 6 including MROI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.2fr_1fr_1fr_1.15fr_1fr_1fr] gap-3">
          {kpis.map((k, i) => (
            <KpiCard key={i} label={k.label} value={k.value} sub={k.sub} />
          ))}
        </div>

        {/* Channel Performance Overview */}
        <Card>
          <button
            className="w-full flex justify-between items-center px-6 py-4 select-none hover:bg-[var(--surface-muted)] transition-colors border-b border-transparent"
            onClick={() => setOverviewOpen(!overviewOpen)}
          >
            <div className="flex items-center gap-3">
              <h3 className="text-[14px] font-semibold text-[var(--ink-900)]">Channel performance overview</h3>
              <ChevronDown size={14} className={`text-[var(--ink-400)] transition-transform ${overviewOpen ? 'rotate-180' : ''}`} />
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <TabPills
                value={overviewTab}
                onChange={setOverviewTab}
                options={[
                  { value: 'spend-channels', label: 'Spend & Channels' },
                  { value: 'mroi', label: 'Subchannel MROI' },
                ]}
              />
              <ExportDropdown />
            </div>
          </button>

          {overviewOpen && overviewTab === 'spend-channels' && (
            <div className="border-t border-[var(--border)] grid grid-cols-1 lg:grid-cols-2 divide-x divide-[var(--border)] ui-fade-in">
              <div className="px-7 py-7">
                <div className="ui-eyebrow text-[var(--ink-500)] mb-5">Optimized spend by category</div>
                <div className="flex items-center gap-8">
                  <DonutChart />
                  <div className="flex-1 space-y-4 min-w-0">
                    {pieData.map((cat, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-[12.5px] font-medium text-[var(--ink-800)]">{cat.name}</span>
                            <span className="text-[12px] text-[var(--ink-500)] tabular-nums">{cat.value}% · {cat.amount}</span>
                          </div>
                          <div className="w-full bg-[var(--surface-subtle)] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.value}%`, background: cat.color }} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-[10px] text-[var(--ink-400)] pt-1">Hover slices for details</div>
                  </div>
                </div>
              </div>
              <div className="px-7 py-7">
                <TopChannelsChart />
              </div>
            </div>
          )}

          {overviewOpen && overviewTab === 'mroi' && (
            <div className="border-t border-[var(--border)] px-7 py-7 ui-fade-in">
              <div className="text-[11.5px] text-[var(--ink-500)] mb-5">
                Marginal ROI shows the return on the next dollar spent — helps identify where additional investment would be most efficient.
              </div>
              <MroiSubchannelChart />
            </div>
          )}
        </Card>

        {/* Channel contribution detail */}
        <Card>
          <CardHeader
            title="Channel contribution detail"
            subtitle="Projected values based on optimized allocation"
            actions={
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" leftIcon={<Download size={12} />}
                  onClick={() => setexportedContribution((prev) => new Set(prev).add('contribution'))}>
                  Export
                </Button>
                {exportedContribution.has('contribution') && (
                  <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>
                )}
              </div>
            }
          />

          <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px] max-w-[240px]">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-400)]" />
              <input type="text" placeholder="Search channels..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full text-[12px] pl-7 pr-3 py-1.5 border border-[var(--border-strong)] rounded-md bg-white placeholder:text-[var(--ink-400)] text-[var(--ink-800)] focus:outline-none focus:border-[var(--brand)] transition-colors" />
            </div>
            <div className="relative">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-[12px] text-[var(--ink-700)] border border-[var(--border-strong)] rounded-md px-2.5 py-1.5 bg-white hover:border-[var(--ink-400)] transition-colors cursor-pointer focus:outline-none appearance-none pr-7">
                <option value="all">All Categories</option>
                {tableData.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--ink-400)] pointer-events-none" />
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={handleExpandAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">
                <ChevronsUpDown size={11} />Expand all
              </button>
              <button onClick={handleCollapseAll} className="flex items-center gap-1 text-[11px] font-medium text-[var(--ink-600)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 bg-white transition-colors">
                Collapse all
              </button>
            </div>
          </div>

          <div className="overflow-x-auto" style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <div style={{ minWidth: '700px' }}>
          <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-3 bg-[var(--ink-900)]">
            <div className="text-[10.5px] font-semibold text-white/60 uppercase tracking-[0.12em]">Channel hierarchy</div>
            {(['spend', 'impSales', 'roi', 'mRoi'] as const).map((col, i) => {
              const label = ['Spend', 'Impactable sales', 'ROI', 'Marginal ROI'][i];
              return (
                <button key={col} onClick={() => isAnythingExpanded && handleSort(col)}
                  className={`flex items-center justify-end gap-1 w-full transition-all ${isAnythingExpanded ? 'cursor-pointer hover:text-white' : 'cursor-default opacity-60'}`}>
                  <span className={`text-[10.5px] font-semibold uppercase tracking-[0.12em] ${isSortActive(col) ? 'text-white' : 'text-white/60'}`}>{label}</span>
                  {isAnythingExpanded && (
                    isSortAsc(col)
                      ? <ArrowUpNarrowWide size={12} className="text-white flex-shrink-0" />
                      : isSortActive(col)
                      ? <ArrowDownWideNarrow size={12} className="text-white flex-shrink-0" />
                      : <ArrowUpDown size={12} className="text-white/25 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            {filteredData.length === 0 ? (
              <div className="px-6 py-10 text-center text-[13px] text-[var(--ink-400)]">
                No channels match your filters.{' '}
                <button onClick={() => { setSearch(''); setCategoryFilter('all'); }} className="text-[var(--brand)] hover:underline font-medium">Clear filters</button>
              </div>
            ) : filteredData.map((cat, ci) => {
              const catOpen = expandedCats.has(cat.name);
              const catColor = getCatColor(cat.name);
              return (
                <div key={ci} className="border-b-2 border-[var(--surface-subtle)] last:border-0">
                  <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-3.5 bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] cursor-pointer border-b border-[var(--border)]" onClick={() => toggleCat(cat.name)}>
                    <div className="flex items-center gap-2">
                      <ChevronIcon open={catOpen} style={{ color: catColor }} />
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: catColor }} />
                      <span className="text-[13px] font-bold text-[var(--ink-900)] uppercase tracking-wide">{cat.name}</span>
                      {catOpen && (
                        <button className="ml-2 text-[10px] text-[var(--ink-400)] hover:text-[var(--brand)] underline underline-offset-2 font-medium transition-colors"
                          onClick={(e) => { e.stopPropagation(); setExpandedChannels((prev) => new Set([...prev, ...cat.channels.map((ch) => `${cat.name}-${ch.name}`)])); }}>
                          expand all channels
                        </button>
                      )}
                    </div>
                    <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{cat.spend}</div>
                    <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{cat.impSales}</div>
                    <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{cat.roi}</div>
                    <div className="text-right text-[13px] font-bold tabular-nums text-[var(--ink-900)]">{cat.mRoi}</div>
                  </div>

                  {catOpen && cat.channels.map((ch, chi) => {
                    const key = `${cat.name}-${ch.name}`;
                    const chOpen = expandedChannels.has(key);
                    const hasSubs = ch.subchannels.length > 0;
                    return (
                      <div key={chi} className="border-b border-[var(--border)] last:border-0">
                        <div className={`grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-3 bg-white ${hasSubs ? 'cursor-pointer hover:bg-[var(--surface-muted)]' : ''}`}
                          onClick={() => hasSubs && toggleCh(key)}>
                          <div className="flex items-center gap-3 pl-6">
                            {hasSubs ? <ChevronIcon open={chOpen} style={{ color: catColor }} /> : <span className="w-[10px] flex-shrink-0" />}
                            <span className="text-[13px] font-medium text-[var(--ink-700)]">{ch.name}</span>
                          </div>
                          <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{ch.spend}</div>
                          <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{ch.impSales}</div>
                          <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-700)] font-medium">{ch.roi}</div>
                          <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{ch.mRoi}</div>
                        </div>
                        {chOpen && hasSubs && ch.subchannels.map((sub, si) => (
                          <div key={si} className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr] px-6 py-2.5 bg-[var(--surface-muted)] border-t border-[var(--border)]">
                            <div className="flex items-center pl-14">
                              <span className="w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0" style={{ background: catColor }} />
                              <span className="text-[12.5px] text-[var(--ink-500)]">{sub.name}</span>
                            </div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-400)]">{sub.spend}</div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-400)]">{sub.impSales}</div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-500)]">{sub.roi}</div>
                            <div className="text-right text-[12.5px] tabular-nums text-[var(--ink-400)]">{sub.mRoi}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          </div>
          </div>

          <div className="px-5 py-3 text-[11px] text-[var(--ink-400)] border-t border-[var(--border)] bg-[var(--surface-muted)]">
            {hasActiveFilters
              ? <span>Showing filtered results · <button onClick={() => { setSearch(''); setCategoryFilter('all'); }} className="text-[var(--brand)] hover:underline font-medium">Clear all filters</button></span>
              : 'Projected values based on optimized allocation'}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}