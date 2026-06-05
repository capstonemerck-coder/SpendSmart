/**
 * ExportButtons
 *
 * Compact export action component for tables and charts.
 * Renders a single CSV button when showPNG is false (default),
 * or a dropdown with PNG / CSV / both options when showPNG is true.
 * Used on the Data History trends and dataset table sections.
 *
 * @param {ExportButtonsProps} props
 */
import { useState } from 'react';
import { Download, FileSpreadsheet, Image, ChevronDown } from 'lucide-react';

interface ExportButtonsProps {
  /** When true, renders a dropdown exposing PNG, CSV, and both options. */
  showPNG?: boolean;
  onExportCSV?: () => void;
  onExportPNG?: () => void;
}

const BTN_BASE =
  'flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-700)] ' +
  'hover:text-[var(--ink-900)] border border-[var(--border-strong)] ' +
  'hover:border-[var(--ink-400)] rounded-md px-2.5 py-1.5 transition-colors bg-white';

/**
 * ExportButtons
 *
 * Single-button variant: renders a Download icon + "Export" label that calls onExportCSV.
 * Dropdown variant (showPNG=true): opens a menu with three export options.
 *
 * @param {ExportButtonsProps} props
 */
export function ExportButtons({ showPNG = false, onExportCSV, onExportPNG }: ExportButtonsProps) {
  const [open, setOpen] = useState(false);

  if (!showPNG) {
    return (
      <button className={BTN_BASE} onClick={onExportCSV} type="button">
        <Download size={12} />
        Export
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        className={`${BTN_BASE} gap-1`}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        type="button"
      >
        <Download size={12} />
        Export
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[var(--border)] rounded-lg shadow-[var(--shadow-md)] z-20 overflow-hidden">
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-[var(--ink-700)] hover:bg-[var(--surface-muted)] transition-colors"
            onClick={() => { onExportPNG?.(); setOpen(false); }}
            type="button"
          >
            <Image size={12} className="text-[var(--ink-400)]" />
            Export PNG
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-[var(--ink-700)] hover:bg-[var(--surface-muted)] transition-colors"
            onClick={() => { onExportCSV?.(); setOpen(false); }}
            type="button"
          >
            <FileSpreadsheet size={12} className="text-[var(--ink-400)]" />
            Export CSV
          </button>
          <button
            className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-[var(--ink-700)] hover:bg-[var(--surface-muted)] transition-colors"
            onClick={() => { onExportPNG?.(); onExportCSV?.(); setOpen(false); }}
            type="button"
          >
            <Download size={12} className="text-[var(--ink-400)]" />
            Export both
          </button>
        </div>
      )}
    </div>
  );
}
