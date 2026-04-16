# Month View

> Calendar-grid planning surface — the third and final task view for v1.

## What it's for

A month-shaped map for scanning 28–31 days at a glance. Surfaces patterns — busy weeks, stacked days, empty stretches — that Today (action surface) and Week (scheduling horizon) can't show. Purpose-built for monthly bills, quarterly repeats, anniversaries, and far-future tasks.

## What it's not for

- Not a Google Calendar competitor (no time slots, no hourly grid, no drag-to-reschedule).
- Not a primary task execution surface (that's Today).
- Not a substitute for Week's day-to-day scheduling.

## Route

`/month` — lives in the `(views)` route group, inherits `AppShell` shared layout.

## Layout

### Desktop (≥ 1024px)

- **Header**: month + year (Gabarito display font), prev/next arrows, "This month" reset, filter toggle, "Add for [date]" button with ⌘↵ shortcut.
- **7-column grid** (Sunday-anchored, matching Week). Day cells show: date number, up to 2 truncated task titles, "+N more" overflow.
- **Today cell**: accent-filled date circle.
- **Selected cell**: accent-subtle background, inline drill-down panel below the row.

### Mobile (< 1024px)

- Same 7-column grid but compact — date number + density dots only (≈48px per cell at 375px).
- Tapping a day opens the inline drill-down with full task list.
- FAB for task creation, pre-fills selected day.

### Drill-down panel

Inline expansion below the grid row containing the selected day. Shows:
- Day heading with close button
- Full task list (`TaskListItem` components) with complete/edit/delete
- `DoneAccordion` for completed tasks
- Empty state with rotating warm copy and add-task CTA

## Props / state

Page component — no props. Internal state:

| State | Type | Purpose |
|---|---|---|
| `viewYear` / `viewMonth` | `number` | Currently displayed month |
| `selectedIso` | `string \| null` | Selected day (null = no drill-down) |
| `filter` | `FilterValue` | Mine/Theirs/All filter |
| `sheetOpen` | `boolean` | TaskSheet visibility |
| `editingTask` | `UITask \| null` | Task being edited |
| `toast` | `object \| null` | Undo toast state |

## Data flow

- Uses `useTasks()`, `useMe()`, `useCategories()` from TanStack Query hooks.
- Task adapters from `src/lib/task-adapters.ts` — no duplication.
- Filter applies to both the grid density counts and drill-down task list.
- Task creation pre-fills the selected day (or today if no day selected).

## Key states

| State | Behavior |
|---|---|
| **Default** | Grid with density indicators, today highlighted, current month shown |
| **Empty month** | Clean empty grid, still interactive |
| **Empty day (drill-down)** | Warm rotating copy, add-task CTA |
| **Day selected** | Accent-subtle background on cell, drill-down panel appears |
| **Today** | Accent-filled date circle, always visible |
| **Different month** | "This month" button gets accent dot indicator |
| **Loading** | Grid renders immediately (structure first, data fills in) |

## Accessibility

- Grid uses `role="grid"` with `role="row"` and `role="gridcell"`.
- Day cells are buttons with `aria-selected` and `aria-current="date"` for today.
- Full screen-reader labels with date, day name, and task count.
- Escape closes the drill-down.
- Focus-visible rings on all interactive elements.
- `prefers-reduced-motion` respected for all animations.

## Interaction model

- **Tap day**: select it, open drill-down.
- **Tap selected day again**: deselect, close drill-down.
- **Prev/next month**: arrow buttons.
- **"This month"**: reset to current month, deselect day.
- **⌘↵**: open task creation sheet.
- **Escape**: close drill-down.

## Components reused

`TaskListItem`, `DoneAccordion`, `FilterToggle`, `Fab`, `TaskSheet`, `Toast`, `InviteBanner`

## Design decisions

1. **Inline drill-down** (not side panel or bottom sheet) — keeps the grid visible, works on both breakpoints.
2. **Fixed cell height** — the grid shape is stable regardless of content density. Matches the "map" metaphor.
3. **No month-to-month animation** — instant swap keeps it crisp (matches Week's approach).
4. **Density dots on mobile** — cell width at 375px/7 ≈ 48px is too narrow for title previews.
5. **"This month" dot indicator** — when navigated to a different month, a small accent dot on the "This month" button helps orientation.

## Changelog

| Date | Change |
|---|---|
| 2026-04-15 | Initial implementation — calendar grid, inline drill-down, full CRUD, filter, density dots, today-hero, month navigation |
