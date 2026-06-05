/**
 * DataInputContent.tsx
 *
 * Core Data Input page. Orchestrates the 4-stage upload flow
 * (raw-data → target-variable → model-output → complete), consumes
 * FilterContext for cascading Market/Brand/Indication selection, and manages
 * modal/drawer visibility. Upload logic is delegated to useDataInputUpload.
 * Must be wrapped in FilterProvider (provided by DataInput.tsx).
 */
import { useRef, useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, ChevronRight, Clock, Upload } from 'lucide-react';
import { PageContainer, PageHeader, Card, Button, Select, Field } from '@/components/shared';
import { useFilters } from '@/context/FilterContext';
import { useDataInputUpload } from '@/hooks/useDataInputUpload';
import { UploadHistoryModal } from '@/components/shared/modals/UploadHistoryModal';
import { EmptyDatasetModal } from '@/components/shared/modals/EmptyDatasetModal';
import { WrongFormatModal } from '@/components/shared/modals/WrongFormatModal';
import { TemplateDrawer } from '@/components/shared/data/TemplateDrawer';
import { DataInputTargetVariableStep } from './DataInputTargetVariableStep';
import { DataInputUploadSection } from './DataInputUploadSection';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DataInputContentProps {
  onNavigate?: (tab: string) => void;
  onUploadComplete?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * DataInputContent
 *
 * Orchestrates the 4-stage Data Input upload flow. Renders the business context
 * section, progress indicator, and the active stage (target variable, upload, or
 * completion). Passes all upload state and handlers from useDataInputUpload to
 * focused sub-components.
 *
 * @param {DataInputContentProps} props
 */
export default function DataInputContent({ onNavigate, onUploadComplete }: DataInputContentProps) {
  const { filters, options, setMarket, setBrand, setIndication } = useFilters();
  const upload = useDataInputUpload(filters.metadataId, onUploadComplete);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  const [showHistory, setShowHistory]             = useState(false);
  const [showEmptyModal, setShowEmptyModal]       = useState(false);
  const [showErrorModal, setShowErrorModal]       = useState(false);
  const [uploadedColumns, setUploadedColumns]     = useState<string[]>([]);
  const [expectedColumns, setExpectedColumns]     = useState<string[]>([]);
  const [modalValidationErrors, setModalValidationErrors] = useState<string[]>([]);

  // Auto-scroll to the upload section when Market/Brand/Indication resolves
  useEffect(() => {
    if (filters.metadataId && uploadSectionRef.current) {
      setTimeout(() => uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [filters.metadataId]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Input Hub"
        title="Upload a dataset"
        description="Select market context, then upload raw data and model output."
      />

      <Card>
        <div className="divide-y divide-[var(--border)]">

          {/* ── Section 1: Business context ── */}
          <div className="px-6 py-5 space-y-4">
            <p className="ui-eyebrow">1. Select business context</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
              <Field label="Market *">
                <Select value={filters.market ?? ''} onChange={(e) => setMarket(e.target.value || null)} disabled={options.marketsLoading}>
                  <option value="">{options.marketsLoading ? 'Loading…' : 'Select market'}</option>
                  {options.markets.map((m) => <option key={m}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Brand *">
                <Select value={filters.brand ?? ''} onChange={(e) => setBrand(e.target.value || null)} disabled={!filters.market || options.brandsLoading}>
                  <option value="">{!filters.market ? 'Select market first' : options.brandsLoading ? 'Loading…' : 'Select brand'}</option>
                  {options.brands.map((b) => <option key={b}>{b}</option>)}
                </Select>
              </Field>
              <Field label="Indication *">
                <Select
                  value={filters.indication ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setIndication(v || null, options.indications.find((i) => i.indication === v)?.metadata_id ?? null);
                  }}
                  disabled={!filters.brand || options.indicationsLoading}
                >
                  <option value="">{!filters.brand ? 'Select brand first' : options.indicationsLoading ? 'Loading…' : 'Select indication'}</option>
                  {options.indications.map((i) => <option key={i.indication} value={i.indication}>{i.indication}</option>)}
                </Select>
              </Field>
            </div>

            {filters.metadataId ? (
              <div className="flex items-center gap-2 text-[12px] text-[var(--brand-700)] bg-[var(--brand-50)] px-3 py-1.5 rounded-md border border-[var(--brand-100)] w-fit">
                <CheckCircle2 size={13} />Context resolved — ready to upload
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200 w-fit">
                <AlertCircle size={13} />Select Market, Brand and Indication to enable upload
              </div>
            )}

            {/* Cycle ID — auto-populated and locked after DATA_FACT upload */}
            <div className="max-w-xs">
              <Field label={upload.cycleIdLocked ? 'Cycle ID (auto-detected from file)' : 'Cycle ID (optional — auto-detected from file)'}>
                <div className="relative">
                  <input
                    value={upload.cycleId}
                    onChange={(e) => !upload.cycleIdLocked && upload.setCycleId(e.target.value)}
                    readOnly={upload.cycleIdLocked}
                    placeholder="Detected automatically after upload"
                    className={`ui-input w-full ${upload.cycleIdLocked ? 'bg-[var(--surface-subtle)] text-[var(--ink-700)] cursor-not-allowed pr-9' : ''}`}
                  />
                  {upload.cycleIdLocked && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <CheckCircle2 size={14} className="text-[var(--brand)]" />
                    </div>
                  )}
                </div>
                {upload.cycleIdLocked && (
                  <p className="text-[11px] text-[var(--ink-500)] mt-1">
                    Locked to cycle from raw data upload. Model output will use the same cycle.
                  </p>
                )}
              </Field>
            </div>
          </div>

          {/* ── Progress steps (visible after first upload) ── */}
          {upload.rawDataSubmitted && (
            <div className="px-6 py-4 bg-[var(--surface-muted)]">
              <div className="flex items-center gap-2 max-w-xl">
                {upload.steps.map((step, i) => (
                  <div key={step.key} className="flex items-center gap-2 flex-1">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-[12.5px] font-medium transition-all ${
                      step.done
                        ? 'text-green-700 bg-green-50 border-green-200'
                        : upload.uploadStage === step.key
                        ? 'text-[var(--brand-700)] bg-[var(--brand-50)] border-[var(--brand-200)]'
                        : 'text-[var(--ink-400)] bg-white border-[var(--border)]'
                    }`}>
                      {step.done
                        ? <CheckCircle2 size={13} className="flex-shrink-0" />
                        : upload.uploadStage === step.key
                        ? <div className="w-3 h-3 rounded-full border-2 border-[var(--brand)] flex-shrink-0" />
                        : <div className="w-3 h-3 rounded-full border-2 border-[var(--border-strong)] flex-shrink-0" />}
                      {step.label}
                    </div>
                    {i < upload.steps.length - 1 && <div className="h-px flex-1 bg-[var(--border)]" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Target variable step ── */}
          {upload.uploadStage === 'target-variable' && (
            <DataInputTargetVariableStep
              targetVariable={upload.targetVariable}
              setTargetVariable={upload.setTargetVariable}
              tvSearch={upload.tvSearch}
              setTvSearch={upload.setTvSearch}
              filteredTVOptions={upload.filteredTVOptions}
              allTVOptions={upload.allTVOptions}
              cycleId={upload.cycleId}
              onConfirm={upload.handleConfirmTargetVariable}
              onSkip={upload.skipTargetVariable}
            />
          )}

          {/* ── Upload section (raw-data and model-output stages) ── */}
          {(upload.uploadStage === 'raw-data' || upload.uploadStage === 'model-output') && (
            <DataInputUploadSection
              file={upload.file}
              uploadStage={upload.uploadStage}
              uploadStatus={upload.uploadStatus}
              uploadResult={upload.uploadResult}
              uploadErrors={upload.uploadErrors}
              uploadWarnings={upload.uploadWarnings}
              dragActive={upload.dragActive}
              fileInputRef={upload.fileInputRef}
              sectionRef={uploadSectionRef}
              onDragOver={(e) => { e.preventDefault(); upload.setDragActive(true); }}
              onDragLeave={() => upload.setDragActive(false)}
              onDrop={upload.handleDrop}
              onRemoveFile={() => upload.handleFile(null)}
              onOpenDrawer={() => upload.setDrawerOpen(true)}
              onTryAgain={() => upload.handleFile(null)}
              onFileChange={(e) => upload.handleFile(e.target.files?.[0] || null)}
            />
          )}

          {/* ── Completion panel ── */}
          {upload.uploadStage === 'complete' && (
            <div className="p-6">
              <div className="max-w-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                    <CheckCircle2 size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold text-green-900 mb-1">Upload Complete</h3>
                    <p className="text-[12.5px] text-green-700 leading-relaxed">
                      All data uploaded for cycle <strong>{upload.cycleId}</strong>.
                      {upload.targetVariableConfirmed && <> Target variable set to <strong>{upload.targetVariable}</strong>.</>}
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5 mb-5">
                  {[
                    'Raw data ingested',
                    `Target variable: ${upload.targetVariableConfirmed ? upload.targetVariable : 'not set'}`,
                    'Model output ingested',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-[13px] text-green-800 bg-white/60 px-4 py-2.5 rounded-lg border border-green-200/50">
                      <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <Button variant="primary" className="w-full !py-3" leftIcon={<ChevronRight size={16} />}
                  onClick={() => onNavigate?.('DATA HISTORY')}>
                  View Data History
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer (upload stages only) ── */}
        {(upload.uploadStage === 'raw-data' || upload.uploadStage === 'model-output') && (
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex justify-between items-center rounded-b-[12px]">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-1.5 text-[12px] text-[var(--ink-500)] hover:text-[var(--ink-900)] transition-colors"
            >
              <Clock size={13} />View upload history
            </button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={upload.reset}>Reset</Button>
              <Button
                variant="primary"
                disabled={!upload.file || upload.isUploading || (upload.isSuccess && upload.uploadStage === 'raw-data') || !filters.metadataId}
                onClick={upload.handleSubmit}
                leftIcon={
                  upload.isUploading
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : upload.isSuccess
                    ? <CheckCircle2 size={14} />
                    : <Upload size={14} />
                }
              >
                {upload.isUploading ? 'Uploading…' : upload.isSuccess ? 'Uploaded ✓' : upload.uploadStage === 'raw-data' ? 'Submit Raw Data' : 'Submit Model Output'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Modals ── */}
      {showHistory && <UploadHistoryModal onClose={() => setShowHistory(false)} />}

      {showEmptyModal && (
        <EmptyDatasetModal
          onDismiss={() => setShowEmptyModal(false)}
          onViewTemplate={() => { setShowEmptyModal(false); upload.setDrawerOpen(true); }}
        />
      )}

      {showErrorModal && (
        <WrongFormatModal
          validationErrors={modalValidationErrors}
          uploadedColumns={uploadedColumns}
          expectedColumns={expectedColumns}
          onClose={() => setShowErrorModal(false)}
          onViewTemplate={() => { setShowErrorModal(false); upload.setDrawerOpen(true); }}
          onTryAgain={() => {
            setShowErrorModal(false);
            upload.handleFile(null);
            setUploadedColumns([]);
            setExpectedColumns([]);
          }}
        />
      )}

      {upload.drawerOpen && <TemplateDrawer onClose={() => upload.setDrawerOpen(false)} />}
    </PageContainer>
  );
}
