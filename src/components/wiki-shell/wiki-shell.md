# WikiShell

## Purpose

Inner chrome for every `/wiki` page. Sits inside `AppShell`'s content area and supplies the wiki's own secondary navigation (pill-row of sections: Overview, Progress, Docs, Design system, Roadmap) plus a page header slot with an eyebrow, title, optional subtitle, and optional right-aligned action. Kept deliberately quiet — the wiki is an internal read-surface, not a marketing site; its chrome shouldn't out-shout what it frames.

## Non-purpose

- Not the app's primary shell — `AppShell` handles the sidebar, top bar, and global layout. `WikiShell` is a *secondary* shell, scoped to `/wiki/*` routes only.
- Not a markdown renderer — for doc bodies, compose `WikiMarkdown` as a child.
- Not a data fetcher — callers pass pre-computed `title`, `subtitle`, and children.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `activeSection` | `"overview" \| "progress" \| "docs" \| "design-system" \| "roadmap"` | required | Which pill is highlighted. |
| `title` | `string` | required | Page headline rendered as `<h1>`. |
| `subtitle` | `string` | — | Prose one-liner under the title. Wraps at 48rem max. |
| `eyebrow` | `string` | — | Small uppercase category caption above the title (e.g., "Reference", "Build"). |
| `headerAction` | `ReactNode` | — | Right-aligned slot for a CTA or edge link in the header. |
| `children` | `ReactNode` | required | Page body. |

## States

| State | Behavior |
|---|---|
| Default | Pill-row shows active section in accent fill with accent-glow shadow; others are secondary text with subtle hover. |
| Narrow viewport | Pill-row horizontally scrolls with hidden scrollbar; page content stays within a 72rem max-width column. |
| No eyebrow / subtitle / action | Slots simply don't render — no reserved space, no layout shift. |

## Accessibility

- Nav is labelled `aria-label="Wiki sections"`; list uses `role="list"`.
- Active pill uses `aria-current="page"`.
- Each pill meets `--touch-target-min` (44px).
- Icons are `aria-hidden` — the text label carries the semantics.
- Title is a single `<h1>`; subtitle is a sibling `<p>`. Caller-provided content below is expected to start at `<h2>` so the outline stays linear.

## Usage examples

```tsx
<WikiShell
  activeSection="progress"
  eyebrow="Build"
  title="Progress"
  subtitle="Every phase from CLAUDE.md, parsed live."
>
  <WikiProgress summary={summary} />
</WikiShell>

<WikiShell
  activeSection="roadmap"
  eyebrow="Roadmap"
  title="Open questions"
  headerAction={<Link href="/wiki/docs/open-questions">Open the source doc →</Link>}
>
  {/* board */}
</WikiShell>
```

## Do / Don't

**Do** set `activeSection` to match the route — the pill-row is how users orient themselves inside the wiki.

**Don't** nest another `WikiShell` inside `children`. One per page.

**Do** keep `subtitle` short enough to read at a glance — this is orientation, not a lede.

**Don't** put interactive filters or toolbars in `headerAction`. It's for a single affordance (link out, primary action). Controls belong in the page body.

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Initial implementation. Pill-row secondary nav, page header with eyebrow/title/subtitle/action, 72rem content column. |
