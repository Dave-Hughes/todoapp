# DoneAccordion

## Purpose

Collapsible section at the bottom of a task list that holds completed tasks. Shows a "Done (N)" toggle button with a rotating chevron. When expanded, the list animates open with a height transition. Completed tasks render as `TaskListItem` with `variant="done"`. Returns `null` when the task list is empty, so callers never need to guard against an empty render.

## Non-purpose

- Not a general-purpose accordion or disclosure widget — it is purpose-built for the done-tasks section.
- Not responsible for managing the completed task list — `tasks` is passed as a prop.
- Does not handle `onComplete` or `onPostpone` for the done items — those are no-ops since done items cannot be re-completed or postponed here.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `tasks` | `Task[]` | required | Array of completed tasks. Component returns `null` if empty. |
| `onUncomplete` | `(taskId: string) => void` | required | Called when a user unchecks a done task to move it back to active. |
| `onTap` | `(taskId: string) => void` | required | Called when a user taps a done task row to open the edit sheet. |

## States

| State | Behavior |
|---|---|
| Empty (`tasks.length === 0`) | Returns `null` — nothing rendered. |
| Collapsed (default) | "Done (N)" button with chevron pointing down. |
| Expanded | Chevron rotates 180°. List animates open (height + opacity). |
| Collapsing | List animates closed (height to 0 + opacity to 0). |
| Reduced motion | `opacity` transition only (no height animation). `duration: 0` on chevron rotation. |

## Accessibility

- The toggle button has `aria-expanded` set to `true` or `false`, which assistive technologies announce correctly.
- The `ChevronDown` icon is `aria-hidden="true"`.
- The task count in the button label (`Done (N)`) uses `tabular-nums` so it doesn't shift layout as digits change.
- Each `TaskListItem` inside carries its own accessible labels (see `task-list-item.md`).
- Focus management: when the section collapses, focus remains on the toggle button. No focus trap needed.

## Usage examples

```tsx
<DoneAccordion
  tasks={completedTasks}
  onUncomplete={(id) => uncompleteTask(id)}
  onTap={(id) => openEditSheet(id)}
/>

// No render guard needed — component handles empty internally
<DoneAccordion
  tasks={[]}               // renders nothing
  onUncomplete={() => {}}
  onTap={() => {}}
/>
```

## Do / Don't

**Do** place `DoneAccordion` below the active task list, separated by a small margin. The component adds `mt-[var(--space-4)]` on its outer wrapper — don't add additional top margin on the parent.

**Don't** pass active (non-done) tasks to `DoneAccordion`. The items render with `variant="done"`, which disables drag and applies strikethrough unconditionally.

**Do** pass a stable `onUncomplete` callback — toggling a task to active should remove it from the `tasks` array, which will cause the component to re-render the list without that item (or return `null` if it was the last one).

**Don't** try to control the open/closed state from outside — `DoneAccordion` owns its own `isOpen` state. If you need external control, refactor to a controlled variant.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Animated height expand/collapse, chevron rotation, null-on-empty guard, reduced-motion support. |
| 2026-04-12 | Changed done task list from `gap` spacing to `divide-y` with surface container and rounded corners, matching the active task list visual treatment. |
