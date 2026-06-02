import { useRef, useState } from 'react';
import { Upload, X, CheckCircle2, FileSpreadsheet, Plus } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, Button, Field, Select,
} from '@/components/shared';
import { EmptyState } from '@/components/shared/feedback/EmptyState';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { UploadPreviewTable } from '@/components/shared/data/UploadPreviewTable';
import { CycleCreateModal } from '@/components/shared/modals/CycleCreateModal';
import { useAuth } from '@/hooks/useAuth';
import { useUploadCycles } from '@/hooks/useUploadCycles';
import { useUploadActions } from '@/hooks/useUploadActions';
import { useCycleCreate } from '@/hooks/useCycleCreate';

/**
 * DataInput
 *
 * Entry point for uploading channel and subchannel MMM parameter files.
 * Supports a two-step flow: parse (preview) → confirm (commit).
 *
 * Role access:
 *   Admin / Data Scientist — full upload access
 *   Brand Intelligence Analyst — read-only informational banner
 *   Other authenticated — read-only banner
 *
 * States: loading cycles, empty (no cycles), error (fetch/parse/commit), success.
 */
export default function DataInput() {
  const { currentUser } = useAuth();
  const { cycles, isLoading: cyclesLoading, error: cyclesError, refetchCycles } = useUploadCycles();
  const {
    previewData, committedRecord, isParsing, isCommitting,
    parseError, commitError, parseFile, confirmUpload, resetUpload,
  } = useUploadActions();
  const { isCreating, createError, createCycleAction, clearCreateError } = useCycleCreate();

  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileTypeError, setFileTypeError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUpload = currentUser?.role === 'admin' || currentUser?.role === 'data scientist';
  const isReadOnly = !canUpload;

  const handleFileChange = (f: File | null) => {
    setFileTypeError(null);
    if (f && !/\.(csv|xlsx)$/i.test(f.name)) {
      setFileTypeError('Only CSV and XLSX files are supported.');
      return;
    }
    setFile(f);
    // Reset any prior parse results when a new file is chosen.
    resetUpload();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    handleFileChange(e.dataTransfer.files?.[0] ?? null);
  };

  const handleParse = async () => {
    if (!selectedCycleId || !file) return;
    await parseFile(selectedCycleId, file);
  };

  const handleConfirm = async () => {
    if (!selectedCycleId) return;
    await confirmUpload(selectedCycleId);
  };

  const handleReset = () => {
    setFile(null);
    setSelectedCycleId('');
    setFileTypeError(null);
    resetUpload();
  };

  const handleCycleCreate = async (cycleId: string, description: string) => {
    await createCycleAction({ cycle_id: cycleId, description: description || undefined });
    setCycleModalOpen(false);
    clearCreateError();
    refetchCycles();
    setSelectedCycleId(cycleId);
  };

  const formatBytes = (b: number) => {
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  if (cyclesLoading) return <LoadingState />;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Data Input"
        title="Upload channel parameters"
        description="Upload a CSV or XLSX file containing channel and subchannel MMM parameters. Supported columns: channel_name, subchannel_name, roi_coefficient, min_spend, max_spend."
      />

      {isReadOnly ? (
        <Card>
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet size={22} className="text-[var(--ink-400)]" />
            </div>
            <p className="text-[15px] font-semibold text-[var(--ink-900)] mb-1">Read-only access</p>
            <p className="text-[13px] text-[var(--ink-500)] max-w-sm mx-auto">
              File uploads are managed by Admins and Data Scientists.
              Visit <strong>Data History</strong> to view upload records.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {cyclesError && (
            <ErrorState
              message={cyclesError}
              onRetry={refetchCycles}
            />
          )}

          {!cyclesError && (
            <Card>
              <div className="divide-y divide-[var(--border)]">

                {/* ── Section 1: Cycle selector ── */}
                <div className="px-6 py-5">
                  <p className="ui-eyebrow mb-3">1. Select planning cycle</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <Select
                        value={selectedCycleId}
                        onChange={(e) => setSelectedCycleId(e.target.value)}
                        disabled={!!previewData || !!committedRecord}
                      >
                        <option value="">Select a cycle…</option>
                        {cycles.map((c) => (
                          <option key={c.cycle_id} value={c.cycle_id}>
                            {c.cycle_id}{c.description ? ` — ${c.description}` : ''}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Plus size={13} />}
                      onClick={() => setCycleModalOpen(true)}
                      disabled={!!previewData || !!committedRecord}
                    >
                      New cycle
                    </Button>
                  </div>

                  {!cyclesLoading && cycles.length === 0 && (
                    <p className="text-[12px] text-[var(--ink-500)] mt-2">
                      No cycles yet. Create one to get started.
                    </p>
                  )}
                </div>

                {/* ── Section 2: File upload ── */}
                <div className="px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="ui-eyebrow">2. Upload file</p>
                    {file && !previewData && !committedRecord && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<X size={13} />}
                        onClick={() => handleFileChange(null)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  {!previewData && !committedRecord && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 transition-all cursor-pointer ${
                        dragActive
                          ? 'border-[var(--brand)] bg-[var(--brand-50)]'
                          : 'border-[var(--border-strong)] bg-[var(--surface-muted)] hover:border-[var(--brand)] hover:bg-[var(--brand-50)]'
                      }`}
                      onClick={() => !file && fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white border border-[var(--border)] flex items-center justify-center shadow-sm">
                          {file
                            ? <FileSpreadsheet size={20} className="text-[var(--brand)]" />
                            : <Upload size={20} className="text-[var(--brand)]" />
                          }
                        </div>
                        {file ? (
                          <div>
                            <div className="text-[14px] font-semibold text-[var(--ink-900)]">{file.name}</div>
                            <div className="text-[12px] text-[var(--ink-500)] mt-0.5">{formatBytes(file.size)}</div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-[14px] font-semibold text-[var(--ink-900)]">
                              {dragActive ? 'Drop to upload' : 'Drop file here or click to browse'}
                            </div>
                            <div className="text-[12px] text-[var(--ink-500)] mt-0.5">CSV, XLSX</div>
                          </div>
                        )}
                        {!file && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          >
                            Select file
                          </Button>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx"
                        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                      />
                    </div>
                  )}

                  {fileTypeError && (
                    <p className="text-[12px] text-[var(--danger)] mt-2">{fileTypeError}</p>
                  )}
                </div>

                {/* ── Section 3: Parse / Preview ── */}
                {(parseError || previewData) && (
                  <div className="px-6 py-5">
                    <p className="ui-eyebrow mb-3">3. Preview</p>
                    {parseError && (
                      <ErrorState
                        title="Parse failed"
                        message={parseError}
                        onRetry={handleParse}
                      />
                    )}
                    {previewData && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-[13px] text-[var(--ink-600)]">
                          <span className="font-semibold text-[var(--ink-900)]">{previewData.row_count} rows</span>
                          <span>·</span>
                          <span>{previewData.channels.length} channels</span>
                          <span>·</span>
                          <span>{previewData.channels.reduce((n, c) => n + c.subchannels.length, 0)} subchannels</span>
                        </div>
                        <UploadPreviewTable channels={previewData.channels} />
                      </div>
                    )}
                  </div>
                )}

                {/* ── Section 4: Committed confirmation ── */}
                {committedRecord && (
                  <div className="px-6 py-6">
                    <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={20} className="text-white" />
                      </div>
                      <div>
                        <div className="text-[15px] font-semibold text-green-900 mb-0.5">Upload committed</div>
                        <div className="text-[12.5px] text-green-700">
                          {committedRecord.filename} — {committedRecord.row_count} rows ingested for cycle{' '}
                          <strong>{committedRecord.cycle_id}</strong>.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Commit error ── */}
                {commitError && (
                  <div className="px-6 py-4">
                    <ErrorState title="Commit failed" message={commitError} />
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex justify-end gap-2 rounded-b-[12px]">
                <Button variant="secondary" onClick={handleReset}>Reset</Button>

                {!previewData && !committedRecord && (
                  <Button
                    variant="primary"
                    onClick={handleParse}
                    disabled={!selectedCycleId || !file || isParsing}
                    leftIcon={isParsing ? undefined : <Upload size={14} />}
                  >
                    {isParsing ? 'Parsing…' : 'Preview Upload'}
                  </Button>
                )}

                {previewData && !committedRecord && (
                  <Button
                    variant="primary"
                    onClick={handleConfirm}
                    disabled={isCommitting}
                    leftIcon={isCommitting ? undefined : <CheckCircle2 size={14} />}
                  >
                    {isCommitting ? 'Committing…' : 'Confirm Upload'}
                  </Button>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {cycleModalOpen && (
        <CycleCreateModal
          isCreating={isCreating}
          createError={createError}
          onClose={() => { setCycleModalOpen(false); clearCreateError(); }}
          onSubmit={handleCycleCreate}
        />
      )}
    </PageContainer>
  );
}
