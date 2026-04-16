# WikiAppFrame

## Purpose

Thin client wrapper that hydrates `AppShell` with live user/partner/points data via the `useMe` TanStack Query hook. Exists because `/wiki/*` pages are server components (they read markdown from disk), but `AppShell` is a client component that needs query-backed data. This frame is the seam between them: the server layout handles auth gating, the frame hydrates shell data, and each page handles filesystem reads.

## Non-purpose

- Not a replacement for `AppShell` — it *composes* it. All shell concerns (sidebar, mobile header, skip-to-content, pinning) stay in `AppShell`.
- Not an auth guard — authentication redirects happen in `src/app/wiki/layout.tsx`, not here. By the time this renders, the user is signed in.
- Not a data fetcher for page content — markdown, progress, design-system data all come from server-side functions in `lib/wiki/*`. This only hydrates shell chrome.
- Not used outside the `/wiki` route tree. The Today view already has its own client boundary at the page level.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activePath` | `string` | required | Current route path, passed to `AppShell` so the sidebar can highlight the correct item (typically `/wiki`, surfaced in the utility row). |
| `children` | `ReactNode` | required | Page content (typically a `WikiShell` wrapping the page body). |

## States

| State | Behavior |
|---|---|
| Loading (`useMe` pending) | Shell renders with empty-string names and zeroed points. `AppShell`'s internal empty-state handling takes over. Avoids a shell flicker. |
| Solo (no partner) | `partnerName=""`, `partnerPoints=undefined` → `AppShell` / `Sidebar` switch to solo-state affordances (e.g., "Bring your person in" CTA). |
| Paired | Both names and point tallies populated. |
| `useMe` error | Falls through to zeros. Error toasts / retries are `useMe`'s responsibility, not this frame's. |

## Accessibility

- No direct a11y surface. All interactive chrome is `AppShell`'s, which handles skip-to-content, landmarks, and focus.

## Usage examples

```tsx
// src/app/wiki/layout.tsx
import { getAuthedContext, AuthError } from "@/lib/auth-context";
import { redirect } from "next/navigation";
import { WikiAppFrame } from "@/components/wiki-app-frame/wiki-app-frame";

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  try {
    await getAuthedContext();
  } catch (err) {
    if (err instanceof AuthError) redirect("/sign-in");
    throw err;
  }
  return <WikiAppFrame activePath="/wiki">{children}</WikiAppFrame>;
}
```

## Do / Don't

**Do** keep this component minimal. Any future shell-level data needs (notifications, feature flags) should be sourced here from hooks, then passed through `AppShell` props.

**Don't** do auth here. The server layout is the correct gate — this component assumes the user is authenticated.

**Do** reuse `useMe` for other client surfaces that need the same data. A second query hook would duplicate work and risk drift.

**Don't** fetch markdown or other page content in this frame. Server pages do that; passing results through React context would break the server/client boundary.

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Initial implementation. Pulls from `useMe`, passes to `AppShell`, gracefully handles loading/solo/paired/error. |
