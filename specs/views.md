# Spec: Views

> **Status:** Complete. Interviewed and specced 2026-04-11.

## Summary

Three views of the same underlying task list at three zoom levels: Today, Week, Month. They share a consistent mental model: **navigation on top, familiar task list on bottom.** The task list layout is the same everywhere — only the navigation layer changes per zoom level.

Today is the hero view. Opened ten times a day, gets the most design attention. Week and Month are planning surfaces.

## In scope (v1)

- Today view — the hero, primary daily execution surface
- Week view — seven-day planning horizon with horizontal day strip
- Month view — full month calendar grid for must-not-slip tasks
- Filter toggle: Mine / Theirs / All (persistent across views)
- Postpone (per-task, swipe left) and Roll Over (bulk, Today view)
- Task creation from any view with context-aware due date defaults
- Swipe gestures: right to complete, left to postpone
- Swipe mode setting: direct (default) or reveal
- Completed tasks in collapsed "Done" accordion
- Empty states with 3–4 rotating copy variants
- "Today" shortcut to snap back to current day from any view
- Instant view switching, no loading state

## Out of scope (v1)

- Dedicated "planning mode"
- Calendar integration
- Filters beyond owner (Mine / Theirs / All)
- Custom views
- Drag-to-reschedule across days (consider for fast-follow)
- Exact navigation component design (deferred to Impeccable/design system phase)

## Shared structure across all views

### Task list layout

The bottom portion of every view is the same task list, structured in two sections plus an accordion:

**Primary section: Hard-deadline tasks.** Tasks with `flexible: false` due on the selected day. Sorted by time (if set), then by creation order. These are the must-do items.

**Secondary section: "When you can."** Tasks with `flexible: true` whose due date is the selected day or earlier (for Today view — flexible tasks whose date has passed auto-surface here). Gentler visual treatment. Available to grab but not urgent.

**Done accordion (collapsed by default).** Completed tasks for the selected day. Collapsed header shows count ("Done (5)") for a quick recognition moment. Expandable to see what's been knocked out.

### Filter toggle

Three states, persistent across views and view switches:

| Filter | Shows |
|---|---|
| **Mine** | Tasks assigned to me + shared tasks |
| **Theirs** | Tasks assigned to my partner + shared tasks |
| **All** | Everything (mine + theirs + shared, no duplicates) |

Shared tasks (assignee_user_id = null) appear in **every** filter state.

### Task interactions

All task interactions work identically in every view:

- **Swipe right:** Complete (direct or reveal mode, per user setting)
- **Swipe left:** Postpone menu (Tomorrow, Next Week, Next Month, Pick a Date)
- **Tap:** Open task detail/edit
- **First-time tooltip:** On first swipe-to-complete, non-blocking tip about reveal mode in settings

### Context-aware task creation

A persistent add button is always available (exact placement determined in design phase). Creating a task defaults the due date based on context:

| Creating from | Default due date |
|---|---|
| Today view | Today |
| Week view (day X selected) | Day X |
| Month view (day Y selected) | Day Y |

Quick-entry: title focused, smart defaults pre-filled, type and hit enter. Expandable for full fields.

## Today view

### The hero

Today is opened ten times a day. It answers "what do I need to do right now?" and "what can I grab when I have a moment?" Everything about it is optimized for fast scanning and fast action.

### Structure

1. **Primary section** — hard-deadline tasks due today, plus hard-deadline overdue tasks from previous days (with a gentle "still hanging around" indicator, warm not scolding)
2. **Secondary section** — flexible tasks due today or whose date has passed and auto-surfaced
3. **Done accordion** — collapsed, shows completion count

### Overdue handling (Today view)

- **Hard-deadline tasks from previous days** that weren't completed show up in the primary section. Subtle warm indicator (e.g., "from yesterday," "still hanging around"). Never red ink, never "overdue," never scolding.
- **Flexible tasks past their date** quietly appear in the secondary section. No special indicator — they're "when you can" items that followed the user forward. No ghost left on their original day in Week/Month views.

### Roll Over

Available in the Today view when incomplete tasks remain. Pushes all incomplete tasks to tomorrow.

- **Repeating tasks:** absorbed if tomorrow already has a scheduled occurrence (no duplicates)
- **Non-repeating tasks:** always move to tomorrow
- **Hard-deadline and flexible tasks:** both roll over
- Exact UI trigger (button, end-of-day prompt, etc.) determined in design phase

### Empty states

Two variants:

- **No tasks at all** (new household or everything deleted): strong CTA to create the first task. Onboarding moment.
- **Caught up** (tasks exist elsewhere, but nothing for today): warm, rewarding copy. "Nothing left today. You two are dangerous." 3–4 rotating variants, cycled so the same line doesn't show twice in a row.

## Week view

### Structure

**Top: Horizontal day strip.** Seven days, left to right. Each day shows:
- Day name and date
- Small density indicator (count, dot, or subtle visual) — how many tasks that day
- Highlighted state for the currently selected day

**Bottom: Selected day's task list.** Identical layout to Today view (primary section, secondary section, Done accordion). All the same interactions (swipe, filter, create).

### Navigation

- **Tap a day in the strip** to select it and see its tasks below
- **Day selection only via strip** — no horizontal swipe on the task list area (preserves swipe-to-complete/postpone gestures)
- **Switching from Month view to Week:** the Week strip shows the week containing whatever day was selected in Month, with that day selected. Preserves context.

### Overdue behavior in Week view

- **Past days are viewable.** Tapping Monday on a Wednesday shows Monday's tasks, including any that are still incomplete. Tasks stay on their original day — they don't auto-move. The user decides to postpone or roll over explicitly.
- **Exception: flexible tasks.** Flexible tasks whose date has passed do not appear on their original day. They've auto-surfaced in Today's secondary section.

