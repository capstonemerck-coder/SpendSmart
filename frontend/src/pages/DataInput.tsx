/**
 * DataInput.tsx
 *
 * Multi-stage file upload flow for Data Input module.
 * Stages: raw-data → target-variable → model-output → complete.
 * Uses FilterContext for cascading Market/Brand/Indication selection.
 * Wraps DataInputContent with FilterProvider for scoped filter state.
 */
import React from 'react';
import { FilterProvider } from '@/context/FilterContext';
import DataInputContent from './DataInputContent';

/**
 * DataInput
 *
 * Wrapper component that provides FilterContext to the Data Input flow.
 * Keeps filter state scoped to this module only.
 */
export default function DataInput() {
  return (
    <FilterProvider>
      <DataInputContent />
    </FilterProvider>
  );
}
