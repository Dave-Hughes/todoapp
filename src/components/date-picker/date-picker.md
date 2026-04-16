# DatePicker

Calendar grid with preset row for date selection. Used inside Popover (desktop) or BottomSheet (mobile).

## What it's for

- Selecting a due date for a task in the Create sheet
- Quick-picking Today/Tomorrow/Next week via presets
- Full calendar navigation for arbitrary dates

## What it's not for

- Date range selection (not needed in v1)
- Time picking (separate stepper in expanded sheet)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | ISO date string (e.g. `"2026-04-14"`) |
| `onChange` | `(isoDate: string) => void` | — | Called when the user selects a date |

## States

- **Default**: shows current month with today ringed, selected date filled
- **Navigating**: month changes via chevron buttons or PageUp/PageDown
- **Preset selected**: Today/Tomorrow/Next week buttons show pressed state

## Accessibility

- `role="grid"` with arrow-key navigation between days
- Enter/Space selects the focused date
- Home/End navigate to start/end of week
- PageUp/PageDown navigate months
- `aria-selected` on the selected date cell
- `aria-current="date"` on today's cell
- Month label uses `aria-live="polite"` for screen reader announcements

## Keyboard

| Key | Action |
|---|---|
| Arrow Left/Right | Previous/next day |
| Arrow Up/Down | Same day prev/next week |
| Home/End | Start/end of week |
| PageUp/PageDown | Previous/next month |
| Enter/Space | Select focused date |

## Usage

```tsx
<DatePicker
  value="2026-04-14"
  onChange={(iso) => setDate(iso)}
/>
```

## Do / Don't

- **Do** render inside Popover on desktop and BottomSheet on mobile
- **Do** close the picker after selection (parent responsibility)
- **Don't** use for date ranges or recurring date patterns

## Changelog

- **Phase 2**: Initial implementation. Calendar grid with presets, full keyboard navigation, OKLCH theme tokens.
- **2026-04-15**: Lint fix: `let current` → `const current` in `getMonthGrid`. Removed the `useEffect` that synced `viewYear`/`viewMonth` when `focusedDate` left the current month — moved that logic into `handleGridKeyDown` alongside `setFocusedDate`. Satisfies `react-hooks/set-state-in-effect` and `prefer-const`.
