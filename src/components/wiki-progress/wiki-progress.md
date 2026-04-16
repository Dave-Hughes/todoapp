# WikiProgress

## Purpose

Renders a parsed `ProgressSummary` (from `lib/wiki/progress.ts`, sourced from CLAUDE.md's "Build progress" section) as a dashboard. Leads with a summary card — percent complete, item count, and status chips for done/in-progress/upcoming — and then lists each phase as a card with its status icon, a "Phase N · Shipped/In progress/Upcoming" meta line, title, and any parsed sub-items and notes. In-progress phases use accent border + subtle fill to draw the eye to where the build currently lives.

## Non-purpose

- Not a parser — the caller must pass a fully computed `ProgressSummary`. Parsing lives in `lib/wiki/progress.ts`.
- Not a task tracker — this is a read-only view of build phases. To change status, edit CLAUDE.md.
- Not a roadmap view — roadmap (open questions) is a separate surface rendered by `/wiki/roadmap`.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `summary` | `ProgressSummary` | required | Parsed phases, counts, and totals from `getBuildProgress()`. |
| `activeOnly` | `boolean` | `false` | If `true`, hides upcoming phases and shows only done + in-progress. Useful for condensed overviews. |

## States

| State | Behavior |
|---|---|
| Default | Summary card on top, then every phase as its own card. |
| `activeOnly` | Upcoming phases filtered out; done + in-progress only. |
| Phase: `done` | Success-colored check badge, muted secondary text. |
| Phase: `in-progress` | Accent badge + accent border + `--color-accent-subtle` background on the card. |
| Phase: `upcoming` | Empty circle, tertiary text. |
| Sub-items | Indented list under the phase header. Each has its own status icon and inherits color from status. |
| Notes | Italic tertiary prose lines appearing after sub-items. |
| Empty summary (no phases) | Phase list renders empty; summary still shows 0 / 0 items, 0%. |

## Accessibility

- Progress bar is a `<div role="progressbar">` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Phase list is `<ol role="list">` to preserve ordinal meaning.
- Each status icon has an `aria-label` ("Shipped" / "In progress" / "Upcoming") so the visual state is announced.
- Color is never the sole carrier of status — icons, labels, and text all convey it.

## Usage examples

```tsx
import { getBuildProgress } from "@/lib/wiki/progress";
import { WikiProgress } from "@/components/wiki-progress/wiki-progress";

// Full progress view
const summary = await getBuildProgress();
<WikiProgress summary={summary} />

// Condensed view for a dashboard tile
<WikiProgress summary={summary} activeOnly />
```

## Do / Don't

**Do** keep CLAUDE.md's "Build progress" section as the single source of truth. Update CLAUDE.md, not a config file.

**Don't** hard-code phase data into this component. If something isn't showing up, fix the parser in `lib/wiki/progress.ts` or the markdown in CLAUDE.md.

**Do** render the full view (no `activeOnly`) on the dedicated `/wiki/progress` page. Use `activeOnly` sparingly, for compact surfaces.

**Don't** add click-through interactivity that implies phases are editable here. This is a reflection of the source markdown, not an editor.

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Initial implementation. Summary card, progress bar, status chips, per-phase cards with sub-items and notes. |
