# InviteBanner

## Purpose

A content-wide, dismissable banner shown to solo users (no partner in their household). Sits at the top of the main canvas, above the page header. Its job is to be a friendly, scannable nudge — visible without being pushy, hideable without losing the underlying invite affordance (which lives permanently in the sidebar and mobile header).

## Non-purpose

- Not the only invite affordance. The persistent sidebar entry and mobile header button stay visible after dismissal.
- Not a modal. Doesn't trap focus, doesn't dim the page, doesn't block interaction.
- Not the invite flow itself. Clicking "Send invite" navigates to `/invite`.
- Doesn't show for paired users — the parent must pass `hidden` (typically `Boolean(partner)`).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `hidden` | `boolean` | `false` | When `true`, render nothing. Use this to hide the banner once the user has a partner. |

## States

| State | Behavior |
|---|---|
| Solo, not dismissed | Banner visible with icon, copy, "Send invite" CTA, and X dismiss. |
| Solo, dismissed (this device) | Hidden. Persisted in `localStorage` under `todoapp:invite-banner-dismissed`. |
| Paired (`hidden` true) | Hidden. |
| Reduced motion | Enters with a fade only — no vertical translate. |
| Dismiss | Instant removal (no exit animation). The dismiss is intentional, so a quick disappearance reads as immediate confirmation rather than a UI lag. |

## Accessibility

- Uses `<aside>` with `aria-label="Invite your partner"` so screen-reader users can navigate to or skip it.
- Dismiss button has explicit `aria-label="Dismiss invite banner"` and meets the 44px touch target.
- The decorative icon container is `aria-hidden="true"` — the heading carries the meaning.
- Keyboard: dismiss button is focusable; CTA is a real `<a>` (Tab-reachable, Enter-activatable).

## Persistence

Dismissal is stored client-side in `localStorage` (key: `todoapp:invite-banner-dismissed`). It is NOT synced to the server — clearing browser data or signing in on another device shows the banner again. This is intentional for v1; a server-side `dismissedAt` is the obvious upgrade once we have a `user_preferences` table.

## Usage

```tsx
import { InviteBanner } from "@/components/invite-banner/invite-banner";

// Inside the page, just below AppShell's top padding:
<InviteBanner hidden={Boolean(partner)} />
```

## Do / Don't

**Do** keep the persistent affordances (sidebar button, mobile header icon) wired up regardless of banner state — dismissal is for the banner, not for the feature.

**Don't** use this banner for non-invite messaging. It's specifically scoped to the "bring your person in" nudge. For other transient messages, use `Toast`.

**Do** match the voice — keep copy short, warm, and low-ego (`docs/voice-and-tone.md`). Current copy: "Bring your person in." / "Two heads, one list. That's the whole point."

## Tokens used

- `--color-accent`, `--color-accent-subtle`, `--color-accent-text`, `--color-accent-hover` (CTA + icon badge)
- `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary` (heading, body, dismiss)
- `--color-canvas` (dismiss hover bg)
- `--radius-lg`, `--radius-md`, `--radius-sm`, `--radius-full`
- `--space-0-5`, `--space-1-5`, `--space-2`, `--space-3`, `--space-4`, `--space-8`
- `--text-xs`, `--text-sm`, `--leading-tight`, `--weight-semibold`
- `--touch-target-min`, `--duration-instant`

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Initial implementation. Solo-state nudge with X dismissal persisted in `localStorage`. Animated entry (300ms ease-out-quart, fade-only under reduced motion); dismiss removes immediately. |
| 2026-04-14 | Critique pass: dropped the filled-circle icon badge (read as generic "alert with avatar"), inlined a small `UserPlus` icon at heading-level. Demoted the CTA from filled-accent to text-accent (with hover-fill) so the FAB stays the unambiguous primary action on the page. Tightened vertical padding (`--space-3` → `--space-2`). Removed the same-as-bg border. |
| 2026-04-14 | Audit pass: nbsp between "person" and "in." prevents orphan on 375px viewport. CTA resting state uses `--color-accent-hover` (darker accent) instead of `--color-accent` for clearer AA contrast over `--color-accent-subtle`. |
| 2026-04-14 | Colorize pass: added `--shadow-sm` (warm-tinted) to lift the banner off the warm canvas — canvas and accent-subtle differ by only ~1% lightness, so the banner used to smear into the page. Shadow gives it "note card" presence without introducing new color. |
| 2026-04-14 | Delight pass: CTA gains tactile feedback. Hover lifts 1px with a warm `--shadow-sm`; active settles back flush. 200ms transition on color + bg + transform + shadow, `--ease-out-quart`. Reduced-motion users get the color change only (durations clamp globally). No new tokens. |
| 2026-04-14 | Bolder pass (craft, not volume): heading swapped from `--font-body` (Bricolage Grotesque) to `--font-display` (Gabarito). Aligns the banner with the app's heading-voice pattern — Today h1, bottom-sheet titles, empty-state heading — which all use the display font. Size/weight/color unchanged so the banner still doesn't compete with the FAB. Every volume-knob alternative (larger heading, filled bg, shadow-md, entrance stagger) was rejected because each would reverse a prior audit or critique decision. |
| 2026-04-15 | Lint fix: localStorage-read effect changed from `useEffect` to `useIsoLayoutEffect` (iso-safe — falls back to `useEffect` during SSR). Satisfies `react-hooks/set-state-in-effect`; also the correct hook for "read external store before paint." |