### Empty states

Same two-variant approach as Today: "no tasks at all" and "this day/week is clear." Rotating copy. The density indicators in the day strip also provide visual information about emptiness.

## Month view

### Structure

**Top: Calendar grid.** Full month layout showing all days. Each day cell has:
- The date number
- A single density indicator showing how many tasks are on that day
- No distinction between hard-deadline and flexible in the indicator (v1)
- No full task titles in the grid — density only

**Bottom: Selected day's task list.** Same layout as Today/Week. Tap a day in the grid to see its tasks.

### Navigation

- **Tap a day in the grid** to select it and see its tasks
- **Switching from Month to Week:** Week shows the week containing the selected day, with that day still selected

### Use case

Month is for the tasks that must not slip by: rent, quarterly bills, anniversary, doctor's appointment. The density indicators let you scan the month to see which days are heavy and which are light. Planning happens here; execution happens in Today.

### Empty states

Same approach: "no tasks at all" and "this month is clear." Rotating copy.

## View switching

### Navigation

Today, Week, and Month are always one tap away from each other via a persistent navigation element:
- **Desktop:** left sidebar (exact design deferred to Impeccable phase)
- **Mobile:** traditional bottom tab bar (exact design deferred to Impeccable phase)

### Context preservation

Switching between views preserves the selected day:
- Today → Week: Week strip highlights today
- Week (Thursday selected) → Month: Month grid highlights Thursday
- Month (23rd selected) → Week: Week strip shows the week of the 23rd, with the 23rd selected
- Any view → Today: always shows today (the "today" shortcut)

### Performance

- **Instant transitions.** No loading spinner when switching views. Data is already client-side from the initial fetch.
- **Loading state only on initial app open** or after a long period of inactivity.
- View switching is re-filtering client-side data, not a new network request.

### "Today" shortcut

A quick-access button or gesture that snaps any view back to the current day, regardless of where the user has navigated. Available from Week and Month views.

## Usage patterns

Expected usage frequency informs design priority:

- **Today ↔ Week:** the hot path. Users toggle frequently between these two. They should feel like almost the same surface (and given the shared task list layout, they are).
- **Month:** less frequent, more deliberate planning gesture. Accessed when looking ahead or checking specific dates.

## Responsive design

The navigation pattern is responsive — desktop and mobile get appropriate treatments. The task list layout and interaction model are the same across form factors. Mobile must feel native-quality even during the web phase. Exact breakpoints and navigation components determined in Impeccable/design system phase.

## Latency targets

| Moment | Target |
|---|---|
| View switching (Today ↔ Week ↔ Month) | Instant. No loading state. Client-side re-filter. |
| Selecting a day (Week strip or Month grid) | Instant. Task list updates with no perceptible delay. |
| Initial app open (cold start) | Data fetched and first view rendered. Target TBD during build. |
| Returning to app (warm start) | Today view renders before any network round-trip (cached data). Fresh data arrives via next poll. |

## Acceptance criteria

- Switching between views is instant (no loading state visible)
- Today view renders before any network round-trip when returning to the app
- All three views display the correct tasks for the selected time slice
- Filter toggle (Mine / Theirs / All) works correctly in every view; shared tasks appear in all states
- Hard-deadline overdue tasks appear in Today's primary section with gentle indicator
- Flexible past-date tasks auto-surface in Today's secondary section only (not on original day)
- Week day strip shows correct density indicators
- Month calendar grid shows correct density indicators
- Context is preserved when switching between views (selected day carries over)
- "Today" shortcut works from Week and Month views
- Completed tasks move to collapsed Done accordion with correct count
- Postpone moves task to correct date; task animates out of current day
- Roll Over pushes all incomplete tasks to tomorrow; repeating tasks absorbed
- Task creation from each view defaults due date correctly
- Swipe gestures (complete, postpone) work in all views
- Swipe mode setting (direct vs reveal) is respected
- Every view has real empty states (both "no tasks" and "caught up" variants)
- Empty state copy rotates (3–4 variants, no repeat two days in a row)
- All three views pass keyboard navigation and screen reader checks (WCAG 2.1 AA)
- All three views are responsive (mobile and desktop)

## Test coverage

Happy paths *and* edge cases:

- Task completed in Today disappears from active list and appears in Done accordion
- Done accordion shows correct count; expands and collapses
- Partner completes a task while Today is open — update propagates within 5 seconds
- Week day strip correctly highlights selected day and shows density
- Tapping different days in Week strip updates task list correctly
- Month grid density indicators match actual task counts
- View switch from Month (23rd selected) → Week → Today preserves context correctly
- "Today" shortcut snaps back from any navigated state
- Filter toggle: "Mine" shows my tasks + shared; "Theirs" shows partner's + shared; "All" shows everything
- Overdue hard-deadline task appears in Today's primary section with indicator
- Flexible past-date task appears in Today's secondary section; not on original day in Week
- Roll Over with mix of repeating (absorbed) and non-repeating (moved) tasks
- Postpone from Week view (looking at Thursday): task moves to selected date, disappears from Thursday
- Creating a task from Week view with Friday selected: due date defaults to Friday
- Empty state renders correctly for each view (both variants)
- Empty state copy rotates correctly (not same line twice in a row)
- Week view with 0 tasks on a day shows empty day correctly in strip and list
- Month view with 0 tasks on a day shows empty day correctly in grid and list
- Month view with a day that has 20+ tasks: density indicator handles gracefully
- Keyboard navigation: can switch views, select days, and interact with tasks without mouse
- Screen reader: all views announce correctly
- Responsive: views render correctly at mobile and desktop breakpoints
