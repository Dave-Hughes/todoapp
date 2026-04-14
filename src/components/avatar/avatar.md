# Avatar

## Purpose

Displays a user's identity as a circular monogram. Used wherever a person needs a visual presence — in the sidebar, mobile header, and task list items. Generates a deterministic warm-hue background from the user's name so each person always gets the same color, and it always feels Cozy.

## Non-purpose

- Not for images or uploaded photos (no `src` prop; this is an initials-only component for v1).
- Not for generic icons or status badges beyond the single notification dot.
- Not a button or interactive target on its own — wrap it if you need click behavior.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | required | Full name or display name. First character becomes the initial; the full string drives the hue hash. |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | `sm` = 28px, `md` = 36px, `lg` = 44px. |
| `showNotification` | `boolean` | `false` | Shows a small accent-colored dot at the top-right corner. |
| `className` | `string` | `""` | Extra classes on the outer wrapper. |

## States

| State | Behavior |
|---|---|
| Default | Circular monogram with deterministic warm background. |
| With notification | Accent dot (`--color-accent`) with a surface-colored ring appears top-right. |
| `sm` | 28 × 28px, `--text-xs` initial. |
| `md` | 36 × 36px, `--text-sm` initial. |
| `lg` | 44 × 44px, `--text-base` initial. |

## Accessibility

- The inner circle has `role="img"` and `aria-label={name}`, so screen readers announce the person's name.
- The notification dot has `aria-label="New notification"`.
- No interactive role — add `aria-label` and keyboard handling on any wrapping `<button>` if you make it tappable.
- `sm` and `md` sizes are smaller than 44px visually, but the touch target is expanded with negative margin (`-m-[11px]`) when placed inside an interactive parent; verify touch target in context.

## Usage examples

```tsx
// Sidebar: large avatar with notification dot
<Avatar name="Krista" size="lg" showNotification />

// Mobile header: small avatar, no dot
<Avatar name="Dave" size="sm" />

// Task list: small avatar for assignee attribution
<Avatar name={task.assigneeName} size="sm" />

// Custom wrapper class
<Avatar name="Krista" size="md" className="ring-2 ring-[var(--color-accent)]" />
```

## Do / Don't

**Do** pass the person's full display name — the hue hash uses all characters, so "Dave" and "David" render different but consistent warm hues.

**Don't** pass an empty string. `getInitial("")` returns an empty initial and `getHue("")` returns 20°, producing a fallback swatch — defensively fine but semantically wrong. Guard upstream.

**Do** use `showNotification` only for genuine unread-notification state, not as a general badge.

**Don't** hard-code the background or text color. The warm oklch values are intentional design choices — override only via a new token if a theme requires a different approach.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Deterministic warm hue (20°–60° oklch), three sizes, notification dot. |
