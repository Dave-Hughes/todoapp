# MobileHeader

## Purpose

The top bar for mobile viewports (below `lg`). Shows collaborative points for both partners on the left and the current user's avatar (with optional notification dot) on the right. Provides at-a-glance partnership status without requiring the user to navigate anywhere. Hidden on desktop, where `Sidebar` carries the same information.

## Non-purpose

- Not visible on desktop (`lg:hidden`).
- Not a page title bar — it carries no heading or breadcrumb. Page-level headings live in the main content area.
- Not responsible for navigation — `BottomTabs` handles that.
- Does not manage its own data — all values are passed as props by `AppShell`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `userName` | `string` | required | Current user's display name. First name is extracted for the points display; full name is passed to `Avatar`. |
| `partnerName` | `string \| undefined` | — | Partner's display name. When absent, only the current user's points show. |
| `userPoints` | `number` | required | Current user's point total. |
| `partnerPoints` | `number \| undefined` | — | Partner's points. Only shown when `partnerName` is also provided. |
| `hasNotification` | `boolean` | `false` | Forwarded to `Avatar`'s `showNotification` prop. |

## States

| State | Behavior |
|---|---|
| Solo (no partner) | Only current user's first name + points on the left. No separator dot. |
| Paired | Both first names and points, separated by a `·` middot. |
| With notification | Avatar shows accent dot. |

## Accessibility

- Wrapped in `<header>` landmark.
- Points text uses `tabular-nums` so scores don't cause layout shift when digits change.
- `Avatar` carries `role="img"` and `aria-label={name}` internally.
- There is no interactive element in the header itself beyond the avatar's notification dot (which is presentational). If the avatar ever becomes tappable, add a wrapping `<button>` with an explicit `aria-label`.

## Usage examples

```tsx
// Inside AppShell — the typical usage
<MobileHeader
  userName="Dave"
  userPoints={42}
/>

// Paired with partner
<MobileHeader
  userName="Dave"
  partnerName="Krista"
  userPoints={42}
  partnerPoints={38}
  hasNotification={true}
/>
```

In practice this is always rendered by `AppShell`. Direct instantiation is only needed in tests or Storybook.

## Do / Don't

**Do** pass both `partnerName` and `partnerPoints` together. Passing one without the other will produce a partial display.

**Don't** add navigation links or action buttons to `MobileHeader`. It is an identity/status bar, not an action bar.

**Do** use `tabular-nums` formatting for any numeric values you add — it's already on the points container.

**Don't** render this on desktop. It self-hides via `lg:hidden`, but avoid including it in desktop-only layouts for code clarity.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Collaborative points display, avatar with notification, mobile-only. |
