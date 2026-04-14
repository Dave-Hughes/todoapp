# Session Handoff — Persistence + Auth

**Session date:** 2026-04-14
**Branch merged from:** `worktree-persistence-auth`
**Plan:** [docs/superpowers/plans/2026-04-14-persistence-and-auth.md](superpowers/plans/2026-04-14-persistence-and-auth.md)

## What shipped

The app is no longer a UI prototype. Clerk authenticates every request, every query is household-scoped, and tasks live in Neon.

### Database (Drizzle + Neon)
- 8 tables: `households`, `users`, `categories`, `seeded_tasks`, `tasks`, `task_events`, `invites`, `notifications`
- 4 enums: `swipe_mode`, `invite_status`, `notification_type`, `task_event_type`
- Partial index `tasks_household_active_idx` on `(household_id)` where `deleted_at IS NULL` (hot-path query)
- `$onUpdate(() => new Date())` on all `updated_at` columns
- Self-FK on `tasks.parent_task_id` (`onDelete: "set null"`) for repeat-rule occurrences
- `assignee_user_id` intentionally has no FK — rationale (sentinel `SHARED_ASSIGNEE_SENTINEL`) documented in `src/db/schema.ts`

### Auth (Clerk)
- `src/proxy.ts` — Next 16 middleware replacement protecting all non-public routes
- `src/app/sign-in/[[...sign-in]]/page.tsx` + `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/lib/auth-context.ts` — `getAuthedContext()` lazily upserts user + household on first authed request. Race-safe via `onConflictDoNothing({ target: users.clerkUserId })` + re-fetch. Display name falls back through Clerk's `firstName` → `firstName lastName` → email prefix.

### API surface (all household-scoped)
- `GET /api/me` — current user + household
- `GET /api/categories`
- `GET /api/tasks`, `POST /api/tasks`
- `PATCH /api/tasks/[id]`, `DELETE /api/tasks/[id]`
- `POST /api/tasks/[id]/complete`, `POST /api/tasks/[id]/uncomplete`

All routes use:
- `src/lib/api/validators.ts` — Zod v4 with `discriminatedUnion` repeat rules
- `src/lib/api/responses.ts` — `json()`, `error()`, `handleRouteError()` (maps `AuthError` → 401, `ZodError` → 400)

### Client layer (TanStack Query v5)
- `src/lib/hooks/use-me.ts`, `use-categories.ts`, `use-tasks.ts` (+ create/update/delete/complete/uncomplete mutations)
- Optimistic updates: onMutate snapshot → onError rollback → onSettled invalidate
- Global `staleTime: 5000`, `refetchInterval: 5000` (5-second polling) — `src/lib/query-client-provider.tsx`

### Seeded data
- 98 curated household tasks (`src/db/seed/seeded-tasks.ts`) scored on 5/15/30 point scale
- 5 default categories (`src/db/seed/default-categories.ts`): Uncategorized (default), Home, Errands, Bills, Health
- Idempotent seed runner: `npm run db:seed`

### Today view rewrite
`src/app/page.tsx` is now fully wired to the API. Preserved from the prototype: filter toggle, completion copy variants, undo toasts, ⌘↵ shortcut, swipe hint, reduced-motion. **Dropped:** Roll Over button, repeating-task delete dialog (to return post-invite flow).

## What was NOT done this session

### Task 13 skipped — existing e2e tests are broken
The pre-existing specs (`tests/task-sheet.spec.ts`, `tests/today-view.spec.ts`) were written against DEMO_TASKS / hardcoded "Dave" and "Krista" names. They will fail against the real backend until adapted. The Playwright **auth setup** (`tests/auth.setup.ts`) passes in ~7.8s — that infrastructure is ready; the specs themselves need rewriting.

**When you pick this up:**
1. Run `npx playwright test` in the worktree, collect failures
2. Replace hardcoded "Dave"/"Krista" with display names queried from the rendered header
3. Replace "expect 8 tasks initially" assumptions with tests that create tasks via UI on a clean DB (`resetE2EData()` already runs in setup)
4. Relax any `setTimeout(50)` timing assumptions

### Things deliberately deferred
- **Partner invite UI** — `invites` table exists, flow is not built
- **Week / Month views** — only Today
- **Onboarding** (two-minute dump, first-task nudge, invite prompt)
- **Real-time sync** — polling only in v1
- **Notifications UI** — table exists, surface is not built
- **SMS / email / digests** — not in v1

## Playwright test user

- User ID: `user_3CMdtjBrCUUocsVWVHIbM3CRyL0`
- Email: `dave+clerk_test@example.com` (Clerk's magic `+clerk_test@` pattern, accepts verification code `424242`)
- Password in `.env.test` (git-ignored)
- Sign-in flow handles `needs_second_factor` via `prepareSecondFactor` + `attemptSecondFactor` — Clerk's dev instance requires email verification on every sign-in even with MFA toggled off

## How to try it end-to-end yourself

1. `npm run dev`
2. Navigate to `http://localhost:3000` — you'll be redirected to Clerk sign-in
3. Sign up with any email (real verification email; use `+clerk_test@` for code `424242`)
4. First authed request creates your user row + household row automatically
5. Land on Today — if database is seeded, you'll see an empty Today view (seeded_tasks are a template library, not assigned); create tasks via the `+` FAB
6. Complete / uncomplete / edit / delete tasks — every mutation round-trips the API within 300ms, UI is optimistic
7. Open in a second browser with a different Clerk user to verify household scoping (each sign-up gets its own household)

## Key files by concern

| Concern | File |
|---|---|
| Schema | `src/db/schema.ts` |
| DB client | `src/db/index.ts` |
| Auth context | `src/lib/auth-context.ts` |
| Middleware | `src/proxy.ts` |
| Query layer | `src/lib/db/queries/{users,households,categories,tasks,task-events}.ts` |
| Validators | `src/lib/api/validators.ts` |
| API responses | `src/lib/api/responses.ts` |
| Client hooks | `src/lib/hooks/` |
| Query client | `src/lib/query-client-provider.tsx` |
| Constants (sentinel, poll) | `src/lib/constants.ts` |
| Today view | `src/app/page.tsx` |
| Seed | `src/db/seed/` |
| E2E auth | `tests/auth.setup.ts` |
| E2E fixtures | `tests/fixtures/{test-user,reset-db}.ts` |
