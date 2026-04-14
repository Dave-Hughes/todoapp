"use client";

import { useRef, useEffect, useCallback } from "react";

/* ================================================================
 * Types
 * ================================================================ */

export type CategoryValue =
  | "Uncategorized"
  | "Errands"
  | "Health"
  | "Home"
  | "Bills";

export interface CategoryPickerProps {
  /** Currently selected category. */
  value: CategoryValue;
  /** Called when the user picks a category. */
  onChange: (value: CategoryValue) => void;
}

/* ================================================================
 * Category list — matches demo data in page.tsx
 * ================================================================ */

const CATEGORIES: { value: CategoryValue; colorSlot: number }[] = [
  { value: "Uncategorized", colorSlot: 0 },
  { value: "Errands", colorSlot: 1 },
  { value: "Health", colorSlot: 2 },
  { value: "Home", colorSlot: 3 },
  { value: "Bills", colorSlot: 4 },
];

/* Color slot CSS variable mapping (1-indexed in tokens) */
function getCategoryColor(slot: number): {
  text: string;
  bg: string;
} {
  if (slot === 0) {
    return {
      text: "var(--color-text-tertiary)",
      bg: "var(--color-surface-dim)",
    };
  }
  return {
    text: `var(--color-category-${slot})`,
    bg: `var(--color-category-${slot}-subtle)`,
  };
}

/* ================================================================
 * CategoryPicker
 *
 * A listbox showing categories with colored dot indicators.
 * Used inside Popover on both breakpoints.
 *
 * Keyboard: Up/Down arrow moves, Enter selects, Home/End jump.
 * ================================================================ */

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndex = CATEGORIES.findIndex((c) => c.value === value);

  /* Focus the selected option on mount */
  useEffect(() => {
    requestAnimationFrame(() => {
      const active = listRef.current?.querySelector<HTMLElement>(
        '[aria-selected="true"]',
      );
      active?.focus();
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextIndex = activeIndex;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          nextIndex = Math.min(activeIndex + 1, CATEGORIES.length - 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          nextIndex = Math.max(activeIndex - 1, 0);
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = CATEGORIES.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onChange(CATEGORIES[activeIndex].value);
          return;
        default:
          return;
      }

      if (nextIndex !== activeIndex) {
        onChange(CATEGORIES[nextIndex].value);
      }
    },
    [activeIndex, onChange],
  );

  return (
    <div className="min-w-[220px] max-w-[calc(100vw-var(--space-8))]">
      {/* Header */}
      <div className="px-[var(--space-3)] pt-[var(--space-3)] pb-[var(--space-2)]">
        <p className="text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-text-tertiary)]">
          File it where?
        </p>
      </div>

      {/* List */}
      <div
        ref={listRef}
        role="listbox"
        aria-label="Set category"
        onKeyDown={handleKeyDown}
        className="py-[var(--space-1)]"
      >
        {CATEGORIES.map((cat) => {
          const isSelected = cat.value === value;
          const colors = getCategoryColor(cat.colorSlot);

          return (
            <button
              key={cat.value}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(cat.value)}
              className={[
                "w-full flex items-center gap-[var(--space-3)]",
                "px-[var(--space-3)] py-[var(--space-2)]",
                "text-[length:var(--text-sm)]",
                "min-h-[var(--touch-target-min)]",
                "transition-colors duration-[var(--duration-instant)]",
                isSelected
                  ? "bg-[var(--color-accent-subtle)] text-[color:var(--color-text-primary)] font-[var(--weight-medium)]"
                  : "text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-dim)]",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-border-focus)]",
              ].join(" ")}
            >
              {/* Color dot */}
              <span
                className="w-3 h-3 rounded-[var(--radius-full)] shrink-0"
                style={{ backgroundColor: colors.text }}
                aria-hidden="true"
              />
              <span>{cat.value}</span>
              {/* Check mark for selected */}
              {isSelected && (
                <span
                  className="ml-auto text-[color:var(--color-accent)]"
                  aria-hidden="true"
                >
                  &#10003;
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
