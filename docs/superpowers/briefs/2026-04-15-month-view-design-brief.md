# Month View — Design Brief

> Produced from a /shape discovery interview, 2026-04-15. This brief guides the implementation of the Month view, the third and final task view for v1.

---

## 1. Feature Summary

The Month view is a calendar-grid planning surface that shows the shape of an entire month at a glance. It serves the "tasks that must not slip by" use case — monthly bills, quarterly repeats, anniversaries, and anything placed far in the future. It's the only view with enough horizon to plan 3 months ahead or spot a quiet week for a dentist appointment. Unlike Today (action surface) and Week (scheduling horizon), Month is a **map**: you scan it, spot where you need to go, and zoom in without leaving.

## 2. Primary User Action

**Scan the shape of the month**, then drill into specific days to inspect, create, or edit tasks. The calendar grid itself is the value — seeing 28–31 days at once reveals patterns (busy weeks, stacked days, empty stretches) that no other view can show.

## 3. Design Direction

Per Principle #9: "Today is the hero view. Week and Month are planning surfaces and can be cleaner and less opinionated."

Month should feel **calm, spatial, and information-dense without being cluttered**. It's closer to a wall calendar than a to-do list. The Cozy theme's warm canvas and soft surface tones should make the grid feel approachable, not clinical. The visual rhythm comes from the day cells themselves — their density indicators, the today highlight, and the contrast between busy and quiet days.

Design energy goes into:
- Making the grid scannable at a glance (density reads before titles)
- Making drill-down feel smooth and contextual (stay in Month, don't navigate away)
- Keeping the surface quiet — no competing UI noise

This is NOT a Google Calendar competitor. No time slots, no hourly grid, no drag-to-reschedule. It's a month-shaped lens on the same task list.

## 4. Layout Strategy

### Desktop (≥ 1024px)

```
┌─────────────────────────────────────────────────────────────┐
│  April 2026          ◀  ▶  This month     [Mine|Theirs|All]│
│                                              [+ Add task ⌘↵]│
├─────────────────────────────────────────────────────────────┤
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat               │
├─────┬─────┬─────┬─────┬─────┬─────┬─────────────────────────┤
│     │     │     │  1  │  2  │  3  │  4                      │
│     │     │     │ Buy…│     │ Pay…│                          │
│     │     │     │ +2  │     │     │                          │
├─────┼─────┼─────┼─────┼─────┼─────┼─────────────────────────┤
│  5  │  6  │  7  │  8  │  9  │ 10  │ 11                      │
│ ... │ ... │     │     │     │ Den…│                          │
```

- **7-column grid**, Sunday-anchored (matches Week view convention)
- **Day cells** show: date number, up to 2–3 truncated task title previews, "+N more" overflow
- **Density feel**: subtle background warmth or a small bar/indicator so the month shape reads at a glance even before reading titles
- **Selected day** gets a drill-down panel/expansion showing that day's full task list with CRUD (create, complete, edit, delete) — same capabilities as selecting a day in Week view
- **Today cell** gets accent treatment consistent with Week's today-hero pattern (accent ring or fill)
- **Header**: month + year (display font), prev/next arrows, "This month" reset, filter toggle, Add task button

### Mobile (< 1024px)

- Same 7-column grid but cells are compact (date + density indicator only, no title previews)
- Tapping a day opens a drill-down (bottom sheet or inline expansion) with full task list
- FAB for task creation, pre-fills selected day
- Prev/next month via arrows or swipe gesture (stretch — arrows are MVP)

### Drill-Down Panel

When a day is selected:
- **Desktop**: inline expansion below the selected row, or a right-side panel — keeps the calendar grid visible
- **Mobile**: bottom sheet or full-width expansion below the grid
- Shows the same task list UI as Today/Week (TaskListItem components, complete/edit/delete, done accordion)
- Task creation from here pre-fills the selected day
- Closing the panel returns to the pure grid view

## 5. Key States

| State | What the user sees/feels |
|---|---|
| **Default (has tasks)** | Calendar grid with density indicators and title previews. Today highlighted. Current month shown. |
| **Empty month** | Clean empty grid — still interactive. Tapping any day opens the drill-down where tasks can be created. No heavy empty-state messaging on the grid itself. |
| **Empty day (drill-down open)** | Warm empty state inside the drill-down panel. Rotating copy per voice/tone. Clear affordance to create a task. |
| **Loading** | Grid skeleton or subtle shimmer on day cells while tasks load. Grid structure visible immediately. |
| **Error** | Inline error with retry, consistent with Today/Week patterns. |
| **Day selected** | Selected day cell gets visual emphasis (accent border or highlight). Drill-down panel opens with that day's tasks. |
| **Today** | Accent treatment on today's cell (consistent with Week's today-hero). Visible whether or not today is the selected day. |
| **Past days with incomplete tasks** | Incomplete tasks still show on their original day. This is intentional — surfacing what didn't get done is part of the app's ethos (making invisible labor visible). No special "overdue" styling. |
| **Navigated to different month** | Grid shows that month's tasks. "This month" button visible for quick return. |

