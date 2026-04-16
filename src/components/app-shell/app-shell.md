# AppShell

## Purpose

The root layout wrapper for every authenticated page. Composes `Sidebar` (desktop), `MobileHeader` (mobile top), `BottomTabs` (mobile bottom), and the main content area into a responsive, correctly offset shell. All layout spacing — sidebar offset, header height, tab bar height, content max-width — is handled here via design tokens. Pages render their content as `children` inside the shell.

**AppShell must be used via a shared layout, not per-page.** See `src/app/(views)/layout.tsx` for the task-view shell. Rendering `<AppShell>` inside each individual `page.tsx` causes the sidebar and chrome to unmount/remount on every navigation — the sidebar flashes, the points hero re-runs, and the view-switch fade becomes invisible because it's being outpaced by a full-tree remount. The shared-layout pattern keeps the shell mounted and swaps only `{children}` between routes.

**Internal links must be `next/link` `<Link>` components, not plain `<a href>` tags.** A plain `<a>` triggers a full page reload, which unmounts the shared layout — defeating its purpose. `Sidebar` and `BottomTabs` both use `<Link>`.

## Non-purpose

- Not responsible for auth checks or redirects — that belongs to middleware or a server component wrapping `AppShell`.
- Not a data-fetching boundary — user and partner data are passed as props. The page or layout above `AppShell` is responsible for fetching.
- Not a router. It does not push navigation; it only reflects `activePath` downward.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | required | Page content rendered inside the main content area. |
| `activePath` | `string` | required | Current route path. Forwarded to `Sidebar` and `BottomTabs` for active state. |
| `userName` | `string` | required | Current user's display name. Forwarded to `Sidebar`, `MobileHeader`, and (indirectly) `Avatar`. |
| `partnerName` | `string \| undefined` | — | Partner's display name. Forwarded to `Sidebar` and `MobileHeader`. |
| `userPoints` | `number` | required | Current user's point total. |
| `partnerPoints` | `number \| undefined` | — | Partner's points. |
| `hasNotification` | `boolean` | `false` | Forwarded to `Sidebar` and `MobileHeader` for the notification dot. |

## States

This is a layout component; its states are the union of its children's states. Key layout behaviors:

| Breakpoint | Layout |
|---|---|
| Mobile (< `lg`) | `MobileHeader` at top, content fills remaining height, `BottomTabs` fixed at bottom. Content has bottom padding equal to `--tab-bar-height`. |
| Desktop (≥ `lg`) | `Sidebar` fixed on the left, content offset by `--sidebar-width`. No tab bar. |

## Accessibility

- `<main>` wraps the page content — a proper landmark for skip-navigation targets.
- `Sidebar` provides an `<aside>` landmark. `BottomTabs` and `Sidebar` each render `<nav aria-label="Main navigation">`.
- `<header>` landmark is provided by `MobileHeader`.
- Pages that use `AppShell` should include a skip-link before `AppShell` in the document to allow keyboard users to bypass navigation.

## Usage examples

```tsx
// In a Next.js App Router layout (app/layout.tsx or a route group layout)
import { AppShell } from "@/components/app-shell/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user data server-side, then pass down
  return (
    <AppShell
      activePath="/today"
      userName="Dave"
      partnerName="Krista"
      userPoints={42}
      partnerPoints={38}
      hasNotification={false}
    >
      {children}
    </AppShell>
  );
}
```

```tsx
// With usePathname for dynamic active path (in a Client Component layout)
"use client";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell/app-shell";

export function ClientShell({ children, ...userProps }) {
  const pathname = usePathname();
  return (
    <AppShell activePath={pathname} {...userProps}>
      {children}
    </AppShell>
  );
}
```

## Do / Don't

**Do** derive `activePath` from `usePathname()` so nav active states stay accurate during client-side navigation.

**Don't** nest `AppShell` inside another `AppShell`. It is a singleton per page tree.

**Don't** put page-level `<h1>` headings inside `AppShell` itself — they belong in the `children` content.

**Do** pass both `partnerName` and `partnerPoints` together. Partial pairing produces incomplete displays in both `Sidebar` and `MobileHeader`.

## View-switch transition

**There isn't one right now.** Route changes between `/today`, `/week`, `/month` swap `{children}` instantly.

### History — attempts and why each failed

Every attempt so far has produced a visible flicker on nav. Keeping the record here so the next attempt doesn't repeat the same trap.

