"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Animated number that counts from previous value to current value.
 * Uses RAF for smooth 60fps counting. Respects prefers-reduced-motion.
 */
export function AnimatedNumber({ value }: { value: number }) {
  const shouldReduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to || shouldReduceMotion) {
      setDisplay(to);
      return;
    }

    const duration = 300;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out-quart: 1 - (1 - t)^4
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplay(Math.round(from + (to - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, shouldReduceMotion]);

  return <>{display}</>;
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
  return (
    <div className="flex items-baseline gap-[var(--space-3)] tabular-nums">
      {/* User points */}
      <span className="flex items-baseline gap-[var(--space-1)]">
        <span className="text-[length:var(--text-sm)] font-[var(--weight-bold)] text-[color:var(--color-accent)]">
          <AnimatedNumber value={userPoints} />
        </span>
        {userPointsToday > 0 && (
          <span className="text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-success)] opacity-70">
            +{userPointsToday}
          </span>
        )}
      </span>

      {/* Separator */}
      {partnerPoints !== undefined && (
        <>
          <span className="text-[length:var(--text-xs)] text-[color:var(--color-text-disabled)]">&middot;</span>
          <span className="flex items-baseline gap-[var(--space-1)]">
            <span className="text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-tertiary)]">
              <AnimatedNumber value={partnerPoints} />
            </span>
            {partnerPointsToday > 0 && (
              <span className="text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-success)] opacity-70">
                +{partnerPointsToday}
              </span>
            )}
          </span>
        </>
      )}
    </div>
  );
}
