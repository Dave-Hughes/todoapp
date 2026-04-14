# Session Handoff: Design System Bootstrap (Step 5)

> **For:** Claude Code session  
> **Date:** 2026-04-12  
> **Prerequisite:** Impeccable is installed (`~/.agents/skills/`). All 17 design skills available.

## What to read first

Read these files in this order before doing anything. This is not optional.

1. `CLAUDE.md` — full project orientation, stack, principles, session checklist
2. `.impeccable.md` — the Impeccable Design Context (brand, aesthetic, references, constraints)
3. `docs/themes.md` — the theme system and default theme brief
4. `docs/voice-and-tone.md` — the app's character, do/don't examples
5. `design-system/README.md` — the design system rules (the contract)
6. `docs/scope-v1.md` — what ships in v1
7. `specs/views.md` — Today/Week/Month structure (Today is the hero)
8. `specs/tasks.md` — task data model, swipe gestures, completion/postpone flows
9. `specs/multiplayer.md` — invite flow, attribution, recognition moments
10. `docs/principles.md` — product, design, and engineering principles

Also read the Impeccable reference files relevant to this work:
- `~/.agents/skills/impeccable/SKILL.md` — the main Impeccable skill (design direction, font procedure, color rules, anti-patterns)
- `~/.agents/skills/impeccable/reference/color-and-contrast.md`
- `~/.agents/skills/impeccable/reference/typography.md`
- `~/.agents/skills/impeccable/reference/spatial-design.md`
- `~/.agents/skills/impeccable/reference/motion-design.md`
- `~/.agents/skills/impeccable/reference/interaction-design.md`
- `~/.agents/skills/shape/SKILL.md` — the shape skill (structured UX planning)
- `~/.agents/skills/impeccable/reference/craft.md` — the craft flow

## Where we are in the build flow

```
1. ✅ Product interview (foundation docs)
2. ✅ Tech stack interview → docs/tech-stack.md
3. ✅ CLAUDE.md + AGENTS.md
4. ✅ Voice and tone
5. ⬅️ YOU ARE HERE: Design system bootstrap
6. ✅ Provision external systems
7. ✅ Verify CLI/API/MCP access
8. ✅ Hardened CLI-first rules
9.    Build (walking skeleton) — NEXT after this
10.   Playwright e2e tests
```

## What this session needs to accomplish

Bootstrap the design system by building the Today view — the hero surface that 70% of design energy should go toward. The design system (tokens, theme, base components) emerges FROM the Today view, not before it in a vacuum.

### The sequence

**Phase 1: Shape the Today view**

Run `/shape` for the Today view. The discovery interview is mostly answered by the specs, but shape it properly — layout strategy, key states, interaction model, content requirements. The `.impeccable.md` file has the Design Context already populated.

The Today view (from `specs/views.md`) has:
- Primary section: hard-deadline tasks due today + overdue with gentle indicator
- Secondary section: flexible "when you can" tasks
- Done accordion: collapsed, shows completion count and who completed each task
- Filter toggle: Mine / Theirs / All (persistent)
- Persistent add button (placement TBD — decide during shape)
- Notification badge (lightweight)
- Navigation: sidebar on desktop, bottom tabs on mobile
- Empty states: two variants (no tasks at all / caught up), 3-4 rotating copy variants
- Swipe gestures: right to complete, left to postpone
- Points visible in profile area, framed collaboratively

**Phase 2: Build tokens + theme + Today view together**

Run `/impeccable craft` (or follow the craft flow manually). Build in this order per the craft reference:

1. **Structure** — semantic HTML for the Today view's primary state
2. **Tokens + Theme** — as you lay out the view, create `src/styles/tokens.css` (the contract) and `src/styles/themes/cozy.css` (the Cozy values). Wire into `globals.css` with Tailwind v4's `@theme inline`. Tokens are created as needed by the real UI, not speculatively.
3. **Layout and spacing** — 4pt grid, semantic space tokens
4. **Typography and color** — follow the Impeccable font selection procedure (reject reflex fonts!), use OKLCH, tint neutrals toward brand hue
5. **Components** — each component that emerges gets its own folder with `.tsx` and `.md` doc. Components consume CSS variables only.
6. **Interactive states** — hover, focus, active, disabled for every interactive element
7. **Edge case states** — empty (both variants), loading, error, offline
8. **Motion** — Framer Motion, exponential ease-out curves (NOT bounce/elastic), respect `prefers-reduced-motion`
9. **Responsive** — mobile-first, bottom tab bar on mobile, sidebar on desktop

**Phase 3: Extract and document**

Once the Today view looks and feels right:
- Run `/impeccable extract` to formalize the token set and reusable components
- Verify every component has its sibling `.md` doc
- Run the new-component checklist from `design-system/README.md` on each component
- Run `/audit` for accessibility and anti-pattern checks
- Update `CLAUDE.md` to mark Step 5 as complete

### Components that should emerge from the Today view

Based on the specs, the Today view needs at minimum:
- TaskListItem (swipeable, with checkbox, attribution, category, time, flexible indicator)
- Checkbox (the completion control, animated)
- Button (primary, secondary, ghost, destructive variants)
- IconButton (for actions)
- FilterToggle (segmented control: Mine / Theirs / All)
- AddButton (persistent FAB)
- NotificationBadge (dot or count)
- EmptyState (illustration + rotating copy + CTA)
- DoneAccordion (collapsible completed tasks with attribution)
- Toast (undo delete, errors)
- Navigation / AppShell (sidebar desktop, bottom tabs mobile)
- SwipeSurface (gesture container for swipe-to-complete/postpone)

Don't build these in isolation — they emerge as you build the Today view. Each gets extracted into its own folder with a `.md` doc when it's ready.

## Critical constraints (from Impeccable + project docs)

### DO:
- Use OKLCH for all colors
- Tint neutrals toward brand hue (warm)
- Follow the font selection procedure — reject the reflex fonts list
- Use a fixed `rem` type scale (app UI, not marketing)
- 4pt spacing grid
- Animate only `transform` and `opacity` (use `grid-template-rows` for height)
- Use exponential ease-out curves (`ease-out-quart` or similar)
- Every token is semantic (`--color-accent`, not `--color-coral`)
- Every component passes WCAG 2.1 AA
- Every component has a sibling `.md` doc in the same commit

### DON'T:
- No hard-coded values anywhere (colors, fonts, spacing, motion, shadows)
- No bounce or elastic easing
- No pure black (#000) or pure white (#fff)
- No side-stripe borders (border-left > 1px) on cards/list items
- No gradient text
- No Inter, Plus Jakarta Sans, Fraunces, DM Sans, or any font on the reflex list
- No cards nested inside cards
- No `user-scalable=no`
- No framework-default animation durations or easing

## Before starting

1. Verify you can run `npm run dev` and see the app at localhost:3000
2. Install framer-motion: `npm install framer-motion`
3. Confirm `.impeccable.md` exists in project root and has Design Context
4. Read ALL the files listed above

## After finishing

1. Update `CLAUDE.md` — mark Step 5 complete, add any new conventions established
2. Update `docs/open-questions.md` if any questions were resolved
3. Commit everything with a clear message describing what was built
4. Note what's ready for Step 9 (walking skeleton) and what gaps remain

## One more thing

The quality bar from the vision doc: **"Would I show this to a paying customer as an example of my work."** This is a commercial product and a capability showcase. The design system bootstrap sets the tone for everything that follows. Make it count.
