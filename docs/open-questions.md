# Open Questions

Things we did not resolve during the foundation interview that need answers *before* or *during* the build. Each item has a rough sense of when it needs to be decided. Update this doc as questions get answered; move resolved items into the relevant foundation or spec doc.

## Blocking before build

These need answers before the first line of application code is written.

**1. What's the real name of the app?**
"ToDoApp" is a placeholder. A dedicated naming brainstorm session is planned. Needed before: public-facing anything (domain, landing page, app store). Not blocking the data model, the component system, or the internal docs.

**Rename checklist (run this when the name is decided):**
- [ ] Purchase domain via Cloudflare
- [ ] Find-and-replace "ToDoApp" across the entire repo (folder names, docs, code, package.json, README, CLAUDE.md)
- [ ] Rename the GitHub repo (if created by then)
- [ ] Update the Vercel project name
- [ ] Update the Neon project name
- [ ] Update the Clerk application name and any user-facing auth UI copy
- [ ] Update Resend sender domain and email templates
- [ ] Update Stripe product/account name
- [ ] Update Cloudflare DNS records to point the new domain at Vercel
- [ ] Update any environment variables that reference the old name or domain
- [ ] Update `og:title`, `og:url`, meta tags, and any SEO-facing strings
- [ ] Update voice-and-tone.md if the name itself has personality implications (e.g., if the name is playful, it may inform how the app refers to itself)
- [ ] Grep the codebase one more time for any straggling "ToDoApp" or "todoapp" references
- [ ] Verify the app builds, deploys, and all tests pass after the rename

**2. ~~Tech stack decisions inside the default stack.~~** ✅ Resolved 2026-04-10. See [tech-stack.md](tech-stack.md). Auth: Clerk. ORM: Drizzle. Testing: Vitest + React Testing Library + Playwright. Household scoping via Clerk Organizations + Neon. Full rationale in the doc.

**~~3. How is a "household" represented in the data model?~~** ✅ Resolved 2026-04-11. Own `households` table in Neon, Clerk Organizations as auth/invite layer only. Every sign-up creates a household. Accepting an invite merges the partner into the inviter's household (migrating any solo tasks); the abandoned household is soft-deleted. Household has an editable `name` field, auto-generated as "Partner1 & Partner2" when the second partner joins. Full details in [specs/tasks.md](../specs/tasks.md) and [specs/multiplayer.md](../specs/multiplayer.md).

**~~4. Partner onboarding flow — the two-sided problem.~~** ✅ Resolved 2026-04-11. Two distinct flows. **Organizer:** sign up → auto-create household → empty Today with "get what's in your head out of there" dump moment → rapid-fire task creation → invite prompt after a few tasks (one-time nudge + persistent quiet affordance) → send invite via email or copy-link. Can assign tasks to "Partner" (sentinel UUID) before partner joins. **Willing Partner:** branded invite landing page → sign up → land directly in Today view with the reveal moment (adaptive copy based on whether tasks are pre-assigned) → one soft suggested action ("Want to grab one?"), dismissible, fires once. No tutorial, no feature tour. Full details in [specs/multiplayer.md](../specs/multiplayer.md).

## Blocking during build

These can be deferred until the relevant feature is being built, but must be resolved then.

**~~5. What does "snappy" mean in concrete numbers?~~** ✅ Resolved 2026-04-11. Optimistic UI everywhere — creation and completion feel instant (animation begins within one frame, ~16ms). Server confirm < 300ms. Cross-partner sync via polling every 5 seconds. View switching instant (client-side re-filter, no network round-trip). Points increment is part of the optimistic completion update. Full targets in [specs/tasks.md](../specs/tasks.md).

**~~6. Notification philosophy.~~** ✅ Resolved 2026-04-11. Quiet by default, in-app only for v1. Three events generate notifications: (1) partner assigned a task to you, (2) partner completed a task you assigned to them (the recognition moment), (3) partner joined the household. Everything else visible on next open/poll — no notification. Shared task completion: no notification in v1. Presentation: lightweight badge/dot, simple notification list, read/unread. No per-event settings in v1; settings arrive post-v1 with push/SMS/email. Full details in [specs/multiplayer.md](../specs/multiplayer.md).

**~~7. Repeat-rule edge cases.~~** ✅ Resolved 2026-04-11. Supported in v1: daily (every N days), weekly (every N weeks on one or more specific days — multi-day supported as single rule), monthly (every N months on a specific date, with clamping for short months). Yearly noted for post-v1. Tasks support date-only or date+time; timezone stored on user profile. Repeat rules generate next occurrence in user's local time (preserves wall-clock time across DST). Spawn-next model: each occurrence is its own task row, with rolling 60-day pre-generation window. Full details in [specs/tasks.md](../specs/tasks.md).

**~~8. Concurrent-edit behavior.~~** ✅ Resolved 2026-04-11. Per-field last-write-wins. Both partners editing different fields of the same task: both saves succeed. Both editing the same field: last save to the server wins. Next poll (every 5 seconds) shows both partners the current state. No locking, no conflict dialogs. Full details in [specs/tasks.md](../specs/tasks.md).

