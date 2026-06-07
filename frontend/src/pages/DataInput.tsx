/**
 * DataInput.tsx
 *
 * Thin wrapper that renders DataInputContent.
 * FilterProvider is now provided at the app level (App.tsx),
 * so no local provider is needed here.
 */
import DataInputContent from './DataInputContent';

/**
 * DataInput
 *
 * Entry point for the Data Input module.
 * Renders DataInputContent which consumes FilterContext from the app-level provider.
 */
export default function DataInput({ onNavigate, onUploadComplete }: {
  onNavigate?: (tab: string) => void;
  onUploadComplete?: () => void;
}) {
  return <DataInputContent onNavigate={onNavigate} onUploadComplete={onUploadComplete} />;
}