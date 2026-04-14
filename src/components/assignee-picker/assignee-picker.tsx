"use client";

import { useRef, useEffect, useCallback } from "react";

/* ================================================================
 * Types
 * ================================================================ */

export type AssigneeValue = "me" | "partner" | "shared";

export interface AssigneePickerProps {
  /** Currently selected assignee. */
  value: AssigneeValue;
  /** Called when the user picks an assignee. */
  onChange: (value: AssigneeValue) => void;
  /** Current user's display name. */
  userName: string;
  /** Partner's display name. */
  partnerName: string;
}

/* ================================================================
 * Helpers
 * ================================================================ */

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

const OPTIONS: { value: AssigneeValue; label: (u: string, p: string) => string }[] = [
  { value: "me", label: (u) => u },
  { value: "partner", label: (_, p) => p },
  { value: "shared", label: () => "Shared" },
];

/* ================================================================
 * AssigneePicker
 *
 * A compact listbox showing Me / Partner / Shared with avatar initials.
 * Used inside Popover on both breakpoints.
 *
 * Keyboard: Up/Down arrow moves, Enter selects, Home/End jump.
 * ================================================================ */

export function AssigneePicker({
  value,
  onChange,
  userName,
  partnerName,
}: AssigneePickerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeIndex = OPTIONS.findIndex((o) => o.value === value);

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
          nextIndex = Math.min(activeIndex + 1, OPTIONS.length - 1);
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
          nextIndex = OPTIONS.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          onChange(OPTIONS[activeIndex].value);
          return;
        default:
          return;
      }

      if (nextIndex !== activeIndex) {
        onChange(OPTIONS[nextIndex].value);
      }
    },
    [activeIndex, onChange],
  );

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Set assignee"
      onKeyDown={handleKeyDown}
      className="min-w-[200px] max-w-[calc(100vw-var(--space-8))] py-[var(--space-1)]"
    >
      {OPTIONS.map((opt) => {
        const label = opt.label(userName, partnerName);
        const isSelected = opt.value === value;
        const initial =
          opt.value === "shared" ? "S" : getInitial(label);

        return (
          <button
            key={opt.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(opt.value)}
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
            {/* Avatar initial */}
            <span
              className={[
                "w-7 h-7 rounded-[var(--radius-full)]",
                "flex items-center justify-center shrink-0",
                "text-[length:var(--text-xs)] font-[var(--weight-semibold)]",
                isSelected
                  ? "bg-[var(--color-accent)] text-[color:var(--color-accent-text)]"
                  : "bg-[var(--color-chip-bg)] text-[color:var(--color-text-secondary)]",
              ].join(" ")}
              aria-hidden="true"
            >
              {initial}
            </span>
            <span>{label}</span>
            {/* Check mark for selected */}
            {isSelected && (
              <span className="ml-auto text-[color:var(--color-accent)]" aria-hidden="true">
                &#10003;
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
