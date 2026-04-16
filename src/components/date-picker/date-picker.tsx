"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ================================================================
 * Types
 * ================================================================ */

export interface DatePickerProps {
  /** Currently selected date (ISO string, e.g. "2026-04-14"). */
  value: string;
  /** Called when the user picks a date. */
  onChange: (isoDate: string) => void;
}

/* ================================================================
 * Helpers
 * ================================================================ */

function toISO(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

function getMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = startOfWeek(first);

  const weeks: Date[][] = [];
  const current = new Date(start);

  while (current <= last || weeks.length < 6) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
    if (current > last && weeks.length >= 5) break;
  }
  return weeks;
}

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/* ================================================================
 * DatePicker
 *
 * Calendar grid + preset row. Used inside Popover (desktop) or
 * BottomSheet (mobile — wired by TaskSheet).
 *
 * Keyboard: arrow keys navigate days, Enter selects, Home/End go
 * to start/end of week, PageUp/PageDown go to prev/next month.
 * ================================================================ */

export function DatePicker({ value, onChange }: DatePickerProps) {
  const today = useMemo(() => new Date(), []);
  const selected = useMemo(() => new Date(value + "T00:00:00"), [value]);

  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());
  const [focusedDate, setFocusedDate] = useState(selected);

  const gridRef = useRef<HTMLDivElement>(null);

  const weeks = useMemo(
    () => getMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const selectDate = useCallback(
    (d: Date) => {
      onChange(toISO(d));
    },
    [onChange],
  );

  /* Focus the active cell whenever focusedDate changes */
  useEffect(() => {
    const iso = toISO(focusedDate);
    const btn = gridRef.current?.querySelector<HTMLElement>(
      `[data-date="${iso}"]`,
    );
    btn?.focus();
  }, [focusedDate]);

  function handleGridKeyDown(e: React.KeyboardEvent) {
    let next: Date | null = null;

    switch (e.key) {
      case "ArrowLeft":
        next = addDays(focusedDate, -1);
        break;
      case "ArrowRight":
        next = addDays(focusedDate, 1);
        break;
      case "ArrowUp":
        next = addDays(focusedDate, -7);
        break;
      case "ArrowDown":
        next = addDays(focusedDate, 7);
        break;
      case "Home":
        next = startOfWeek(focusedDate);
        break;
      case "End":
        next = addDays(startOfWeek(focusedDate), 6);
        break;
      case "PageUp":
        e.preventDefault();
        prevMonth();
        next = new Date(focusedDate);
        next.setMonth(next.getMonth() - 1);
        break;
      case "PageDown":
        e.preventDefault();
        nextMonth();
        next = new Date(focusedDate);
        next.setMonth(next.getMonth() + 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectDate(focusedDate);
        return;
    }

    if (next) {
      e.preventDefault();
      setFocusedDate(next);
      // Keep the calendar view in sync when focused date leaves current month
      if (next.getFullYear() !== viewYear || next.getMonth() !== viewMonth) {
        setViewYear(next.getFullYear());
        setViewMonth(next.getMonth());
      }
    }
  }

  /* Presets */
  const tomorrow = addDays(today, 1);
  const nextWeekDay = addDays(today, 7 - today.getDay() + 1); // next Monday

  const presets = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: tomorrow },
    { label: "Next week", date: nextWeekDay },
  ];

  return (
    <div className="w-[308px] max-w-[calc(100vw-var(--space-8))] p-[var(--space-3)]">
      {/* Preset row */}
      <div
        className="flex gap-[var(--space-2)] mb-[var(--space-3)]"
        role="group"
        aria-label="Quick date presets"
      >
        {presets.map((p) => {
          const isSelected = isSameDay(selected, p.date);
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => selectDate(p.date)}
              aria-pressed={isSelected}
              className={[
                "flex-1 py-[var(--space-1-5)] px-[var(--space-2)]",
                "rounded-[var(--radius-md)]",
                "text-[length:var(--text-xs)] font-[var(--weight-medium)]",
                "transition-colors duration-[var(--duration-instant)]",
                "min-h-[var(--touch-target-min)]",
                "flex items-center justify-center",
                isSelected
                  ? "bg-[var(--color-accent)] text-[color:var(--color-accent-text)]"
                  : "bg-[var(--color-surface-dim)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-chip-bg-hover)]",
              ].join(" ")}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-[var(--space-2)]">
        <button
          type="button"
          aria-label="Previous month"
          onClick={prevMonth}
          className="
            p-[var(--space-1)] rounded-[var(--radius-md)]
            text-[color:var(--color-text-tertiary)]
            hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-dim)]
            min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
            flex items-center justify-center
            transition-colors duration-[var(--duration-instant)]
          "
        >
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <span
          className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]"
          aria-live="polite"
        >
          {monthLabel}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={nextMonth}
          className="
            p-[var(--space-1)] rounded-[var(--radius-md)]
            text-[color:var(--color-text-tertiary)]
            hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-dim)]
            min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
            flex items-center justify-center
            transition-colors duration-[var(--duration-instant)]
          "
        >
          <ChevronRight size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-[var(--space-1)]" role="row">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="text-center text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-text-disabled)] py-[var(--space-1)]"
            role="columnheader"
            aria-label={d}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        ref={gridRef}
        role="grid"
        aria-label="Date picker calendar"
        onKeyDown={handleGridKeyDown}
      >
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" role="row">
            {week.map((day) => {
              const iso = toISO(day);
              const isCurrentMonth = day.getMonth() === viewMonth;
              const isToday = isSameDay(day, today);
              const isSelected = isSameDay(day, selected);
              const isFocused = isSameDay(day, focusedDate);

              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  data-date={iso}
                  tabIndex={isFocused ? 0 : -1}
                  aria-selected={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => selectDate(day)}
                  className={[
                    "w-full aspect-square",
                    "flex items-center justify-center",
                    "rounded-[var(--radius-md)]",
                    "text-[length:var(--text-sm)]",
                    "transition-colors duration-[var(--duration-instant)]",
                    // Selected
                    isSelected
                      ? "bg-[var(--color-accent)] text-[color:var(--color-accent-text)] font-[var(--weight-semibold)]"
                      : [
                          // Today ring + medium weight to stand out
                          isToday
                            ? "ring-1 ring-[var(--color-accent)] ring-inset font-[var(--weight-medium)]"
                            : "",
                          // Current month vs other
                          isCurrentMonth
                            ? "text-[color:var(--color-text-primary)]"
                            : "text-[color:var(--color-text-disabled)]",
                          "hover:bg-[var(--color-surface-dim)]",
                        ].join(" "),
                    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-border-focus)]",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
