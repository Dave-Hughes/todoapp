# NotificationBell

## Purpose

Bell icon button with an unread-count badge. Opens a notification panel — a Popover on desktop (≥ 768 px) or a BottomSheet on mobile (< 768 px). Lists all household notifications via `NotificationList`.

## Props

| Prop | Type | Description |
|---|---|---|
| `members` | `{ id: string; displayName: string }[]` | Household members, forwarded to `NotificationList` for resolving actor display names. |

`members` is the only required prop. Notifications and tasks are fetched internally via `useNotifications` and `useTasks`.

## Interaction

1. **Badge**: shows unread count capped at "9+". Hidden when count is zero.
2. **Open**: clicking the bell opens the panel and fires `useMarkAllNotificationsRead` if `unreadCount > 0`. Mark-all fires once on open, not again on subsequent opens with zero unread.
3. **Row click**: closes the panel immediately. If the notification has a `taskId`, calls `router.push("/today")` and then `scrollToTaskAndHighlight(taskId)` after 400 ms to let the task list mount before scrolling.
4. **Close**: Escape, click outside (Popover), or dragging down (BottomSheet).
5. **Mobile detection**: `window.matchMedia("(max-width: 767px)")` — wired with an `addEventListener("change")` listener so the panel choice updates on resize without a full remount.

## Accessibility

- `aria-label` on the button describes unread count when > 0 ("Notifications — N unread") and falls back to "Notifications" when 0.
- `aria-haspopup="dialog"` and `aria-expanded` keep screen readers oriented.
- Badge `<span>` is `aria-hidden="true"` — the count is already in the button's `aria-label`.

## Solo gating

The caller (e.g., `MobileHeader`, `Sidebar`) should only mount `NotificationBell` when the household is paired. In solo state there are no partner-generated notifications, so the bell adds noise without value.

## Changelog

| Date | Change |
|---|---|
| 2026-04-16 | Initial implementation. Popover (desktop) + BottomSheet (mobile), mark-all on open, row click navigates + scroll-highlights. |
