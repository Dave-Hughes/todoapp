# Sidebar

## Purpose

The persistent left-rail navigation for desktop viewports (≥ `lg`). Acts as the couple's daily command post. Composes: brand mark (logo + wordmark), a points **hero** celebrating both partners' totals, the main nav (Today / Week / Month), an invite nudge in solo state, and a utility row with Settings + pin toggle. Hidden entirely on mobile — `BottomTabs` and `MobileHeader` take over there.

## Non-purpose

- Not visible on mobile. Do not attempt to repurpose it as a mobile drawer; use a `BottomSheet` instead.
- Not a router — nav links are plain `<a>` tags. Routing is handled by Next.js App Router at the page level.
- Not responsible for auth state or fetching user data — all data is passed as props by `AppShell`.
- Not responsible for persisting its own pin state — `AppShell` owns the state and persists it to `localStorage`.

## Behavior

The sidebar has two primary width modes:

- **Peek** (default, `--sidebar-width-peek` = 72px). Collapsed. Shows the logo mark, compressed tally numerals, nav icons, a compact invite affordance (solo), settings icon, and the pin toggle.
- **Expanded** (`--sidebar-width` = 272px). Shows the full masthead: wordmark, partner names as labels, today's deltas, nav labels + contextual stats, invite CTA, settings label.

Triggers that flip peek → expanded:

- **Hover** the rail anywhere. Expands with an ease-out-quart transition and floats *over* content (main content does not shift).
- **Focus within** the rail (keyboard). Treated the same as hover so tab navigation reveals labels.
- **Pinned** (via the pin toggle or `⌘\` / `Ctrl+\` keyboard shortcut). Locks expanded state. When pinned, main content shifts to accommodate the full width. The pin button shows an accent tint when active.

The keyboard shortcut is handled in `AppShell` and ignored while focus is inside an `<input>`, `<textarea>`, or contenteditable so it doesn't disrupt task entry.

Mouseleave or blur collapses back to peek, unless pinned.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activePath` | `string` | required | Current route path. Used to set `aria-current="page"` and apply active styles. |
| `userName` | `string` | required | Current user's display name. Appears as the label under their tally. |
| `partnerName` | `string \| undefined` | — | Partner's display name. When absent, the partner tally is hidden and the invite nudge renders in its place. |
| `userPoints` | `number` | required | Current user's point total. |
| `partnerPoints` | `number \| undefined` | — | Partner's point total. Only displayed when `partnerName` is also present. |
| `userPointsToday` | `number` | `0` | Today's delta for the user. Shown as `+N today` under the tally when expanded and > 0. |
| `partnerPointsToday` | `number` | `0` | Today's delta for the partner. Same rules. |
| `hasNotification` | `boolean` | `false` | Announces a new notification via a visually-hidden live region (for AT users). |
| `todayCount` | `number \| undefined` | — | Count shown on the Today nav row (e.g. `3 left`). Hidden when undefined. |
| `weekCount` | `number \| undefined` | — | Count shown on the Week nav row (e.g. `12 ahead`). Hidden when undefined. |
| `monthLabel` | `string \| undefined` | — | Short label shown on the Month nav row (e.g. `March`). Hidden when undefined. |
| `isPinned` | `boolean` | required | Whether the sidebar is locked in expanded state. Owned by `AppShell`. |
| `onTogglePin` | `() => void` | required | Fired when the pin toggle is clicked. |

## States

| State | Behavior |
|---|---|
| Peek (default) | 72px rail. Icons, compressed numerals, pin toggle visible. |
| Hover-expanded (unpinned) | Grows to 272px, floats above content with `shadow-lg`, mouseleave collapses. |
| Pinned | Locked at 272px. `shadow-lg` is not applied; main content shifts to accommodate. Pin icon swaps to `PanelLeftClose`. |
| Solo (no partner) | Points hero shows only user's tally. In expanded, the invite CTA renders above utility; in peek, a single accented `UserPlus` icon sits above Settings. |
| Paired | Full twin-tally points hero with connector mark. No invite CTA. |
| Active nav | Active row has a `canvas`-colored inset panel (not a pill, not a left border), accent-colored icon, and display-weight label. `aria-current="page"` set. |
| Active settings | Same inset panel + accent icon as active nav. |
| Notification on user | Visually-hidden live region announces "You have a new notification." |
| Reduced motion | Width transition drops to 50ms; delta animations are disabled. |

## Accessibility

- Root is `<aside aria-label="Primary">`; main nav is `<nav aria-label="Main navigation">` containing a `<ul role="list">`.
- Active link has `aria-current="page"`.
- All interactive elements meet `--touch-target-min` (44px).
- Pin toggle is a `<button>` with `aria-pressed={isPinned}` and a descriptive `aria-label` ("Pin sidebar open" / "Unpin sidebar").
- Icons are `aria-hidden="true"`; text labels carry the accessible name. In peek, labels become `sr-only` or `title` attributes on links without visible labels.
- `hasNotification` triggers a visually-hidden `aria-live="polite"` announcement.
- All motion respects `prefers-reduced-motion` via `useReducedMotion` from Framer Motion.

## Usage examples

```tsx
// Minimal — solo user, peek default
<Sidebar
  activePath="/today"
  userName="Dave"
  userPoints={42}
  isPinned={false}
  onTogglePin={() => {}}
/>

// Paired, with nav context stats
<Sidebar
  activePath="/week"
  userName="Dave"
  partnerName="Krista"
  userPoints={245}
  partnerPoints={312}
  userPointsToday={15}
  partnerPointsToday={60}
  hasNotification
  todayCount={3}
  weekCount={12}
  monthLabel="March"
  isPinned={true}
  onTogglePin={togglePin}
/>
```

In practice, `Sidebar` is always rendered by `AppShell` — which owns `isPinned` and `onTogglePin` and persists pin state in `localStorage` under `todoapp:sidebar-pinned`.

## Do / Don't

**Do** keep `activePath` in sync with `usePathname()`.

**Do** pass contextual stats (`todayCount`, `weekCount`, `monthLabel`) when available — they're the small detail that makes the nav feel alive.

**Don't** render `Sidebar` on mobile. It uses `hidden lg:flex` and self-hides, but avoid adding it to mobile-only layouts for clarity.

**Don't** pass `partnerPoints` without `partnerName`, or vice versa — the pair is rendered atomically.

**Don't** add action buttons inside the nav section. The nav is navigation. Actions belong in `UtilityRow` or on the page.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation: 272px rail with avatar + inline points + compact nav. |
| 2026-04-13 | Rebuilt from scratch. Peek (72px) / expanded (272px) rail with hover + pin states, logo mark + wordmark, hero typographic points display with connector, weighted nav with contextual stats, architectural active state (no left-border), bottom utility with pin toggle. |
| 2026-04-13 | Post-critique: fixed-height points hero so nav rows don't shift on hover; identical "standard menu item" layout for Settings + Pin rows so icons stay aligned across states; pin button gets accent-tinted active state; ⌘\ / Ctrl+\ keyboard shortcut to toggle pin; shared `Tooltip` component wired to the pin button with shortcut hint. |