## 6. Interaction Model

### Navigation
- **Prev/next month**: arrow buttons in the header (same pattern as Week's prev/next week)
- **"This month" reset**: jumps back to current month (same pattern as Week's "This week")
- **Day selection**: tap/click any day cell to select it and open drill-down

### Day Cell Interaction
- **Tap**: selects the day, opens drill-down panel
- **Tap selected day again**: closes the drill-down (deselects)
- **Keyboard**: arrow keys navigate between days in the grid. Enter/Space selects. Escape closes drill-down.

### Drill-Down
- Full CRUD on tasks for the selected day
- Same TaskListItem component as Today/Week (checkbox, swipe actions, overflow menu, tap-to-edit)
- Task creation via FAB or Add button pre-fills the selected day
- Filter toggle (Mine/Theirs/All) applies to the whole month grid AND the drill-down simultaneously

### Task Creation
- FAB (mobile) / Add task button (desktop) pre-fills the selected day (if one is selected) or today (if no day selected)
- Small "+" affordance within day cells (stretch goal — FAB/button is MVP)

### View Transitions
- Month view lives in the `(views)` route group, inherits shared AppShell layout
- Sidebar stays mounted, view-switch fade applies (same AnimatePresence pattern)
- Grid cells animate in with a subtle stagger on mount (consistent with Today/Week list animation)

## 7. Content Requirements

### Header Copy
- Month + year in display font (Gabarito): "April 2026"
- Subtitle: task count summary — "{N} tasks this month" or similar

### Day Cell Copy
- Date number (prominent)
- Up to 2–3 task title previews (truncated, body font, secondary text color)
- "+{N} more" overflow in tertiary text

### Empty Day (Drill-Down)
- Rotating warm copy (3–4 variants, same pattern as Today/Week empty states):
  - "Wide open. Enjoy it."
  - "Nothing here yet."
  - "A blank canvas."
  - "Free day. For now."

### Navigation
- "This month" button label
- Month names: full names ("April", "May"), not abbreviated

### Realistic Ranges
- Days per month: 28–31
- Tasks per day: 0 (common) to 15 (typical busy), 20 (extreme)
- Months navigable: no artificial limit, but most usage is current month ± 2–3

## 8. Recommended References

For the implementation phase:
- **spatial-design.md** — the grid layout, cell sizing, and responsive behavior are the core challenge
- **interaction-design.md** — drill-down panel open/close, day selection, keyboard navigation
- **motion-design.md** — grid entrance animation, drill-down expand/collapse, month transition
- **color-and-contrast.md** — density indicators, today highlight, selected state vs. hover state

Existing components to reuse:
- `TaskListItem` — inside the drill-down panel
- `DoneAccordion` — for completed tasks in drill-down
- `EmptyState` — for empty days in drill-down
- `FilterToggle` — Mine/Theirs/All
- `TaskSheet` — for create/edit (opens from drill-down context)
- `Toast` / `ConfirmDialog` — for delete flows
- `Fab` — mobile task creation
- `InviteBanner` — solo-state nudge (same as Today/Week)

## 9. Open Questions

1. **Drill-down pattern**: inline expansion below the grid row vs. side panel vs. bottom sheet. Needs to be resolved during build — try inline expansion first (keeps grid visible, works on both breakpoints).

2. **Density indicator style**: dots (like Week's strip), a subtle background warmth gradient, a tiny bar, or just the title previews themselves as implicit density. Worth trying 2–3 options during build.

3. **Month-to-month transition animation**: crossfade, slide left/right, or just instant swap? Week doesn't animate its week transitions. Month probably shouldn't either (keep it crisp), but worth a quick test.

4. **Grid cell height**: fixed height per row (simpler, cleaner grid) vs. variable height based on content (shows more titles on busy days). Fixed is likely better for the "map" metaphor — the grid shape should be stable.

5. **Mobile cell content**: date number + density dots only, or try to fit one title preview? Depends on cell size at 375px / 7 columns ≈ 48px per cell. Likely dots only.

6. **"Today" in a different month**: when navigated to a non-current month, should there still be a visual indicator of which month contains today? A subtle label in the header or a dot on the "This month" button could help orientation.

---

*This brief is ready for handoff to implementation. Use `/impeccable craft` or begin building directly with this as the spec.*
