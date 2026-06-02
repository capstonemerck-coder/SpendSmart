import { useState } from 'react';
import { Modal, Button, Field, Input } from '@/components/shared';
import type { CycleSummary } from '@/utils/types';

/**
 * CycleCreateModal
 *
 * Modal for creating a new planning cycle.
 * Validates that the cycle ID (name) is non-empty before enabling submit.
 * Shows field-level error on conflict (409) or validation failure.
 * On success, calls onCreated with the new cycle and closes.
 *
 * @param {CycleCreateModalProps} props
 */
interface CycleCreateModalProps {
  isCreating: boolean;
  createError: string | null;
  onClose: () => void;
  onSubmit: (cycleId: string, description: string) => Promise<void>;
}

export function CycleCreateModal({
  isCreating,
  createError,
  onClose,
  onSubmit,
}: CycleCreateModalProps) {
  const [cycleId, setCycleId] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  const idError = touched && !cycleId.trim() ? 'Cycle ID is required.' : null;
  const canSubmit = cycleId.trim().length > 0 && !isCreating;

  const handleSubmit = async () => {
    setTouched(true);
    if (!cycleId.trim()) return;
    await onSubmit(cycleId.trim(), description.trim());
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Create planning cycle"
      subtitle="Add a new named cycle for grouping uploads"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isCreating}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!canSubmit}>
            {isCreating ? 'Creating…' : 'Create cycle'}
          </Button>
        </>
      }
    >
      <div className="px-6 py-5 space-y-4">
        <Field
          label="Cycle ID"
          required
          hint="A short unique identifier, e.g. Q3-2025 or FY2026-H1"
          error={idError ?? createError ?? undefined}
        >
          <Input
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="Q3-2025"
            invalid={!!(idError || createError)}
            maxLength={50}
            autoFocus
          />
        </Field>
        <Field label="Description" hint="Optional — describe what this cycle covers">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Q3 2025 US market model refresh"
          />
        </Field>
      </div>
    </Modal>
  );
}
