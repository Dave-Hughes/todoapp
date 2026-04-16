"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useRef, type KeyboardEvent } from "react";
import { EASE_OUT_QUART } from "../../lib/motion";

export interface WeekDay {
  /** ISO date (YYYY-MM-DD). */
  iso: string;
  /** Short day label ("Sun", "Mon"...). */
  shortName: string;
  /** Date of month as a number (1–31). */
  dayOfMonth: number;
  /** Total task count for this day across the household (pre-filter). */
  count: number;
  /** True if this day is today. */
  isToday: boolean;
}

interface WeekDayStripProps {
  days: WeekDay[];
  selectedIso: string;
  onSelect: (iso: string) => void;
}

/**
 * Horizontal day strip for the Week view. Seven tappable pills,
 * each showing a day name, date, and a density indicator (1–3 dots
 * capped, "3+" beyond). Today is given visual emphasis even when it's
 * not the selected day — it's the anchor within the week.
 *
 * Keyboard: arrow keys move focus + select between days and clamp at the
 * Sunday/Saturday ends (no wrap — week-over-week nav is its own affordance).
 * Home/End jump to the first/last day. Tab moves to the next focusable element.
 */
export function WeekDayStrip({ days, selectedIso, onSelect }: WeekDayStripProps) {
  const shouldReduceMotion = useReducedMotion();
  const listRef = useRef<HTMLDivElement>(null);

  function focusIndex(idx: number) {
    const node = listRef.current?.querySelectorAll<HTMLButtonElement>("[data-day-pill]")[idx];
    node?.focus();
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = days.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = Math.min(index + 1, last);
    else if (e.key === "ArrowLeft") next = Math.max(index - 1, 0);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next != null && next !== index) {
      e.preventDefault();
      onSelect(days[next].iso);
      focusIndex(next);
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Days of the week"
      className="flex items-stretch gap-[var(--space-1)] overflow-x-auto -mx-[var(--space-2)] px-[var(--space-2)] pb-[var(--space-2)] scroll-smooth"
    >
      {days.map((day, idx) => {
        const isSelected = day.iso === selectedIso;
        return (
          <motion.button
            key={day.iso}
            data-day-pill
            role="tab"
            type="button"
            aria-selected={isSelected}
            aria-current={day.isToday ? "date" : undefined}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(day.iso)}
            onKeyDown={(e) => onKey(e, idx)}
            initial={false}
            animate={{ scale: isSelected ? 1 : 0.98 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.18, ease: EASE_OUT_QUART }
            }
            className={`
              relative flex-1 min-w-[2.75rem] sm:min-w-[3.5rem]
              flex flex-col items-center justify-center
              gap-[var(--space-1)]
              px-[var(--space-1)] sm:px-[var(--space-2)] py-[var(--space-3)]
              rounded-[var(--radius-lg)]
              min-h-[var(--touch-target-min)]
              outline-none
              transition-colors duration-[var(--duration-fast)]
              focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)]
              ${
                isSelected
                  ? "bg-[var(--color-accent)] text-[color:var(--color-accent-text)] shadow-[var(--shadow-sm)]"
                  : day.isToday
                    ? "bg-[var(--color-accent-subtle)] text-[color:var(--color-accent)] hover:bg-[var(--color-surface)]"
                    : "bg-[var(--color-surface)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-dim)] hover:text-[color:var(--color-text-primary)]"
              }
            `}
          >
            <span
              className={`
                text-[length:var(--text-xs)]
                font-[var(--weight-semibold)]
                uppercase tracking-[0.08em]
                ${isSelected ? "" : "opacity-80"}
              `}
            >
              {day.shortName}
            </span>
            <span
              className={`
                font-[family-name:var(--font-display)]
                text-[length:var(--text-xl)]
                font-[var(--weight-bold)]
                tabular-nums leading-none
              `}
            >
              {day.dayOfMonth}
            </span>
            <DensityDots count={day.count} isSelected={isSelected} />
            {day.isToday && !isSelected && (
              <span
                aria-hidden="true"
                className="
                  absolute -top-[var(--space-1)] right-[var(--space-2)]
                  text-[length:var(--text-xs)]
                  font-[var(--weight-semibold)]
                  text-[color:var(--color-accent)]
                  bg-[var(--color-canvas)]
                  px-[var(--space-1)] rounded-[var(--radius-sm)]
                  leading-none
                "
              >
                today
              </span>
            )}
            <span className="sr-only">
              {new Date(`${day.iso}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              {day.isToday ? ", today" : ""}
              {day.count > 0
                ? `, ${day.count} ${day.count === 1 ? "task" : "tasks"}`
                : ", no tasks"}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

function DensityDots({ count, isSelected }: { count: number; isSelected: boolean }) {
  if (count === 0) {
    return (
      <span
        aria-hidden="true"
        className="block h-[var(--space-1)] w-[var(--space-1)] rounded-[var(--radius-full)] opacity-0"
      />
    );
  }
  const dots = Math.min(count, 3);
  const color = isSelected
    ? "bg-[var(--color-accent-text)]"
    : "bg-[var(--color-accent)]";
  return (
    <span
      aria-hidden="true"
      className="flex items-center gap-[var(--space-0-5)] h-[var(--space-1)]"
    >
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className={`h-[var(--space-1)] w-[var(--space-1)] rounded-[var(--radius-full)] ${color} ${
            isSelected ? "" : "opacity-80"
          }`}
        />
      ))}
      {count > 3 && (
        <span
          className={`
            ml-[var(--space-0-5)]
            text-[length:var(--text-xs)]
            font-[var(--weight-semibold)]
            leading-none
            ${isSelected ? "text-[color:var(--color-accent-text)]" : "text-[color:var(--color-accent)]"}
          `}
        >
          +
        </span>
      )}
    </span>
  );
}
