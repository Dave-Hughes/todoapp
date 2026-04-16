# Popover

Portal-rendered, click-triggered popover that positions relative to an anchor element. Used by task sheet chip pickers for inline selection UIs.

## What it's for

- Inline pickers that open from chip buttons (date, assignee, category)
- Any small UI that needs to float near a trigger element
- Desktop and mobile inline popovers (Date picker uses BottomSheet on mobile instead)

## What it's not for

- Full-screen overlays or modals (use BottomSheet)
- Hover-only information (use Tooltip)
- Menus with destructive actions (future — use a dedicated menu component)

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | — | Controlled open state |
| `onClose` | `() => void` | — | Called on Escape or click outside |
| `anchorRef` | `RefObject<HTMLElement>` | — | The trigger element to position against |
| `placement` | `"bottom-start" \| "bottom-center" \| "bottom-end"` | `"bottom-start"` | Popover position relative to anchor |
| `role` | `"dialog" \| "listbox" \| "menu" \| "grid"` | `"dialog"` | ARIA role for the container |
| `ariaLabel` | `string` | — | Accessible label |
| `children` | `ReactNode` | — | Popover content |
| `className` | `string` | `""` | Additional classes |

## States

- **Closed**: not rendered in DOM
- **Open**: portal-rendered at computed position, animated entrance
- **Repositioning**: auto-adjusts on scroll/resize

## Accessibility

- Focus moves to first focusable element on open
- Escape closes and parent handles focus return to trigger
- `aria-modal={false}` — popover does not trap focus (parent sheet owns the trap)
- Click outside closes

## Usage

```tsx
<Popover
  isOpen={isDateOpen}
  onClose={() => setIsDateOpen(false)}
  anchorRef={dateChipRef}
  placement="bottom-start"
  role="grid"
  ariaLabel="Pick a date"
>
  <DatePicker value={date} onChange={setDate} />
</Popover>
```

## Do / Don't

- **Do** pass a meaningful `role` that matches the content (grid for calendar, listbox for selection lists)
- **Do** let the parent handle focus return — Popover only moves focus in
- **Don't** nest Popovers
- **Don't** use for content that needs scroll — keep popover content compact

## Changelog

- **Phase 2**: Initial implementation. Portal-rendered, positioned relative to anchor, animated with Framer Motion.
- **2026-04-15**: Lint fix: positioning effects (`setPos` on open/close and measure-then-reposition) changed from `useEffect` to `useIsoLayoutEffect`. DOM measurement belongs in layout effects; also satisfies `react-hooks/set-state-in-effect`.
