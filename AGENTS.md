# AGENTS.md

> **What this file is:** Role definitions for AI agents working on this project. Each role has a specific scope, required reading, and constraints. An agent should adopt the role most relevant to its current task.

## Roles

### frontend

**Scope:** Components, pages, styling, animation, accessibility, and anything in `src/components/`, `src/app/`, or `src/styles/`.

**Required reading before any work:**
- `CLAUDE.md` (always)
- `design-system/README.md` (mandatory — contains the component and token checklists)
- `docs/themes.md` (the theme system and default theme brief)
- `docs/voice-and-tone.md` (all user-visible copy must pass this)

**Constraints:**
- No hard-coded values. Everything from theme tokens.
- Every component ships with sibling `.md` doc, updated in the same commit.
- Every component ships with real states (hover, focus, disabled, loading, empty, error).
- WCAG 2.1 AA. Keyboard navigable. Screen reader labeled. Touch targets ≥ 44px.
- Motion tuned by hand via Framer Motion. Respect `prefers-reduced-motion`.
- Run the new-component checklist (`design-system/README.md`) before calling anything done.
- Use Impeccable commands (`/polish`, `/audit`, `/critique`) during and after UI work.

**Tools / skills to use:**
- `design:design-system` — for auditing token/component drift
- `design:ux-copy` — for any user-visible copy
- `design:accessibility-review` — before merging any component or flow
- `design:design-critique` — for reviewing finished screens

---

### backend

**Scope:** Database schema, Drizzle models and migrations, API routes, Clerk integration, server-side logic, and anything in `src/db/`, `src/lib/`, or API-facing code in `src/app/api/`.

**Required reading before any work:**
- `CLAUDE.md` (always)
- `docs/tech-stack.md` (stack rationale, especially Drizzle, Clerk, Neon sections)
- `docs/scope-v1.md` (to know what the data model must support now vs. be prepared for)
- `docs/open-questions.md` (especially #3 household model, #8 concurrent edits)

**Constraints:**
- Drizzle schema in `src/db/schema.ts` is the source of truth for the data model.
- Every schema change generates a migration via `drizzle-kit generate`.
- Household data scoping via Clerk Organizations. Never leak data across households.
- Data model must be prepared for post-v1 features (Vault, Bounties, SMS, digests) without building them.
- The `points` field exists on tasks but is not user-visible in v1.
- CLI-first: verify you can query the database and interact with Clerk before making changes.

---

### testing

**Scope:** Test strategy, test writing, test infrastructure. Playwright e2e tests, Vitest unit/integration tests, React Testing Library component tests.

**Required reading before any work:**
- `CLAUDE.md` (always)
- `docs/principles.md` (especially #16 — test the unhappy paths)
- `docs/scope-v1.md` (to understand what flows exist and what edge cases matter)

**Constraints:**
- Three layers: Vitest for unit/integration, React Testing Library for components, Playwright for e2e.
- Happy paths are table stakes. The real value is edge cases: stale sessions, partial network failures, concurrent edits by both partners, invited partner who never accepts, repeat tasks across DST boundaries, reassignment mid-completion.
- E2e tests cover the full couple experience — both partners' perspectives, not just one.
- Component tests assert on what the user sees (React Testing Library philosophy), not implementation details.

---

### product

**Scope:** Feature specs, product decisions, scope questions, user research, copy review.

**Required reading before any work:**
- `CLAUDE.md` (always)
- `docs/vision.md` (the full product framing)
- `docs/personas.md` (the two personas and the symmetric-roles constraint)
- `docs/scope-v1.md` (what's in and what's out)
- `docs/principles.md` (all of them)
- `docs/voice-and-tone.md` (the character)
- `docs/open-questions.md` (the full list)

**Constraints:**
- Features must serve visibility, coordination, or recognition. If a feature doesn't clearly serve one of these three, cut it or defer it.
- Recognition over coordination when there's a trade-off.
- v1 scope is locked. Don't expand it without Dave explicitly opening the conversation.
- Specs are written just-in-time, immediately before the feature is built.
- Interview before building. Surface assumptions before committing to a direction.

**Tools / skills to use:**
- `design:ux-copy` — for copy decisions
- `design:user-research` — for structuring research
- `design:research-synthesis` — for synthesizing findings

---

### infra

**Scope:** External system provisioning, CLI access verification, deploy pipeline, environment variables, Vercel/Neon/Clerk/Cloudflare/Stripe/Resend setup.

**Required reading before any work:**
- `CLAUDE.md` (always)
- `docs/tech-stack.md` (what systems exist and their roles)
- `docs/principles.md` (#13–14: CLI-first, never guess)

**Constraints:**
- CLI-first. Every system must be accessible via CLI/API before anything is built against it.
- Verify access, don't assume it. If you can't query the database, that's a blocker.
- Document connection details and CLI commands in `CLAUDE.md` once verified.
- us-east-1 for Neon and Vercel serverless functions.
- Cloudflare is DNS/registrar only. Do not configure it as a CDN layer in front of Vercel.
- Stripe account wired early but not integrated in v1.

## How to use this file

1. Identify which role fits your current task. Most tasks map to one role.
2. Read the required docs for that role.
3. Follow that role's constraints throughout your work.
4. If a task spans multiple roles (e.g., building a new feature end-to-end), read the required docs for all relevant roles and follow the strictest constraints from each.

## Updating this file

Add or modify roles when:
- A new area of concern emerges that doesn't fit existing roles.
- A role's constraints need tightening based on mistakes made.
- New tools or skills become relevant to a role.
