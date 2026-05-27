import { Lock, ArrowLeft } from 'lucide-react';
import { Button, Card } from '@/components/shared';

interface UnauthorizedScreenProps {
  attemptedScreen: string;
  onGoHome: () => void;
}

export default function UnauthorizedScreen({ attemptedScreen, onGoHome }: UnauthorizedScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <Card className="p-10 max-w-md w-full text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--danger-bg)] flex items-center justify-center mx-auto mb-5">
          <Lock size={22} className="text-[var(--danger)]" />
        </div>
        <h2 className="font-display text-[22px] font-semibold text-[var(--ink-900)] mb-2 tracking-tight">
          Access denied
        </h2>
        <p className="text-[13.5px] text-[var(--ink-700)] mb-1">
          You don't have permission to view{' '}
          <strong className="text-[var(--ink-900)]">{attemptedScreen}</strong>.
        </p>
        <p className="text-[12px] text-[var(--ink-500)] mb-7">
          Contact your administrator if you believe this is a mistake.
        </p>
        <Button variant="primary" onClick={onGoHome} leftIcon={<ArrowLeft size={14} />}>
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
