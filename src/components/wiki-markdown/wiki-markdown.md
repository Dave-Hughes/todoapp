# WikiMarkdown

## Purpose

Theme-aware markdown renderer for `/wiki` doc pages. Takes a raw markdown string and renders it using React elements fully styled by theme tokens — typography, colors, spacing, and radii all come from `--color-*`, `--text-*`, `--space-*`, `--radius-*`. The rendered output automatically restyles under any theme (Cozy today; others later). Supports GFM: tables, task lists, strikethrough, autolinks.

## Non-purpose

- **Intentionally not MDX.** Docs stay plain markdown so humans and other sessions can author them in any editor. If a doc ever needs interactive React content, add it as a component elsewhere and link to it.
- Not a syntax highlighter — code blocks render with mono font and background, no tokenization. If we need highlighting later, add it as a plugin layer.
- Not a markdown parser exposed to callers — this is purely a render component. Parsing/frontmatter extraction happens upstream in `lib/wiki/*`.
- Not a markdown editor.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `string` | required | Raw markdown source to render. |
| `className` | `string` | `""` | Optional wrapper class for layout (max-width, padding) — internal typography is token-driven and not overridable here. |

## States

| State | Behavior |
|---|---|
| Default | Every supported element rendered with a theme-token styling override. No defaults from the browser. |
| Empty string | Renders an empty wrapper `<div>`. No crash, no skeleton. |
| Unsupported element | react-markdown's default unstyled output. Add a component override here if it shows up in a real doc. |
| GFM task list (checked/unchecked) | Renders a decorative token-styled checkbox glyph inline, replacing the default `<input>`. `aria-hidden="true"` — state is conveyed by the surrounding text. |
| Code block (fenced) | Rendered in a `<pre>` with `--color-surface-dim` background, horizontal scroll on overflow. |
| Inline code | Pill with `--color-surface-dim` background and `--font-mono`. |
| Table | Wrapped in a rounded, bordered container with horizontal overflow scroll. |
| Blockquote | Accent left border + `--color-accent-subtle` wash, italicized secondary text. |

## Accessibility

- Headings (`h1`–`h4`) preserve semantic hierarchy — callers must *not* render their own `<h1>` for the page (use `WikiShell`'s `title` prop) when a doc body already contains one, to avoid two `<h1>`s per page.
- Links get accent color + underline for non-color-only affordance.
- GFM checkbox glyphs are decorative (`aria-hidden="true"`) — the semantics live in the text following the checkbox.

## Usage examples

```tsx
import { WikiMarkdown } from "@/components/wiki-markdown/wiki-markdown";

// Typical doc page
<WikiMarkdown>{doc.body}</WikiMarkdown>

// Inside a styled container (card)
<article className="rounded-[var(--radius-xl)] border p-[var(--space-6)]">
  <WikiMarkdown>{component.body}</WikiMarkdown>
</article>
```

## Do / Don't

**Do** pre-process markdown upstream (frontmatter stripping, link rewriting) in `lib/wiki/*` before passing to this component. This stays a pure renderer.

**Don't** pass user-generated markdown from untrusted sources. This renders with react-markdown's default sanitization, which is conservative but not a substitute for source trust. The wiki is for in-repo docs only.

**Do** wrap in a card or container for visual separation when rendering alongside other page chrome.

**Don't** reach in and override the typography tokens via `className` — changes to doc typography belong in this component so every wiki page stays consistent.

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Initial implementation. Full element overrides (headings, lists, code, tables, blockquote, GFM task lists), theme-token styling throughout. |
