/**
 * ExportDropdown.tsx
 *
 * Compact dropdown button exposing "Export CSV" and "Export PNG" actions.
 * Shows a green "Exported" badge alongside the button when isExported is true.
 * Used per-chart in the Channel performance overview card on Model Summary.
 */
import { useState } from 'react';
import { Download } from 'lucide-react';
import { Badge } from '@/components/shared';
import { CheckCircle2 } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExportDropdownProps {
  /** Called when user selects Export CSV. */
  onCSV: () => void;
  /** Called when user selects Export PNG. */
  onPNG: () => void;
  /** When true, shows the green "Exported" badge next to the button. */
  isExported?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * ExportDropdown
 *
 * A small "Export" button that opens a two-item dropdown (CSV / PNG).
 * Closes on blur with a 150 ms delay so click handlers fire before close.
 *
 * @param {ExportDropdownProps} props
 */
export function ExportDropdown({ onCSV, onPNG, isExported = false }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const btnClass = 'flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-700)] hover:text-[var(--ink-900)] border border-[var(--border-strong)] hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 transition-colors bg-white';

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button className={btnClass} onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}>
          <Download size={12} className="text-[var(--ink-400)]" />
          Export
          <svg width="10" height="10" viewBox="0 0 10 10" className="ml-0.5 text-[var(--ink-400)]">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[var(--border)] rounded-lg shadow-lg z-20 overflow-hidden">
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors" onClick={() => { onCSV(); setOpen(false); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              Export CSV
            </button>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-[var(--ink-700)] hover:bg-[var(--surface-subtle)] transition-colors border-t border-[var(--border)]" onClick={() => { onPNG(); setOpen(false); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--ink-400)]"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              Export PNG
            </button>
          </div>
        )}
      </div>
      {isExported && <Badge tone="success" icon={<CheckCircle2 size={11} />}>Exported</Badge>}
    </div>
  );
}
