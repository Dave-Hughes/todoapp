"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  type KeyboardEvent,
} from "react";
import { parseRepeatRule, type RepeatRule, type DayOfWeek } from "./parse-repeat";
import { formatRepeatRule } from "./format-repeat";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ================================================================
 * Types
 * ================================================================ */

export type { RepeatRule, DayOfWeek } from "./parse-repeat";

export interface RepeatPickerProps {
  /** Currently set repeat rule (null = doesn't repeat). */
  value: RepeatRule | null;
  /** Called when the user commits a value (preset click, Enter on valid NLP, or clear). */
  onChange: (value: RepeatRule | null) => void;
}

/* ================================================================
 * Preset definitions
 * ================================================================ */

interface Preset {
  label: string;
  getRule: () => RepeatRule;
}

const DAY_INDEX_MAP: DayOfWeek[] = [
  "sun", "mon", "tue", "wed", "thu", "fri", "sat",
];

function getTodayDayOfWeek(): DayOfWeek {
  return DAY_INDEX_MAP[new Date().getDay()];
}

const PRESETS: Preset[] = [
  {
    label: "Daily",
    getRule: () => ({ type: "daily", interval: 1 }),
  },
  {
    label: "Weekdays",
    getRule: () => ({
      type: "weekly",
      interval: 1,
      days: ["mon", "tue", "wed", "thu", "fri"] as DayOfWeek[],
    }),
  },
  {
    label: "Weekly",
    getRule: () => ({
      type: "weekly",
      interval: 1,
      days: [getTodayDayOfWeek()],
    }),
  },
  {
    label: "Monthly",
    getRule: () => ({
      type: "monthly",
      interval: 1,
      dayOfMonth: new Date().getDate(),
    }),
  },
];

/* ================================================================
 * Check if a rule matches a preset (for highlighting)
 * ================================================================ */

function rulesMatch(a: RepeatRule | null, b: RepeatRule): boolean {
  if (!a) return false;
  if (a.type !== b.type) return false;

  if (a.type === "daily" && b.type === "daily") {
    return a.interval === b.interval;
  }

  if (a.type === "weekly" && b.type === "weekly") {
    return (
      a.interval === b.interval &&
      a.days.length === b.days.length &&
      a.days.every((d, i) => d === b.days[i])
    );
  }

  if (a.type === "monthly" && b.type === "monthly") {
    return a.interval === b.interval && a.dayOfMonth === b.dayOfMonth;
  }

  return false;
}

/* ================================================================
 * RepeatPicker
 *
 * Two-zone picker: preset quick-picks + NLP text input.
 * Opens in a Popover on both breakpoints.
 *
 * Keyboard:
 *   - Arrow Left/Right navigates presets
 *   - Tab moves from presets to input
 *   - Enter in input commits if parseable
 *   - Escape closes (handled by parent Popover)
 * ================================================================ */

