# CLAUDE.md

> **Read this first.** Every AI session working on this project must read this file before doing anything. It is the single source of truth for project orientation.

## What this project is

A to-do app purpose-built for couples. This is a commercial product intended to be marketed and sold — not a personal tool or portfolio piece. Dave and Krista are the first users; the goal is a viable product serving many couples at scale.

"ToDoApp" is a placeholder name. The real name is TBD.

## The stack

| Slot | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS v4 |
| Database | Neon (Postgres), us-east-1 |
| ORM | Drizzle |
| Auth | Clerk (Organizations for household scoping) |
| Data fetching | TanStack Query (polling in v1, push later) |
| Animation | Framer Motion |
| Hosting | Vercel |
| DNS / Registrar | Cloudflare (DNS only, not a CDN layer) |
| Transactional email | Resend |
| Payments | Stripe (wired early, not integrated in v1) |
| E2E testing | Playwright |
| Unit / integration testing | Vitest + React Testing Library |
| Design tooling | Impeccable (`npx skills add pbakaus/impeccable`) |
| Package manager | npm |

Full rationale for every choice: [docs/tech-stack.md](docs/tech-stack.md).

## The build flow

1. ✅ Product interview (foundation docs)
2. ✅ Tech stack interview → `docs/tech-stack.md`
3. ✅ CLAUDE.md + AGENTS.md (this file)
4. ✅ Voice and tone (baked into foundation pass)
5. ✅ Design system bootstrap (Today view, tokens, Cozy theme, 14 components)
6. ✅ Provision external systems + verify full CLI/API/MCP access
7. ✅ Verify full CLI/API/MCP interconnectivity across the stack
8. ✅ Update this file with hardened "always CLI first, never guess" rules
9. Build (walking skeleton: task + Today view + minimal multiplayer scaffolding)
   - ✅ Task Create Sheet Phase 1: shell, title input, chip row, CTA, error state
   - ✅ Task Create Sheet Phase 1b: BottomSheet composition, Enter-to-submit, mobile scroll
   - ✅ Task Create Sheet Phase 2: inline pickers (date, assignee, category), expanded section (time, flexible, notes, points)
   - ✅ Post-Phase 2 audit: extracted SegmentedControl, fixed touch targets, grid-row animation, responsive picker widths
   - ✅ Phase 3: Repeat picker with NLP (presets + natural language input, client-side parser)
   - ✅ Phase 4: Edit mode + Delete (edit sheet, inline delete confirmation, ConfirmDialog, undo toast)
10. ✅ Playwright e2e tests (274 runs after optimization, 0 failures)
11. Keep updating markdown after every major change

## Foundation docs (read before making decisions)

These define the product. Read the ones relevant to your task. Read all of them if this is your first session.

| Doc | What it covers |
|---|---|
| [docs/vision.md](docs/vision.md) | Origin story, wedge, core emotional claim, tenets |
| [docs/personas.md](docs/personas.md) | The Organizer, The Willing Partner |
| [docs/scope-v1.md](docs/scope-v1.md) | What ships in v1, what doesn't, what v1 is prepared for |
| [docs/principles.md](docs/principles.md) | Product, design, and engineering principles |
| [docs/voice-and-tone.md](docs/voice-and-tone.md) | The app's character (theme-agnostic) |
| [docs/themes.md](docs/themes.md) | The theme system as a first-class concept |
| [docs/tech-stack.md](docs/tech-stack.md) | Every stack choice and why |
| [docs/open-questions.md](docs/open-questions.md) | Unresolved decisions |

## Design system rules

**Read [design-system/README.md](design-system/README.md) before touching any UI code.** The full rules are there. The non-negotiables:

- **No hard-coded values. Ever.** Colors, fonts, spacing, motion — everything comes from theme tokens. If a token doesn't exist, add it to every theme first, then use it.
- **Tokens are semantic, not descriptive.** `--color-accent`, not `--color-coral`.
- **Components are the design system.** Code is the source of truth. Docs live next to code. Drift is a bug.
- **Every component ships with real states** (hover, focus, disabled, loading, empty, error — whichever apply).
- **Every component ships accessible.** WCAG 2.1 AA. Keyboard navigable. Screen reader labeled. Touch targets ≥ 44px.
- **Every component ships with its doc** in the same commit.
- **Motion is tuned, not defaulted.** Respect `prefers-reduced-motion`.
- **No Figma.** The code is the design system. There is no parallel source of truth.

