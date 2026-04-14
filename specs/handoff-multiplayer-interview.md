# Handoff Prompt — Multiplayer Spec Interview

> Copy everything below this line and paste it as your first message in a new session.

---

Read `CLAUDE.md` first, then these docs in order: `docs/vision.md`, `docs/scope-v1.md`, `docs/principles.md`, `docs/voice-and-tone.md`, `docs/open-questions.md`. Then read the three specs: `specs/tasks.md`, `specs/views.md`, `specs/multiplayer.md`. Confirm you're oriented before we begin.

## Context

We're in the middle of a product interview session to fill out the three feature specs for the ToDoApp project (a couples to-do app). The **tasks spec** and **views spec** are now complete — read them carefully as they contain all the decisions made so far. The **multiplayer spec** is still a stub and needs to be fleshed out through an interview.

## What's already been decided (you'll see the details in the completed specs and open-questions.md)

These are resolved and should not be re-litigated:

- **Household data model (OQ #3):** Own `households` table in Neon, Clerk Organizations as auth/invite layer. Every sign-up creates a household. Accepting an invite merges partner into inviter's household (migrating solo tasks). Abandoned household soft-deleted. Household has editable `name` (auto-generated as "Partner1 & Partner2").
- **Latency targets (OQ #5):** Optimistic UI everywhere. Creation/completion instant. Server confirm < 300ms. Cross-partner polling every 5s. View switching instant (client-side).
- **Repeat rules (OQ #7):** Daily, weekly (multi-day), monthly (clamping), custom N-interval. Spawn-next model. Rolling 60-day window. Yearly deferred.
- **Concurrent edits (OQ #8):** Per-field last-write-wins. No locking.
- **Categories (OQ #9):** Household-level, 2-3 pre-seeded defaults + "Uncategorized" catch-all, user-editable, one per task.
- **Assignee model (OQ #10):** Three options — Me, Partner, Shared (null assignee). Shared tasks appear in all filter states. Completer earns points.
- **Points:** Per-user, not per-household. Visible and editable in v1. Pre-filled from seeded task database (~100 common tasks with relative point values). Points invariant: you only hold points for completed, non-deleted tasks.
- **Themes:** Per-user, not per-household.
- **Due dates:** Required on every task (context-aware default). Flexible flag for "when you can" tasks. Date-only or date+time. Timezone on user profile.
- **Swipe gestures:** Right to complete, left to postpone. Direct swipe default, reveal swipe in settings.
- **Postpone:** Per-task quick action (Tomorrow, Next Week, Next Month, Pick a Date).
- **Roll Over:** Bulk action pushing all incomplete today-tasks to tomorrow. Repeating tasks absorbed if next occurrence exists.
- **Views:** Three views, consistent model (nav on top, task list on bottom). Today = hero. Week = horizontal day strip + daily task list. Month = calendar grid + daily task list. Filter: Mine/Theirs/All.
- **TaskEvent table:** Logs all task events (created, completed, reassigned, postponed, etc.) — not surfaced in v1 UI but powers post-v1 features.
- **Dave's preference:** tackle complexity upfront rather than deferring.

## What still needs to be specced — the multiplayer interview

The multiplayer stub (`specs/multiplayer.md`) needs to be filled out to the same level of detail as the tasks and views specs. The interview should cover:

### Open questions to resolve during the interview
- **OQ #4:** Partner onboarding flow (the two-sided problem) — this is the most important UX flow in the product
- **OQ #6:** Notification philosophy — how and when does the app nudge each partner?
- **OQ #12:** What about the partner who never accepts? Graceful single-user state.

### Topics to cover
1. **Invite flow mechanics:** Email, shareable link, or both? Invite expiration? Re-send? What the invite email/link looks like and says.
2. **Organizer first-run:** The full flow from sign-up through first tasks to sending the invite. The "get what's in your head out of there" moment.
3. **Willing Partner first-run:** The full flow from clicking the invite link through seeing the shared list. Zero-pressure, warm. The "oh, I didn't realize all this was on your plate" moment. This is the single most important flow.
4. **Single-user state:** What does the app look and feel like before the partner joins? "Works for one, visibly misses its other half."
5. **Household membership:** Max 2 members. What happens if someone tries to add a third? What if both partners created separate households before linking?
6. **Notification philosophy:** In-app only for v1, but the spec should define: what events trigger notifications? How are they presented? Default loud or quiet?
7. **Data model details:** Invite table, membership tracking, any additional fields on household or user.
8. **The breakup/unlink question (OQ #11):** Not UI in v1, but the data model must support it. How does account splitting work conceptually?
9. **Recognition moments in multiplayer:** "Dave got it. Trash is out." Where and how do these show up in v1?
10. **Edge cases:** Invite to an email that already has an account. Invite to yourself. Partner signs up on a different device. Session handling for two devices.

## How to run the interview

Interview me one question at a time. Lay out options and trade-offs where decisions are needed. After we've covered all the topics above, write the completed `specs/multiplayer.md` to the same standard as the tasks and views specs (status, summary, in/out of scope, data model, interaction flows, edge cases, acceptance criteria, test coverage). Also update `docs/open-questions.md` with the resolved decisions (#4, #6, #11, #12).

Don't jump ahead to design or code — just the spec.