export function RepeatPicker({ value, onChange }: RepeatPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [showError, setShowError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const presetRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedPreset, setFocusedPreset] = useState(0);

  /* Pre-populate input when reopening with an existing custom rule */
  useIsoLayoutEffect(() => {
    if (value) {
      // Check if the current value matches a preset
      const matchesPreset = PRESETS.some((p) => rulesMatch(value, p.getRule()));
      if (!matchesPreset) {
        setInputValue(formatRepeatRule(value));
      } else {
        setInputValue("");
      }
    } else {
      setInputValue("");
    }
    setShowError(false);
  }, [value]);

  /* Focus the first preset or matching preset on mount */
  const initialValueRef = useRef(value);
  useEffect(() => {
    const initialValue = initialValueRef.current;
    requestAnimationFrame(() => {
      if (initialValue) {
        const matchIdx = PRESETS.findIndex((p) => rulesMatch(initialValue, p.getRule()));
        if (matchIdx >= 0) {
          setFocusedPreset(matchIdx);
          presetRefs.current[matchIdx]?.focus();
          return;
        }
      }
      // No match — focus first preset
      presetRefs.current[0]?.focus();
    });
  }, []);

  /* Debounced NLP preview */
  const parsedPreview = useMemo(() => {
    if (!inputValue.trim()) return null;
    return parseRepeatRule(inputValue);
  }, [inputValue]);

  const previewLabel = parsedPreview ? formatRepeatRule(parsedPreview) : null;

  /* Preset click — commit immediately */
  const handlePresetClick = useCallback(
    (preset: Preset) => {
      onChange(preset.getRule());
    },
    [onChange],
  );

  /* Preset keyboard nav */
  const handlePresetKeyDown = useCallback(
    (e: KeyboardEvent, index: number) => {
      let nextIndex = index;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextIndex = Math.min(index + 1, PRESETS.length - 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextIndex = Math.max(index - 1, 0);
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = PRESETS.length - 1;
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handlePresetClick(PRESETS[index]);
          return;
        default:
          return;
      }

      if (nextIndex !== index) {
        setFocusedPreset(nextIndex);
        // Defer focus until after React re-renders the tabIndex change
        requestAnimationFrame(() => {
          presetRefs.current[nextIndex]?.focus();
        });
      }
    },
    [handlePresetClick],
  );

  /* Input submit */
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (parsedPreview) {
          setShowError(false);
          onChange(parsedPreview);
        } else if (inputValue.trim()) {
          setShowError(true);
        }
      }
    },
    [parsedPreview, inputValue, onChange],
  );

  /* Clear handler */
  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  return (
    <div className="min-w-[260px] max-w-[calc(100vw-var(--space-8))]">
      {/* Header */}
      <div className="px-[var(--space-3)] pt-[var(--space-3)] pb-[var(--space-2)]">
        <p className="text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-text-tertiary)]">
          How often?
        </p>
      </div>

      {/* Preset buttons */}
      <div
        role="radiogroup"
        aria-label="Repeat frequency presets"
        className="flex flex-wrap gap-[var(--space-2)] px-[var(--space-3)] pb-[var(--space-3)]"
      >
        {PRESETS.map((preset, i) => {
          const isSelected = rulesMatch(value, preset.getRule());

          return (
            <button
              key={preset.label}
              ref={(el) => { presetRefs.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={focusedPreset === i ? 0 : -1}
              onClick={() => handlePresetClick(preset)}
              onKeyDown={(e) => handlePresetKeyDown(e, i)}
              className={[
                "inline-flex items-center justify-center",
                "px-[var(--space-3)] py-[var(--space-1-5)]",
                "rounded-[var(--radius-full)]",
                "text-[length:var(--text-sm)] font-[var(--weight-medium)]",
                "min-h-[var(--touch-target-min)]",
                "transition-[background-color,border-color,color] duration-[var(--duration-instant)]",
                isSelected
                  ? "bg-[var(--color-accent-subtle)] border border-[var(--color-accent)] text-[color:var(--color-accent-hover)]"
                  : "bg-[var(--color-chip-bg)] border border-[var(--color-border-subtle)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-chip-bg-hover)] hover:border-[var(--color-border)] hover:text-[color:var(--color-text-primary)]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]",
              ].join(" ")}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--color-border-subtle)] mx-[var(--space-3)]" />

      {/* NLP input zone */}
      <div className="px-[var(--space-3)] pt-[var(--space-3)] pb-[var(--space-3)]">
        <label
          htmlFor="repeat-nlp-input"
          className="block text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-text-tertiary)] mb-[var(--space-1)]"
        >
          Or type your own
        </label>
        <input
          ref={inputRef}
          id="repeat-nlp-input"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (showError) setShowError(false);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="every other Tuesday"
          autoComplete="off"
          className={[
            "w-full",
            "bg-[var(--color-surface-dim)]",
            "rounded-[var(--radius-md)]",
            "px-[var(--space-3)] py-[var(--space-2)]",
            "text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]",
            "placeholder:text-[color:var(--color-text-disabled)]",
            "leading-[var(--leading-normal)]",
            "outline-none",
            "border",
            showError
              ? "border-[var(--color-destructive)]"
              : "border-[var(--color-border-subtle)] focus:border-[var(--color-border-focus)]",
            "transition-colors duration-[var(--duration-instant)]",
            "min-h-[var(--touch-target-min)]",
          ].join(" ")}
        />

        {/* Preview / error feedback */}
        <div className="mt-[var(--space-2)] min-h-[1.75rem]">
          {showError && (
            <p
              role="alert"
              className="text-[length:var(--text-sm)] text-[color:var(--color-destructive)] font-[var(--weight-medium)]"
            >
              Hmm, couldn&rsquo;t figure that one out
            </p>
          )}
          {!showError && previewLabel && (
            <p
              role="status"
              className="
                text-[length:var(--text-sm)] font-[var(--weight-medium)]
                text-[color:var(--color-accent-hover)]
              "
            >
              &#10003; {previewLabel}
            </p>
          )}
        </div>
      </div>

      {/* Clear option — only shown when a rule is set */}
      {value && (
        <>
          <div className="border-t border-[var(--color-border-subtle)] mx-[var(--space-3)]" />
          <div className="py-[var(--space-1)]">
            <button
              type="button"
              onClick={handleClear}
              className={[
                "w-full flex items-center gap-[var(--space-3)]",
                "px-[var(--space-3)] py-[var(--space-2)]",
                "text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]",
                "min-h-[var(--touch-target-min)]",
                "hover:bg-[var(--color-surface-dim)]",
                "transition-colors duration-[var(--duration-instant)]",
                "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-border-focus)]",
              ].join(" ")}
            >
              Doesn&rsquo;t repeat
            </button>
          </div>
        </>
      )}
    </div>
  );
}
