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
   - ✅ Phase 5 (2026-04-15): Week view (`/week`) — Sunday-anchored calendar week, `WeekDayStrip` day picker with density dots (1–3 + `+` overflow), today-hero treatment within the strip, prev/next/this-week nav, context-aware task creation (FAB/Add pre-fills the selected day), rotating empty-day copy. Today moved from `/` to `/today`; `/` is now a server redirect. Task adapters (`toUITask`, `uiTaskToFormData`, `formDataToCreateInput`, `daysBetween`, `addDaysIso`, `todayIso`, repeat-rule shape converters) lifted into `src/lib/task-adapters.ts` so Today and Week share one set of transforms. `TaskSheet` extended to honor `initialData.date` in create mode (all other fields still reset to defaults on create — see `task-sheet.md` changelog).
10. ✅ Playwright e2e (274 runs, 0 failures — optimized from 733)
11. ✅ Persistence + auth (Clerk + Neon + Drizzle, API routes, TanStack Query, seeded task DB)
    - Pre-existing demo-state e2e specs (`task-sheet.spec.ts`, `today-view.spec.ts`) will need adapting to real backend — tracked as follow-up.
12. ✅ Internal wiki at `/wiki` (signed-in only)
    - Parses CLAUDE.md build progress + `docs/` + `docs/open-questions.md` live at request time.
    - Indexes every `src/components/*` that ships with a co-located `.md`; flags drift when a component lacks one.
    - Entry point from sidebar utility row (BookOpen icon). All new surfaces theme-token driven — no hard-coded values.
13. ✅ Post-persistence polish pass (2026-04-14)
    - **Bug fixes:** repeat rule now persists through edit (DB↔UI shape converter, since lifted to `src/lib/task-adapters.ts` in Phase 5); points display wired to real data via new `getUserPointsTotals()` + `GET /api/me` extension; swipe-vs-tap disambiguation on `TaskListItem` (drag-threshold ref) stops the edit sheet from opening on quick swipes.
    - **Iconography:** emoji chips (📅 👤 🏷 🔁) in `TaskSheet` replaced with Lucide icons (`Calendar`, `UserRound`, `Tag`, `RotateCw`). `RotateCw` also added to `TaskListItem` metadata row as a repeat indicator.
    - **Invite surfaces:** new `InviteBanner` component — dismissable (localStorage), solo-state-only, Gabarito-display heading, tactile CTA (hover lift + active press), warm shadow-sm lift. `MobileHeader` gains a 44×44 `UserPlus` link next to the avatar when solo. Sidebar affordance unchanged. Five design passes on the banner (critique 38/40 → audit 19/20 → colorize → delight → bolder) — every change recorded in `src/components/invite-banner/invite-banner.md` changelog.
    - **Points display:** `AnimatedNumber` reduced to a pass-through (RAF count-up was cancelled by TanStack Query refetch oscillation); `MobilePoints` hides the partner block entirely in solo state (no more misleading "0 · 0"); uses em-dash for "no points yet."
    - All mutations (`use-tasks`) now invalidate both `["tasks"]` and `["me"]` on settle so completions update the points header immediately.