## File structure

```
ToDoApp/
├── CLAUDE.md                  ← you are here
├── AGENTS.md                  ← agent role definitions
├── .impeccable.md             ← Design Context for Impeccable skills
├── README.md
├── design-system/
│   └── README.md              ← design system rules
├── docs/
│   ├── vision.md
│   ├── personas.md
│   ├── scope-v1.md
│   ├── principles.md
│   ├── voice-and-tone.md
│   ├── themes.md
│   ├── tech-stack.md
│   ├── open-questions.md
│   └── session-handoff-design-system.md
├── specs/
│   ├── tasks.md
│   ├── views.md
│   └── multiplayer.md
└── src/
    ├── app/
    │   ├── globals.css        ← Tailwind v4 + token/theme imports
    │   ├── layout.tsx         ← Root layout (Bricolage Grotesque + Gabarito fonts)
    │   └── page.tsx           ← Today view (hero surface with demo data)
    ├── components/            ← each component has .tsx + .md doc
    │   ├── app-shell/         ← responsive layout frame
    │   ├── avatar/            ← initial-based avatar with notification dot
    │   ├── bottom-sheet/      ← draggable sheet with focus trap
    │   ├── bottom-tabs/       ← mobile tab bar (Today/Week/Month/Settings)
    │   ├── checkbox/          ← animated circle checkbox
    │   ├── confirm-dialog/    ← centered modal for delete confirmations
    │   ├── done-accordion/    ← collapsible completed tasks
    │   ├── empty-state/       ← two variants (no-tasks, caught-up) with rotating copy
    │   ├── fab/               ← floating action button (mobile)
    │   ├── filter-toggle/     ← thin wrapper around SegmentedControl for Mine/Partner's/All
    │   ├── icon-button/       ← compact icon-only button with variants (extracted pattern)
    │   ├── mobile-header/     ← compact header with points
    │   ├── popover/           ← portal-rendered click-triggered popover (chip pickers)
    │   ├── repeat-picker/    ← presets + NLP input for recurrence rules (3 files: tsx, parse, format)
    │   ├── date-picker/       ← calendar grid + preset row (Today/Tomorrow/Next week)
    │   ├── assignee-picker/   ← listbox: Me / Partner / Shared with avatar initials
    │   ├── category-picker/   ← listbox: 5 categories with colored dots
    │   ├── segmented-control/ ← generic animated radiogroup (shared by FilterToggle + flexible toggle)
    │   ├── sidebar/           ← desktop rail with peek/hover/pinned states, points hero, nav
    │   ├── task-chip/         ← pill chip for task field shortcuts (date, assignee, etc.)
    │   ├── task-list-item/    ← swipeable task row
    │   ├── task-sheet/        ← task creation sheet with inline pickers + expanded section
    │   ├── toast/             ← timed notification with undo
    │   └── tooltip/           ← portal-rendered tooltip with shortcut hints
    ├── lib/
    │   └── motion.ts          ← shared Framer Motion easing curves and transition presets
    ├── db/                    ← Drizzle schema and migrations (TBD)
    └── styles/
        ├── tokens.css         ← token contract (70+ CSS variables)
        └── themes/
            └── cozy.css       ← default theme (OKLCH colors, warm terracotta accent)
```

## Design system conventions (established Step 5)