**~~9. Category system.~~** ✅ Resolved 2026-04-11. Categories are household-level, shared by both partners. Pre-seeded with 2–3 sensible defaults (exact defaults TBD) including an "Uncategorized" catch-all. Users can add, rename, reorder, and delete categories. One category per task (single `category_id` FK). Per-user categories noted for post-v1. Full details in [specs/tasks.md](../specs/tasks.md).

**~~10. "Assigned to both partners" — does it exist?~~** ✅ Resolved 2026-04-11. Yes, but it's called **"Shared."** Three assignee options: Me, Partner, or Shared. Shared = `assignee_user_id` is null, meaning either partner can complete it. Shared tasks appear in every filter state (Mine, Theirs, All). The completing partner earns the points. Full details in [specs/tasks.md](../specs/tasks.md).

## Long-horizon questions

These don't block v1 but the *existence* of the question shapes how v1 is built. Each of these has been flagged because the architecture needs to not preclude an answer.

**~~11. The breakup question.~~** ✅ Resolved 2026-04-11. Clean split with data export. Both partners can export full household data before unlink. Tasks assigned to you go with you; tasks assigned to your ex-partner stay with them; shared tasks stay with the original household. A new household is created for the departing partner. Points reset for both. No UI in v1 — unlink is a support action. Post-v1 gets a settings flow with appropriate gravity (no jokes). Architectural implication: tasks must be movable between households via `household_id` FK. Full details in [specs/multiplayer.md](../specs/multiplayer.md).

**~~12. What about the "list person" whose partner refuses to join?~~** ✅ Resolved 2026-04-11. The app works for one, visibly misses its other half — but is NOT a waiting room. Full core loop works solo (create, complete, edit, delete, repeat, postpone, roll over, all views, categories, points). Filter toggle present with "Theirs" empty + warm message. Persistent quiet invite affordance. Recognition moments don't fire in solo mode. One gentle re-engage prompt after a reasonable interval, then quiet — no escalation. Post-v1: explicit solo mode toggle in settings to remove partner references entirely. Full details in [specs/multiplayer.md](../specs/multiplayer.md).

**13. Billing model.**
Free? Freemium? Per-household subscription? Stripe is in the stack; the decision of *what* to charge for is deferred. Probably a post-v1 question, but v1 architecture should not make any of those impossible.

**14. The iOS question.**
v1 is web. A native iOS app is on the long-term roadmap but only if the web version validates with real users. The question is whether the web version is built as a PWA that can be installed on iOS homescreens (leaning yes) and whether any v1 API decisions would make a future native client painful (they shouldn't).

**15. What does "recognition" actually look like in product, concretely?**
The foundation docs make "recognition" load-bearing. We have a few examples (partner completes a task you assigned, Today view summarizing the day's contributions, the two-minute-dump moment during onboarding). But the full design space of "moments of recognition" has not been explored. Worth a dedicated brainstorm session post-foundation and pre-build.

**16. Tone calibration over time.**
The voice is playful. How playful before it gets annoying on day 60? Users habituate to jokes. The app needs a plan for tone that doesn't rely on any single joke landing twice. Possibly: a rotating copy library for common surfaces so "the empty Today view" is never the same line two days in a row. Needs design attention before v1 ships but doesn't block the data model. **Partially addressed 2026-04-11:** the views spec calls for 3–4 rotating copy variants per empty state, cycled so the same line doesn't repeat two days in a row. Full copy written during UX copy phase.

## Parking lot

Ideas that came up during interviews that are explicitly *not* being decided now, but shouldn't be lost.

- Habit stacks (mentioned in "not in v1")
- Weekly email digests
- Calendar two-way sync
- Integration with smart home / IoT triggers
- Shared grocery lists as a special task type
- Birthday and anniversary reminders pre-loaded for the couple
- "Surprise mode" where one partner can hide tasks from the other as part of planning a gift or event
- Smart task creation / NLP parsing ("Take out trash daily Krista" → auto-set repeat, assignee, category)
- Smart point suggestions based on task history
- Task templates (type "trash" → pre-filled task with points, category, repeat)
- Points ledger with per-user earning/spending history
- "Take a task" gesture — grab a task off your partner's plate with a recognition moment
- Per-user categories (in addition to household-level)
- Yearly repeat rule

## Process notes (not questions, just sequencing)

- **When to run the `design:design-system` skill:** *After* the tech stack is provisioned and CLI access verified, and *before* the first real component is built. Its output populates `src/styles/tokens.css`, the first theme file (`src/styles/themes/cozy.css`), and the initial base components with sibling `.md` docs. It does *not* go into `docs/`; the foundation docs stay strategic. The rules governing all of this live in `design-system/README.md`, which already exists as the contract.
- **When to run `design:ux-copy`:** per-surface, as copy is written. Not a one-time pass.
- **When to run `design:accessibility-review`:** before merging any new component or flow, and again before v1 ships as a full-audit pass.
