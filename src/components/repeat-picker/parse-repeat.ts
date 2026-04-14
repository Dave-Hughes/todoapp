/**
 * parse-repeat.ts
 *
 * Client-side NLP parser for recurrence rules. Converts natural language
 * input ("every Tuesday", "daily", "every 3 days") into a structured
 * RepeatRule matching the repeat_rule JSONB spec from specs/tasks.md.
 *
 * Pure function. No dependencies. No server round-trip.
 */

/* ================================================================
 * Types — match specs/tasks.md repeat_rule JSONB
 * ================================================================ */

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type RepeatRule =
  | { type: "daily"; interval: number }
  | { type: "weekly"; interval: number; days: DayOfWeek[] }
  | { type: "monthly"; interval: number; dayOfMonth: number };

/* ================================================================
 * Day-of-week mapping
 * ================================================================ */

const DAY_MAP: Record<string, DayOfWeek> = {
  // Full names
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
  // 3-letter abbreviations
  mon: "mon",
  tue: "tue",
  wed: "wed",
  thu: "thu",
  fri: "fri",
  sat: "sat",
  sun: "sun",
  // 2-letter abbreviations
  mo: "mon",
  tu: "tue",
  we: "wed",
  th: "thu",
  fr: "fri",
  sa: "sat",
  su: "sun",
};

const WEEKDAY_DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND_DAYS: DayOfWeek[] = ["sat", "sun"];

/* ================================================================
 * Ordinal / number parsing helpers
 * ================================================================ */

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  other: 2, // "every other" = every 2
};

function parseNumber(str: string): number | null {
  const lower = str.toLowerCase().trim();
  if (WORD_NUMBERS[lower] !== undefined) return WORD_NUMBERS[lower];
  const n = parseInt(lower);
  return isNaN(n) || n < 1 ? null : n;
}

/** Extract day-of-month from ordinal like "15th", "1st", "23rd" */
function parseOrdinal(str: string): number | null {
  const match = str.match(/^(\d{1,2})(st|nd|rd|th)?$/i);
  if (!match) return null;
  const n = parseInt(match[1]);
  return n >= 1 && n <= 31 ? n : null;
}

/* ================================================================
 * Extract all day names from a string
 * ================================================================ */

function extractDays(input: string): DayOfWeek[] {
  const days: DayOfWeek[] = [];
  const seen = new Set<DayOfWeek>();

  // Split on common separators: and, &, commas, spaces
  const tokens = input.toLowerCase().split(/[\s,&]+/).filter(Boolean);

  for (const token of tokens) {
    // Strip trailing punctuation
    const clean = token.replace(/[^a-z]/g, "");
    // Skip tokens that look like ordinals (e.g. "15th", "1st", "23rd")
    // or common noise words
    if (/^\d/.test(token) || clean === "the" || clean === "on" || clean === "of" || clean === "every" || clean === "other") continue;
    const day = DAY_MAP[clean];
    if (day && !seen.has(day)) {
      seen.add(day);
      days.push(day);
    }
  }

  // Sort days Mon → Sun for consistency
  const ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  days.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

  return days;
}

/* ================================================================
 * Main parser
 * ================================================================ */