| Decision | Value |
|---|---|
| Body font | Bricolage Grotesque (Google Fonts, variable weight) |
| Display font | Gabarito (Google Fonts, variable weight) |
| Color space | OKLCH everywhere |
| Brand hue | ~42° (warm terracotta/peach accent) |
| Neutral tint hue | 55° (warm, chroma 0.005-0.012) |
| Spacing base | 4pt grid (4, 8, 12, 16, 24, 32, 48, 64, 96) |
| Easing | ease-out-quart `cubic-bezier(0.25, 1, 0.5, 1)` — no bounce/elastic |
| Icon library | Lucide (line, strokeWidth 2, rounded corners) |
| Theme | Light (Cozy) — derived from domestic/couples context |
| Canvas/surface contrast | Canvas 93% / Surface 98.5% lightness (warm parchment) |
| Texture | Subtle fractal noise at 0.3 opacity on canvas |
| Desktop nav | Left rail — peek (72px) by default, expands to 272px on hover, pinnable (⌘\) with persisted state |
| Mobile nav | Bottom tab bar (4 slots) + compact header with points |
| Task creation | Bottom sheet (both breakpoints) |
| Inline pickers | Popover (desktop) or secondary BottomSheet (mobile, date only) |
| Segmented controls | Shared `SegmentedControl` primitive with animated layoutId indicator |
| Height animation | `grid-template-rows: 0fr → 1fr` (not Framer Motion height) |
| Breakpoint | lg: (1024px) for desktop/mobile split |
| Edit sheet entry | Tap task row (primary) or "Edit" in overflow menu (secondary) |
| Delete confirmation (non-repeating) | Inline in overflow menu — transforms to confirmation row |
| Delete confirmation (repeating) | Centered ConfirmDialog with branching options |
| Delete confirmation (from edit sheet) | ConfirmDialog (sheet closes first) |

## Commands

```bash
# Development
npm run dev                    # Start Next.js dev server

# Testing
npm run test:e2e               # Playwright e2e tests (all 3 viewports: desktop Chrome, mobile Chrome, mobile Safari)
npm run test:e2e:ui            # Playwright tests with interactive UI
npm run test                   # Vitest unit/integration tests (not yet configured)

# Database
npx drizzle-kit generate       # Generate migration from schema changes
npx drizzle-kit migrate        # Run pending migrations

# Linting / formatting
npm run lint                   # ESLint
npm run format                 # Prettier (if configured)
```

## Test coverage (as of Phase 4 + optimization)

**274 test runs, 0 failures.** Viewport-agnostic tests run desktop-only; mobile-specific tests run on all 3 viewports (desktop Chrome, Pixel 7, iPhone 14).

Test files:
- `tests/today-view.spec.ts` — 150 unique tests (11 mobile-specific × 3 viewports + 139 desktop-only)
- `tests/task-sheet.spec.ts` — 92 unique tests (5 mobile-specific × 3 viewports + 87 desktop-only)

Covers (today-view): page load, page header, desktop layout (sidebar), mobile layout (header, tabs, FAB), filter toggle, task completion, task uncomplete, Done accordion, empty states, task creation, roll over, postpone, task metadata, section labels, hover actions, undo, overflow menu, mobile roll-over, completion micro-celebration, partner points, accessibility, keyboard nav, focus trap, theme tokens, voice and tone, responsive, edge cases.

Covers (task-sheet): sheet open/close (Cmd+Enter, FAB, toolbar button), title field (autofocus, placeholder, multi-line, keyboard shortcuts), chip row (defaults, horizontal scroll, fade mask), CTA states (enabled, disabled, submitting, error), date picker (popover open, preset selection, calendar grid, arrow-key nav, Escape focus return, mobile BottomSheet divergence), assignee picker (open, select partner/shared, keyboard selection), category picker (open, "File it where?" header, select category), repeat picker (chip enabled, popover open, all 4 presets commit + update chip, NLP input for single day/multi-day/interval/monthly, real-time preview, parse error on unparseable input, clear rule, Escape close, keyboard nav between presets, value reset on reopen, input pre-population for custom rules), expanded section (Details toggle, time stepper increment/clear, flexible toggle, notes field + placeholder, points auto-fill + manual edit), cross-cutting (submit with picker values, flexible tasks in correct section, picker reset on reopen), edit mode (tap-to-edit, overflow menu edit, pre-populated fields, header/CTA variants, auto-expand Details, save updates list, close without saving preserves task), delete flow (direct delete from menu, undo toast, undo restores task, delete from edit sheet header icon, done tasks menu with disabled items).

