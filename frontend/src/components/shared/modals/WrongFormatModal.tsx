/**
 * WrongFormatModal.tsx
 *
 * Modal shown when an uploaded file fails column structure validation.
 * Displays structured error messages and a side-by-side column comparison
 * (uploaded vs expected). Provides links to the template drawer and try-again.
 * Used by the Data Input module.
 */
import React from 'react';
import { AlertTriangle, X, BookOpen } from 'lucide-react';
import { Button } from '@/components/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WrongFormatModalProps {
  validationErrors: string[];
  uploadedColumns: string[];
  expectedColumns: string[];
  onClose: () => void;
  onViewTemplate: () => void;
  onTryAgain: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * WrongFormatModal
 *
 * Error overlay for format validation failures. Renders:
 * - A list of structured validation error messages.
 * - A side-by-side column comparison (uploaded vs expected) when columns are known.
 * - "Compare with Template" navigates to the template drawer.
 * - "Try Again" dismisses and resets the dropzone.
 *
 * @param {WrongFormatModalProps} props
 */
export function WrongFormatModal({
  validationErrors, uploadedColumns, expectedColumns, onClose, onViewTemplate, onTryAgain,
}: WrongFormatModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={22} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-[17px] font-semibold text-[var(--ink-900)] mb-1">Wrong Input Data Format</h3>
              <p className="text-[12.5px] text-[var(--ink-600)]">The following issues were detected in your upload</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Error list */}
          <div className="space-y-2">
            {validationErrors.map((err, i) => (
              <div key={i} className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <X size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
                <span className="text-[13px] text-red-900 font-medium">{err}</span>
              </div>
            ))}
          </div>

          {/* Column comparison */}
          {(uploadedColumns.length > 0 || expectedColumns.length > 0) && (
            <div className="border border-[var(--border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[var(--surface-muted)] border-b border-[var(--border)]">
                <h4 className="text-[13px] font-semibold text-[var(--ink-900)]">Column Structure Comparison</h4>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                <div className="px-4 py-3">
                  <div className="text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2">
                    Uploaded Columns ({uploadedColumns.length})
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {uploadedColumns.length === 0 ? (
                      <div className="text-[12px] text-[var(--ink-400)] italic">Could not parse columns</div>
                    ) : uploadedColumns.map((col, i) => {
                      const isMismatch = !expectedColumns.includes(col);
                      return (
                        <div key={i} className={`text-[12px] px-2 py-1 rounded flex items-center gap-1 ${isMismatch ? 'bg-red-50 text-red-700 font-medium' : 'text-[var(--ink-700)]'}`}>
                          {isMismatch && <X size={11} className="flex-shrink-0" />}
                          <code>{col}</code>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2">
                    Expected Columns ({expectedColumns.length})
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {expectedColumns.map((col, i) => {
                      const isMissing = uploadedColumns.length > 0 && !uploadedColumns.includes(col);
                      return (
                        <div key={i} className={`text-[12px] px-2 py-1 rounded flex items-center gap-1 ${isMissing ? 'bg-red-50 text-red-700 font-medium' : 'text-[var(--ink-700)]'}`}>
                          {isMissing && <AlertTriangle size={11} className="flex-shrink-0" />}
                          <code>{col}</code>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex justify-end gap-2 rounded-b-2xl">
          <Button variant="secondary" leftIcon={<BookOpen size={14} />} onClick={onViewTemplate}>
            Compare with Template
          </Button>
          <Button variant="primary" onClick={onTryAgain}>Try Again</Button>
        </div>
      </div>
    </div>
  );
}
