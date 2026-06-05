/**
 * useDataInputUpload.ts
 *
 * Manages the 4-stage upload flow state machine for the Data Input module.
 * Stages: raw-data → target-variable → model-output → complete.
 *
 * Handles file selection, drag-and-drop, upload submission, cycle ID locking,
 * target variable selection, and all stage transitions.
 *
 * API calls are delegated to uploadService — no direct api calls in this hook.
 *
 * @param metadataId      - Resolved metadata ID from FilterContext.
 * @param onUploadComplete - Optional callback fired after each successful upload.
 */
import { useRef, useState } from 'react';
import type React from 'react';
import { uploadService } from '@/services/upload.service';
import type { UploadResponse, UploadError } from '@/utils/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UploadStage = 'raw-data' | 'target-variable' | 'model-output' | 'complete';
export type UploadStatusValue = 'idle' | 'uploading' | 'success' | 'error';

export interface TVOption {
  value: string;
  label: string;
  desc: string;
  fromData?: boolean;
}

export interface UploadStep {
  key: string;
  label: string;
  done: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TARGET_VARIABLE_OPTIONS: TVOption[] = [
  { value: 'sales',             label: 'Sales',             desc: 'Total revenue from sales' },
  { value: 'revenue',           label: 'Revenue',           desc: 'Gross revenue' },
  { value: 'incremental_sales', label: 'Incremental Sales', desc: 'Media-driven uplift in sales' },
  { value: 'conversions',       label: 'Conversions',       desc: 'Number of conversions / transactions' },
  { value: 'units',             label: 'Units Sold',        desc: 'Volume of units sold' },
  { value: 'scripts',           label: 'Scripts',           desc: 'Prescriptions / scripts (pharma)' },
  { value: 'nrx',               label: 'NRx',               desc: 'New prescriptions' },
  { value: 'trx',               label: 'TRx',               desc: 'Total prescriptions' },
  { value: 'value',             label: 'Value',             desc: 'Generic value column' },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useDataInputUpload
 *
 * Encapsulates all upload-related state and handlers for DataInputContent.
 * Returns a flat object of state values, derived values, and handler functions.
 *
 * @param {number | null} metadataId      - From FilterContext. Required for submissions.
 * @param {() => void}    onUploadComplete - Optional success callback.
 */
export function useDataInputUpload(
  metadataId: number | null,
  onUploadComplete?: () => void,
) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFileState]           = useState<File | null>(null);
  const [dragActive, setDragActive]   = useState(false);
  const [drawerOpen, setDrawerOpen]   = useState(false);

  const [cycleId, setCycleId]             = useState('');
  const [cycleIdLocked, setCycleIdLocked] = useState(false);

  const [uploadStatus, setUploadStatus]     = useState<UploadStatusValue>('idle');
  const [uploadResult, setUploadResult]     = useState<UploadResponse | null>(null);
  const [uploadErrors, setUploadErrors]     = useState<UploadError[]>([]);
  const [uploadWarnings, setUploadWarnings] = useState<string[]>([]);

  const [uploadStage, setUploadStage]           = useState<UploadStage>('raw-data');
  const [rawDataSubmitted, setRawDataSubmitted] = useState(false);
  const [modelSubmitted, setModelSubmitted]     = useState(false);

  const [dataFactVariables, setDataFactVariables]             = useState<string[]>([]);
  const [targetVariable, setTargetVariable]                   = useState('');
  const [targetVariableConfirmed, setTargetVariableConfirmed] = useState(false);
  const [tvSearch, setTvSearch]                               = useState('');

  // ── File handlers ────────────────────────────────────────────────────────────

