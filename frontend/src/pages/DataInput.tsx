//data-input
import { useRef, useState } from 'react';
import { Upload, X, CheckCircle2, FileSpreadsheet, BookOpen, Download, ChevronDown, ChevronUp, AlertTriangle, Info, Sparkles, Check, ChevronRight } from 'lucide-react';
import {
  PageContainer, PageHeader, Card, Button, Input, Select, Field, Badge,
} from '@/components/shared';

export default function DataInput({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [file, setFile, ] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'raw-data' | 'model-output'>('raw-data');
  const [dragActive, setDragActive] = useState(false);
  const [region, setRegion] = useState('');
  const [product, setProduct] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Smart drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rulesExpanded, setRulesExpanded] = useState(false);
  const [rawDataExpanded, setRawDataExpanded] = useState(true);
  const [modelOutputExpanded, setModelOutputExpanded] = useState(true);

  // Validation states
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error' | 'empty'>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showEmptyModal, setShowEmptyModal] = useState(false);
  const [uploadedColumns, setUploadedColumns] = useState<string[]>([]);
  const [expectedColumns, setExpectedColumns] = useState<string[]>([]);

  // Track individual dataset uploads
  const [rawDataValidated, setRawDataValidated] = useState(false);
  const [modelOutputValidated, setModelOutputValidated] = useState(false);

  // Upload stage tracking
  const [uploadStage, setUploadStage] = useState<'raw-data' | 'model-output' | 'complete'>('raw-data');
  const [rawDataSubmitted, setRawDataSubmitted] = useState(false);
  const [modelOutputSubmitted, setModelOutputSubmitted] = useState(false);

  // Target variable selection
  const [showTargetVariableCard, setShowTargetVariableCard] = useState(false);
  const [targetVariable, setTargetVariable] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Raw Data sample structure
  const rawDataSample = [
    {
      cycle_id: 'C2025Q1',
      date: '2025-01-15',
      variable: 'sales',
      segment: 'consumer',
      spend: '125000',
      reach: '450000',
      value: '3.2',
      channel: 'Digital',
      sub_channel: 'Social Media',
      upload_id: 'UP001',
    },
    {
      cycle_id: 'C2025Q1',
      date: '2025-01-22',
      variable: 'impressions',
      segment: 'hcp_npp',
      spend: '85000',
      reach: '320000',
      value: '2.8',
      channel: 'Events',
      sub_channel: 'Conferences',
      upload_id: 'UP001',
    },
    {
      cycle_id: 'C2025Q2',
      date: '2025-04-10',
      variable: 'conversions',
      segment: 'consumer',
      spend: '95000',
      reach: '380000',
      value: '4.1',
      channel: 'TV',
      sub_channel: 'Cable',
      upload_id: 'UP002',
    },
  ];

  // Model Output sample structure
  const modelOutputSample = [
    {
      cycle_id: 'C2025Q1',
      variable: 'digital_spend',
      channel: 'Digital',
      sub_channel: 'Social Media',
      category: 'consumer',
      estimate: '0.0342',
      curve_type: 'adstock',
      curvature: '0.85',
      adstock_rate: '0.45',
      adstock_horizon: '8',
      p_value: '0.001',
      impactable_sales_pct: '23.4',
      base_sales: '1250000',
    },
    {
      cycle_id: 'C2025Q1',
      variable: 'tv_spend',
      channel: 'TV',
      sub_channel: 'Cable',
      category: 'consumer',
      estimate: '0.0287',
      curve_type: 'diminishing_returns',
      curvature: '0.72',
      adstock_rate: '0.38',
      adstock_horizon: '12',
      p_value: '0.003',
      impactable_sales_pct: '31.2',
      base_sales: '1450000',
    },
    {
      cycle_id: 'C2025Q2',
      variable: 'events_spend',
      channel: 'Events',
      sub_channel: 'Conferences',
      category: 'hcp_npp',
      estimate: '0.0419',
      curve_type: 'adstock',
      curvature: '0.91',
      adstock_rate: '0.52',
      adstock_horizon: '6',
      p_value: '0.002',
      impactable_sales_pct: '18.7',
      base_sales: '980000',
    },
  ];

  const rawDataColumns = Object.keys(rawDataSample[0]);
  const modelOutputColumns = Object.keys(modelOutputSample[0]);

  const rawDataTooltips: Record<string, string> = {
    cycle_id: 'Unique identifier for the marketing cycle',
    date: 'Transaction date in YYYY-MM-DD format',
    variable: 'Metric being tracked (sales, impressions, etc.)',
    segment: 'Target audience segment',
    spend: 'Marketing spend amount in USD',
    reach: 'Total audience reach count',
    value: 'Calculated metric value',
    channel: 'Primary marketing channel',
    sub_channel: 'Specific sub-channel within the channel',
    upload_id: 'Unique upload batch identifier',
  };

  const modelOutputTooltips: Record<string, string> = {
    cycle_id: 'Marketing cycle identifier',
    variable: 'Spend variable name',
    channel: 'Marketing channel category',
    sub_channel: 'Channel subdivision',
    category: 'Audience category',
    estimate: 'Model coefficient estimate',
    curve_type: 'Response curve type',
    curvature: 'Curve shape parameter',
    adstock_rate: 'Ad carryover effect rate',
    adstock_horizon: 'Effect decay period (weeks)',
    p_value: 'Statistical significance',
    impactable_sales_pct: 'Percentage of impactable sales',
    base_sales: 'Baseline sales amount',
  };

  // Suggested target variables with recommended one
  const suggestedTargetVariables = [
    { value: 'sales', label: 'sales', suggested: false },
    { value: 'revenue', label: 'revenue', suggested: false },
    { value: 'conversions', label: 'conversions', suggested: false },
    { value: 'incremental_sales', label: 'incremental_sales', suggested: false },
    { value: 'roi', label: 'roi', suggested: false },
    { value: 'target', label: 'target', suggested: false },
  ];

  // Filter target variables based on search
  const filteredTargetVariables = suggestedTargetVariables.filter((v) =>
    v.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mock validation function
  const validateFile = (uploadedFile: File) => {
    setValidationStatus('validating');

    // Simulate validation - in real app, parse CSV and validate structure
    const randomOutcome = Math.random();

    setTimeout(() => {
      // 10% chance of empty dataset
      if (randomOutcome < 0.1) {
        setValidationStatus('empty');
        setShowEmptyModal(true);
        return;
      }

      // 25% chance of validation error
      if (randomOutcome < 0.35) {
        const errorTypes = [
          'Column mismatch detected',
          'Invalid datatype detected: "spend" must be numeric',
          'Unsupported structure',
          'Incorrect date format: Expected YYYY-MM-DD, found MM/DD/YYYY',
        ];

        // Simulate column comparison
        const expected = fileType === 'raw-data' ? rawDataColumns : modelOutputColumns;
        const uploaded = [...expected];

        // Randomly modify uploaded columns to create mismatch
        if (Math.random() > 0.5) {
          uploaded.splice(Math.floor(Math.random() * uploaded.length), 1);
          uploaded.push('unknown_column');
        } else {
          uploaded[Math.floor(Math.random() * uploaded.length)] = 'wrong_column';
        }

        setExpectedColumns(expected);
        setUploadedColumns(uploaded);
        setValidationStatus('error');
        setValidationErrors(errorTypes.slice(0, Math.floor(Math.random() * 3) + 1));
        setShowErrorModal(true);
      } else {
        // Success
        setValidationStatus('success');
        setValidationErrors([]);
        setUploadedColumns([]);
        setExpectedColumns([]);

        // Track which dataset was validated
        if (fileType === 'raw-data') {
          setRawDataValidated(true);
        } else {
          setModelOutputValidated(true);
        }

        // Do NOT auto-show target variable card here
        // It will be shown manually after Model Output submission
      }
    }, 1200);
  };

  const handleFileUpload = (uploadedFile: File | null) => {
    setFile(uploadedFile);
    if (uploadedFile) {
      setValidationStatus('idle');
      validateFile(uploadedFile);
    } else {
      setValidationStatus('idle');
      setValidationErrors([]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  const downloadSampleCSV = (type: 'raw-data' | 'model-output') => {
    const sampleData = type === 'raw-data' ? rawDataSample : modelOutputSample;
    const headers = Object.keys(sampleData[0]);
    const csvContent = [
      headers.join(','),
      ...sampleData.map((row) => headers.map((header) => row[header as keyof typeof row]).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type.replace('-', '_')}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = () => {
    if (validationStatus !== 'success') return;

    if (uploadStage === 'raw-data') {
      // Submit Raw Data and transition to Model Output
      setRawDataSubmitted(true);
      setUploadStage('model-output');

      // Reset upload section only (keep market/brand)
      setFile(null);
      setFileType('model-output');
      setValidationStatus('idle');
      setValidationErrors([]);
      setUploadedColumns([]);
      setExpectedColumns([]);
      setShowErrorModal(false);
      setShowEmptyModal(false);

      // Smooth transition
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } else if (uploadStage === 'model-output') {
      // Submit Model Output and show target variable card
      setModelOutputSubmitted(true);

      // Show target variable card after brief delay, then auto-scroll
      setTimeout(() => {
        setShowTargetVariableCard(true);

        // Auto-scroll to target variable card
        setTimeout(() => {
          const targetVariableCard = document.getElementById('target-variable-card');
          if (targetVariableCard) {
            targetVariableCard.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 100);
      }, 600);
    }
  };

  const reset = () => {
    setFile(null);
    setRegion('');
    setProduct('');
    setFileType('raw-data');
    setValidationStatus('idle');
    setValidationErrors([]);
    setShowErrorModal(false);
    setShowEmptyModal(false);
    setUploadedColumns([]);
    setExpectedColumns([]);
    setRawDataValidated(false);
    setModelOutputValidated(false);
    setShowTargetVariableCard(false);
    setTargetVariable('');
    setSearchTerm('');
    setDropdownOpen(false);
    setUploadStage('raw-data');
    setRawDataSubmitted(false);
    setModelOutputSubmitted(false);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Input Hub"
        title="Upload a dataset"
        description={<span className="whitespace-nowrap">Add raw data or model output to your workspace with intelligent validation. Supported formats: CSV, XLSX.</span>}
      />

      <Card>
        <div className="divide-y divide-[var(--border)]">

          {/* ── Section 1: Market & Brand ── */}
          <div className="px-6 py-5 flex items-center gap-6">
            <p className="ui-eyebrow shrink-0">Choose Market & Brand</p>
            <div className="flex items-center gap-3">
              <div className="w-[200px]">
                <Select value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="">Select market…</option>
                  <option>North America</option>
                  <option>Europe</option>
                  <option>Asia Pacific</option>
                </Select>
              </div>
              <div className="w-[200px]">
                <Select value={product} onChange={(e) => setProduct(e.target.value)}>
                  <option value="">Select brand…</option>
                  <option>Product A</option>
                  <option>Product B</option>
                  <option>Product C</option>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Section 2: Upload ── */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <p className="ui-eyebrow">Upload file</p>
              {file && (
                <Button variant="secondary" size="sm" onClick={() => setFile(null)} leftIcon={<X size={13} />}>
                  Remove
                </Button>
              )}
            </div>

            {/* Progress Indicator */}
            {rawDataSubmitted && (
              <div className="mb-5 pb-5 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-[12.5px] text-green-700 bg-green-50 px-3 py-1.5 rounded-md border border-green-200">
                    <CheckCircle2 size={14} className="flex-shrink-0" />
                    <span className="font-medium">Raw Data Uploaded</span>
                  </div>
                  <div className="h-[1px] flex-1 bg-[var(--border)]" />
                  <div className={`flex items-center gap-2 text-[12.5px] px-3 py-1.5 rounded-md border ${
                    modelOutputSubmitted
                      ? 'text-green-700 bg-green-50 border-green-200'
                      : 'text-[var(--ink-600)] bg-white border-[var(--border)]'
                  }`}>
                    {modelOutputSubmitted ? (
                      <CheckCircle2 size={14} className="flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--brand)] flex-shrink-0" />
                    )}
                    <span className="font-medium">
                      {modelOutputSubmitted ? 'Model Output Uploaded' : 'Upload Model Output'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* File type selector */}
            <div className="grid grid-cols-2 gap-3 max-w-xl mb-5">
              {([
                { v: 'raw-data', label: 'Raw data', desc: 'Original CSV/XLSX before model run' },
                { v: 'model-output', label: 'Model output', desc: 'Result of a completed model' },
              ] as const).map((opt) => {
                const selected = fileType === opt.v;
                const isDisabled = rawDataSubmitted && opt.v === 'raw-data';
                return (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => !isDisabled && setFileType(opt.v)}
                    disabled={isDisabled}
                    className={`text-left border rounded-lg px-4 py-3 transition-all ${
                      selected
                        ? 'border-[var(--brand)] bg-[var(--brand-50)] shadow-sm'
                        : isDisabled
                        ? 'border-[var(--border)] bg-[var(--surface-muted)] opacity-60 cursor-not-allowed'
                        : 'border-[var(--border)] hover:border-[var(--ink-400)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 ${
                          selected ? 'border-[var(--brand)]' : 'border-[var(--border-strong)]'
                        }`}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-[var(--brand)]" />}
                      </span>
                      <span className={`text-[13px] font-semibold ${selected ? 'text-[var(--brand-700)]' : 'text-[var(--ink-900)]'}`}>
                        {opt.label}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-[var(--ink-500)] ml-6">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Dropzone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 transition-all ${
                dragActive
                  ? 'border-[var(--brand)] bg-[var(--brand-50)]'
                  : validationStatus === 'success'
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50'
                  : 'border-[var(--border-strong)] bg-[var(--surface-muted)]'
              }`}
            >
              {validationStatus === 'success' ? (
                // Success State
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center mb-4 shadow-lg animate-[bounceIn_0.5s_cubic-bezier(0.16,1,0.3,1)]">
                    <CheckCircle2 size={28} className="text-white" />
                  </div>
                  <div className="font-display text-[17px] font-semibold text-green-700 mb-1">
                    Dataset structure verified successfully
                  </div>
                  <div className="text-[12.5px] text-green-600 mb-3">
                    Ready to Upload
                  </div>
                  <Badge tone="success" className="!text-[11px] !px-3 !py-1">
                    Schema Match: 100%
                  </Badge>

                  {file && (
                    <div className="mt-5 mx-auto max-w-2xl bg-white border border-green-200 rounded-lg p-3.5 flex items-center gap-3 shadow-sm">
                      <div className="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet size={18} className="text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[var(--ink-900)] truncate">{file.name}</div>
                        <div className="text-[11.5px] text-[var(--ink-500)] mt-0.5">
                          {formatBytes(file.size)} · {fileType === 'raw-data' ? 'Raw data' : 'Model output'}
                        </div>
                      </div>
                      <Badge tone="success" icon={<CheckCircle2 size={11} />}>Validated</Badge>
                    </div>
                  )}
                </div>
              ) : (
                // Default Upload State
                <div className="flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-white border border-[var(--border)] flex items-center justify-center mb-4 shadow-sm">
                    <Upload size={22} className="text-[var(--brand)]" />
                  </div>
                  <div className="font-display text-[17px] font-semibold text-[var(--ink-900)] mb-1">
                    {dragActive ? 'Drop to upload' : 'Drop file here to upload'}
                  </div>
                  <div className="text-[12.5px] text-[var(--ink-500)] mb-4">
                    or select from your computer · CSV, XLSX
                  </div>

                  {/* See Expected Dataset Structure CTA */}
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--brand)] hover:text-[var(--brand-700)] transition-all mb-4 group px-3 py-1.5 rounded-md hover:bg-[var(--brand-50)]"
                  >
                    <BookOpen size={15} className="group-hover:scale-110 transition-transform" />
                    <span className="border-b border-dotted border-[var(--brand)] group-hover:border-solid">
                      See Expected Dataset Structure
                    </span>
                  </button>

                  <Button variant="primary" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload size={14} />}>
                    Select file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.json"
                    onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
                  />
                </div>
              )}

              {file && validationStatus === 'validating' && (
                <div className="mt-5 mx-auto max-w-2xl bg-white border border-[var(--brand-200)] rounded-lg p-3.5 flex items-center gap-3 shadow-sm animate-[pulse_2s_ease-in-out_infinite]">
                  <div className="w-10 h-10 rounded-md bg-[var(--brand-50)] flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={18} className="text-[var(--brand)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-[var(--ink-900)] truncate">{file.name}</div>
                    <div className="text-[11.5px] text-[var(--brand-700)] mt-0.5 flex items-center gap-1.5 font-medium">
                      <div className="w-3 h-3 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
                      Checking dataset structure...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Variable Smart Card - Appears after both datasets validated */}
          {showTargetVariableCard && (
            <div id="target-variable-card" className="mt-6 animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)]">
              <div className="max-w-2xl mx-auto bg-white border border-[var(--border)] rounded-xl shadow-lg overflow-hidden">
                {/* Card Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-blue-50/50 to-transparent border-b border-[var(--border)]">
                  <div className="flex items-start gap-3">
                    {/* AI Sparkle Icon */}
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[15px] font-semibold text-[var(--ink-900)]">Enter Target Variable</h3>
                        <Badge tone="neutral" className="!text-[10px] !px-2 !py-0.5">Required</Badge>
                      </div>
                      <p className="text-[12px] text-[var(--ink-600)] leading-relaxed">
                        Enter the business outcome variable shared across both datasets.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="px-6 py-5">
                  {/* Premium Searchable Dropdown */}
                  <div className="relative">
                    <label className="block text-[12px] font-medium text-[var(--ink-700)] mb-2">
                      Target Variable
                    </label>

                    {/* Dropdown Button */}
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="w-full px-4 py-3 bg-white border border-[var(--border)] rounded-lg hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-left flex items-center justify-between"
                    >
                      <span className={`text-[13px] ${targetVariable ? 'text-[var(--ink-900)] font-medium' : 'text-[var(--ink-400)]'}`}>
                        {targetVariable || 'Select a target variable...'}
                      </span>
                      <ChevronDown size={16} className={`text-[var(--ink-400)] transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-[var(--border)] rounded-lg shadow-xl max-h-64 overflow-hidden animate-[scaleIn_0.15s_ease-out]">
                        {/* Search Input */}
                        <div className="p-2 border-b border-[var(--border)]">
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search variables..."
                            className="w-full px-3 py-2 text-[12.5px] border border-[var(--border)] rounded-md focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                            autoFocus
                          />
                        </div>

                        {/* Options List */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredTargetVariables.length > 0 ? (
                            filteredTargetVariables.map((variable) => (
                              <button
                                key={variable.value}
                                onClick={() => {
                                  setTargetVariable(variable.value);
                                  setDropdownOpen(false);
                                  setSearchTerm('');
                                }}
                                className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors flex items-center justify-between group ${
                                  targetVariable === variable.value ? 'bg-blue-50' : ''
                                }`}
                              >
                                <span className="text-[13px] text-[var(--ink-900)] font-medium">
                                  {variable.label}
                                </span>
                                <div className="flex items-center gap-2">
                                  {variable.suggested && (
                                    <Badge tone="success" className="!text-[10px] !px-2 !py-0.5">
                                      Suggested
                                    </Badge>
                                  )}
                                  {targetVariable === variable.value && (
                                    <Check size={14} className="text-blue-600" />
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-6 text-center text-[12px] text-[var(--ink-400)]">
                              No matching variables found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Helper text below dropdown */}
                  <p className="mt-2 text-[11px] text-[var(--ink-500)]">
                    This variable will be used to align raw data and model output datasets.
                  </p>
                </div>

                {/* Card Footer */}
                <div className="px-6 py-4 bg-[var(--surface-muted)] border-t border-[var(--border)] flex items-center justify-end rounded-b-xl">
                  <Button
                    variant="primary"
                    disabled={!targetVariable}
                    onClick={() => {
                      // Mark upload flow as complete
                      setUploadStage('complete');
                      setShowTargetVariableCard(false);
                    }}
                    className="!py-2.5 !px-5 !text-[13px]"
                  >
                    Confirm Variable
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Completion State - After target variable confirmed */}
          {uploadStage === 'complete' && (
            <div className="mt-6 animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)]">
              <div className="max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-6">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md">
                      <CheckCircle2 size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[16px] font-semibold text-green-900 mb-1">
                        Upload Complete
                      </h3>
                      <p className="text-[12.5px] text-green-700 leading-relaxed">
                        Both datasets and target variable have been successfully configured.
                      </p>
                    </div>
                  </div>

                  {/* Completion Checklist */}
                  <div className="space-y-2.5 mb-5">
                    <div className="flex items-center gap-2.5 text-[13px] text-green-800 bg-white/60 px-4 py-2.5 rounded-lg border border-green-200/50">
                      <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
                      <span className="font-medium">Raw Data Uploaded</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-green-800 bg-white/60 px-4 py-2.5 rounded-lg border border-green-200/50">
                      <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
                      <span className="font-medium">Model Output Uploaded</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[13px] text-green-800 bg-white/60 px-4 py-2.5 rounded-lg border border-green-200/50">
                      <CheckCircle2 size={16} className="flex-shrink-0 text-green-600" />
                      <span className="font-medium">
                        Target Variable Configured: {targetVariable}
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button
                    variant="primary"
                    className="w-full !py-3 !text-[14px] !font-semibold bg-green-600 hover:bg-green-700 !border-green-600"
                    leftIcon={<ChevronRight size={16} />}
                    onClick={() => {
                      // Navigate to Data History
                      if (onNavigate) {
                        onNavigate('DATA HISTORY');
                      }
                    }}
                  >
                    Continue to Analysis
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer actions */}
        {uploadStage !== 'complete' && (
          <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex justify-end gap-2 rounded-b-[12px]">
            <Button variant="secondary" onClick={reset}>Reset</Button>
            <Button
              variant="primary"
              disabled={validationStatus !== 'success'}
              onClick={handleSubmit}
              leftIcon={validationStatus === 'success' ? <CheckCircle2 size={14} /> : <Upload size={14} />}
            >
              {validationStatus === 'success'
                ? uploadStage === 'raw-data'
                  ? 'Submit Raw Data'
                  : 'Submit Model Output'
                : uploadStage === 'raw-data'
                ? 'Submit Raw Data'
                : 'Submit Model Output'}
            </Button>
          </div>
        )}
      </Card>

      {/* Smart Drawer - Expected Dataset Structure */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 animate-[fadeIn_0.2s_ease-out] cursor-pointer"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 bottom-0 w-[650px] bg-white shadow-2xl z-50 flex flex-col animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-[var(--border)] bg-gradient-to-r from-[var(--brand-50)] to-white">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[17px] font-semibold text-[var(--ink-900)] mb-1.5">Expected Dataset Structure</h3>
                  <p className="text-[12px] text-[var(--ink-600)] leading-relaxed max-w-md">
                    Refer to these sample structures to ensure your dataset format is correct before upload.
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="text-[var(--ink-400)] hover:text-[var(--ink-700)] -m-1 p-1.5 rounded-md hover:bg-white/80 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Raw Data Dataset Section - Only show when raw-data is selected */}
              {fileType === 'raw-data' && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setRawDataExpanded(!rawDataExpanded)}
                    className="w-full px-5 py-3.5 bg-gradient-to-r from-[var(--surface-muted)] to-white hover:from-[var(--surface-subtle)] hover:to-[var(--surface-muted)] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--brand)] flex items-center justify-center">
                        <FileSpreadsheet size={16} className="text-white" />
                      </div>
                      <span className="text-[14px] font-semibold text-[var(--ink-900)]">Raw Data Dataset</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Download size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSampleCSV('raw-data');
                        }}
                        className="!py-1.5 !px-3 !text-[11px]"
                      >
                        Download
                      </Button>
                      {rawDataExpanded ? <ChevronUp size={18} className="text-[var(--ink-500)]" /> : <ChevronDown size={18} className="text-[var(--ink-500)]" />}
                    </div>
                  </button>

                  {rawDataExpanded && (
                    <div className="border-t border-[var(--border)] bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead className="bg-[var(--surface-muted)] sticky top-0">
                            <tr>
                              {rawDataColumns.map((col) => (
                                <th
                                  key={col}
                                  className="px-3 py-2.5 text-left font-semibold text-[var(--ink-700)] border-b border-[var(--border)] relative group whitespace-nowrap"
                                >
                                  <div className="flex items-center gap-1">
                                    {col}
                                    <Info size={11} className="text-[var(--ink-400)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  {/* Tooltip */}
                                  <div className="absolute left-0 top-full mt-1 bg-[var(--ink-900)] text-white text-[10px] px-2.5 py-1.5 rounded-md shadow-xl z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {rawDataTooltips[col]}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rawDataSample.map((row, idx) => (
                              <tr
                                key={idx}
                                className={`${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-[var(--surface-muted)]'
                                } hover:bg-[var(--brand-50)] transition-colors`}
                              >
                                {Object.values(row).map((value, colIdx) => (
                                  <td key={colIdx} className="px-3 py-2.5 text-[var(--ink-700)] border-b border-[var(--border)] whitespace-nowrap">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Model Output Dataset Section - Only show when model-output is selected */}
              {fileType === 'model-output' && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setModelOutputExpanded(!modelOutputExpanded)}
                    className="w-full px-5 py-3.5 bg-gradient-to-r from-[var(--surface-muted)] to-white hover:from-[var(--surface-subtle)] hover:to-[var(--surface-muted)] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
                        <FileSpreadsheet size={16} className="text-white" />
                      </div>
                      <span className="text-[14px] font-semibold text-[var(--ink-900)]">Model Output Dataset</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<Download size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSampleCSV('model-output');
                        }}
                        className="!py-1.5 !px-3 !text-[11px]"
                      >
                        Download
                      </Button>
                      {modelOutputExpanded ? <ChevronUp size={18} className="text-[var(--ink-500)]" /> : <ChevronDown size={18} className="text-[var(--ink-500)]" />}
                    </div>
                  </button>

                  {modelOutputExpanded && (
                    <div className="border-t border-[var(--border)] bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px]">
                          <thead className="bg-[var(--surface-muted)] sticky top-0">
                            <tr>
                              {modelOutputColumns.map((col) => (
                                <th
                                  key={col}
                                  className="px-3 py-2.5 text-left font-semibold text-[var(--ink-700)] border-b border-[var(--border)] relative group whitespace-nowrap"
                                >
                                  <div className="flex items-center gap-1">
                                    {col}
                                    <Info size={11} className="text-[var(--ink-400)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  {/* Tooltip */}
                                  <div className="absolute left-0 top-full mt-1 bg-[var(--ink-900)] text-white text-[10px] px-2.5 py-1.5 rounded-md shadow-xl z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {modelOutputTooltips[col]}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {modelOutputSample.map((row, idx) => (
                              <tr
                                key={idx}
                                className={`${
                                  idx % 2 === 0 ? 'bg-white' : 'bg-[var(--surface-muted)]'
                                } hover:bg-green-50 transition-colors`}
                              >
                                {Object.values(row).map((value, colIdx) => (
                                  <td key={colIdx} className="px-3 py-2.5 text-[var(--ink-700)] border-b border-[var(--border)] whitespace-nowrap">
                                    {value}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Formatting Guidelines */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setRulesExpanded(!rulesExpanded)}
                  className="w-full px-5 py-3.5 bg-gradient-to-r from-amber-50 to-white hover:from-amber-100 hover:to-amber-50 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen size={16} className="text-amber-600" />
                    <span className="text-[14px] font-semibold text-[var(--ink-900)]">Formatting Guidelines</span>
                  </div>
                  {rulesExpanded ? <ChevronUp size={18} className="text-[var(--ink-500)]" /> : <ChevronDown size={18} className="text-[var(--ink-500)]" />}
                </button>

                {rulesExpanded && (
                  <div className="px-5 py-4 space-y-3.5 text-[12px] text-[var(--ink-700)] border-t border-[var(--border)] bg-white">
                    <div>
                      <div className="font-semibold text-[var(--ink-900)] mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                        Accepted File Formats
                      </div>
                      <div className="text-[var(--ink-600)] pl-3">CSV (.csv), Excel (.xlsx)</div>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--ink-900)] mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                        Date Format Examples
                      </div>
                      <div className="text-[var(--ink-600)] pl-3">
                        <div>✓ 2025-01-15</div>
                        <div>✓ 2025-12-31</div>
                        <div className="text-red-600">✗ 01/15/2025 (incorrect)</div>
                        <div className="text-red-600">✗ 15-Jan-2025 (incorrect)</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--ink-900)] mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                        Numeric Field Expectations
                      </div>
                      <div className="text-[var(--ink-600)] pl-3">
                        Columns like spend, reach, value, estimate must contain only numeric values. No currency symbols or special characters.
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--ink-900)] mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                        Upload Best Practices
                      </div>
                      <div className="text-[var(--ink-600)] pl-3">
                        <div>• Remove empty rows and columns</div>
                        <div>• Verify data types before upload</div>
                        <div>• Use UTF-8 encoding for CSV files</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--ink-900)] mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)]" />
                        Duplicate Row Recommendations
                      </div>
                      <div className="text-[var(--ink-600)] pl-3">
                        Remove duplicate rows based on cycle_id and date combination to avoid data inconsistencies.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Empty Dataset Modal */}
      {showEmptyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            {/* Modal Header */}
            <div className="px-6 py-6 border-b border-[var(--border)]">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                  <AlertTriangle size={24} className="text-amber-600" />
                </div>
                <h3 className="text-[17px] font-semibold text-[var(--ink-900)] mb-2">
                  Empty Dataset Detected
                </h3>
                <p className="text-[13px] text-[var(--ink-600)] leading-relaxed">
                  The uploaded file does not contain any usable data. Please upload a valid dataset.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[var(--surface-subtle)] flex justify-center gap-2 rounded-b-2xl">
              <Button
                variant="primary"
                onClick={() => {
                  setShowEmptyModal(false);
                  setDrawerOpen(true);
                }}
                leftIcon={<BookOpen size={14} />}
              >
                Refer Dataset Structure
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal - Wrong Format */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-[scaleIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--border)]">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={22} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-semibold text-[var(--ink-900)] mb-1.5">
                    Wrong Input Data Format
                  </h3>
                  <p className="text-[12.5px] text-[var(--ink-600)]">
                    The following issues were detected in your upload
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-5 space-y-5">
              {/* Error List */}
              <div className="space-y-2">
                {validationErrors.map((error, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <X size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <span className="text-[13px] text-red-900 font-medium">{error}</span>
                  </div>
                ))}
              </div>

              {/* Column Comparison */}
              {uploadedColumns.length > 0 && expectedColumns.length > 0 && (
                <div className="border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[var(--surface-muted)] border-b border-[var(--border)]">
                    <h4 className="text-[13px] font-semibold text-[var(--ink-900)]">Column Structure Comparison</h4>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                    {/* Uploaded Columns */}
                    <div className="px-4 py-3">
                      <div className="text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2">
                        Uploaded Columns
                      </div>
                      <div className="space-y-1.5">
                        {uploadedColumns.map((col, idx) => {
                          const isMismatch = !expectedColumns.includes(col);
                          return (
                            <div
                              key={idx}
                              className={`text-[12px] px-2 py-1 rounded ${
                                isMismatch
                                  ? 'bg-red-50 text-red-700 font-medium'
                                  : 'text-[var(--ink-700)]'
                              }`}
                            >
                              {isMismatch && <X size={12} className="inline mr-1" />}
                              {col}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Expected Columns */}
                    <div className="px-4 py-3">
                      <div className="text-[11px] font-semibold text-[var(--ink-500)] uppercase tracking-wide mb-2">
                        Expected Columns
                      </div>
                      <div className="space-y-1.5">
                        {expectedColumns.map((col, idx) => {
                          const isMissing = !uploadedColumns.includes(col);
                          return (
                            <div
                              key={idx}
                              className={`text-[12px] px-2 py-1 rounded ${
                                isMissing
                                  ? 'bg-red-50 text-red-700 font-medium'
                                  : 'text-[var(--ink-700)]'
                              }`}
                            >
                              {isMissing && <AlertTriangle size={12} className="inline mr-1" />}
                              {col}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-subtle)] flex justify-end gap-2 rounded-b-2xl">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowErrorModal(false);
                  setDrawerOpen(true);
                }}
                leftIcon={<BookOpen size={14} />}
              >
                Compare with Template
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowErrorModal(false);
                  setFile(null);
                  setValidationStatus('idle');
                  setUploadedColumns([]);
                  setExpectedColumns([]);
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
        @keyframes bounceIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes fadeUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </PageContainer>
  );
}