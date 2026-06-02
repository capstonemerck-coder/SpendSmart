import { Trash2 } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, CardHeader, Button, Select,
} from '@/components/shared';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { SkeletonTable } from '@/components/shared/feedback/SkeletonTable';
import { UploadStatusBadge } from '@/components/shared/data/UploadStatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useUploadCycles } from '@/hooks/useUploadCycles';
import { useUploadHistory } from '@/hooks/useUploadHistory';

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'success', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

/**
 * DataHistory
 *
 * Displays the paginated history of all file uploads across all cycles.
 * Supports filtering by cycle and status.
 * Admins can delete upload records from this page.
 *
 * States: loading (SkeletonTable), empty (EmptyState), error (ErrorState), data.
 */
export default function DataHistory() {
  const { isAdmin } = useAuth();
  const { cycles } = useUploadCycles();
  const {
    uploadRecords, isLoading, error,
    currentPage, totalPages, total,
    selectedCycleId, selectedStatus,
    setSelectedCycleId, setSelectedStatus, setPage,
    refetchHistory, deleteRecord, isDeleting,
  } = useUploadHistory();

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Data History"
        title="Upload history"
        description="Review all channel parameter uploads across planning cycles."
      />

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select
          value={selectedCycleId ?? ''}
          onChange={(e) => setSelectedCycleId(e.target.value || null)}
          className="!h-9 !text-[12.5px] min-w-[160px]"
        >
          <option value="">All cycles</option>
          {cycles.map((c) => (
            <option key={c.cycle_id} value={c.cycle_id}>{c.cycle_id}</option>
          ))}
        </Select>

        <Select
          value={selectedStatus ?? ''}
          onChange={(e) => setSelectedStatus(e.target.value || null)}
          className="!h-9 !text-[12.5px] min-w-[140px]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>

        {(selectedCycleId || selectedStatus) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedCycleId(null); setSelectedStatus(null); }}
          >
            Clear filters
          </Button>
        )}

        <span className="ml-auto text-[12px] text-[var(--ink-500)]">
          {!isLoading && `${total} record${total !== 1 ? 's' : ''}`}
        </span>
      </div>

      <Card>
        <CardHeader
          title="Upload records"
          subtitle={isLoading ? 'Loading…' : `${total} total`}
        />

        {error && (
          <div className="p-6">
            <ErrorState message={error} onRetry={refetchHistory} />
          </div>
        )}

        {isLoading && !error && <SkeletonTable rows={8} columns={7} />}

        {!isLoading && !error && uploadRecords.length === 0 && (
          <EmptyState
            title="No uploads yet"
            message="Upload a channel parameter file on the Data Input page to get started."
          />
        )}

        {!isLoading && !error && uploadRecords.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
                <tr>
                  {['Filename', 'Cycle', 'Uploaded By', 'Rows', 'Size', 'Status', 'Date', ...(isAdmin ? [''] : [])].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left ui-eyebrow text-[var(--ink-500)] font-semibold whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadRecords.map((record) => (
                  <tr
                    key={record.upload_id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)] transition-colors"
                  >
                    <td className="px-4 py-3 text-[var(--ink-900)] font-medium max-w-[200px] truncate">
                      {record.filename ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-700)] whitespace-nowrap">
                      {record.cycle_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-700)]">
                      {record.uploader_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-700)] tabular-nums">
                      {record.row_count != null ? record.row_count.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-500)] tabular-nums">
                      {formatSize(record.file_size_bytes)}
                    </td>
                    <td className="px-4 py-3">
                      <UploadStatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--ink-500)] whitespace-nowrap tabular-nums">
                      {formatDate(record.uploaded_at)}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<Trash2 size={12} />}
                          disabled={isDeleting}
                          onClick={() => deleteRecord(record.upload_id)}
                          title="Delete upload record"
                        >
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] rounded-b-[12px] flex items-center justify-between">
            <p className="text-[12px] text-[var(--ink-500)]">
              Page <span className="font-semibold text-[var(--ink-700)]">{currentPage}</span>{' '}
              of <span className="font-semibold text-[var(--ink-700)]">{totalPages}</span>
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
