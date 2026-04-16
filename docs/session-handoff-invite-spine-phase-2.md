# Session handoff — Invite spine, end of Phase 2

> **Date:** 2026-04-16
> **Session model:** Claude Opus 4.6 (1M context), subagent-driven-development pattern
> **Prior handoff:** [session-handoff-invite-spine-phase-1.md](session-handoff-invite-spine-phase-1.md)

## TL;DR for the next session

Tasks 8–20 of the [partner invite spine plan](superpowers/plans/2026-04-16-partner-invite-spine.md) are done. The full organizer→partner pipeline is implemented: email renderer, Resend wrapper, 5 API routes, public-route middleware, 3 TanStack Query hooks, 3 UI components, 3 pages. Branch `feat/invite-spine` now has **22 commits** (14 from Phase 1 + 8 new). Unit tests **74/74 green** (no new unit tests were required by Phase 2 beyond Task 8's 2 email-renderer tests). `next build` passes, typecheck clean. Tasks 21–24 (Playwright partner auth setup, two-context e2e, invite-banner/mobile-header/sidebar `<Link>` migration, CLAUDE.md + open-questions update) remain for the next session.

## Where we are

### Branch and worktree
- **Branch:** `feat/invite-spine`
- **Worktree path:** `/Users/davehughes/Documents/Claude/Projects/ToDoApp/.claude/worktrees/invite-spine`
- **Working tree:** clean
- **Relative to main:** 22 commits ahead

### Commits added this session (8)
```
768ce96 chore(invites): escape apostrophes in Tasks 16 + 18 to satisfy lint
c796463 feat(invites): /invite/[token]/accept page — redeem token for signed-in user
be87b68 feat(invites): branded /invite/[token] landing (valid/invalid/used)
03a2ef7 feat(invites): /invite page — compose/waiting state toggler
a47b7ba feat(invites): InviteWaiting component (copy link + cancel)
bd51fda feat(invites): InviteCompose component (email + copy-link)
b6c0447 feat(invites): useCurrentInvite/useCreateInvite/useCancelInvite hooks
3563265 feat(invites): allow /invite/[token] landing as public route
fc207bf feat(invites): dev-only reset endpoint for repeatable invite testing
1f7fe5a feat(invites): POST /api/invites/[token]/accept — redeem token
aae71f2 feat(invites): DELETE /api/invites/[id] — cancel pending invite
ec77abb feat(invites): POST/GET /api/invites — create + read current invite
3b03edc feat(invites): resend wrapper with dev-mode no-op fallback
234c169 feat(invites): render invite email (subject, text, html)
```

(14 commits listed because the fixup was amended into Task 16+18's apostrophe escapes as a single chore commit.)

### Test / build status
- **Vitest:** 74/74 passing (2 new in `src/lib/email/invite-email.test.ts`, rest pre-existing)
- **Typecheck:** clean (`npx tsc --noEmit` exits 0)
- **Build:** `npx next build` succeeds — all 5 invite API routes + 3 invite pages registered
- **Lint:** 4 residual errors remain, **none introduced by Phase 2's in-scope work**:
  - `src/components/invite-banner/invite-banner.tsx:87`, `src/components/mobile-header/mobile-header.tsx:50`, `src/components/sidebar/sidebar.tsx:473` — three `<a href="/invite/">` tags that Next.js's `@next/next/no-html-link-for-pages` rule flags now that `/invite` is a registered route. **This is Task 23's scope** — the Phase-1 plan already names this as the migration work.
  - `src/components/week-day-strip/week-day-strip.test.tsx:8` — pre-existing `no-explicit-any` from Phase 5.
- **Playwright:** not run this session (Tasks 21–22 are out of scope).

## What was built — by file

### `src/lib/email/` (new)
- `invite-email.ts` — `renderInviteEmail({ organizerName, inviteUrl })` returns `{ subject, text, html }`. HTML-escapes the organizer name. No React Email dep — one email doesn't justify it.
- `invite-email.test.ts` — 2 tests (happy path + XSS-escape).
- `send.ts` — thin Resend wrapper with dev-mode fallback: when `RESEND_API_KEY` or `EMAIL_FROM` is missing, logs `[email:dev-fallback] would send:` instead of throwing. Enables full Organizer flow without a live API key.

### `src/app/api/invites/` (new)
- `route.ts` — `POST` creates invite (Zod-validated email, enforces one-active-per-household 409, optionally sends email) and `GET` returns current active invite or `null`. Both gated via `getAuthedContext()`.
- `[id]/route.ts` — `DELETE` scopes to caller's household, refuses non-pending invites with 409, otherwise `cancelInvite(id)`.
- `[token]/accept/route.ts` — `POST` wraps `acceptInvite()`, maps the 5-kind discriminated union to HTTP status codes: `ok`→200, `invalid_token`→410, `self_invite|household_full|acceptor_in_two_person_household`→409.

### `src/app/api/dev/reset-invite-state/route.ts` (new)
Dev-only POST endpoint. Gated on `NODE_ENV !== "production"` AND `x-dev-reset-secret` header matching `process.env.DEV_RESET_SECRET`. Cancels all invites for the caller's household, detaches any second member, restores the household name to the caller's display name. Prereq for Task 21's Playwright fixtures.

### `src/proxy.ts` (modified)
Added `"/invite/(.*)"` to the Clerk public-route matcher. Note: `/invite` itself (no trailing segment) remains authenticated — that's the Organizer's own compose page. Only `/invite/<anything>` is public.

### `src/lib/hooks/use-invite.ts` (new)
- `useCurrentInvite()` — polls `GET /api/invites` every `POLL_INTERVAL_MS` (5s).
- `useCreateInvite()` — mutation accepting `string | null`. Invalidates `["invite"]` on settle.
- `useCancelInvite()` — mutation accepting invite ID. Invalidates `["invite"]` on settle.

### `src/components/invite-compose/` (new)
- `invite-compose.tsx` + `invite-compose.md`. Organizer form: email input + "Copy link instead" fallback. Self-email blocked client-side against `useUser().primaryEmailAddress`. Error states via `role="alert"`. Invokes `onSent?.()` callback so parent can swap to waiting.

### `src/components/invite-waiting/` (new)
- `invite-waiting.tsx` + `invite-waiting.md`. Shows the invite URL in a read-only input with a Copy button (toggles "Copied" for 1.8s), plus "Cancel and start over". Resend is intentionally not surfaced in v1 per the plan; user cancels + recreates.

### `src/components/invite-landing/` (new)
- `invite-landing.tsx` + `invite-landing.md`. Branded public landing. Presentational only — parent server component owns token resolution and the 3 states. Two CTAs: `/sign-up?redirect_url=/invite/<token>/accept` and `/sign-in?...`.

### `src/app/invite/` (new)
- `page.tsx` — client component, Organizer compose/waiting toggler based on `useCurrentInvite()`.
- `[token]/page.tsx` — public server component. Resolves token via `findInviteByToken`. 3 states: invalid/cancelled → friendly message; already accepted → friendly message; valid → `<InviteLanding organizerName token />`.
- `[token]/accept/page.tsx` — authenticated server component. If not signed in, redirects to `/sign-in?redirect_url=/invite/<token>/accept`. Signed in → `getAuthedContext()` (lazy-creates a solo household for brand-new partners) → `acceptInvite()` → on `ok`, redirects to `/today?welcomed=1`; otherwise renders a context-appropriate error message.

## What's left — Tasks 21–24

> **Update (2026-04-16, end of Phase 3 session):** All four tasks are done. Branch now 28 commits ahead of main. Baseline: `vitest` 74/74, `next build` clean, `lint` has 1 pre-existing error (`week-day-strip.test.tsx` `no-explicit-any`, unchanged from Phase 5), `invite-flow` e2e 4/4 green. Follow-ups from this section are now tracked in `docs/open-questions.md` items #18–#25.
>
> **Phase 3 session notes worth preserving:**
> 1. **Clerk password initially wrong.** The partner user's password in the Clerk dashboard was `Cmozart00123!` (trailing `!` missing from the value I originally typed). Fixed in `.env.test` and the smoke test passed on the retry.
> 2. **Sibling dynamic-route slug conflict surfaced during Task 22 smoke test.** `src/app/api/invites/[id]/route.ts` + `[token]/accept/route.ts` both existed as siblings under `/api/invites/` — Next.js/Turbopack rejected this in dev (`'id' !== 'token'`), even though `next build` alone didn't flag it in Phase 2. Task 22's commit renamed `[id]` → `[token]` with `{ token: id } = await params` destructure; the callsite `useCancelInvite` passes the UUID unchanged. This ate two commits (the test commit + a follow-up to document the alias). Lesson captured in open-questions #25.
> 3. **DEV_RESET_SECRET sync.** `.env.test` was set to `test-only-secret` in Phase 1 but `.env.local` has `local-dev-secret-change-me`. Playwright's `webServer` spawns the dev server in the runner's env, so the runner's `.env.test` override propagates — but `reuseExistingServer: true` means an already-running dev server (started from `.env.local`) won't pick up the override. Synced `.env.test` to the `.env.local` value during Task 22 to eliminate the 401 hazard on `resetInviteState`.
> 4. **Opus code-quality review on Task 22 caught three issues.** Unused `E2E_USER` import (lint warning), browser lifecycle without `try/finally` (zombie chromium on test failure), and the `{ token: id }` alias needing a comment. All three fixed in commit `66b2b40`.
> 5. **PARTNER_STORAGE still a warning in `playwright.config.ts`.** Task 21's spec declared the constant but nothing uses it (the `invite-flow` project creates contexts per-test via `browser.newContext({ storageState: "tests/.auth/partner.json" })`, so the module-level constant is dead). Cosmetic, `no-unused-vars` warning only, not blocking. Fixable as a one-line cleanup in any future pass.
>
> Tasks 21–24 as originally specified below are retained for historical reference.

### Task 21: Partner Playwright auth setup
- Requires creating a **second Clerk test user** in the Clerk dashboard first. Create `partner+clerk_test@example.com` with a strong password, copy the user ID/email/password into `.env.test`'s three empty `E2E_PARTNER_CLERK_USER_*` placeholders.
- Creates `tests/fixtures/partner-user.ts`, `tests/fixtures/reset-invite.ts`, `tests/invite.setup.ts`, modifies `playwright.config.ts` to add the partner storageState project.
- Uses the dev-reset endpoint (Task 13) to make the flow idempotent across runs.

### Task 22: Two-context invite flow e2e
- Creates `tests/invite-flow.spec.ts`. Uses two `browser.newContext()`: organizer + partner, each with their own storageState.
- Stubs Resend by inspecting the dev-fallback log OR by mocking the `sendEmail` module at the test layer.
- Asserts: organizer hits `/invite`, sends invite, sees waiting state; partner opens URL in incognito context, signs up via Clerk, redirected to `/today?welcomed=1`; organizer refresh shows 2 avatars and the `InviteBanner` dismissed.

### Task 23: `<a href>` → `<Link>` migration for invite affordances
- **This is also where the 3 residual lint errors come from.** Three files have `<a href="/invite">` that must become `<Link href="/invite">`:
  - `src/components/invite-banner/invite-banner.tsx:87`
  - `src/components/mobile-header/mobile-header.tsx:50`
  - `src/components/sidebar/sidebar.tsx:473`
- Not a shell/chrome change — just the tag swap + removing any `href` quirks. After this, lint drops to 1 pre-existing error (week-day-strip any).

### Task 24: CLAUDE.md + open-questions update
- Append a new row to CLAUDE.md's build progress table: "Phase 17: Partner invite spine (Tasks 1–24)."
- Prune/resolve any relevant items from `docs/open-questions.md`.

## Reviewer follow-ups worth tracking

These surfaced during Phase 2's code-quality reviews. **None block Phase 2's completion**, but they're real product concerns.

1. **Concurrent-POST race on `/api/invites` creates orphan active invites.** `src/app/api/invites/route.ts` check-then-insert isn't atomic. Two simultaneous POSTs from the same household can each pass the 409 check and both insert `pending` rows. Blast radius is tiny (human double-tap window), same class of race as the acceptInvite concurrent-accept race flagged in Phase 1. Fix: a partial unique index `CREATE UNIQUE INDEX ON invites(household_id) WHERE status = 'pending'` + catch the unique-violation in the route. Pair this with Phase 1's concurrent-accept fix as one migration.

2. **`sendEmail` failure after DB commit is surfaced as 500.** `src/app/api/invites/route.ts` inserts the invite row first, then calls `sendEmail`. If Resend rejects (unverified domain, bad address, transient network), the row is already persisted. User sees "internal_error"; next attempt hits `active_invite_exists` (409) — confusing UX. Two options: (a) swallow the send error and return `201 { invite }` so the UI shows the copy-link affordance (email was always optional — the link works regardless); (b) return a distinguishable `invite_created_email_failed` code with the invite payload. Either matches the product framing that email is a nice-to-have, not critical path. Recommend (a) — simplest, and the UI already has a copy-link fallback.

3. **Clerk `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` / `..._SIGN_UP_FORCE_REDIRECT_URL` can silently override `redirect_url`.** If either env var is set in Vercel (common for apps that want users landing on a dashboard), partners never reach `/invite/<token>/accept` after sign-up — they're sent to the force-redirect URL instead. Not a code bug, a deploy-config risk. Action: before first QA, `vercel env ls | grep CLERK_.*FORCE_REDIRECT` and confirm neither is set. If they are, either (a) unset them and move the default-landing logic into route code, or (b) accept the invite via a different mechanism (e.g. rely on the `redirect_url` param in the sign-up URL only, but document that the force-redirect env must be absent).

4. **Invite tokens appear in Vercel access logs.** The token is a path segment, so any request-logging captures it. Treat tokens like bearer credentials for any future observability work; consider rotating to a short-lived HMAC if deeper logging is added.

5. **No rate-limiting on `/api/invites/<token>/accept`.** Brute-forcing valid tokens is theoretically possible. `generateInviteToken()` produces 128 bits of entropy so the practical risk is negligible for v1, but worth a `TODO` for v1.1.

6. **Residual Phase-1 follow-ups** (from prior handoff, still unaddressed): concurrent-accept race, double `if (organizer)` guard in `accept.ts`, test title nit, sentinel-swap path untested through orchestrator, merge edge case on missing Uncategorized, missing module-level doc on `invites.ts` queries. Nothing new; flag in `docs/open-questions.md` alongside #1–#5 above.

## How to resume (fresh session)

1. `cd /Users/davehughes/Documents/Claude/Projects/ToDoApp/.claude/worktrees/invite-spine`
2. Verify clean tree: `git status` (expect "nothing to commit"), `git log --oneline main..HEAD` (expect 22 commits).
3. Re-run unit tests: `npx vitest run` (expect 74/74).
4. Re-run typecheck: `npx tsc --noEmit` (expect clean).
5. Quick build smoke: `npx next build` (expect success, all invite routes listed).
6. **Before starting Task 21:** in the Clerk dashboard, create a second test user (`partner+clerk_test@example.com`) and paste credentials into `.env.test`'s empty `E2E_PARTNER_CLERK_USER_*` values.
7. Ask Claude to execute starting from Task 21 of `docs/superpowers/plans/2026-04-16-partner-invite-spine.md` using `superpowers:subagent-driven-development`.

## Context tips for the next session

- **Tasks 21 + 22 are the remaining substantive work.** Use a full Sonnet subagent dispatch for each. Opus code-quality review worth it on Task 22 (two-context test choreography is easy to get subtly wrong).
- **Task 23 is a 3-line-per-file migration.** Controller-level edit, no subagent needed. Just swap `<a>` to `<Link>` in the 3 files, verify lint drops to 1 pre-existing error.
- **Task 24 is docs.** Append a row to the CLAUDE.md build-progress table, decide what (if anything) to prune from open-questions. Fifteen minutes.
- **If you hit the lint `<a>` errors and want to fix them early (before Task 23),** that's fine — they're effectively a prerequisite for clean merge. Just keep the change atomic (one commit, `src/components/*` only, no scope creep).
- **`next build` was verified clean this session.** If you introduce changes that break build, revert before writing more code — don't accumulate build debt.
- **Dev smoke test not run this session.** The full end-to-end organizer→partner flow was never exercised against a live dev server in this session; unit tests + typecheck + build are all we have. The first manual smoke (or the Task 22 Playwright test) will be the first time the complete flow runs.
- **`package.json`/`package-lock.json` mishap resolved.** During the lint-fix commit, `npm run lint` somehow pruned `resend` from `package.json` + `package-lock.json` (Phase 1 dep). Detected immediately, amended the commit to restore both files. Keep an eye on this if you see a similar signature — `git show <sha> -- package.json` before assuming a commit is scoped to what its message says.

## Reference

- Plan: [docs/superpowers/plans/2026-04-16-partner-invite-spine.md](superpowers/plans/2026-04-16-partner-invite-spine.md)
- Spec: [specs/multiplayer.md](../specs/multiplayer.md)
- Phase-1 handoff: [docs/session-handoff-invite-spine-phase-1.md](session-handoff-invite-spine-phase-1.md)
