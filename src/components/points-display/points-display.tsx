"use client";

/**
 * Renders a points number.
 *
 * NOTE: This was previously a RAF-driven count-up animation. With real data
 * (TanStack Query polling + invalidations on every mutation), the parent's
 * `value` prop oscillates between `0` (default while `meData` is briefly
 * undefined during a refetch) and the real total within a few milliseconds.
 * That cancelled the in-flight RAF chain before the first frame fired, and
 * `display` would never advance off `0`. Static render is correct, robust,
 * and accessible. Re-introduce a count-up only when `value` is guaranteed
 * stable across renders (e.g. via `useDeferredValue` or a debounced wrapper).
 */
export function AnimatedNumber({ value }: { value: number }) {
  return <>{value}</>;
}

/* ================================================================
 * Mobile header variant: compact inline
 * ================================================================ */

interface MobilePointsProps {
  userPoints: number;
  partnerPoints?: number;
  userPointsToday?: number;
  partnerPointsToday?: number;
}

export function MobilePoints({
  userPoints,
  partnerPoints,
  userPointsToday = 0,
  partnerPointsToday = 0,
}: MobilePointsProps) {
  const hasPartner = partnerPoints !== undefined;
  return (
    <div className="flex items-baseline gap-[var(--space-3)] tabular-nums">
      {/* User points */}
      <span className="flex items-baseline gap-[var(--space-1-5)]">
        <span className="text-[length:var(--text-base)] font-[var(--weight-bold)] text-[color:var(--color-accent)] leading-none">
          {userPoints > 0 ? <AnimatedNumber value={userPoints} /> : <span aria-label="no points yet">—</span>}
        </span>
        {userPointsToday > 0 && (
          <span
            className="text-[length:var(--text-xs)] font-[var(--weight-semibold)] text-[color:var(--color-success)]"
            aria-label={`${userPointsToday} earned today`}
          >
            +{userPointsToday}
          </span>
        )}
      </span>

      {/* Partner block — only when paired. Solo state hides this entirely
          to avoid the misleading "0 · 0" leaderboard read. */}
      {hasPartner && (
        <>
          <span className="text-[length:var(--text-xs)] text-[color:var(--color-text-disabled)]" aria-hidden="true">&middot;</span>
          <span className="flex items-baseline gap-[var(--space-1-5)]">
            <span className="text-[length:var(--text-base)] font-[var(--weight-medium)] text-[color:var(--color-text-secondary)] leading-none">
              {partnerPoints! > 0 ? <AnimatedNumber value={partnerPoints!} /> : <span aria-label="partner has no points yet">—</span>}
            </span>
            {partnerPointsToday > 0 && (
              <span
                className="text-[length:var(--text-xs)] font-[var(--weight-semibold)] text-[color:var(--color-success)]"
                aria-label={`partner earned ${partnerPointsToday} today`}
              >
                +{partnerPointsToday}
              </span>
            )}
          </span>
        </>
      )}
    </div>
  );
}
