import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

/**
 * EmptyState
 *
 * Displayed when a data set is empty — no results found, nothing uploaded yet, etc.
 * Supports an optional action slot for prompting the user to create or upload.
 *
 * @param {EmptyStateProps} props
 */
interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title = 'No data yet',
  message = 'Nothing here yet. Data will appear once it has been added.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--ink-400)]">
          {icon ?? <Inbox size={22} />}
        </div>
        <div>
          <p className="text-[15px] font-semibold text-[var(--ink-900)] mb-1">{title}</p>
          <p className="text-[13px] text-[var(--ink-500)]">{message}</p>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}
