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

## Build progress

1. ✅ Product interview (foundation docs)
2. ✅ Tech stack interview → `docs/tech-stack.md`
3. ✅ CLAUDE.md + AGENTS.md
4. ✅ Voice and tone
5. ✅ Design system bootstrap (Today view, tokens, Cozy theme)
6. ✅ Provision external systems + verify CLI/API/MCP access
7. ✅ Interconnectivity verified
8. ✅ CLI-first rules hardened
9. Build (walking skeleton)
   - ✅ Phase 1: Task Create Sheet (shell, title, chips, CTA, error)
   - ✅ Phase 1b: BottomSheet composition, Enter-to-submit, mobile scroll
   - ✅ Phase 2: Inline pickers (date, assignee, category), expanded section
   - ✅ Post-Phase 2 audit: SegmentedControl, touch targets, grid-row animation
   - ✅ Phase 3: Repeat picker with NLP
   - ✅ Phase 4: Edit mode + Delete
10. ✅ Playwright e2e (274 runs, 0 failures — optimized from 733)
11. ✅ Persistence + auth (Clerk + Neon + Drizzle, API routes, TanStack Query, seeded task DB)
    - Pre-existing demo-state e2e specs (`task-sheet.spec.ts`, `today-view.spec.ts`) will need adapting to real backend — tracked as follow-up.
12. Keep updating docs after every major change

## Foundation docs (read the ones relevant to your task)

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

## Design system

**Read [design-system/README.md](design-system/README.md) before touching any UI code.** It has the full rules AND the conventions table (fonts, colors, spacing, motion, layout patterns). The non-negotiables:

- No hard-coded values. Ever. Everything from theme tokens.
- Tokens are semantic, not descriptive.
- Components are the design system. Code is the source of truth.
- Every component ships with real states, accessibility, and its `.md` doc in the same commit.
- No Figma. The code is the design system.

## Commands

```bash
npm run dev                    # Start Next.js dev server
npm run test:e2e               # Playwright e2e (3 viewports)
npm run test:e2e:ui            # Playwright with interactive UI
npm run test                   # Vitest (jsdom + RTL)
npm run test:watch             # Vitest watch mode
npm run db:generate            # Drizzle — generate migration from schema
npm run db:migrate             # Drizzle — apply migrations (uses DATABASE_URL_UNPOOLED)
npm run db:seed                # Seed seeded_tasks + default categories (idempotent)
npm run db:studio              # Drizzle Studio
npm run lint                   # ESLint
```

## Things that must not be re-litigated

- The wedge is "purpose-built for couples" — positioning, not a feature.
- Core emotional claim: making invisible labor visible — recognition, not just coordination.
- Two personas: The Organizer and The Willing Partner.
- v1 scope is locked. No Vault, Bounties, SMS, extra themes, calendar sync, digests, habit stacks, or iOS.
- Default theme: warm/playful/cheeky-cozy ("Cozy"). Others come later.
- Voice: warm, playful, cheeky, competent, low-ego. Theme-agnostic.
- Design system is code-first. No Figma.
- The entire tech stack above. Rationale in `docs/tech-stack.md`.

## External systems (verified 2026-04-14)

| System | Status | Notes |
|---|---|---|
| Neon | Live (Postgres 17, us-east-1) | Schema migrated + seeded (98 tasks, 5 default categories). `DATABASE_URL` + `DATABASE_URL_UNPOOLED` via Vercel integration |
| Clerk | Live (dev instance) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`. Household auto-created on first sign-in via `getAuthedContext()` |
| Vercel | Deployed | Auto-deploys from `main` |
| Cloudflare | Account ready | Domain pending naming decision |
| Stripe | Account ready (sandbox) | Not integrated in v1 |
| Resend | Account ready | API key + domain verification when ready |

**GitHub:** `Dave-Hughes/todoapp` (private) · **Vercel:** `todoapp` · **Dev:** `npm run dev` → `http://localhost:3000`

## CLI-first rules (non-negotiable)

1. **Always CLI into tools first.** Don't ask Dave questions you can answer with a CLI command.
2. **Never write code without verified CLI access** to the systems it depends on.
3. **Verify access at session start** when touching external systems.
4. **Update docs after every major change.** Future sessions inherit what you leave behind.

## The craft bar

**"Would I show this to a paying customer as an example of my work."**

Principles most likely to be violated by a lazy session:
- #13–14: CLI-first. Never propose solutions without verified CLI access.
- #15: Prepared for post-v1, not built for it.
- #18a: Update the doc when you update the component. Same commit.
- #7: Themed from day one. No hard-coded values.

## Session checklist

1. Read this file.
2. Read the foundation docs relevant to your task.
3. If touching UI: read `design-system/README.md`.
4. Confirm CLI access to any external system you'll use.
5. Check `docs/open-questions.md` for anything relevant.
6. After work: update docs if project state changed.
