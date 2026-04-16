# Checkbox

## Purpose

A circular, animated checkbox used to mark tasks complete or incomplete. The checkmark draws in with a short path animation on check and erases on uncheck. Respects `prefers-reduced-motion` — the animation is skipped entirely for users who prefer less motion. This is the primary task-completion affordance in the app.

## Non-purpose

- Not a native `<input type="checkbox">` — it is a `<button role="checkbox">` to allow full control over appearance and animation. Do not use it inside a `<form>` expecting a standard form field value.
- Not for multi-select or indeterminate states (no `indeterminate` prop in v1).
- Not for settings toggles — use a dedicated toggle component for on/off settings.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | required | Whether the checkbox is in the checked state. |
| `onChange` | `(checked: boolean) => void` | required | Called with the new boolean value when the user clicks. |
| `disabled` | `boolean` | `false` | Prevents interaction and reduces opacity to 50%. |
| `label` | `string` | required | Accessible label announced by screen readers. Should describe the action, e.g. `Complete "Buy groceries"`. |
| `className` | `string` | `""` | Extra classes on the button element. |

## States

| State | Behavior |
|---|---|
| Unchecked | Transparent fill, `--color-border` border. |
| Unchecked hover | `--color-accent` border, `--color-accent-subtle` fill. |
| Checked | `--color-accent` border and fill. Checkmark path animates in (0.25s ease-out-quart). |
| Checked → Unchecked | Checkmark path animates out (opacity 0.1s). |
| Disabled | 50% opacity, `cursor-not-allowed`. No hover or click response. |
| Reduced motion | All Framer Motion transitions set to `duration: 0`. Checked/unchecked state still toggles visually. |

## Accessibility

- `role="checkbox"` and `aria-checked` on the `<button>` element give screen readers correct semantics.
- `aria-label` from the `label` prop provides the accessible name. Make it action-oriented: `Complete "Task title"` when unchecked, `Mark "Task title" incomplete` when checked.
- `disabled` maps to the native `disabled` attribute, which removes the element from tab order and announces as disabled.
- The visual touch target is expanded to `--touch-target-min` (44px) via negative margin (`-m-[11px]`) on the 22px circle, so the tappable area is much larger than it appears.
- The SVG checkmark is `aria-hidden="true"` — the button label carries all meaning.

## Usage examples

```tsx
// Basic controlled usage
const [done, setDone] = useState(false);

<Checkbox
  checked={done}
  onChange={setDone}
  label={done ? `Mark "Buy milk" incomplete` : `Complete "Buy milk"`}
/>

// Disabled
<Checkbox
  checked={false}
  onChange={() => {}}
  disabled
  label='Complete "Locked task"'
/>
```

In practice, `Checkbox` is used inside `TaskListItem` and rarely instantiated directly.

## Do / Don't

**Do** make `label` context-aware — it should change between `Complete "X"` and `Mark "X" incomplete` based on `checked` state.

**Don't** use this as a form field. It has no `name` or `value` prop. For form-based multi-select, use a native `<input type="checkbox">` styled separately.

**Do** keep the negative-margin touch-target expansion in mind when placing `Checkbox` near other interactive elements — the tappable area extends 11px beyond the visual edge.

**Don't** wrap `Checkbox` in another `<button>`. The component is already a button; nesting interactive elements breaks keyboard and assistive-tech behavior.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Animated checkmark path, reduced-motion support, circular design, touch-target expansion. |
| 2026-04-15 | Lint fix: celebration bloom trigger moved from `useEffect` (watching `checked` prop) to the `onClick` handler. Eliminates `react-hooks/set-state-in-effect`. Behaviorally identical — the only path from unchecked→checked is via the click handler. Removed unused `useRef`/`useEffect` imports. |
