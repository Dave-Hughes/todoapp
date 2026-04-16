# Design System

> **This file holds the rules, not the contents.** The contents — tokens, components, patterns — live in code. The component docs live *next to* component code (e.g., `src/components/button/button.md` sits next to `button.tsx`). This file is what every Claude session must read before touching any UI.

## The core rule

**The components are the design system. The docs describe what the components already do.**

Component code is the source of truth. Docs are a view of the code. When a component changes, its doc updates in the *same commit*. Drift between a component and its doc is a bug, not doc debt.

No Figma. No parallel design source of truth. The code is the source of truth; this folder and the sibling `.md` files in `src/components/` are how humans and future Claude sessions read it.

## The rules of engagement

These are enforced. Violations are reverted on review, even if the feature works.

### 1. No hard-coded values. Ever.
No hard-coded colors, fonts, font sizes, line heights, spacing, border radii, motion curves, durations, shadows, or sound effects inside component files or feature code. Every one of these comes from a theme token. If a token for what you need doesn't exist, **add the token to every theme first**, then use it. Adding a token is a design-system change and gets documented. Hard-coding is not a shortcut; it's a breach.

### 2. Tokens are semantic, not descriptive.
Name tokens by what they mean, not what they look like. `--color-surface` and `--color-accent`, not `--color-cream` or `--color-coral`. Themes can change the values; the meanings stay constant. The Cyberpunk theme sets `--color-accent` to neon magenta; the default theme sets it to a warm coral. The component using it doesn't know or care.

### 3. Components are a closed set by default.
Do not invent a new component to solve a one-off. First ask: can an existing component be extended? Can an existing pattern compose the answer? A new component is a meaningful addition and requires the full checklist (below). If the task is "make a thing that looks like a button but a bit different," the answer is almost always "add a variant to Button," not "create a new component."

### 4. Every component ships with real states.
Default, hover, focus, active, disabled, loading, empty, error — whichever apply. No `// TODO: empty state` in merged code. If a state is not implemented, the component is not done.

### 5. Every component ships accessible.
WCAG 2.1 AA baseline. Keyboard navigable. Screen reader labeled. Color contrast verified against the *default theme values* (and spot-checked in at least one other theme if multiple exist). Touch targets ≥ 44px. Focus visible. No accessibility regressions merged.

### 6. Every component ships with its doc.
A component merge PR without an updated or new `component-name.md` in the same commit is incomplete. Doc includes: what it's for, what it's not for, props, states, accessibility notes, usage examples with real JSX, do/don't, a tiny changelog.

### 7. Motion is tuned, not defaulted.
No raw framework defaults for animation duration or easing. Every animated component has motion values pulled from theme tokens and has been tuned by hand at least once. Respect `prefers-reduced-motion` always.

### 8. Copy goes through voice and tone.
Any user-visible string in a component — placeholders, labels, error text, empty state copy — must pass the voice and tone test (see [`../docs/voice-and-tone.md`](../docs/voice-and-tone.md)). When in doubt, run the `design:ux-copy` skill.

## Conventions (established values)

These are the specific choices made for this project. They're not rules — they're decisions.

| Decision | Value |
|---|---|
| Body font | Bricolage Grotesque (Google Fonts, variable weight) |
| Display font | Gabarito (Google Fonts, variable weight) |
| Color space | OKLCH everywhere |
| Brand hue | ~42° (warm terracotta/peach accent) |
| Neutral tint hue | 55° (warm, chroma 0.005-0.012) |
| Spacing base | 4pt grid (4, 8, 12, 16, 24, 32, 48, 64, 96) |
| Easing | ease-out-quart `cubic-bezier(0.25, 1, 0.5, 1)` — no bounce/elastic. JS: `src/lib/motion.ts` |
| Icon library | Lucide (line, strokeWidth 2, rounded corners) |
| Theme | Light (Cozy) — derived from domestic/couples context |
| Canvas/surface contrast | Canvas 93% / Surface 98.5% lightness (warm parchment) |
| Desktop nav | Left rail — binary: collapsed 72px icon rail or pinned 272px open. Toggle via pin button or ⌘\. No hover-expand. |
| View shell | Shared layout at `src/app/(views)/layout.tsx` owns `AppShell` (sidebar + chrome). Pages are leaves that return fragments. Sidebar stays mounted across nav. |
| Internal links | `next/link` `<Link>` everywhere inside the authenticated app. Plain `<a href>` triggers a full reload and blows away the shared layout. |
| View-switch motion | `AnimatePresence mode="wait"` on `{children}` in AppShell — opacity-only (0→1 enter, 1→0 exit), 220ms each, EASE_OUT_QUART. No transforms on the wrapper (fractional `translateY` smears child `divide-y` borders into ghost lines). |
| Mobile nav | Bottom tab bar (4 slots) + compact header with points |
| Task creation | Bottom sheet (both breakpoints) |
| Inline pickers | Popover (desktop) or secondary BottomSheet (mobile, date only) |
| Height animation | `grid-template-rows: 0fr → 1fr` (not Framer Motion height) |
| Breakpoint | lg: (1024px) for desktop/mobile split |
| Edit entry | Tap task row (primary) or "Edit" in overflow menu (secondary) |
| Delete (non-repeating) | Direct delete with undo toast, no confirmation |
| Delete (repeating) | ConfirmDialog with "Just this one" / "All future ones too" |

