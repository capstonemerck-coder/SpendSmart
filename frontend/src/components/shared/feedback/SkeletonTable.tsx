/**
 * SkeletonTable
 *
 * Animated placeholder table shown while tabular data is loading.
 * Renders the specified number of rows as grey skeleton bars.
 *
 * @param {SkeletonTableProps} props
 */
interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="w-full animate-pulse">
      {/* Header */}
      <div className="flex gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-subtle)]">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 bg-[var(--border)] rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 px-5 py-4 border-b border-[var(--border)]"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-3 bg-[var(--surface-subtle)] rounded flex-1"
              style={{ opacity: 1 - rowIdx * 0.1 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
