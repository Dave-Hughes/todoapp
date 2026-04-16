# Session handoff — Invite spine, end of Phase 1

> **Date:** 2026-04-16
> **Session model:** Claude Opus 4.6 (1M context), subagent-driven-development pattern

## TL;DR for the next session

Tasks 1–7 of the [partner invite spine plan](superpowers/plans/2026-04-16-partner-invite-spine.md) are done — all **pure logic** tested and committed on branch `feat/invite-spine` in a worktree at `.claude/worktrees/invite-spine/`. **16 new unit tests, all green.** Tasks 8–24 (email, API routes, UI, Playwright e2e, docs) remain. The plan file on disk is the spec; pick up at Task 8 and execute with `superpowers:subagent-driven-development`.

## Where we are

### Branch and worktree
- **Branch:** `feat/invite-spine`, branched from `main@25eaf2c` (post Phase-13–16 catch-up commits)
- **Worktree path:** `/Users/davehughes/Documents/Claude/Projects/ToDoApp/.claude/worktrees/invite-spine`
- **Working tree:** clean
- **Main:** got 2 catch-up commits this session (`8250a1c` features, `25eaf2c` docs) that captured previously-uncommitted Phase 13–16 work. See "How main changed" below.

### Commits on the branch (7, all on top of `25eaf2c`)
```
9f89982 feat(invites): acceptInvite orchestrator with validation + merge + rename + notify
6ffb845 feat(invites): merge solo household into organizer's on accept
04e0d0a feat(invites): swap sentinel assignee UUIDs to real partner id on accept
1759fa8 feat(invites): add createNotification writer
eed0108 feat(invites): add invite CRUD queries (create, find, cancel, accept)
5d1f0cd feat(invites): add url-safe invite token generator
5d0de69 chore(invites): add resend dependency and env scaffolding
```

### Test status
- **Vitest:** 16 new tests, 5 files, all green (`npx vitest run src/lib/invites/ src/lib/db/queries/invites.test.ts`)
- **Playwright:** not yet touched — existing suites still pass
- **Lint:** not run this session, worth checking when resuming

## What was built

### `src/lib/invites/` (new module, 4 files + tests)
- `token.ts` — `generateInviteToken()`, URL-safe 128-bit base64url via `node:crypto.randomBytes(16)`
- `swap-sentinel.ts` — `swapSentinelAssignees(householdId, partnerUserId)` flips sentinel UUID rows to the real partner ID
- `merge.ts` — `mergeSoloHousehold({ fromHouseholdId, intoHouseholdId, movingUserId })` — the intricate one. Handles Uncategorized remap, category migration, task migration, task_events, user move, soft-delete of abandoned household
- `accept.ts` — `acceptInvite({ token, acceptingUserId })` orchestrator. Returns `AcceptResult` discriminated union with 5 kinds: `ok`, `invalid_token`, `self_invite`, `household_full`, `acceptor_in_two_person_household`

### `src/lib/db/queries/` additions
- `invites.ts` — 5 CRUD helpers: `createInvite`, `findActiveInviteForHousehold`, `findInviteByToken`, `cancelInvite`, `markInviteAccepted`
- `notifications.ts` — `createNotification({ householdId, recipientUserId, actorUserId, type, taskId? })`

### Env scaffolding
- `.env.local` — appended `RESEND_API_KEY=`, `EMAIL_FROM=`, `DEV_RESET_SECRET=local-dev-secret-change-me`
- `.env.test` — created with `DEV_RESET_SECRET=test-only-secret` + 3 empty `E2E_PARTNER_CLERK_USER_*` placeholders
- Both gitignored per `.gitignore` `.env*` rule

### Dependencies
- `resend@^6.12.0` added to runtime `dependencies`

## What's left — pick up at Task 8

The plan file at [docs/superpowers/plans/2026-04-16-partner-invite-spine.md](superpowers/plans/2026-04-16-partner-invite-spine.md) has the full text of every remaining task. Each has exact file paths, full code, and commands. Tasks 8–24:

