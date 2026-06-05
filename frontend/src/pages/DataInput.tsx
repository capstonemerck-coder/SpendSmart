/**
 * DataInput.tsx
 *
 * Wrapper component that provides FilterContext to the Data Input flow.
 * Scopes Market/Brand/Indication filter state to this module only.
 */
import React from 'react';
import { FilterProvider } from '@/context/FilterContext';
import DataInputContent from './DataInputContent';

interface DataInputProps {
  onNavigate?: (tab: string) => void;
  onUploadComplete?: () => void;
}

/**
 * DataInput
 *
 * Wraps DataInputContent with FilterProvider so filter state is scoped to
 * the Data Input module. Passes navigation and upload callbacks through.
 *
 * @param {DataInputProps} props
 */
export default function DataInput({ onNavigate, onUploadComplete }: DataInputProps) {
  return (
    <FilterProvider>
      <DataInputContent onNavigate={onNavigate} onUploadComplete={onUploadComplete} />
    </FilterProvider>
  );
}
