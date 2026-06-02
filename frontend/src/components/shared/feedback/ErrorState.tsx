import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/shared';

/**
 * ErrorState
 *
 * Full-area error display used when an API call or data fetch fails.
 * Shows a clear message and an optional retry action.
 *
 * @param {ErrorStateProps} props
 */
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--danger-bg)] flex items-center justify-center">
          <AlertCircle size={22} className="text-[var(--danger)]" />
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--ink-900)] mb-1">{title}</p>
          <p className="text-[13px] text-[var(--ink-500)]">{message}</p>
        </div>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
