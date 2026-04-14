# EmptyState

## Purpose

Friendly, contextual placeholder shown when a task list has no items. Has two variants: `no-tasks` for a brand-new user who hasn't added anything yet (onboarding moment), and `caught-up` for a user who has completed everything (celebration moment). Copy rotates daily in the `caught-up` variant so it doesn't feel stale. Animates in with a gentle fade-up; respects `prefers-reduced-motion`.

## Non-purpose

- Not a general error state — use a dedicated error component for fetch failures or permission errors.
- Not shown when the filter is active but yields no results — that is a distinct "no results for this filter" state (not yet built in v1).
- Not a loading skeleton — use a skeleton component while data is in flight.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `"no-tasks" \| "caught-up"` | required | `no-tasks` = first run / nothing added yet. `caught-up` = all tasks completed. |
| `onAddTask` | `() => void \| undefined` | — | When provided and `variant === "no-tasks"`, renders the "Add the first thing" CTA button. |

## States

| State | Behavior |
|---|---|
| `no-tasks` | Notebook-and-pencil illustration. Onboarding headline. CTA button if `onAddTask` is provided. |
| `no-tasks`, no `onAddTask` | Illustration and headline only. No button. |
| `caught-up` | Checkmark-circle illustration. One of four rotating celebratory copy lines (day-of-year modulo). |
| Mount animation | `opacity: 0, y: 8` → `opacity: 1, y: 0` over 0.5s. |
| Reduced motion | No y-translate, `duration: 0`. Opacity still transitions for screen-reader perception (not perceptible to user). |

## Copy (caught-up rotation)

Rotates deterministically by day of year — the same copy shows all day, but changes the next day:

1. "Nothing left today. You two are dangerous."
2. "All clear. The rest of today is yours."
3. "Done and done. Go enjoy something."
4. "Clean slate. What trouble are you two getting into?"

## Accessibility

- The illustration `<div>` and SVG are `aria-hidden="true"` — they are decorative.
- The headline is an `<h2>` so it participates in the document heading hierarchy.
- The CTA button meets `--touch-target-min` (44px) and has an explicit text label.
- `active:scale-[0.98]` provides tactile press feedback; this is a cosmetic scale that does not cause layout shift.

## Usage examples

```tsx
// First-time user, no tasks
<EmptyState variant="no-tasks" onAddTask={() => setSheetOpen(true)} />

// First-time user, no add action (read-only view)
<EmptyState variant="no-tasks" />

// All tasks done
<EmptyState variant="caught-up" />
```

## Do / Don't

**Do** show `caught-up` only when the active task list is genuinely empty after all tasks are completed — not when a filter produces zero results.

**Don't** show `EmptyState` while data is still loading. Gate it on `isLoading === false && tasks.length === 0`.

**Do** pass `onAddTask` for the `no-tasks` variant in any view where the user can add tasks. The CTA is the fastest path to engagement for a new user.

**Don't** customize or replace the rotating copy without going through voice and tone review. The playful, couples-directed tone is intentional.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Two variants, day-rotation copy, animated entry, reduced-motion support, CTA button. |
