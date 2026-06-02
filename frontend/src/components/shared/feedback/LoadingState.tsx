/**
 * LoadingState
 *
 * Full-area loading indicator used across all screens while data is being fetched.
 * Renders a centred spinner with an optional status message.
 *
 * @param {LoadingStateProps} props
 */
interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = 'Loading…', fullScreen = false }: LoadingStateProps) {
  const containerClass = fullScreen
    ? 'h-screen flex items-center justify-center bg-white'
    : 'flex-1 flex items-center justify-center py-20';

  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-9 h-9 border-[3px] border-[var(--border)] border-t-[var(--brand)] rounded-full animate-spin" />
        <p className="text-[13px] text-[var(--ink-500)]">{message}</p>
      </div>
    </div>
  );
}
