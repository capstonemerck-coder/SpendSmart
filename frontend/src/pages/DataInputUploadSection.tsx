/**
 * DataInputUploadSection.tsx
 *
 * Upload section for the Data Input module. Renders file type toggle cards
 * (locked to the current stage) and the 5-state dropzone.
 *
 * Dropzone states: idle / drag-active / file-selected / uploading / success / error.
 * Used exclusively by DataInputContent.tsx during raw-data and model-output stages.
 */
import React from 'react';
import { Upload, X, CheckCircle2, FileSpreadsheet, BookOpen, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/shared';
import type { UploadResponse, UploadError } from '@/utils/types';
import type { UploadStatusValue } from '@/hooks/useDataInputUpload';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DataInputUploadSectionProps {
  file: File | null;
  uploadStage: 'raw-data' | 'model-output';
  uploadStatus: UploadStatusValue;
  uploadResult: UploadResponse | null;
  uploadErrors: UploadError[];
  uploadWarnings: string[];
  dragActive: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  sectionRef: React.RefObject<HTMLDivElement>;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onRemoveFile: () => void;
  onOpenDrawer: () => void;
  onTryAgain: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Formats a byte count into a human-readable string (B / KB / MB). */
const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * DataInputUploadSection
 *
 * Renders the upload stage section: file type selector cards and the dropzone.
 * All visual states are derived from props — no internal state is managed.
 *
 * @param {DataInputUploadSectionProps} props
 */
export function DataInputUploadSection({
  file, uploadStage, uploadStatus, uploadResult, uploadErrors, uploadWarnings,
  dragActive, fileInputRef, sectionRef, onDragOver, onDragLeave, onDrop,
  onRemoveFile, onOpenDrawer, onTryAgain, onFileChange,
}: DataInputUploadSectionProps) {
  const isSuccess  = uploadStatus === 'success';
  const isError    = uploadStatus === 'error';
  const isUploading = uploadStatus === 'uploading';

  return (
    <div className="p-6" ref={sectionRef}>
      {/* Section header */}
      <div className="flex items-start justify-between mb-4">
        <p className="ui-eyebrow">
          {uploadStage === 'raw-data' ? '2. Upload raw data (DATA_FACT)' : '3. Upload model output (MODEL_FACT)'}
        </p>
        {file && (
          <Button variant="secondary" size="sm" onClick={onRemoveFile} leftIcon={<X size={13} />}>
            Remove
          </Button>
        )}
      </div>

      {/* File type toggle cards — locked to current stage */}
      <div className="grid grid-cols-2 gap-3 max-w-xl mb-5">
        {(['raw-data', 'model-output'] as const).map((opt) => {
          const selected = uploadStage === opt;
          return (
            <div
              key={opt}
              className={`text-left border rounded-lg px-4 py-3 transition-all ${
                selected
                  ? 'border-[var(--brand)] bg-[var(--brand-50)] shadow-sm'
                  : 'border-[var(--border)] bg-[var(--surface-muted)] opacity-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${selected ? 'border-[var(--brand)]' : 'border-[var(--border-strong)]'}`}>
                  {selected && <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />}
                </span>
                <span className={`text-[13px] font-semibold ${selected ? 'text-[var(--brand-700)]' : 'text-[var(--ink-600)]'}`}>
                  {opt === 'raw-data' ? 'Raw data' : 'Model output'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dropzone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-10 transition-all ${
          dragActive
            ? 'border-[var(--brand)] bg-[var(--brand-50)]'
            : isSuccess
            ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50'
            : isError
            ? 'border-red-300 bg-red-50'
            : 'border-[var(--border-strong)] bg-[var(--surface-muted)]'
        }`}
      >
        {isSuccess ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-lg">
              <CheckCircle2 size={28} className="text-white" />
            </div>
            <div className="font-display text-[17px] font-semibold text-green-700 mb-1">Upload successful</div>
            <div className="text-[12.5px] text-green-600 mb-2">
              {uploadResult?.row_count?.toLocaleString()} rows ingested
              {uploadResult?.cycle_id && <> into cycle <strong>{uploadResult.cycle_id}</strong></>}
            </div>
            {uploadStage === 'raw-data' && uploadResult?.cycle_id && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-[var(--brand-700)] bg-[var(--brand-50)] px-3 py-1.5 rounded-md border border-[var(--brand-100)]">
                <CheckCircle2 size={13} />
                Cycle ID <strong>{uploadResult.cycle_id}</strong> locked for model upload
              </div>
            )}
            {uploadWarnings.length > 0 && (
              <div className="mt-3 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 max-w-md text-left">
                {uploadWarnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertTriangle size={26} className="text-red-600" />
            </div>
            <div className="font-display text-[17px] font-semibold text-red-700 mb-1">Upload failed</div>
            <div className="max-w-lg w-full space-y-2 text-left mt-3">
              {uploadErrors.slice(0, 5).map((err, i) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2.5 bg-white border border-red-200 rounded-lg text-[12.5px]">
                  <X size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-red-800">{err.field}</span>
                    {err.row !== null && <span className="text-red-500 ml-1">(row {err.row})</span>}
                    <span className="text-red-700 ml-1">— {err.message}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" onClick={onOpenDrawer} leftIcon={<BookOpen size={14} />}>
                View template
              </Button>
              <Button variant="primary" onClick={onTryAgain}>Try again</Button>
            </div>
          </div>
        ) : isUploading ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--brand-50)] border border-[var(--brand-200)] flex items-center justify-center mb-4">
              <div className="w-7 h-7 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="font-display text-[17px] font-semibold text-[var(--ink-900)] mb-1">Uploading…</div>
            <div className="text-[12.5px] text-[var(--ink-500)]">Validating schema and inserting rows</div>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-white border border-[var(--border)] flex items-center justify-center mb-4 shadow-sm">
              <FileSpreadsheet size={22} className="text-[var(--brand)]" />
            </div>
            <div className="font-display text-[17px] font-semibold text-[var(--ink-900)] mb-1">{file.name}</div>
            <div className="text-[12.5px] text-[var(--ink-500)]">{fmtBytes(file.size)} · Ready to upload</div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-white border border-[var(--border)] flex items-center justify-center mb-4 shadow-sm">
              <Upload size={22} className="text-[var(--brand)]" />
            </div>
            <div className="font-display text-[17px] font-semibold text-[var(--ink-900)] mb-1">
              {dragActive ? 'Drop to upload' : `Drop ${uploadStage === 'raw-data' ? 'raw data' : 'model output'} here`}
            </div>
            <div className="text-[12.5px] text-[var(--ink-500)] mb-4">or select from computer · CSV, XLSX</div>
            <button
              onClick={onOpenDrawer}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--brand)] hover:text-[var(--brand-700)] transition-all mb-4 px-3 py-1.5 rounded-md hover:bg-[var(--brand-50)]"
            >
              <BookOpen size={15} />See expected structure
            </button>
            <Button variant="primary" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={14} />}>
              Select file
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls"
              onChange={onFileChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