| # | Task | File(s) touched | Est. difficulty |
|---|---|---|---|
| 8 | Email renderer (TDD) | `src/lib/email/invite-email.ts` + test | Trivial — pure string formatting |
| 9 | Resend wrapper | `src/lib/email/send.ts` | Trivial — thin SDK wrapper with dev-mode log fallback |
| 10 | POST/GET `/api/invites` | `src/app/api/invites/route.ts` | Medium — calls `createInvite` + `renderInviteEmail` + `sendEmail` |
| 11 | DELETE `/api/invites/[id]` | `src/app/api/invites/[id]/route.ts` | Small — scope check + cancel |
| 12 | POST `/api/invites/[token]/accept` | `src/app/api/invites/[token]/accept/route.ts` | Small — wrapper around `acceptInvite` |
| 13 | Dev reset endpoint | `src/app/api/dev/reset-invite-state/route.ts` | Small — gated POST |
| 14 | Update middleware | `src/proxy.ts` | Trivial — add `/invite/(.*)` to public matcher |
| 15 | Invite hooks | `src/lib/hooks/use-invite.ts` | Small — 3 TanStack Query hooks |
| 16 | `InviteCompose` component | `src/components/invite-compose/` | Medium — form w/ Clerk email lookup |
| 17 | `InviteWaiting` component | `src/components/invite-waiting/` | Small — copy-link + cancel |
| 18 | `/invite` page | `src/app/invite/page.tsx` | Small — state toggler |
| 19 | `/invite/[token]` landing | `src/components/invite-landing/` + `src/app/invite/[token]/page.tsx` | Medium — server component + 3 states |
| 20 | `/invite/[token]/accept` | `src/app/invite/[token]/accept/page.tsx` | Small — server-side redemption + redirect |
| 21 | Partner Playwright auth setup | `tests/invite.setup.ts` + fixtures + `playwright.config.ts` | Medium — requires creating a second Clerk test user |
| 22 | Two-context e2e | `tests/invite-flow.spec.ts` | Medium — two `browser.newContext` setup |
| 23 | Route invite affordances at `/invite` | `src/components/mobile-header/`, `src/components/sidebar/` | Trivial — already at `/invite`, just verify |
| 24 | Update CLAUDE.md + open-questions | docs | Trivial |

## Reviewer follow-ups worth picking up

These were flagged by code-reviewer subagents during Phase 1 and deferred because they're v1-acceptable or YAGNI-blocked. If you have spare cycles after the spine ships, consider:

1. **Concurrent-accept race** (Task 7, `src/lib/invites/accept.ts`). Two parallel `acceptInvite(token, …)` calls can both pass the `pending` gate because there's no transaction/lock. In practice near-impossible (human clicks + TanStack Query de-dup), but fixable with either (a) `db.transaction()` + `SELECT … FOR UPDATE` if the neon-http driver supports it, or (b) making `markInviteAccepted` conditional (`WHERE status='pending'`) and using its returned row count as the claim. (b) requires reordering the accept steps and is more invasive.

2. **Double `if (organizer)` guard** (Task 7). Lines 91 and 99 of `accept.ts` both check `if (organizer)`. If the FK RESTRICT is ever relaxed, an invite with a missing `invitedByUserId` would silently skip both the rename and the notification — worse failure than throwing. Consider collapsing to one block and throwing an invariant-violation error instead of skipping silently.

3. **Test title nit** (Task 7). `src/lib/invites/accept.test.ts`'s third `it("returns already_in_household when accepting user is already in the target household", …)` asserts `kind === "self_invite"`. Rename the title to match the actual assertion: `"returns self_invite when accepting user is already in the target household"`.

4. **Sentinel-swap path untested through orchestrator** (Task 7). `swapSentinelAssignees` is tested in isolation (Task 5) but `acceptInvite`'s invocation of it isn't. Add a 6th assertion to the happy-path test: seed a task with `assigneeUserId = SHARED_ASSIGNEE_SENTINEL` on the organizer's household, accept, assert it's now the acceptor's ID.

