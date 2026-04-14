# Fab

## Purpose

Floating action button for the primary "Add task" action on mobile. Positioned above the `BottomTabs` bar using `--tab-bar-height` and `--fab-offset` tokens. Animates in on mount with a scale-from-zero pop (delayed 0.2s to let the page content settle first). Provides a `whileTap` scale-down for tactile press feedback. Mobile-only — hidden on desktop where a different affordance (e.g., a header button or keyboard shortcut) should be used.

## Non-purpose

- Not visible on desktop (`lg:hidden`). Do not add a desktop fallback inside this component; handle desktop add-task separately.
- Not for secondary actions. FAB = one primary action per screen. If you need multiple actions, use a different pattern.
- Not a router link — it fires `onClick` and the caller opens the `BottomSheet` or navigates as needed.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `onClick` | `() => void` | required | Called when the button is pressed. Typically opens the new-task `BottomSheet`. |
| `label` | `string` | `"Add task"` | `aria-label` on the button. Override if the action in context is more specific. |

## States

| State | Behavior |
|---|---|
| Mount | Animates from `scale: 0, opacity: 0` to `scale: 1, opacity: 1` over 0.3s with 0.2s delay. |
| Resting | Accent background (`--color-accent`), large shadow (`--shadow-lg`). |
| Hover | Accent-hover background (`--color-accent-hover`). |
| Pressed (`whileTap`) | Scales to 0.92. Shadow reduces to `--shadow-md`. |
| Reduced motion | No mount animation, no tap scale. Color transitions still work. |

## Accessibility

- `aria-label` is set from the `label` prop (default `"Add task"`).
- The `Plus` icon is `aria-hidden="true"`.
- Button height and width are controlled by `--fab-size` token — ensure the token value is ≥ 44px.
- The FAB is positioned fixed at `--fab-offset` from the right and above `--tab-bar-height`, keeping it clear of the bottom navigation.

## Usage examples

```tsx
// Standard usage
<Fab onClick={() => setNewTaskSheetOpen(true)} />

// Custom label when context is specific
<Fab
  onClick={() => setNewTaskSheetOpen(true)}
  label="Add task for today"
/>
```

## Do / Don't

**Do** place `Fab` inside `AppShell` (or its equivalent) so the `--tab-bar-height` offset resolves correctly against the actual tab bar.

**Don't** render `Fab` on desktop. It self-hides via `lg:hidden`, but including it in desktop-only layouts is confusing.

**Do** use a specific `label` if the action differs from the generic "Add task" — e.g., if the current view only adds to a specific date.

**Don't** add text next to the icon. The FAB is icon-only; the label is for screen readers only. Extending it to an icon+text "extended FAB" requires a layout change.

**Don't** disable the FAB without explanation. If the action is temporarily unavailable, show a `Toast` explaining why.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Scale-in mount animation, whileTap feedback, mobile-only, reduced-motion support. |
