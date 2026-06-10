/**
 * categories.ts
 *
 * Stable color assignment and value-formatting utilities for MMM categories.
 * Used by chart components and the Model Summary page.
 *
 * getCategoryColor guarantees the same hex for the same category name across
 * all renders: known categories use a fixed palette; unknown categories are
 * assigned from FALLBACK_PALETTE on first encounter at module load time.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

/** Fixed hex colors for the three primary MMM categories. */
const KNOWN: Record<string, string> = {
  'HCP-PP':   '#00857C',
  'HCP-NPP':  '#3F3F46',
  'Consumer': '#A1A1AA',
};

/** Fallback palette assigned to unknown categories in first-encounter order. */
const FALLBACK = ['#0EA5E9', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#F97316'];

/** Module-level map so assignments survive re-renders without React state. */
const _extra = new Map<string, string>();

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Returns a stable hex color for a category name.
 * Known categories use a fixed palette; unknown categories are assigned
 * from FALLBACK in first-encounter order and remembered for the session.
 *
 * @param {string} category - Category name, e.g. "HCP-PP", "Consumer".
 * @returns {string} Hex color string.
 */
export function getCategoryColor(category: string): string {
  if (KNOWN[category]) return KNOWN[category];
  if (_extra.has(category)) return _extra.get(category)!;
  const color = FALLBACK[_extra.size % FALLBACK.length];
  _extra.set(category, color);
  return color;
}

/**
 * Compact dollar format for KPI cards and chart axes.
 * $1,500,000 → "$1.5M", $450,000 → "$450K", $300 → "$300".
 *
 * @param {number} v - Raw dollar value.
 * @returns {string} Compact formatted string.
 */
export function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

/**
 * Exact dollar format with comma separation — intended for tooltips where
 * full precision matters. 1234567 → "$1,234,567".
 *
 * @param {number} v - Raw dollar value.
 * @returns {string} Exact formatted string.
 */
export function fmtExact(v: number): string {
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

/**
 * ROI display format. Two decimals for typical values; five decimals for
 * sub-0.01 magnitudes so tiny coefficients (common when sales units dwarf
 * spend) don't collapse to "0.00".
 *
 * @param {number} v - ROI value (impactable sales / spend, or coefficient).
 * @returns {string} Formatted ROI string.
 */
export function fmtROI(v: number): string {
  return v !== 0 && Math.abs(v) < 0.01 ? v.toFixed(5) : v.toFixed(2);
}
