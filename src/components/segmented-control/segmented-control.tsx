"use client";

import { useRef, useCallback, useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ================================================================
 * Types
 * ================================================================ */

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  /** The available options. Minimum 2. */
  options: SegmentedControlOption<T>[];
  /** Currently selected value. */
  value: T;
  /** Called when the user selects an option. */
  onChange: (value: T) => void;
  /** Accessible label for the radiogroup (e.g. "Filter tasks by assignee"). */
  ariaLabel: string;
  /** Whether all options are disabled. */
  disabled?: boolean;
  /**
   * Visual size variant.
   * - "default": standard size for toolbars (--text-sm, full padding)
   * - "compact": smaller for inline/form contexts (--text-xs, tighter padding)
   */
  size?: "default" | "compact";
  /** Additional className for the outer container. */
  className?: string;
}

/* ================================================================
 * SegmentedControl
 *
 * A radiogroup presented as a row of pill-shaped options with an
 * animated sliding indicator on the active option. Supports arrow-key
 * navigation with roving tabindex.
 *
 * Extracted from FilterToggle to serve as a shared primitive for any
 * binary or multi-option toggle: filter bar, deadline type, repeat
 * mode, settings preferences, etc.
 * ================================================================ */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  size = "default",
  className = "",
}: SegmentedControlProps<T>) {
  const shouldReduceMotion = useReducedMotion();
  const groupRef = useRef<HTMLDivElement>(null);
  const layoutId = useId();

  const currentIndex = options.findIndex((o) => o.value === value);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;
      let nextIndex = currentIndex;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % options.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + options.length) % options.length;
      } else {
        return;
      }

      onChange(options[nextIndex].value);

      // Move focus to the newly active button (roving tabindex)
      const buttons =
        groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
      buttons?.[nextIndex]?.focus();
    },
    [currentIndex, onChange, options, disabled],
  );

  const isCompact = size === "compact";

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={[
        "inline-flex rounded-[var(--radius-lg)]",
        "bg-[var(--color-canvas)] border border-[var(--color-border)]",
        isCompact ? "gap-0 p-[var(--space-0-5)]" : "gap-[var(--space-1)] p-[var(--space-1)]",
        disabled ? "opacity-50 pointer-events-none" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {options.map(({ value: optValue, label }) => {
        const isActive = value === optValue;
        return (
          <button
            key={optValue}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(optValue)}
            disabled={disabled}
            className={[
              "relative",
              isCompact
                ? "px-[var(--space-3)] py-[var(--space-1-5)]"
                : "px-[var(--space-3)] py-[var(--space-1)]",
              isCompact
                ? "rounded-[var(--radius-sm)]"
                : "rounded-[var(--radius-md)]",
              isCompact
                ? "text-[length:var(--text-xs)]"
                : "text-[length:var(--text-sm)]",
              "font-[var(--weight-medium)]",
              "transition-colors duration-[var(--duration-instant)]",
              "min-h-[var(--touch-target-min)]",
              "flex items-center justify-center",
              isCompact ? "" : "min-w-[3.5rem]",
              isActive
                ? "text-[color:var(--color-text-primary)]"
                : "text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className={[
                  "absolute inset-0",
                  isCompact
                    ? "rounded-[var(--radius-sm)]"
                    : "rounded-[var(--radius-md)]",
                  "bg-[var(--color-surface-elevated)] shadow-[var(--shadow-sm)]",
                ].join(" ")}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : {
                        type: "tween",
                        duration: 0.2,
                        ease: [0.25, 1, 0.5, 1],
                      }
                }
              />
            )}
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
