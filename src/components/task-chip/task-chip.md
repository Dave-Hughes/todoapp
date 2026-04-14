# TaskChip

## Purpose

A quiet, rounded pill chip representing a single task field — due date, assignee, category, repeat rule, or the "More" overflow. Displays the current value of the field as a tappable button. Phase 1: visual-only placeholder (clicking is a no-op). Phase 2: `onClick` will open a field picker (popover or sub-sheet).

Used exclusively inside `TaskSheet`'s chip row.

## Non-purpose

- Not a badge or tag for display-only metadata (use the category pill in `TaskListItem` for that).
- Not a checkbox or toggle — it opens a picker, it doesn't toggle between two values.
- Not a general-purpose chip for filter controls (use `FilterToggle` for Mine/Theirs/All).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `ReactNode` | required | Emoji or Lucide icon at the chip's start. Marked `aria-hidden`; the `ariaLabel` carries all accessible meaning. |
| `label` | `string` | required | Human-readable current value: "Today", "Me", "Uncategorized", "Doesn't repeat", "More". |
| `ariaLabel` | `string` | required | Full accessible label for the button: "Set due date", "Set assignee", etc. Distinct from visible label. |
| `onClick` | `() => void` | — | Called when the chip is clicked/tapped. Opens the associated picker. |
| `disabled` | `boolean` | `false` | Disables the chip (reduced opacity, no pointer events). Used during form submission. |
| `isActive` | `boolean` | `false` | Whether the chip's picker is open. Controls `aria-expanded` and accent-subtle visual state. |
| `className` | `string` | `""` | Additional Tailwind/CSS classes for layout overrides. |

## States

| State | Behavior |
|---|---|
| Default | Warm neutral bg (`--color-chip-bg`), secondary text, subtle border. |
| Active (picker open) | Accent-subtle bg (`--color-accent-subtle`), accent border, accent-hover text. `aria-expanded="true"`. |
| Hover | Slightly darker bg (`--color-chip-bg-hover`), darker border, primary text. Smooth 100ms transition. |
| Focus-visible | 2px `--color-border-focus` outline, 2px offset. Keyboard users only. |
| Active | `scale(0.97)` micro-press. 100ms transition. |
| Disabled | 50% opacity. `pointer-events: none`. Used during submit. |

## Accessibility

- `type="button"` — never implicitly submits the enclosing form.
- `aria-label` is always required and must be distinct from the visible label. "Today" as a visible label → "Set due date" as `aria-label`.
- Icon span is `aria-hidden="true"` — the emoji/icon is decorative; the label carries the meaning.
- Touch target `min-h-[var(--touch-target-min)]` (44px) — meets WCAG 2.5.5.
- Focus ring uses `:focus-visible` — appears only for keyboard navigation, not mouse clicks.

## Usage

```tsx
import { TaskChip } from "@/components/task-chip/task-chip";

// Phase 1: no-op (no onClick)
<TaskChip
  icon="📅"
  label="Today"
  ariaLabel="Set due date"
/>

// Phase 2: with picker handler
<TaskChip
  icon="📅"
  label="Today"
  ariaLabel="Set due date"
  onClick={() => openDatePicker()}
/>
```

## Do / Don't

**Do** always pass a distinct `ariaLabel` that names the field, not the value. "Set due date" is correct; "Today" is not (it's the visible label).

**Don't** use this chip outside of `TaskSheet`. It's designed for the chip row context — its max-width truncation, sizing, and spacing assume horizontal row placement.

**Do** pass `disabled` during form submission to prevent double-opens.

**Don't** add icons via CSS background-images. Pass the icon as `ReactNode` so it stays in the React tree and benefits from consistent sizing.

## Changelog

| Date | Change |
|---|---|
| 2026-04-13 | Initial implementation. Phase 1: visual chip with hover/focus/active/disabled states. No-op onClick. Ready for Phase 2 picker wiring. |
| 2026-04-13 | Phase 1b: Removed inline fallback `var(--space-1-5, 0.375rem)`. Token `--space-1-5` (6px) is now a first-class entry in `tokens.css` with documentation. No visual change. |
| 2026-04-14 | Phase 2: Added `isActive` prop for picker-open state. Added `aria-expanded`. Converted to `forwardRef` so parent can hold ref for Popover anchoring. Active state uses accent-subtle bg + accent border. |
