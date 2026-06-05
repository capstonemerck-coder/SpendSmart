/**
 * EmptyDatasetModal.tsx
 *
 * Warning modal shown when an uploaded file contains no usable data rows.
 * Non-blocking: the user can dismiss or navigate to the template drawer
 * for formatting guidance. Used by the Data Input module.
 */
import React from 'react';
import { AlertTriangle, BookOpen } from 'lucide-react';
import { Button } from '@/components/shared';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EmptyDatasetModalProps {
  onDismiss: () => void;
  onViewTemplate: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * EmptyDatasetModal
 *
 * Centred overlay with an amber warning icon, a description, and two actions:
 * dismiss (closes the modal) or view template (opens the template drawer).
 *
 * @param {EmptyDatasetModalProps} props
 */
export function EmptyDatasetModal({ onDismiss, onViewTemplate }: EmptyDatasetModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-6 border-b border-[var(--border)]">
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <h3 className="text-[17px] font-semibold text-[var(--ink-900)] mb-2">Empty Dataset Detected</h3>
            <p className="text-[13px] text-[var(--ink-600)] leading-relaxed">
              The uploaded file does not contain any usable data rows. Please upload a valid dataset.
            </p>
          </div>
        </div>
        <div className="px-6 py-4 bg-[var(--surface-subtle)] flex justify-center gap-2 rounded-b-2xl">
          <Button variant="secondary" onClick={onDismiss}>Dismiss</Button>
          <Button variant="primary" leftIcon={<BookOpen size={14} />} onClick={onViewTemplate}>
            Refer Dataset Structure
          </Button>
        </div>
      </div>
    </div>
  );
}
