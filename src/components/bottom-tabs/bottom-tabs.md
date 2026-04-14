# BottomTabs

## Purpose

The primary navigation for mobile viewports (below `lg`). A fixed tab bar at the bottom of the screen with four tabs — Today, Week, Month, Settings. Respects the device's safe-area inset so nothing is clipped on phones with home indicators. Hidden on desktop, where `Sidebar` takes over.

## Non-purpose

- Not visible on desktop. It uses `lg:hidden` and will not interfere with the sidebar layout.
- Not a router — tabs are plain `<a>` tags. Active state is driven by the `activePath` prop, not internal state.
- Not responsible for user identity or points display — that lives in `MobileHeader`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activePath` | `string` | required | Current route path. Sets `aria-current="page"` and active styles on the matching tab. |

## States

| State | Behavior |
|---|---|
| Active tab | Accent color text, slightly heavier icon stroke (2.25 vs 1.75). `aria-current="page"` set. |
| Inactive tab | Tertiary text. Darkens to primary on `active:` (touch press feedback). |

## Accessibility

- `<nav aria-label="Main navigation">` wraps the tab list.
- Each tab link has `aria-current="page"` when active.
- Tab icons are `aria-hidden="true"` — the text label carries the name.
- Each tab meets `--touch-target-min` (44px) minimum touch target height.
- `pb-[env(safe-area-inset-bottom)]` ensures the bar clears the iPhone home indicator.

## Usage examples

```tsx
// Typically rendered inside AppShell — rarely instantiated directly
<BottomTabs activePath="/today" />

// On a settings page
<BottomTabs activePath="/settings" />
```

## Do / Don't

**Do** derive `activePath` from `usePathname()` so it always matches the current URL.

**Don't** conditionally unmount `BottomTabs` based on scroll position or modal state — it should remain mounted and stable. If you need to obscure it, layer a sheet on top.

**Don't** add more than four tabs without a design review. The layout uses `flex-1` on each `<li>`, so five or more tabs will crowd on narrow phones.

**Do** keep tab labels short (one word). The font is `--text-xs` and space is limited.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Four tabs, safe-area inset, active state, mobile-only. |
