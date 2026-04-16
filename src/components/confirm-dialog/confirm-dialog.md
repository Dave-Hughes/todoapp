# ConfirmDialog

## Purpose

A lightweight centered modal dialog for confirming destructive actions (e.g., delete). Renders a title, one or more action buttons, and a cancel button. Focus-trapped and keyboard-accessible.

## Non-purpose

- Not for form input or complex content — use BottomSheet for that.
- Not for non-blocking feedback — use Toast for that.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility. |
| `onClose` | `() => void` | required | Called on Escape, backdrop click, or cancel button. |
| `title` | `string` | required | Dialog heading (e.g., "Delete it for good?"). |
| `actions` | `ConfirmDialogAction[]` | required | Action buttons. Each has `label`, `onClick`, optional `variant` ("destructive" or "default"). |
| `cancelLabel` | `string` | `"Never mind"` | Cancel button text. |

## States

| State | Behavior |
|---|---|
| Closed | Not in DOM (AnimatePresence). |
| Opening | Backdrop fades in, dialog scales up from 0.95. |
| Open | Focus trapped. First action button auto-focused. |
| Closing | Reverse of opening animation. Focus returns to previously focused element. |
| Reduced motion | Opacity only, no scale. Duration 0. |

## Accessibility

- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title.
- Focus trapped: Tab/Shift+Tab cycle within dialog buttons.
- Escape closes the dialog.
- Focus restored to the previously focused element on close.
- All buttons meet touch target minimum (44px).

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Phase 4: Initial implementation for delete confirmation flows. |
| 2026-04-15 | Lint fix: removed unused `useCallback` import. |
