/**
 * TemplateDrawer.tsx
 *
 * Right-side slide-in drawer showing expected DATA_FACT and MODEL_FACT column
 * structures with sample rows, column tooltips, and formatting guidelines.
 * Used by the Data Input module to guide correct file preparation.
 * Manages its own expand/collapse state for each dataset section.
 */
import React, { useState } from 'react';
import { X, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { DrawerDataset } from './DrawerDataset';

// ── Constants ─────────────────────────────────────────────────────────────────

const DATA_FACT_COLS = ['cycle_id', 'date', 'channel', 'sub_channel', 'variable', 'spend', 'reach', 'value'];
const MODEL_FACT_COLS = [
  'cycle_id', 'variable', 'channel', 'sub_channel', 'category', 'estimate',
  'curve_type', 'curvature', 'adstock_rate', 'adstock_horizon', 'p_value',
  'impactable_sales_pct', 'base_sales',
];

const DATA_FACT_TOOLTIPS: Record<string, string> = {
  cycle_id:    'Unique identifier for the marketing cycle',
  date:        'Transaction date in YYYY-MM-DD format',
  channel:     'Primary marketing channel (e.g. Digital, TV)',
  sub_channel: 'Specific sub-channel within the channel',
  variable:    'Metric being tracked (sales, impressions, etc.)',
  spend:       'Marketing spend amount in USD — must be numeric',
  reach:       'Total audience reach count — must be numeric',
  value:       'Calculated metric value — must be numeric',
};

const MODEL_FACT_TOOLTIPS: Record<string, string> = {
  cycle_id:             'Marketing cycle identifier',
  variable:             'Spend variable name from raw data',
  channel:              'Marketing channel category',
  sub_channel:          'Channel subdivision',
  category:             'Audience category (HCP-PP, HCP-NPP, Consumer)',
  estimate:             'Model coefficient — numeric',
  curve_type:           'Response curve type (adstock, diminishing_returns)',
  curvature:            'Curve shape parameter — numeric',
  adstock_rate:         'Ad carryover decay rate — numeric 0–1',
  adstock_horizon:      'Effect decay period in weeks — integer',
  p_value:              'Statistical significance — numeric 0–1',
  impactable_sales_pct: 'Percentage of sales attributable to media — numeric',
  base_sales:           'Baseline sales amount — numeric',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Downloads a CSV template file for the given upload type.
 *
 * @param {'raw-data' | 'model-output'} type - Which template to download.
 */
const downloadTemplate = (type: 'raw-data' | 'model-output') => {
  const cols = type === 'raw-data' ? DATA_FACT_COLS : MODEL_FACT_COLS;
  const blob = new Blob([cols.join(',') + '\n'], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `template_${type.replace('-', '_')}.csv`,
  });
  a.click();
  URL.revokeObjectURL(url);
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateDrawerProps {
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * TemplateDrawer
 *
 * Slide-in panel with DATA_FACT and MODEL_FACT schema previews and formatting
 * rules. Manages expand/collapse state for each section internally.
 * Animated via slideInRight keyframe defined in a scoped style block.
 *
 * @param {TemplateDrawerProps} props
 */
export function TemplateDrawer({ onClose }: TemplateDrawerProps) {
  const [rawExp, setRawExp]     = useState(true);
  const [modelExp, setModelExp] = useState(true);
  const [rulesExp, setRulesExp] = useState(false);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" onClick={onClose} />
      <div
        className="fixed top-0 right-0 bottom-0 w-[560px] bg-white shadow-2xl z-50 flex flex-col"
        style={{ animation: 'slideInRight 0.3s ease-out' }}
      >
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-start justify-between">
          <h3 className="text-[17px] font-semibold text-[var(--ink-900)]">Expected Dataset Structure</h3>
          <button onClick={onClose} className="text-[var(--ink-400)] hover:text-[var(--ink-700)] p-1.5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <DrawerDataset
            title="DATA_FACT (Raw Data)"
            color="var(--brand)"
            expanded={rawExp}
            onToggle={() => setRawExp((e) => !e)}
            onDownload={() => downloadTemplate('raw-data')}
            columns={DATA_FACT_COLS}
            tooltips={DATA_FACT_TOOLTIPS}
            sampleRows={[
              { cycle_id: 'C2025Q1', date: '2025-01-15', channel: 'Digital', sub_channel: 'Social Media', variable: 'sales',      spend: '125000', reach: '450000', value: '3.2' },
              { cycle_id: 'C2025Q1', date: '2025-01-22', channel: 'Events',  sub_channel: 'Conferences',  variable: 'impressions', spend: '85000',  reach: '320000', value: '2.8' },
              { cycle_id: 'C2025Q2', date: '2025-04-10', channel: 'TV',      sub_channel: 'Cable',        variable: 'conversions', spend: '95000',  reach: '380000', value: '4.1' },
            ]}
          />

          <DrawerDataset
            title="MODEL_FACT (Model Output)"
            color="#16a34a"
            expanded={modelExp}
            onToggle={() => setModelExp((e) => !e)}
            onDownload={() => downloadTemplate('model-output')}
            columns={MODEL_FACT_COLS}
            tooltips={MODEL_FACT_TOOLTIPS}
            sampleRows={[
              { cycle_id: 'C2025Q1', variable: 'digital_spend', channel: 'Digital', sub_channel: 'Social Media', category: 'HCP-NPP',  estimate: '0.0342', curve_type: 'adstock',             curvature: '0.85', adstock_rate: '0.45', adstock_horizon: '8',  p_value: '0.001', impactable_sales_pct: '23.4', base_sales: '1250000' },
              { cycle_id: 'C2025Q1', variable: 'tv_spend',      channel: 'TV',      sub_channel: 'Cable',        category: 'Consumer', estimate: '0.0287', curve_type: 'diminishing_returns', curvature: '0.72', adstock_rate: '0.38', adstock_horizon: '12', p_value: '0.003', impactable_sales_pct: '31.2', base_sales: '1450000' },
              { cycle_id: 'C2025Q2', variable: 'events_spend',  channel: 'Events',  sub_channel: 'Conferences',  category: 'HCP-PP',   estimate: '0.0419', curve_type: 'adstock',             curvature: '0.91', adstock_rate: '0.52', adstock_horizon: '6',  p_value: '0.002', impactable_sales_pct: '18.7', base_sales: '980000'  },
            ]}
          />

          {/* Formatting guidelines */}
          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <button
              onClick={() => setRulesExp(!rulesExp)}
              className="w-full px-5 py-3.5 bg-amber-50 flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <BookOpen size={16} className="text-amber-600" />
                <span className="text-[14px] font-semibold text-[var(--ink-900)]">Formatting Guidelines</span>
              </div>
              {rulesExp ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {rulesExp && (
              <div className="px-5 py-4 space-y-2.5 text-[12px] text-[var(--ink-700)] border-t border-[var(--border)] bg-white">
                <p><strong>Date format:</strong> YYYY-MM-DD (multiple formats accepted)</p>
                <p><strong>Numeric fields:</strong> Plain numbers only, no currency symbols</p>
                <p><strong>Accepted formats:</strong> CSV (.csv), Excel (.xlsx, .xls)</p>
                <p><strong>Duplicates:</strong> Removed automatically</p>
                <p><strong>Cycle ID:</strong> Auto-detected from file if not specified</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
