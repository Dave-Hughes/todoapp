# IconButton

## Purpose

A compact button that renders only an icon, with accessible labeling and consistent sizing/hover/focus behavior. Used for toolbar actions, close buttons, and inline actions throughout the app.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `ReactNode` | required | The icon element (e.g., `<X size={18} />`) |
| `label` | `string` | required | Accessible label (aria-label) |
| `variant` | `"default" \| "success" \| "warning" \| "destructive"` | `"default"` | Color variant for icon and hover background |
| `size` | `"sm" \| "md"` | `"md"` | Padding size |
| `disabled` | `boolean` | `false` | Disabled state |

All standard button HTML attributes are also accepted.

## Variants

| Variant | Icon color | Hover |
|---|---|---|
| default | tertiary -> secondary | surface-dim bg |
| success | success | success-subtle bg |
| warning | warning | warning-subtle bg |
| destructive | tertiary -> destructive | surface-dim bg |

## Accessibility

- `aria-label` from the `label` prop (required -- icon-only buttons must have an accessible name)
- Focus ring via `focus-visible:ring-2`
- Touch target >= 44px via `min-h/min-w-[var(--touch-target-min)]`
- Disabled state with reduced opacity

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Extracted from repeated icon button patterns across task-sheet, task-list-item, and date-picker. |