export function parseRepeatRule(input: string): RepeatRule | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;

  // --- Exact keyword matches ---

  if (raw === "daily" || raw === "every day" || raw === "everyday") {
    return { type: "daily", interval: 1 };
  }

  if (
    raw === "weekdays" ||
    raw === "every weekday" ||
    raw === "on weekdays" ||
    raw === "monday to friday" ||
    raw === "mon to fri" ||
    raw === "monday through friday" ||
    raw === "mon through fri" ||
    raw === "monday-friday" ||
    raw === "mon-fri"
  ) {
    return { type: "weekly", interval: 1, days: [...WEEKDAY_DAYS] };
  }

  if (raw === "weekends" || raw === "every weekend") {
    return { type: "weekly", interval: 1, days: [...WEEKEND_DAYS] };
  }

  if (raw === "weekly" || raw === "every week") {
    // Default to today's day of week
    const todayDay = getTodayDayOfWeek();
    return { type: "weekly", interval: 1, days: [todayDay] };
  }

  if (raw === "biweekly" || raw === "every other week" || raw === "every two weeks") {
    const todayDay = getTodayDayOfWeek();
    return { type: "weekly", interval: 2, days: [todayDay] };
  }

  if (raw === "monthly" || raw === "every month") {
    return { type: "monthly", interval: 1, dayOfMonth: new Date().getDate() };
  }

  // --- "every N days" ---

  const everyNDays = raw.match(
    /^every\s+(\d+|two|three|four|five|six|other)\s+days?$/,
  );
  if (everyNDays) {
    const n = parseNumber(everyNDays[1]);
    if (n) return { type: "daily", interval: n };
  }

  // --- "every other day" ---

  if (raw === "every other day") {
    return { type: "daily", interval: 2 };
  }

  // --- "every N weeks" (without day specification) ---

  const everyNWeeks = raw.match(
    /^every\s+(\d+|two|three|four|five|six)\s+weeks?$/,
  );
  if (everyNWeeks) {
    const n = parseNumber(everyNWeeks[1]);
    if (n) {
      const todayDay = getTodayDayOfWeek();
      return { type: "weekly", interval: n, days: [todayDay] };
    }
  }

  // --- "every <day(s)>" — e.g. "every Tuesday", "every Tue and Thu" ---

  const everyDaysMatch = raw.match(/^every\s+(.+)$/);
  if (everyDaysMatch) {
    const rest = everyDaysMatch[1];

    // Check if it starts with "other" — "every other Tuesday"
    const otherMatch = rest.match(/^other\s+(.+)$/);
    if (otherMatch) {
      const days = extractDays(otherMatch[1]);
      if (days.length > 0) {
        return { type: "weekly", interval: 2, days };
      }
    }

    // Check for "N weeks on <day>" — "every 2 weeks on Monday"
    const nWeeksOnDay = rest.match(
      /^(\d+|two|three|four)\s+weeks?\s+on\s+(.+)$/,
    );
    if (nWeeksOnDay) {
      const n = parseNumber(nWeeksOnDay[1]);
      const days = extractDays(nWeeksOnDay[2]);
      if (n && days.length > 0) {
        return { type: "weekly", interval: n, days };
      }
    }

    // Check for "month on the <ordinal>" — "every month on the 15th"
    const monthOnThe = rest.match(/^month\s+on\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?)/);
    if (monthOnThe) {
      const dom = parseOrdinal(monthOnThe[1]);
      if (dom) return { type: "monthly", interval: 1, dayOfMonth: dom };
    }

    // Check for "N months" — "every 2 months", "every 3 months on the 15th"
    const nMonths = rest.match(
      /^(\d+|two|three|four|five|six)\s+months?(?:\s+on\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?))?$/,
    );
    if (nMonths) {
      const n = parseNumber(nMonths[1]);
      const dom = nMonths[2]
        ? parseOrdinal(nMonths[2])
        : new Date().getDate();
      if (n && dom) return { type: "monthly", interval: n, dayOfMonth: dom };
    }

    // Simple day extraction — "every Tuesday", "every Tuesday and Thursday"
    const days = extractDays(rest);
    if (days.length > 0) {
      return { type: "weekly", interval: 1, days };
    }
  }

  // --- "on <day(s)>" — e.g. "on Tuesdays", "on Tue & Thu" ---

  const onDaysMatch = raw.match(/^on\s+(.+)$/);
  if (onDaysMatch) {
    const days = extractDays(onDaysMatch[1]);
    if (days.length > 0) {
      return { type: "weekly", interval: 1, days };
    }
  }

  // --- "twice a week" / "twice a month" ---

  if (raw === "twice a week" || raw === "2x a week" || raw === "2x per week") {
    // Default to Mon & Thu — reasonable spread
    return { type: "weekly", interval: 1, days: ["mon", "thu"] };
  }

  // --- Bare day names — "Tuesday", "Tue and Thu" ---

  const bareDays = extractDays(raw);
  if (bareDays.length > 0) {
    return { type: "weekly", interval: 1, days: bareDays };
  }

  // --- "monthly on the <ordinal>" ---

  const monthlyOn = raw.match(
    /^monthly\s+on\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?)/,
  );
  if (monthlyOn) {
    const dom = parseOrdinal(monthlyOn[1]);
    if (dom) return { type: "monthly", interval: 1, dayOfMonth: dom };
  }

  // --- Nothing matched ---

  return null;
}

/* ================================================================
 * Helper: today's day of week as DayOfWeek
 * ================================================================ */

const DAY_INDEX_MAP: DayOfWeek[] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
];

function getTodayDayOfWeek(): DayOfWeek {
  return DAY_INDEX_MAP[new Date().getDay()];
}
