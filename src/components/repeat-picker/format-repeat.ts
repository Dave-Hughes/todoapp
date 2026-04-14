/**
 * format-repeat.ts
 *
 * Converts a structured RepeatRule into a human-readable label for display
 * on the Repeat chip and in the picker preview. Pure function, no deps.
 */

import type { RepeatRule, DayOfWeek } from "./parse-repeat";

/* ================================================================
 * Day name maps
 * ================================================================ */

const DAY_SHORT: Record<DayOfWeek, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const WEEKDAY_SET = new Set<DayOfWeek>(["mon", "tue", "wed", "thu", "fri"]);
const WEEKEND_SET = new Set<DayOfWeek>(["sat", "sun"]);

/* ================================================================
 * Ordinal suffix
 * ================================================================ */

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ================================================================
 * Main formatter
 * ================================================================ */

export function formatRepeatRule(rule: RepeatRule): string {
  switch (rule.type) {
    case "daily": {
      if (rule.interval === 1) return "Every day";
      if (rule.interval === 2) return "Every other day";
      return `Every ${rule.interval} days`;
    }

    case "weekly": {
      const { interval, days } = rule;

      // Check for weekdays / weekends shorthand
      if (
        days.length === 5 &&
        days.every((d) => WEEKDAY_SET.has(d))
      ) {
        if (interval === 1) return "Weekdays";
        return `Weekdays every ${interval} weeks`;
      }
      if (
        days.length === 2 &&
        days.every((d) => WEEKEND_SET.has(d))
      ) {
        if (interval === 1) return "Weekends";
        return `Weekends every ${interval} weeks`;
      }

      // Format day list
      const dayStr =
        days.length === 1
          ? DAY_SHORT[days[0]]
          : days.map((d) => DAY_SHORT[d]).join(" & ");

      if (interval === 1) return `Every ${dayStr}`;
      if (interval === 2) return `Every other ${dayStr}`;
      return `Every ${interval} weeks on ${dayStr}`;
    }

    case "monthly": {
      const { interval, dayOfMonth } = rule;
      const dom = ordinal(dayOfMonth);

      if (interval === 1) return `Monthly on ${dom}`;
      if (interval === 2) return `Every other month on ${dom}`;
      return `Every ${interval} months on ${dom}`;
    }
  }
}

/**
 * Short label variant for the chip — abbreviated when possible.
 * Falls back to the full format if no shorter version makes sense.
 */
export function formatRepeatChipLabel(rule: RepeatRule): string {
  // For most cases the full format is already concise enough.
  // Only shorten specific common patterns.
  return formatRepeatRule(rule);
}