  /** Resets upload status state when a new file is selected or cleared. */
  const handleFile = (f: File | null) => {
    setFileState(f);
    setUploadStatus('idle');
    setUploadResult(null);
    setUploadErrors([]);
    setUploadWarnings([]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  /**
   * Submits the current file to the appropriate upload endpoint.
   * Advances stage after success: raw-data → target-variable, model-output → complete.
   * Locks the cycle ID after a successful DATA_FACT upload.
   */
  const handleSubmit = async () => {
    if (!file || !metadataId) return;

    setUploadStatus('uploading');
    setUploadErrors([]);
    setUploadWarnings([]);

    try {
      let result: UploadResponse;

      if (uploadStage === 'raw-data') {
        result = await uploadService.uploadDataFact(file, cycleId.trim() || undefined, metadataId);
      } else {
        result = await uploadService.uploadModelFact(
          file,
          cycleId.trim() || undefined,
          targetVariableConfirmed ? targetVariable : undefined,
          metadataId,
        );
      }

      setUploadResult(result);

      if (result.status === 'failed' || result.errors.length > 0) {
        setUploadStatus('error');
        setUploadErrors(result.errors);
        setUploadWarnings(result.warnings);
      } else {
        setUploadStatus('success');
        setUploadWarnings(result.warnings);
        onUploadComplete?.();

        if (uploadStage === 'raw-data') {
          if (result.cycle_id) {
            setCycleId(result.cycle_id);
            setCycleIdLocked(true);
            // Fetch distinct variables from DATA_FACT to populate target variable options
            uploadService.fetchDataFactVariables(result.cycle_id)
              .then(setDataFactVariables)
              .catch(() => {});
          }
          setRawDataSubmitted(true);
          setTimeout(() => {
            setUploadStage('target-variable');
            handleFile(null);
            setUploadResult(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 1400);
        } else {
          setModelSubmitted(true);
          setTimeout(() => setUploadStage('complete'), 800);
        }
      }
    } catch (err: any) {
      setUploadStatus('error');
      setUploadErrors([{ field: 'file', message: err?.message || 'Upload failed.', row: null }]);
    }
  };

  // ── Stage transitions ────────────────────────────────────────────────────────

  /** Confirms the selected target variable and advances to the model-output stage. */
  const handleConfirmTargetVariable = () => {
    if (!targetVariable) return;
    setTargetVariableConfirmed(true);
    setUploadStage('model-output');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Skips target variable selection and advances to model-output stage. */
  const skipTargetVariable = () => setUploadStage('model-output');

  /** Resets all upload state back to the initial raw-data stage. */
  const reset = () => {
    handleFile(null);
    setUploadStatus('idle');
    setUploadResult(null);
    setUploadErrors([]);
    setUploadWarnings([]);
    setRawDataSubmitted(false);
    setModelSubmitted(false);
    setUploadStage('raw-data');
    setCycleId('');
    setCycleIdLocked(false);
    setTargetVariable('');
    setTargetVariableConfirmed(false);
    setTvSearch('');
    setDataFactVariables([]);
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  // Merge DATA_FACT variables with predefined options, tagging data-sourced entries
  const allTVOptions: TVOption[] = [
    ...TARGET_VARIABLE_OPTIONS,
    ...dataFactVariables
      .filter((v) => !TARGET_VARIABLE_OPTIONS.some((o) => o.value === v))
      .map((v) => ({ value: v, label: v, desc: `From your uploaded data: ${v}`, fromData: true })),
  ];

  const filteredTVOptions = allTVOptions.filter(
    (o) =>
      o.label.toLowerCase().includes(tvSearch.toLowerCase()) ||
      o.value.toLowerCase().includes(tvSearch.toLowerCase()) ||
      o.desc.toLowerCase().includes(tvSearch.toLowerCase()),
  );

  const steps: UploadStep[] = [
    { key: 'raw-data',        label: 'Raw Data',        done: rawDataSubmitted },
    { key: 'target-variable', label: 'Target Variable', done: targetVariableConfirmed },
    { key: 'model-output',    label: 'Model Output',    done: modelSubmitted },
  ];

  return {
    // File state
    file,
    handleFile,
    dragActive,
    setDragActive,
    drawerOpen,
    setDrawerOpen,
    fileInputRef,
    // Cycle ID
    cycleId,
    setCycleId,
    cycleIdLocked,
    // Upload status
    uploadStatus,
    uploadResult,
    uploadErrors,
    uploadWarnings,
    isUploading: uploadStatus === 'uploading',
    isSuccess: uploadStatus === 'success',
    isError: uploadStatus === 'error',
    // Stage machine
    uploadStage,
    rawDataSubmitted,
    modelSubmitted,
    // Target variable
    targetVariable,
    setTargetVariable,
    targetVariableConfirmed,
    tvSearch,
    setTvSearch,
    // Derived
    allTVOptions,
    filteredTVOptions,
    steps,
    // Handlers
    handleDrop,
    handleSubmit,
    handleConfirmTargetVariable,
    skipTargetVariable,
    reset,
  };
}
