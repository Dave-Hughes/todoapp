# TaskListItem

## Purpose

Renders a single task row with its checkbox, title, metadata (time, category, overdue label), and optional assignee avatar. In `active` variant, the row is horizontally draggable: swipe right to complete, swipe left to postpone. In `done` variant, the row is static, the title is struck through, and the "completed by" name is shown. This is the primary list item across the Today, Week, and Month views.

## Non-purpose

- Not a standalone card — it is designed to live inside a list container (e.g., `DoneAccordion` or a task view's `<ul>`).
- Not responsible for fetching or storing task data — all data comes through props.
- Not used for non-task list items (settings rows, notification items, etc.).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `task` | `Task` | required | The task data object (see `Task` interface below). |
| `onComplete` | `(taskId: string) => void` | required | Called when the user checks the checkbox or swipes right. |
| `onUncomplete` | `(taskId: string) => void` | required | Called when a done-variant checkbox is unchecked. |
| `onPostpone` | `(taskId: string) => void` | required | Called when the user swipes left past the threshold. |
| `onTap` | `(taskId: string) => void` | required | Called when the user taps the task title/body area. Opens the edit sheet. |
| `showAssignee` | `boolean` | `true` | Whether to render the assignee avatar. Set to `false` in `DoneAccordion`. |
| `variant` | `"active" \| "done"` | `"active"` | `done` disables drag, shows strikethrough, hides time/overdue metadata. |
| `onDelete` | `(taskId: string) => void` | — | Called when delete is confirmed via inline menu confirmation. |
| `showSwipeHint` | `boolean` | `false` | When `true`, plays a one-time nudge animation (card slides right ~48px, revealing the "Done" swipe background, then snaps back) after 800ms. Used on the first task in a list to teach the swipe gesture. Respects `prefers-reduced-motion`. |

### Task interface

```ts
interface Task {
  id: string;
  title: string;
  dueTime?: string;          // e.g. "3:00 PM"
  flexible: boolean;
  assigneeName?: string;
  categoryName?: string;
  completedAt?: string;
  completedByName?: string;  // shown in done variant
  createdByName: string;
  overdueDays?: number;      // > 0 triggers the overdue label
}
```

## States

| State | Behavior |
|---|---|
| Active, resting | Surface background, title in primary text. |
| Active, swipe hint | Card nudges right 48px over 0.7s, revealing green "Done" background, then snaps back. Fires once after 800ms when `showSwipeHint` is `true`. |
| Active, hover | Canvas background (`--color-canvas`). |
| Swiping right | Green completion background revealed behind. "Done" label visible. |
| Swiping left | Warning background revealed behind. "Postpone" label visible. |
| Swipe complete (right ≥ 80px) | `onComplete` fires, swipe offset resets to 0. |
| Swipe postpone (left ≥ 80px) | `onPostpone` fires, swipe offset resets to 0. |
| Done variant | No drag, strikethrough title, tertiary text, "completed by" name in metadata. |
| Overdue | Warning-colored overdue label with RotateCcw icon. |
| Reduced motion | All Framer Motion transitions `duration: 0`. Drag still works; no spring return animation. |

## Accessibility

- The checkbox uses `Checkbox` component with a context-aware `aria-label` (e.g., `Complete "Buy milk"` or `Mark "Buy milk" incomplete`).
- The title area is a `<button>` with `aria-label="Edit ..."` that triggers `onTap` to open the edit sheet.
- **Overflow menu (Phase 4)**: Expanded to four items — Edit (Pencil icon), Done (Check), Tomorrow (ArrowRight), Delete (Trash2, destructive) — with a divider above Delete. For done-variant tasks, Done and Tomorrow are disabled (`aria-disabled="true"`) and skipped by arrow-key navigation. Delete triggers an inline confirmation ("Delete it for good?" with "Delete" / "Never mind"). Menu renders for both active and done variants. Supports Escape to close, Up/Down arrow navigation (skips disabled items), and Tab to close. First enabled menu item is auto-focused on open.
- **Desktop inline actions**: Complete/Postpone buttons are always in the DOM (for keyboard access) but visually hidden until hover or `focus-within`. CSS `opacity-0 group-hover:opacity-100 focus-within:opacity-100`.
- **Completion micro-celebration**: Checkbox shows a 150ms checked state before the row exits (respects `prefers-reduced-motion` with 0ms delay).
- When `assigneeName` is undefined, a dashed-circle placeholder with a `+` icon renders in place of the avatar. This maintains visual rhythm and hints that the task can be claimed. The placeholder is `aria-label="Unassigned"`.
- Swipe actions are gesture-only and discoverable via the overflow menu fallback and the swipe hint animation.
- The swipe action backgrounds are `aria-hidden="true"`.
- `Clock` and `CalendarClock` icons are `aria-hidden="true"`.

## Usage examples

```tsx
<TaskListItem
  task={{
    id: "abc123",
    title: "Pick up dry cleaning",
    dueTime: "5:00 PM",
    flexible: false,
    assigneeName: "Krista",
    categoryName: "Errands",
    createdByName: "Dave",
    overdueDays: 0,
  }}
  onComplete={(id) => completeTask(id)}
  onUncomplete={(id) => uncompleteTask(id)}
  onPostpone={(id) => postponeTask(id)}
  onTap={(id) => openEditSheet(id)}
/>

// Done variant (used inside DoneAccordion)
<TaskListItem
  task={{ ...task, completedByName: "Krista" }}
  onComplete={() => {}}
  onUncomplete={(id) => uncompleteTask(id)}
  onPostpone={() => {}}
  onTap={(id) => openEditSheet(id)}
  showAssignee={false}
  variant="done"
/>
```

## Do / Don't

**Do** always provide all four callbacks (`onComplete`, `onUncomplete`, `onPostpone`, `onTap`), even if they're no-ops in a given context — this keeps the prop signature stable.

**Don't** render `TaskListItem` outside of a scrollable list container. The swipe gestures rely on `overflow-hidden` on the parent wrapper for the reveal backgrounds to clip correctly.

**Do** use `variant="done"` (not `checked={true}` on the checkbox alone) for completed tasks in the done section — `variant` also disables drag and adjusts the entire row's visual treatment.

**Don't** use `overdueDays` with a `done` variant task — the overdue label is suppressed in done mode but passing the value is confusing.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Active/done variants, swipe gestures (complete + postpone), overdue label, assignee avatar, reduced-motion support. |
| 2026-04-12 | Added overflow menu (three-dot, portal-rendered) with Complete/Postpone actions. Keyboard nav (arrow keys, Escape, Tab). Desktop inline actions now always in DOM with CSS visibility toggle. Completion micro-celebration (150ms hold). Raw spacing values replaced with `--space-0-5` token. |
| 2026-04-12 | Added `showSwipeHint` prop for one-time swipe discovery nudge animation. Unassigned tasks now show a dashed-circle + icon placeholder instead of empty space. Overflow menu items renamed to "Done"/"Tomorrow" with semantic hover colors (`success-subtle`/`warning-subtle`), larger radius, and more generous padding. |
| 2026-04-14 | Phase 4: Expanded overflow menu (Edit, Done, Tomorrow, Delete with divider). Inline delete confirmation. Done-variant tasks get the menu with Done/Tomorrow disabled. Task content area is now a `<button>` for tap-to-edit. Arrow-key nav skips disabled items. `onDelete` prop added. |