5. **Merge edge case: organizer lacks Uncategorized** (Task 6). Currently if the organizer somehow lacks an "Uncategorized" category, partner's Uncategorized tasks end up with `categoryId = null` (because `ON DELETE SET NULL`). Unreachable in v1 — every household is seeded with Uncategorized — but if UI ever allows deleting/renaming it, this becomes a silent data-loss bug. Tighten the guard in `merge.ts:85-87` to `if (partnerUncat[0] && intoUncat)` so partner's Uncategorized only gets deleted when the organizer has one to remap to.

6. **Module-level doc on `src/lib/db/queries/invites.ts`** (Task 3). Unlike `tasks.ts`, the invites query module has no top-of-file comment explaining why it's not household-scoped (finders take tokens or IDs; the caller is responsible for ownership + status gates). Add a short JSDoc block matching `tasks.ts`'s pattern.

None of these block progress. Flag them in open-questions.md or keep in this doc.

## How main changed this session

When the session started, main's committed tip (`f1fc89d`) predated ~13 weeks of uncommitted Phase 13–16 work sitting in the working tree — invite banner, `(views)` shared-layout refactor, week/month views, wiki, polish pass. The first `EnterWorktree` branched off `origin/main` (stale) and the code-reviewer caught that the resulting worktree was missing all project dependencies. To unblock:

- **Committed `8250a1c` (features)** — 70 files, +9194 / −971 — Phases 13–16 implementation code and tests as one catch-up commit
- **Committed `25eaf2c` (docs)** — CLAUDE.md + design-system/README.md + `docs/superpowers/briefs/month-view-design-brief.md` + the invite plan + `.gitignore` addition for `.claire/`
- `.obsidian/workspace.json` was reverted (`git restore`) — personal Obsidian state shouldn't be in commits
- `tech-stack-visual.html` left untracked per user's call

These commits are on `main` (not pushed). The branch `feat/invite-spine` is rooted at `25eaf2c`. When you merge the invite spine back, main should be in a good state for the merge.

## How to resume (fresh session)

1. `cd /Users/davehughes/Documents/Claude/Projects/ToDoApp/.claude/worktrees/invite-spine`
2. Confirm clean tree: `git status` (expect "nothing to commit"), `git log --oneline main..HEAD` (expect 7 commits)
3. Re-run the test suite: `npx vitest run src/lib/invites/ src/lib/db/queries/invites.test.ts` (expect 16/16)
4. Confirm `.env.local` is still populated (it's untracked, so it survived the worktree but verify `grep RESEND_API_KEY .env.local` returns the line)
5. Ask Claude to execute starting from Task 8 of `docs/superpowers/plans/2026-04-16-partner-invite-spine.md` using `superpowers:subagent-driven-development`
6. The first Task 8 dispatch only needs this handoff doc + the plan's Task 8 text as context

## Context tips for the next session

- **Prefer cheaper models for trivial tasks** (haiku for one-file one-function additions). Sonnet for API routes. The code-reviewer subagent already does most heavy lifting at its default model.
- **Consider controller-level review for 1-file no-logic tasks** (Task 4 pattern) to conserve subagent dispatches. Still run full subagent review on the substantive ones (merge, acceptInvite-equivalents).
- **The dev reset endpoint (Task 13) is a prereq for the Playwright fixtures (Task 21–22)**. Don't reorder.
- **Task 21 needs a second Clerk test user created in the Clerk dashboard** before the e2e will work. If you don't have one yet, create a `partner+clerk_test@example.com` user with a strong password, then fill `.env.test`'s three empty `E2E_PARTNER_CLERK_USER_*` values.
- **Task 19 (branded landing) and Task 20 (accept redirect)**: if you hit issues with how Clerk passes the `redirect_url`, check `src/app/sign-up/[[...sign-up]]/page.tsx` and the `ClerkProvider` config in `src/app/layout.tsx`. The `signUpForceRedirectUrl` pattern in the plan should work, but Clerk's default redirect env vars (`NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`) may conflict.

## Reference

- Plan: [docs/superpowers/plans/2026-04-16-partner-invite-spine.md](superpowers/plans/2026-04-16-partner-invite-spine.md)
- Spec: [specs/multiplayer.md](../specs/multiplayer.md)
- Prior handoffs: [docs/session-handoff-persistence-auth.md](session-handoff-persistence-auth.md), [docs/session-handoff-design-system.md](session-handoff-design-system.md)
