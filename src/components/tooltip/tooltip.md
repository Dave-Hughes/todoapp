# Tooltip

## Purpose

Portal-rendered tooltip that escapes `overflow: hidden` parents (e.g. the Sidebar, rounded task rows). Desktop-only — hidden at `< lg`. Shows on pointer hover and keyboard focus of the wrapped trigger.

## Non-purpose

- Not a mobile affordance. Hidden under `lg:`. Use inline labels or a bottom sheet on touch.
- Not a general popover or dropdown. For menus, use a portal-rendered `role="menu"` element (see `task-list-item.tsx`).
- Not a form-level help mechanism. For persistent help text, use inline hints under inputs.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `label` | `string` | required | Visible text of the tooltip. |
| `shortcut` | `string \| undefined` | — | Optional keyboard shortcut hint (e.g. `"⌘\\"`, `"Esc"`). Rendered as a `<kbd>` with a muted inverse background. |
| `placement` | `"top" \| "bottom" \| "right" \| "left"` | `"bottom"` | Where the tooltip appears relative to the trigger. |
| `offset` | `number` | `6` | Distance from trigger edge in px. |
| `children` | `ReactNode` | required | The trigger element. Wrapped in a `<span>` with `display: inline-flex`. |

## Behavior

- Appears on `mouseenter` / `focus`; hides on `mouseleave` / `blur`.
- Rendered through `document.body` via React portal — survives clipping parents.
- Position is computed on each show against the trigger's bounding rect, so it stays accurate even if the trigger moves between shows.
- `role="tooltip"` is applied so screen readers announce it contextually via associated `aria-label` / `aria-describedby` on the trigger.
- `pointer-events: none` on the floating label — never blocks clicks.

## Accessibility

- The trigger element should carry its own `aria-label` / accessible name. The tooltip label is a visual affordance, not the primary accessible name.
- Tooltips appear on both hover and keyboard focus.
- The `<kbd>` element is semantically correct for shortcuts and announced appropriately by AT.

## Usage examples

```tsx
// Basic
<Tooltip label="Complete">
  <Checkbox ... />
</Tooltip>

// With keyboard shortcut + placement
<Tooltip label="Pin sidebar" shortcut="⌘\" placement="top">
  <button aria-label="Pin sidebar" aria-pressed={isPinned}>…</button>
</Tooltip>
```

## Do / Don't

**Do** keep labels short — 1–3 words.

**Do** include shortcut hints on controls that have keyboard bindings.

**Do** pass the trigger's actual accessible name via `aria-label`. Tooltips are a visual bonus, not a replacement.

**Don't** put interactive elements inside the tooltip. It has `pointer-events: none`.

**Don't** use for persistent help. If content needs to stay visible, place it inline.

## Changelog

| Date | Change |
|---|---|
| 2026-04-13 | Extracted from `task-list-item.tsx` into a shared component. Added `placement`, `offset`, and `shortcut` props. |
