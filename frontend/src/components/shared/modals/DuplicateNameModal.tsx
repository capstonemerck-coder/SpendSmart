import { AlertCircle } from 'lucide-react';
import { Modal, Button } from '@/components/shared';

interface DuplicateNameModalProps {
  scenarioName: string;
  onClose: () => void;
}

export function DuplicateNameModal({ scenarioName, onClose }: DuplicateNameModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Duplicate scenario name"
      subtitle="Each scenario must have a unique name"
      footer={<Button variant="primary" onClick={onClose}>OK</Button>}
    >
      <div className="px-6 py-6">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-[var(--danger-bg)] flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} className="text-[var(--danger)]" />
          </div>
          <div className="text-[13.5px] text-[var(--ink-700)] leading-relaxed pt-1">
            A scenario named{' '}
            <span className="font-semibold text-[var(--ink-900)]">"{scenarioName}"</span> already
            exists. Please choose a different name and try again.
          </div>
        </div>
      </div>
    </Modal>
  );
}
