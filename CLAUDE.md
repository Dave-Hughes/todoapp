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
5. Design system bootstrap (`design:design-system` skill, after Impeccable is installed)
6. ✅ Provision external systems + verify full CLI/API/MCP access
7. ✅ Verify full CLI/API/MCP interconnectivity across the stack
8. ✅ Update this file with hardened "always CLI first, never guess" rules
9. Build (walking skeleton: task + Today view + minimal multiplayer scaffolding)
10. Playwright e2e tests with heavy edge-case coverage
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

## File structure (expected once code exists)

```
ToDoApp/
├── CLAUDE.md                  ← you are here
├── AGENTS.md                  ← agent role definitions
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
│   └── open-questions.md
├── specs/
│   ├── tasks.md
│   ├── views.md
│   └── multiplayer.md
└── src/
    ├── app/                   ← Next.js App Router pages
    ├── components/            ← components with sibling .md and .test.ts
    │   └── button/
    │       ├── button.tsx
    │       ├── button.md
    │       └── button.test.ts
    ├── lib/                   ← shared utilities, Drizzle client, etc.
    ├── db/
    │   ├── schema.ts          ← Drizzle schema (source of truth for data model)
    │   └── migrations/        ← Drizzle Kit migrations
    └── styles/
        ├── tokens.css         ← token contract (CSS variables)
        └── themes/
            ├── cozy.css       ← default theme
            └── ...
```

## Commands

```bash
# Development
npm run dev                    # Start Next.js dev server

# Testing
npm run test                   # Vitest unit/integration tests
npm run test:e2e               # Playwright end-to-end tests

# Database
npx drizzle-kit generate       # Generate migration from schema changes
npx drizzle-kit migrate        # Run pending migrations

# Linting / formatting
npm run lint                   # ESLint
npm run format                 # Prettier (if configured)
```

*(Drizzle, Playwright, and Prettier scripts will be added as those tools are configured.)*

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
