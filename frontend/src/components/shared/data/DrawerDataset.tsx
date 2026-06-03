/**
 * DrawerDataset.tsx
 *
 * Standalone expandable table component for displaying dataset rows.
 * Features: column tooltips, CSV export, pagination, responsive layout.
 * Used by DataInput and DataHistory modules.
 */
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Info } from 'lucide-react';
import { exportToCSV } from '@/utils/export';

export interface DrawerDatasetColumn {
  key: string;
  header: string;
  tooltip?: string; // Hover text for the column header
  width?: string; // Tailwind width class (e.g., "w-24", "w-32")
}

export interface DrawerDatasetProps {
  title: string;
  columns: DrawerDatasetColumn[];
  rows: Array<Record<string, any>>;
  pageSize?: number;
  onExport?: (filename: string) => void; // Optional custom export handler
}

/**
 * DrawerDataset
 *
 * Renders a paginated, expandable table with column tooltips and CSV export.
 * All styling follows CLAUDE.md UI design system.
 *
 * @param {DrawerDatasetProps} props
 */
export const DrawerDataset: React.FC<DrawerDatasetProps> = ({
  title,
  columns,
  rows,
  pageSize = 10,
  onExport,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const totalPages = useMemo(
    () => Math.ceil(rows.length / pageSize),
    [rows.length, pageSize],
  );

  const paginatedRows = useMemo(
    () => {
      const start = (currentPage - 1) * pageSize;
      return rows.slice(start, start + pageSize);
    },
    [rows, currentPage, pageSize],
  );

  const toggleRowExpand = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const handleExport = () => {
    const filename = `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}`;
    if (onExport) {
      onExport(filename);
    } else {
      exportToCSV(rows, filename);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with title and export button */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[16px] text-[var(--ink-900)]">{title}</h3>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[var(--brand-50)] hover:bg-[var(--brand-100)] text-[var(--brand)] text-[13px] font-medium transition-colors"
          title="Download as CSV"
        >
          <Download size={14} />
          <span>Export</span>
        </button>
      </div>

      {/* Table wrapper */}
      <div className="border border-[var(--border)] rounded-[12px] overflow-hidden">
        <table className="w-full text-[13px]">
          {/* Header row */}
          <thead>
            <tr className="bg-[var(--surface-subtle)] sticky top-0 border-b border-[var(--border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-left font-semibold text-[var(--ink-500)] whitespace-nowrap relative group ${col.width || 'w-auto'}`}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.tooltip && (
                      <Info
                        size={11}
                        className="text-[var(--ink-400)] opacity-0 group-hover:opacity-100 transition-opacity cursor-help"
                      />
                    )}
                  </div>
                  {col.tooltip && (
                    <div className="absolute left-0 top-full mt-1 bg-[var(--ink-900)] text-white text-[10px] px-2.5 py-1.5 rounded-md shadow-xl z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap max-w-[200px] leading-relaxed">
                      {col.tooltip}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body rows */}
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-[var(--ink-500)]"
                >
                  No data available
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => {
                const globalIdx = (currentPage - 1) * pageSize + idx;
                const isExpanded = expandedRows.has(globalIdx);

                return (
                  <React.Fragment key={globalIdx}>
                    <tr
                      className={`border-b border-[var(--border)] hover:bg-[var(--surface-muted)] cursor-pointer transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-[var(--surface-muted)]'
                      }`}
                      onClick={() => toggleRowExpand(globalIdx)}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-2.5 text-[var(--ink-700)] truncate ${col.width || 'w-auto'}`}
                        >
                          {col.key === 'expand' ? (
                            isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )
                          ) : (
                            row[col.key]
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Expanded row details (if needed for future use) */}
                    {isExpanded && (
                      <tr className="bg-[var(--surface-muted)] border-b border-[var(--border)]">
                        <td colSpan={columns.length} className="px-4 py-3">
                          <div className="text-[12px] text-[var(--ink-600)]">
                            {/* Additional details can be rendered here */}
                            <pre className="whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                              {JSON.stringify(row, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-[var(--ink-500)]">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md border border-[var(--border)] hover:bg-[var(--surface-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
