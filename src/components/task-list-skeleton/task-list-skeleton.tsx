/**
 * Pulsing placeholder shown while task data loads.
 *
 * Three rows of varying width mimic real TaskListItem rows.
 * Uses the `--color-skeleton` design token for the pulse fill.
 */

interface TaskListSkeletonProps {
  /** Number of placeholder rows (default 3). */
  count?: number;
}

export function TaskListSkeleton({ count = 3 }: TaskListSkeletonProps) {
  return (
    <div
      className="flex flex-col gap-[var(--space-3)]"
      aria-busy="true"
      aria-label="Loading tasks"
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
        >
          <div className="h-[1.125rem] w-[1.125rem] rounded-[var(--radius-full)] bg-[var(--color-skeleton)] animate-pulse" />
          <div className="flex-1 flex flex-col gap-[var(--space-2)]">
            <div
              className="h-[0.875rem] rounded-[var(--radius-sm)] bg-[var(--color-skeleton)] animate-pulse"
              style={{ width: `${55 + (i + 1) * 12}%` }}
            />
            <div
              className="h-[0.625rem] rounded-[var(--radius-sm)] bg-[var(--color-skeleton)] animate-pulse"
              style={{ width: `${30 + (i + 1) * 8}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
