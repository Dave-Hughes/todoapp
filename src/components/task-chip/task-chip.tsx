"use client";

import { forwardRef, type ReactNode } from "react";

export interface TaskChipProps {
  /** Icon element rendered at the start of the chip (emoji or Lucide icon). */
  icon: ReactNode;
  /** Human-readable label showing the current value of this field. */
  label: string;
  /** Accessible label for the chip button (e.g. "Set due date"). Distinct from visible label. */
  ariaLabel: string;
  /**
   * Click handler. Opens the associated picker.
   */
  onClick?: () => void;
  /** Whether the chip is disabled (e.g. during form submission). */
  disabled?: boolean;
  /** Whether the chip's picker is open. Controls aria-expanded and active styling. */
  isActive?: boolean;
  /** Additional className for layout overrides (e.g. flex shrink). */
  className?: string;
}

/**
 * TaskChip
 *
 * A quiet, rounded chip representing a single task field (date, assignee,
 * category, repeat, overflow). Displays the current value of the field as a
 * tappable/clickable pill. Clicking opens a field picker (Phase 2+).
 *
 * Designed to be tactile and warm, not dense or Todoist-like. Chips feel like
 * soft physical buttons — they respond to hover, focus, and active states.
 */
export const TaskChip = forwardRef<HTMLButtonElement, TaskChipProps>(
  function TaskChip(
    {
      icon,
      label,
      ariaLabel,
      onClick,
      disabled = false,
      isActive = false,
      className = "",
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isActive ? true : undefined}
        onClick={onClick}
        disabled={disabled}
        className={[
          // Layout
          "inline-flex items-center gap-[var(--space-1-5)]",
          "px-[var(--space-3)] py-[var(--space-1-5)]",
          // Shape
          "rounded-[var(--radius-full)]",
          // Typography
          "text-[length:var(--text-sm)] font-[var(--weight-medium)]",
          "leading-[var(--leading-tight)]",
          // Touch target — inline-flex keeps it tight but min-h ensures 44px tap zone
          "min-h-[var(--touch-target-min)]",
          // Surfaces — active state uses accent-subtle bg + accent border
          isActive
            ? [
                "bg-[var(--color-accent-subtle)]",
                "border border-[var(--color-accent)]",
                "text-[color:var(--color-accent-hover)]",
              ].join(" ")
            : [
                "bg-[var(--color-chip-bg)]",
                "border border-[var(--color-border-subtle)]",
                "text-[color:var(--color-text-secondary)]",
              ].join(" "),
          // Interactions (non-active only)
          !isActive &&
            "hover:bg-[var(--color-chip-bg-hover)] hover:border-[var(--color-border)]",
          !isActive && "hover:text-[color:var(--color-text-primary)]",
          "active:scale-[0.97]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]",
          "transition-[background-color,border-color,color,transform] duration-[var(--duration-instant)]",
          // Disabled
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          // Caller overrides
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Icon — aria-hidden since the ariaLabel carries the full meaning */}
        <span
          className="text-[length:var(--text-sm)] leading-none shrink-0"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="truncate max-w-[10rem]">{label}</span>
      </button>
    );
  },
);