## Things that must not be re-litigated

These were decided during the foundation and tech stack interviews and are not up for rediscussion unless Dave explicitly opens them:

- The wedge is "purpose-built for couples" — not a feature, a positioning constraint.
- The core emotional claim is making invisible labor visible — recognition, not just coordination.
- Two personas: The Organizer and The Willing Partner. Roles are symmetric at the account level and asymmetric per-moment.
- v1 does not include Vault, Bounties, SMS, themes beyond default, calendar sync, email digests, habit stacks, or iOS.
- The default theme is warm/playful/cheeky-cozy ("Cozy"). Other themes come later.
- Voice is warm, playful, cheeky, competent, low-ego. Voice is theme-agnostic.
- Design system is code-first. No Figma. Component docs next to code.
- The entire tech stack in the table above. Rationale is in `docs/tech-stack.md`.

## External systems — verified access (2026-04-10)

All systems are provisioned and verified. Environment variables are set in Vercel (via integrations) and locally in `.env.local`.

| System | Status | Vercel integration | Notes |
|---|---|---|---|
| Neon | **Connected** (Postgres 17, us-east-1) | ✅ `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Pooled + unpooled connections |
| Clerk | **Connected** (dev instance) | ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Production keys needed later |
| Vercel | **Deployed** | — | Auto-deploys from `main` branch |
| Cloudflare | **Account ready** | — | Domain pending naming decision |
| Stripe | **Account ready** (sandbox) | — | Not integrated in v1 |
| Resend | **Account ready** | — | New API key + domain verification when ready |

**GitHub repo:** `Dave-Hughes/todoapp` (private)
**Vercel project:** `todoapp`
**Dev server:** `npm run dev` → `http://localhost:3000`

## CLI-first rules (non-negotiable)

These rules are hardened after verifying full CLI access across the stack. They exist because guessing about external systems is the #1 cause of wasted sessions.

**1. Always CLI into tools first before asking Dave or guessing.** If you need to know the state of the database, query it. If you need to know what Clerk users exist, call the API. If you need to know what's deployed, check Vercel. Do not ask Dave questions you can answer with a CLI command.

**2. Never suggest solutions or write code if you don't have full CLI access.** If you cannot reach the database, that is a blocker — stop and fix it before writing any code that depends on it. If an API key is missing or expired, that is a blocker. Do not work around it with assumptions.

**3. Verify before every session.** At the start of any session that touches external systems, run a quick connectivity check. Don't assume the last session's access still works.

**4. After every major change, update this file and the foundation docs.** A major feature, a new system provisioned, an error resolution, a convention change — all require a doc update in the same session. Future sessions inherit what you leave behind. "Now that we [did X], take a moment to update CLAUDE.md and our other markdown files so future me and you are aware."

## The craft bar

This project's quality bar is **"would I show this to a paying customer as an example of my work."** Higher than "it works," not higher than "it ships."

The principles most likely to be violated by a lazy session:

- **#13–14: CLI-first.** Never propose solutions without verified CLI access to the system in question.
- **#15: Prepared for post-v1, not built for it.** Architecture assumes future features. v1 doesn't build them.
- **#18a: Components are the design system.** Update the doc when you update the component. Same commit.
- **#7: Themed from day one.** Every component uses theme tokens. No hard-coded values, ever.

## Session checklist

Before starting work in any session:

1. Read this file.
2. Read the docs relevant to your task (see the table above).
3. If touching UI: read `design-system/README.md`, `docs/themes.md`, `docs/voice-and-tone.md`.
4. Confirm CLI access to any external system you're about to use.
5. Check `docs/open-questions.md` for anything relevant to your task.
6. After completing work: update this file and relevant docs if the project state has changed.

## Updating this file

This file is a living document. Update it when:

- A new tool or system is provisioned (add connection details, CLI commands).
- The file structure changes meaningfully.
- A new convention is established.
- A major milestone is reached (update the build flow checkboxes).
- CLI access to a new system is verified (add the verification command).

A major change without a CLAUDE.md update is incomplete.