14. ✅ Phase 5 audit + shared-layout refactor (2026-04-15)
    - **Phase 5 review:** 36/40 /critique, 19/20 /audit. P1 mobile fixes — Week h1 no longer wraps 3 lines at 375px (stacks `flex-col lg:flex-row`), day-strip pills tighten to `min-w-[2.75rem] sm:min-w-[3.5rem]` so all 7 fit without overflow. `tests/auth.setup.ts` updated: the Phase-5 `/` → `/today` redirect broke `page.waitForURL("/")` → now waits for `/today`.
    - **Sidebar simplified (bigger change than it looks):** hover-to-expand "peek" removed. Sidebar is now strictly binary — collapsed (72px rail) or pinned open (272px). Toggle via the pin button or `⌘\`. Wiki link dropped from the utility rack (URL still works, just no affordance). Pin button label is **"Collapse sidebar"** (was "Unpin sidebar"). `motion.aside` swapped for a plain `<aside>` with a Tailwind CSS transition — Framer Motion v12 doesn't interpolate between two CSS-variable strings on `animate.width`, which had the rail stuck at peek even when `isPinned` flipped true.
    - **Shared layout for views** — the big one. AppShell (+ sidebar + mobile header + bottom tabs) now lives in `src/app/(views)/layout.tsx`, not inside each page. `/today` and `/week` moved into the `(views)` route group. Pages return `<>…</>` fragments; the layout owns the chrome and computes `todayCount` / `weekCount` once from shared TanStack cache. **Before this:** sidebar remounted on every nav — flashed collapsed→pinned, points hero re-ran, everything replayed. **After:** verified via DOM-node identity check that the sidebar survives navigation (same element before and after). Sidebar nav items and bottom-tab items switched from `<a href>` to `next/link` `<Link>` so client-side routing actually works (plain anchors trigger full page reloads, which defeat the shared layout).
    - **View-switch transition:** `AppShell` wraps `{children}` in `AnimatePresence mode="wait"` with an opacity-only fade (0 → 1 enter, 1 → 0 exit, 220ms each, `EASE_OUT_QUART`). Clear before/during/after beat, no transforms on the parent. Earlier tried a `y: 14 → 0` rise for a "settling" feel but fractional `translateY` during the tween sub-pixel-rendered 1px child borders (the task-list `divide-y`) as ghost rows during the ~200ms window. Opacity-only has no sub-pixel geometry → clean.
    - **AppShell pinned state read via `useLayoutEffect`** (iso-safe wrapper). Before: `useEffect` set `isPinned` *after* first paint, so every mount flashed from collapsed → pinned. After: the pin bit is read before paint and the rail opens to the correct width instantly.
15. ✅ Month view (2026-04-15)
    - **Route:** `/month` in the `(views)` route group — inherits shared `AppShell` layout (sidebar stays mounted across nav).
    - **Calendar grid:** 7-column, Sunday-anchored (matches Week). Desktop cells show date + up to 2 truncated task titles + "+N more" overflow. Mobile cells show date + density dots (cell width ≈ 48px at 375px/7).
    - **Today-hero:** accent-filled date circle on today's cell, consistent with Week's today treatment.
    - **Drill-down:** inline expansion below the grid row containing the selected day. Full CRUD via `TaskListItem`, `DoneAccordion`, empty state with rotating warm copy. Tap to select, tap again to deselect, Escape to close.
    - **Month navigation:** prev/next arrows, "This month" reset. "This month" button gets an accent dot indicator when viewing a different month.
    - **Filter:** `FilterToggle` (Mine/Theirs/All) applies to grid density counts and drill-down simultaneously.
    - **Task creation:** FAB (mobile) / "Add for [date]" button (desktop) with ⌘↵. Pre-fills selected day or today.
    - **Layout stat:** `monthCount` computed in shared layout, sidebar shows "{N} this mo" when tasks exist.
    - **Design decisions:** fixed cell height (map metaphor), no month-to-month animation (crisp swap), inline drill-down over side panel.
16. ✅ Week + Month impeccable pass (2026-04-16)
    - **Critique + audit** across Week and Month. Both views scored **36+/40 critique, 19/20 audit** after fixes. Clean `npx impeccable --json` automated scan.
    - **Motion fix (P1):** Month drill-down was animating `height: auto` directly — violates "don't animate layout properties." Switched to `grid-template-rows: 0fr → 1fr` with `overflow-hidden` inner wrapper. Same visual, no layout-thrash.
    - **Consistency fixes (P1–P2):** Week secondary "When you can" section + Today secondary section both missing `shadow-sm` (primary had it). Month empty cells switched from `bg-canvas` → `bg-surface-dim` with borders (fixes visible seam between date cells and padding cells). Month drill-down empty state shrunk from `py-8 h-16 w-16` → `py-6 h-12 w-12` since it's inline, not full-screen. Week "This week" button gained off-current accent-dot indicator matching Month's pattern.
    - **Loading skeletons:** Zero loading state across all three views before this. New `<TaskListSkeleton count={3} />` component renders pulsing placeholder rows on `isLoading` — wired into Today, Week, Month. Subtitle text also shows "Loading…" during fetch.
    - **Month grid keyboard nav:** Arrow-key navigation (←→↑↓) + Home/End + proper roving tabindex. Default focusable cell is today (in current month) or the 1st (otherwise). `role="rowgroup"` on each row wrapper fixes the grid→row ARIA parent-child chain.
    - **Extract (duplication cleanup):**
      - `taskListVariants(shouldReduceMotion)` → [src/lib/motion.ts](src/lib/motion.ts). Was duplicated verbatim across Today/Week/Month.
      - `emptyDayCopy(iso)` → [src/lib/task-adapters.ts](src/lib/task-adapters.ts). Merged Week's 4 lines + Month's 4 lines into 8 shared rotating lines, one hash function.
      - `<TaskListSkeleton />` → new component at [src/components/task-list-skeleton/](src/components/task-list-skeleton/task-list-skeleton.tsx) with co-located `.md`. Replaces duplicated inline skeleton markup.
    - **Test status:** Unit tests 56/56 passing. `month-view.spec.ts` all green. 138 Playwright failures remain in `today-view.spec.ts` + `task-sheet.spec.ts` — same pre-existing demo-state specs flagged in Phase 11 (asserting hardcoded demo points like "245"/"312" that don't exist in the real backend). No regressions introduced.
17. ✅ Partner invite spine (2026-04-16, Tasks 1–24 across three sessions)
    - **Routes:** `/invite` (Organizer compose/waiting toggler), `/invite/[token]` (public branded landing — 3 states: valid / invalid-or-cancelled / already-accepted), `/invite/[token]/accept` (authenticated redemption → `redirect("/today?welcomed=1")`).
    - **API:** `POST /api/invites` (create, Zod-validated email, one-active-per-household 409, optional Resend send), `GET /api/invites` (current active invite or null, polled every 5s), `DELETE /api/invites/[token]` (cancel — directory name says `[token]` to satisfy Next.js's sibling-dynamic-slug constraint with `[token]/accept/`, but the caller actually passes the invite UUID; see the route handler's comment), `POST /api/invites/[token]/accept` (redeem, maps 5-kind discriminated union to HTTP status), `POST /api/dev/reset-invite-state` (dev-only, gated on `NODE_ENV !== "production"` + `x-dev-reset-secret`).
    - **Core logic (TDD):** `acceptInvite()` orchestrator returning a 5-kind discriminated union (`ok | invalid_token | self_invite | household_full | acceptor_in_two_person_household`), `mergeSoloHousehold()` (remaps Uncategorized, migrates categories + tasks + task_events + user, soft-deletes abandoned household), `swapSentinelAssignees()` (flips sentinel assignee UUIDs to the real partner ID on accept), `generateInviteToken()` (128-bit base64url). 16 Vitest integration tests against the dev DB.
    - **Email:** `renderInviteEmail({ organizerName, inviteUrl })` returns `{ subject, text, html }` with HTML-escaped organizer name. `sendEmail` is a thin Resend wrapper with a **dev-mode fallback** — when `RESEND_API_KEY` or `EMAIL_FROM` is missing it logs `[email:dev-fallback] would send:` instead of throwing, which is what makes the e2e flow work without a live API key.
    - **UI:** `InviteCompose` (email input + copy-link fallback, self-email blocked client-side), `InviteWaiting` (read-only URL + Copy button + "Cancel and start over"), `InviteLanding` (branded public page). Mutations via `useCurrentInvite` / `useCreateInvite` / `useCancelInvite` (TanStack Query, invalidate `["invite"]` on settle).
    - **Link chrome:** banner CTA, mobile-header UserPlus icon, and sidebar collapsed-peek icon all route via `next/link` `<Link>` so the shared `(views)` layout survives navigation. Sidebar's **expanded-state** `motion.a` remains a raw anchor pending a motion-wrapped-Link pass — flagged in open-questions.
    - **Testing:** Playwright two-context fixture — `tests/invite.setup.ts` signs a second Clerk test user in and saves `tests/.auth/partner.json`; `tests/invite-flow.spec.ts` launches organizer + partner browser contexts and exercises send→land→accept→merged-household and the cancel-and-start-over path. `test.describe.configure({ mode: "serial" })` prevents races on the shared organizer household given global `fullyParallel: true`. The spec wraps browsers in `try/finally` so `browser.close()` runs on assertion failure.
    - **NOT in this phase (deferred to follow-up plans):** First-run reveal copy on `/today?welcomed=1`, notifications UI generation beyond the `partner_joined` row that already inserts, Done-accordion completer attribution, shared-points display, filter "Theirs" warm empty state, gentle re-engage prompt after interval.
18. Keep updating docs after every major change

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
- **AppShell is a shared layout, not a per-page wrapper.** Task views live under `src/app/(views)/` and inherit the chrome from `(views)/layout.tsx`. Pages return fragments. Sidebar stays mounted across navigation. Re-litigating this means re-introducing the sidebar-flash problem.
- **Internal links use `next/link` `<Link>`, not `<a href>`.** Plain anchors trigger full page reloads and blow away the shared layout.

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