## Folder layout

```
ToDoApp/
├── design-system/
│   └── README.md              ← you are here (the rules)
├── docs/
│   ├── themes.md              ← the theme brief
│   └── voice-and-tone.md      ← the character
└── src/
    ├── styles/
    │   ├── tokens.css         ← the token contract (CSS variables)
    │   └── themes/
    │       ├── cozy.css       ← default theme values
    │       └── ...            ← future themes
    └── components/
        └── button/
            ├── button.tsx     ← the component (source of truth)
            ├── button.md      ← the doc (describes the component)
            └── button.test.ts ← the tests
```

The `tokens.css` file is the *contract* of what tokens exist. Each theme file supplies values for all of them. No component imports theme files directly; components consume CSS variables only.

## The new-component checklist

Before merging a new component, all of the following must be true. A Claude session adding a component must verify each item.

- [ ] The component uses only theme tokens. No hard-coded values anywhere.
- [ ] All relevant states are implemented (default, hover, focus, active, disabled, loading, empty, error, as applicable).
- [ ] Keyboard navigation works. Tab order is correct. Focus is visible.
- [ ] Screen reader labels are present and accurate.
- [ ] Color contrast meets WCAG 2.1 AA in the default theme.
- [ ] Touch targets are ≥ 44px where applicable.
- [ ] Motion is tuned, not framework default. `prefers-reduced-motion` respected.
- [ ] All user-visible copy conforms to `docs/voice-and-tone.md`.
- [ ] A sibling `component-name.md` exists in the same folder, and is updated in the same commit.
- [ ] The component doc includes: purpose, non-purpose, props, states, a11y notes, usage examples, do/don't, changelog.
- [ ] Tests exist: unit for logic, interaction for behavior, and the component is exercised by at least one Playwright e2e path if it appears in a shipped flow.

## The new-token checklist

Before adding a new token:

- [ ] The token has a semantic name (what it *means*, not what it looks like).
- [ ] The token is defined in `tokens.css` as a CSS variable.
- [ ] Every existing theme file has a value for it. No theme is left incomplete.
- [ ] The token is documented in a comment in `tokens.css` explaining its intended use.
- [ ] No existing token could have covered the use case (verified, not assumed).

## How to propose a change to an existing component

1. Read the current `component-name.md` to understand current intent.
2. If the change is additive (a new variant, a new prop, a new state), extend without breaking existing usage.
3. If the change is breaking, search the codebase for all usages and update them in the same PR.
4. Update `component-name.md` in the same commit. Add an entry to its changelog.
5. Run the component checklist again.

## When to invoke which skill

- **Before starting a UI feature:** read this file, `docs/themes.md`, and `docs/voice-and-tone.md`.
- **When writing user-visible copy:** invoke `design:ux-copy`.
- **When auditing accessibility before merge:** invoke `design:accessibility-review`.
- **When auditing the design system for drift, naming inconsistencies, or hard-coded values:** invoke `design:design-system`.
- **When reviewing a finished screen or flow:** invoke `design:design-critique`.
- **For the initial design system bootstrap** (tokens + base components, one time, after the tech stack is provisioned): invoke `design:design-system` with the intent "create the initial token set and base component library based on the foundation docs."

## The Claude contract

Every future Claude Code session that touches a UI file must:

1. **Read this file first.** Before proposing any UI code.
2. **Read `docs/themes.md` and `docs/voice-and-tone.md`** if the change involves styling or copy.
3. **Verify CLI access** to the relevant systems before guessing (see `docs/principles.md` #13–14).
4. **Treat components as a closed set** unless explicitly asked to add one.
5. **Update the component doc in the same commit** as the component change.
6. **Run the relevant checklist** before calling a change done.

## What's in here vs. what's in code

| Thing | Lives in |
|---|---|
| Rules and discipline for the design system | **This file** (`design-system/README.md`) |
| The theme brief and default theme vibe | `docs/themes.md` |
| The character and copy principles | `docs/voice-and-tone.md` |
| The actual token contract (CSS variable names + meanings) | `src/styles/tokens.css` |
| Actual theme values | `src/styles/themes/cozy.css` (and others) |
| A component's code | `src/components/<name>/<name>.tsx` |
| A component's doc | `src/components/<name>/<name>.md` |
| A component's tests | `src/components/<name>/<name>.test.ts` |
| Composition patterns (how components go together) | `src/components/patterns/` with sibling `.md` docs |

If you're looking for something and it's not in the place the table says, the table is right and the codebase is wrong. File an issue.
