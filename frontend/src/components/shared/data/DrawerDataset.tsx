/**
 * DrawerDataset.tsx
 *
 * Expandable dataset schema preview used inside the template drawer.
 * Renders a collapsible header with a download button, and when expanded,
 * a mini table with sample rows and column header tooltips.
 * Used by TemplateDrawer to show DATA_FACT and MODEL_FACT column structures.
 */
import React from 'react';
import { FileSpreadsheet, Download, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { Button } from '@/components/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DrawerDatasetProps {
  title: string;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  onDownload: () => void;
  columns: string[];
  tooltips: Record<string, string>;
  sampleRows: Record<string, string>[];
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * DrawerDataset
 *
 * Collapsible schema preview card. The header shows the dataset title and a
 * download button. When expanded, renders a scrollable table with column
 * tooltips and alternating sample rows.
 *
 * @param {DrawerDatasetProps} props
 */
export function DrawerDataset({
  title, color, expanded, onToggle, onDownload, columns, tooltips, sampleRows,
}: DrawerDatasetProps) {
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full px-5 py-3.5 bg-gradient-to-r from-[var(--surface-muted)] to-white hover:from-[var(--surface-subtle)] flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color }}>
            <FileSpreadsheet size={16} className="text-white" />
          </div>
          <span className="text-[14px] font-semibold text-[var(--ink-900)]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Download size={12} />}
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="!py-1.5 !px-3 !text-[11px]"
          >
            Download
          </Button>
          {expanded
            ? <ChevronUp size={18} className="text-[var(--ink-500)]" />
            : <ChevronDown size={18} className="text-[var(--ink-500)]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-white overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-[var(--surface-muted)] sticky top-0">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left font-semibold text-[var(--ink-700)] border-b border-[var(--border)] whitespace-nowrap relative group"
                  >
                    <div className="flex items-center gap-1">
                      {col}
                      {tooltips[col] && (
                        <Info size={11} className="text-[var(--ink-400)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      )}
                    </div>
                    {tooltips[col] && (
                      <div className="absolute left-0 top-full mt-1 bg-[var(--ink-900)] text-white text-[10px] px-2.5 py-1.5 rounded-md shadow-xl z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-[200px] leading-relaxed">
                        {tooltips[col]}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={`${idx % 2 === 0 ? 'bg-white' : 'bg-[var(--surface-muted)]'} hover:bg-[var(--brand-50)] transition-colors`}
                >
                  {columns.map((col) => (
                    <td key={col} className="px-3 py-2.5 text-[var(--ink-700)] border-b border-[var(--border)] whitespace-nowrap">
                      {row[col] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
