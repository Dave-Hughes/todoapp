# AppShell

## Purpose

The root layout wrapper for every authenticated page. Composes `Sidebar` (desktop), `MobileHeader` (mobile top), `BottomTabs` (mobile bottom), and the main content area into a responsive, correctly offset shell. All layout spacing — sidebar offset, header height, tab bar height, content max-width — is handled here via design tokens. Pages render their content as `children` inside the shell.

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

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Composes Sidebar, MobileHeader, BottomTabs, and main content area with responsive offsets. |
