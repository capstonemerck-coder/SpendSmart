/**
 * UploadHistoryModal.tsx
 *
 * Modal overlay showing the current user's full upload history.
 * Self-contained: fetches its own data on mount via uploadService.fetchUploadHistory().
 * Supports manual refresh and CSV export.
 * Used by the Data Input module footer "View upload history" link.
 */
import React, { useEffect, useState } from 'react';
import { X, Clock, Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/shared';
import { uploadService } from '@/services/upload.service';
import { exportToCSV } from '@/utils/export';
import type { UploadHistoryRow } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadHistoryModalProps {
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * UploadHistoryModal
 *
 * Full-screen modal with a scrollable upload history table. Fetches data on
 * mount and exposes a refresh button and CSV export. Status cells use inline
 * colour + icon status indicators.
 *
 * @param {UploadHistoryModalProps} props
 */
export function UploadHistoryModal({ onClose }: UploadHistoryModalProps) {
  const [history, setHistory] = useState<UploadHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  /** Fetches upload history from the API and updates local state. */
  const loadHistory = async () => {
    setLoading(true);
    try { setHistory(await uploadService.fetchUploadHistory()); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadHistory(); }, []);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--ink-500)]" />
            <h3 className="text-[15px] font-semibold text-[var(--ink-900)]">Upload History</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportToCSV(history.map((h) => ({ ...h })), 'upload_history')}
              className="flex items-center gap-1.5 text-[11px] border border-[var(--border)] rounded-md px-2.5 py-1.5 hover:bg-[var(--surface-subtle)] text-[var(--ink-700)]"
            >
              <Download size={11} />Export CSV
            </button>
            <button onClick={loadHistory} className="p-1.5 rounded-md hover:bg-[var(--surface-subtle)]">
              <RefreshCw size={14} className={`text-[var(--ink-500)] ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-700)] p-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-[13px] text-[var(--ink-400)]">
              <div className="w-5 h-5 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
              Loading…
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-[13px] text-[var(--ink-400)]">No uploads yet.</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-subtle)] sticky top-0">
                <tr>
                  {['ID', 'File', 'Type', 'Cycle', 'Rows', 'Status', 'Uploaded at'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left ui-eyebrow text-[var(--ink-500)] font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.upload_id} className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)]">
                    <td className="px-4 py-2.5 font-mono text-[var(--ink-500)]">{row.upload_id}</td>
                    <td className="px-4 py-2.5 text-[var(--ink-900)] max-w-[180px] truncate" title={row.filename || ''}>{row.filename || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={row.is_datafile ? 'brand' : 'neutral'} className="!text-[10px]">
                        {row.is_datafile ? 'DATA_FACT' : 'MODEL_FACT'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-[var(--ink-700)]">{row.cycle_id || '—'}</td>
                    <td className="px-4 py-2.5 tabular-nums text-[var(--ink-700)]">{row.row_count?.toLocaleString() || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`flex items-center gap-1 text-[11.5px] font-medium ${row.status === 'success' ? 'text-green-700' : row.status === 'failed' ? 'text-red-600' : 'text-amber-700'}`}>
                        {row.status === 'success' ? <CheckCircle size={12} /> : row.status === 'failed' ? <XCircle size={12} /> : <Clock size={12} />}
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--ink-500)] tabular-nums">
                      {new Date(row.uploaded_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