1. **Symmetric opacity fade via `AnimatePresence mode="wait"` (220/220ms, `EASE_OUT_QUART`).** Worked technically but felt unintentional — the cadence of the fade didn't match the instant-snap of the sidebar/tab indicator, and the total 440ms read as laggy.
2. **Direction-aware horizontal slide + crossfade (`x: ±12px`, 140ms exit / 240ms enter).** Introduced a snap-to-new-content flicker. Root cause: framer-motion applies the child's `initial` state via JS _after_ React's first paint. For one frame the new motion.div paints at its natural CSS default (`x: 0, opacity: 1`) before Framer snaps it to its `initial` state. The viewer reads that as the new content appearing in place before the transition fires.
3. **Asymmetric opacity-only fade (140ms exit / 240ms enter, `EASE_IN_QUART` out, `EASE_OUT_QUART` in).** Flickered worse than either of the above. Didn't fully diagnose — possibly an interaction between `mode="wait"` timing and Next.js App Router's `children` swap, possibly the same first-paint issue applied to opacity via `initial={{ opacity: 0 }}` on subsequent nav.

### Before re-adding an animation

- Solve the first-paint issue first. Framer's `initial` prop isn't applied until after the element paints once. Options: set the initial state inline via `style` (CSS applies synchronously with React's paint), use a CSS keyframe animation instead of framer-motion, use the native View Transitions API (Next.js 16 supports it).
- Remember the `divide-y` sub-pixel bug. Any `y` translation on this parent smears the task-list's 1px `border-top` rows into ghost rows during the tween because sub-pixel y positions put those borders onto fractional pixels. `x` translation is safe on that count, but still hits the first-paint issue.
- Test in the actual signed-in preview. The Clerk sign-in redirect blocks the sandbox browser, so automated verification isn't possible from Claude's side — the user has to drive this.

**Direction.** `VIEW_ORDER` in `app-shell.tsx` maps `/today = 0, /week = 1, /month = 2` — matching the sidebar's top-down order and the bottom-tab left-to-right order. `direction = sign(currIndex - prevIndex)`:

- `+1` — moving "right" along the nav (e.g. Today → Week). New view enters from the right, old view exits to the left.
- `-1` — moving "left" (e.g. Month → Week). New enters from the left, old exits to the right.
- `0` — first render, in-place rerender, or a route outside `VIEW_ORDER` (e.g. `/settings`, `/wiki`). Variants collapse to a pure opacity fade — no horizontal translation.

**Timing & easing.**

- **Exit:** `opacity 1 → 0`, `x 0 → direction * -12px`, **140ms**, `EASE_IN_QUART` (accelerating away — "leaving").
- **Enter:** `opacity 0 → 1`, `x direction * 12px → 0`, **240ms**, `EASE_OUT_QUART` (smooth exponential deceleration — "arriving").
- Exit is ~58% of enter duration: things leave faster than they arrive.

**Why horizontal (x), not vertical (y).** The task-list rows inside each view use `divide-y`, which renders as 1px `border-top` on siblings. A `translateY` on the parent places the children — and therefore those borders — at fractional y-positions during the tween, which sub-pixel-smears into visible ghost rows. `translateX` shifts horizontal borders sideways but never moves them vertically, so no smear. `will-change: transform, opacity` on the motion wrapper forces a separate compositor layer as belt-and-braces.

**`mode="wait"`.** Keeps a clean before/during/after beat — exit finishes before enter starts. Crossfade (no mode) looked muddy under the layered task-list stagger.

**Reduced motion.** `prefers-reduced-motion: reduce` collapses all three variants to `{ opacity: 1, x: 0 }` — no animation, no transform, instant swap. Plumbed via Framer's `useReducedMotion()`.

## Pinned bit — read before paint

Sidebar pin state is persisted to `localStorage` as `"todoapp:sidebar-pinned"`. AppShell reads it via `useLayoutEffect` (iso-safe — falls back to `useEffect` on the server) so the rail opens to the correct width on the first paint. Reading it in `useEffect` causes a one-frame flash from collapsed → pinned on every mount, which is visible and jarring.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Composes Sidebar, MobileHeader, BottomTabs, and main content area with responsive offsets. |
| 2026-04-15 | Hoisted into `src/app/(views)/layout.tsx` as a shared layout — sidebar + chrome now stay mounted across `/today ↔ /week` navigation. Pages became leaves. Added `AnimatePresence mode="wait"` opacity fade on `{children}` keyed on `activePath` (220ms each side). Pinned state read via `useLayoutEffect` to avoid a first-paint flash. |
| 2026-04-16 | View-switch transition **removed entirely**. Tried three iterations during this session — direction-aware slide (`x: ±12px`), asymmetric opacity-only fade (140/240ms), symmetric opacity fade (the previous shipping state) — each flickered on nav. Root cause (at least for the transform variant) is framer-motion applying `initial` state via JS after React's first paint, producing a one-frame snap-to-animate-state before the transition starts. Stripped `AnimatePresence`, `motion.div`, `useReducedMotion`, and their imports from AppShell; `children` is now rendered directly. Removed `EASE_IN_QUART` from `src/lib/motion.ts` (unused elsewhere). See "View-switch transition" section for attempt history and constraints for any future re-introduction. |
