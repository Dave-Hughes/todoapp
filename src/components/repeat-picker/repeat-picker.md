# RepeatPicker

A two-zone inline picker for setting task recurrence rules. Combines preset quick-picks for common patterns with a natural language text input for custom rules.

## Purpose

Lets users set how often a task repeats — from simple "Daily" to custom "every other Tuesday and Thursday." Triggered from the Repeat chip in the task creation sheet.

## Not for

- Editing individual occurrences of a repeating task (that's task edit mode, Phase 4).
- Server-side recurrence rule validation (client-side only in v1).
- Yearly repeat rules (deferred to post-v1).

## Files

| File | Role |
|---|---|
| `repeat-picker.tsx` | Picker UI — presets + NLP input + preview |
| `parse-repeat.ts` | Pure NLP parser: `string → RepeatRule \| null` |
| `format-repeat.ts` | Pure formatter: `RepeatRule → string` |

## Props

### RepeatPickerProps

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `RepeatRule \| null` | — | Currently set repeat rule. `null` = doesn't repeat. |
| `onChange` | `(value: RepeatRule \| null) => void` | — | Called when the user commits a value. |

## Data Types

### RepeatRule

```ts
type RepeatRule =
  | { type: "daily"; interval: number }
  | { type: "weekly"; interval: number; days: DayOfWeek[] }
  | { type: "monthly"; interval: number; dayOfMonth: number };

type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
```

Matches the `repeat_rule` JSONB spec in `specs/tasks.md`.

## Layout

Two zones vertically stacked inside a Popover:

1. **Presets** — 4 pill buttons in a flex-wrap row: Daily, Weekdays, Weekly, Monthly. Tapping commits immediately and closes the picker.
2. **NLP input** — Text input with "Or type your own" label and placeholder "every other Tuesday". Real-time preview shows parsed interpretation below the input. Enter commits if parseable.
3. **Clear** — Visible only when a rule is set. Resets to null (doesn't repeat).

Width: `min-w-[260px] max-w-[calc(100vw-var(--space-8))]`.

## States

| State | Behavior |
|---|---|
| Default (no rule) | No preset highlighted. Input empty. |
| Preset selected | Matching preset highlighted with accent styling. Input empty. |
| Custom rule set | No preset highlighted. Input pre-populated with formatted rule. |
| NLP typing | Preview shows parsed result below input. No error while typing. |
| NLP parse error | Inline hint on Enter: "Hmm, couldn't figure that one out." Input stays active. |
| Reopening | Previous state restored — matching preset highlighted or input pre-populated. |

## NLP Parser Scope

The parser (`parse-repeat.ts`) handles:

- **Daily:** "daily", "every day", "every 3 days", "every other day"
- **Weekdays/weekends:** "weekdays", "weekends", "monday to friday"
- **Weekly:** "weekly", "every week", "every Tuesday", "every Tue and Thu", "every other Monday"
- **N-weekly:** "every 2 weeks", "biweekly", "every 2 weeks on Monday"
- **Monthly:** "monthly", "every month", "every month on the 15th", "monthly on the 1st"
- **N-monthly:** "every 2 months", "every 3 months on the 15th"
- **Bare day names:** "Tuesday", "Tue and Thu"

Not supported in v1: yearly, ordinal weekdays ("first Monday of the month"), complex cron-style rules.

## Accessibility

- Presets use `role="radiogroup"` / `role="radio"` with `aria-checked`.
- Roving tabindex on presets: Arrow Left/Right navigates, Enter/Space selects.
- Tab moves from presets to text input.
- Text input has `<label>` with `htmlFor`.
- Parse error uses `role="alert"` for screen reader announcement.
- All interactive elements meet 44px minimum touch target.
- Focus returns to Repeat chip on close (handled by parent Popover/TaskSheet).

## Keyboard

| Key | Context | Action |
|---|---|---|
| Arrow Left/Right | Presets | Navigate between presets |
| Home/End | Presets | Jump to first/last preset |
| Enter/Space | Presets | Select focused preset (commits + closes) |
| Tab | Presets | Move focus to NLP input |
| Enter | Input | Commit if parseable, show error if not |
| Escape | Anywhere | Close picker (handled by parent Popover) |

## Usage

```tsx
import { RepeatPicker, type RepeatRule } from "../repeat-picker/repeat-picker";
import { Popover } from "../popover/popover";

<Popover
  isOpen={activePicker === "repeat"}
  onClose={closePicker}
  anchorRef={repeatChipRef}
  placement="bottom-start"
  ariaLabel="Set repeat rule"
>
  <RepeatPicker
    value={repeatRule}
    onChange={(rule) => {
      setRepeatRule(rule);
      closePicker();
    }}
  />
</Popover>
```

## Do / Don't

| Do | Don't |
|---|---|
| Use presets for common patterns | Build custom interval steppers |
| Show real-time NLP preview | Wait for blur to parse |
| Let unparseable input stay in the field | Clear the input on error |
| Pre-populate input when reopening with custom rule | Show raw JSON to the user |
| Use "Doesn't repeat" as the clear label | Use "None" or "Remove" |

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Initial implementation — Phase 3. Presets + NLP input. |
