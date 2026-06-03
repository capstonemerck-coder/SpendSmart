/**
 * DataInputContent.tsx
 *
 * Core 4-stage Data Input flow.
 * Stage 1 (raw-data): Filter + DATA_FACT upload
 * Stage 2 (target-variable): Variable selection
 * Stage 3 (model-output): MODEL_FACT upload
 * Stage 4 (complete): Success
 */
import React, { useRef, useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { PageContainer, PageHeader, Card, Button } from '@/components/shared';
import { ErrorState } from '@/components/shared/feedback/ErrorState';
import { LoadingState } from '@/components/shared/feedback/LoadingState';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/context/FilterContext';
import { uploadDataFact, uploadModelFact } from '@/services/upload.service';
import { reportsService } from '@/services/reports.service';
import type { UploadResponse } from '@/utils/types';

type Stage = 'raw-data' | 'target-variable' | 'model-output' | 'complete';

export default function DataInputContent() {
  const { currentUser } = useAuth();
  const { selectedMarket, setSelectedMarket, selectedBrand, setSelectedBrand, selectedIndication, setSelectedIndication, selectedMetadataId, markets, brands, indications, isLoading: filtersLoading, error: filtersError } = useFilters();
  const [stage, setStage] = useState<Stage>('raw-data');
  const [cycleId, setCycleId] = useState<string | null>(null);
  const [targetVariable, setTargetVariable] = useState<string | null>(null);
  const [dataFactVariables, setDataFactVariables] = useState<string[]>([]);
  const [customVariable, setCustomVariable] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isReadOnly = currentUser?.role !== 'admin' && currentUser?.role !== 'data scientist';

  const handleFileChange = async (file: File | null, isDataFact: boolean) => {
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      setUploadError('Only CSV and XLSX files are supported.');
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      const result: UploadResponse = isDataFact
        ? await uploadDataFact(file, cycleId || undefined, selectedMetadataId || undefined)
        : await uploadModelFact(file, cycleId || undefined, targetVariable || customVariable || undefined, selectedMetadataId || undefined);

      if (result.status === 'success') {
        if (isDataFact && result.cycle_id) {
          setCycleId(result.cycle_id);
          setDataFactVariables(await reportsService.dataFactVariables(result.cycle_id));
          setStage('target-variable');
        } else if (!isDataFact) {
          setStage('complete');
        }
      } else {
        setUploadError(result.message || 'Upload failed');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, isDataFact: boolean) => {
    e.preventDefault();
    setDragActive(false);
    handleFileChange(e.dataTransfer.files?.[0] ?? null, isDataFact);
  };

  const DropzoneUI = ({ isDataFact }: { isDataFact: boolean }) => (
    <div onDragOver={(e) => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={(e) => handleDrop(e, isDataFact)} className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${dragActive ? 'border-[var(--brand)] bg-[var(--brand-50)]' : 'border-[var(--border-strong)] bg-[var(--surface-muted)]'}`}>
      {isDataFact ? <Upload size={32} /> : <FileSpreadsheet size={32} />}
      <div className={`mx-auto mb-3 ${dragActive ? 'text-[var(--brand)]' : 'text-[var(--ink-400)]'}`} />
      <p className="text-[14px] font-semibold text-[var(--ink-900)] mb-1">{isDataFact ? 'Drop DATA_FACT file here' : 'Drop MODEL_FACT file here'}</p>
      <p className="text-[12px] text-[var(--ink-500)] mb-3">CSV or XLSX format</p>
      <input ref={fileInputRef} type="file" accept=".csv,.xlsx" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null, isDataFact)} disabled={isUploading || isReadOnly || (isDataFact && !selectedMetadataId)} className="hidden" />
      <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isReadOnly || (isDataFact && !selectedMetadataId)}>Or click to browse</Button>
    </div>
  );

  if (filtersLoading) return <LoadingState />;
  if (filtersError) return <ErrorState message={filtersError} />;

  return (
    <PageContainer>
      <PageHeader eyebrow="Data Input" title="Upload Marketing Mix Model Data" description={stage === 'raw-data' ? 'Select market context and upload DATA_FACT file' : 'Follow the steps to complete your upload'} />

      {stage !== 'complete' && (
        <div className="flex gap-2 mb-6">
          {(['raw-data', 'target-variable', 'model-output'] as const).map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${stage === s ? 'bg-[var(--brand)] text-white' : ['raw-data', 'target-variable', 'model-output'].indexOf(stage) > idx ? 'bg-green-500 text-white' : 'bg-[var(--surface-subtle)] text-[var(--ink-500)]'}`}>{['raw-data', 'target-variable', 'model-output'].indexOf(stage) > idx ? '✓' : idx + 1}</div>
              {idx < 2 && <div className="w-8 h-0.5 bg-[var(--border)]" />}
            </div>
          ))}
        </div>
      )}

      {stage === 'raw-data' && (
        <Card className="space-y-6">
          {isReadOnly && <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg"><AlertCircle size={16} className="mt-0.5 text-amber-700 flex-shrink-0" /><p className="text-[13px] text-amber-700">You have read-only access.</p></div>}
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-[13px] font-semibold text-[var(--ink-900)] mb-2">Market</label><select value={selectedMarket || ''} onChange={(e) => setSelectedMarket(e.target.value || null)} disabled={isReadOnly} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-[13px] disabled:opacity-50"><option value="">Select Market</option>{markets.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="block text-[13px] font-semibold text-[var(--ink-900)] mb-2">Brand</label><select value={selectedBrand || ''} onChange={(e) => setSelectedBrand(e.target.value || null)} disabled={!selectedMarket || isReadOnly} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-[13px] disabled:opacity-50"><option value="">Select Brand</option>{brands.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
            <div><label className="block text-[13px] font-semibold text-[var(--ink-900)] mb-2">Indication</label><select value={selectedIndication || ''} onChange={(e) => setSelectedIndication(e.target.value || null)} disabled={!selectedBrand || isReadOnly} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-[13px] disabled:opacity-50"><option value="">Select Indication</option>{indications.map((ind) => <option key={ind} value={ind}>{ind}</option>)}</select></div>
          </div>
          {cycleId && <div><label className="block text-[13px] font-semibold text-[var(--ink-900)] mb-2">Cycle ID</label><div className="px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-[13px] text-[var(--ink-700)] flex items-center gap-2">{cycleId}<CheckCircle2 size={14} className="text-green-500" /></div></div>}
          <DropzoneUI isDataFact={true} />
          {uploadError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700">{uploadError}</div>}
          {!selectedMetadataId && <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[13px] text-blue-700">Select Market, Brand, and Indication to enable upload.</div>}
        </Card>
      )}

      {stage === 'target-variable' && (
        <Card className="space-y-6">
          <div><label className="block text-[14px] font-semibold text-[var(--ink-900)] mb-3">Select or enter target variable</label><div className="grid grid-cols-4 gap-2 mb-4">{dataFactVariables.map((v) => <button key={v} onClick={() => setTargetVariable(v)} className={`px-3 py-2 rounded-lg text-[12px] font-medium border transition-all ${targetVariable === v ? 'border-[var(--brand)] bg-[var(--brand-50)]' : 'border-[var(--border)] bg-white'}`}>{v}</button>)}</div><input type="text" placeholder="Or enter custom variable" value={customVariable} onChange={(e) => { setCustomVariable(e.target.value); setTargetVariable(null); }} className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-[13px]" /></div>
          <div className="flex gap-3"><Button variant="secondary" onClick={() => setStage('raw-data')}>Back</Button><Button variant="secondary" onClick={() => setStage('model-output')}>Skip</Button><Button onClick={() => targetVariable || customVariable ? setStage('model-output') : setUploadError('Please select or enter a variable')} disabled={!targetVariable && !customVariable}>Continue</Button></div>
        </Card>
      )}

      {stage === 'model-output' && (
        <Card className="space-y-6">
          <div><label className="block text-[13px] font-semibold text-[var(--ink-900)] mb-2">Cycle ID</label><div className="px-3 py-2 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-lg text-[13px]">{cycleId}</div></div>
          <DropzoneUI isDataFact={false} />
          <div className="flex gap-3"><Button variant="secondary" onClick={() => setStage('target-variable')}>Back</Button></div>
        </Card>
      )}

      {stage === 'complete' && (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-green-500" />
          <h2 className="text-[18px] font-semibold text-green-900">Upload Complete!</h2>
          <p className="text-[14px] text-green-800">Your data has been successfully ingested.</p>
          <Button onClick={() => window.location.href = '/data-history'}>View Data History</Button>
        </Card>
      )}
    </PageContainer>
  );
}
