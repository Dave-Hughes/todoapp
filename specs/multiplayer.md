# Spec: Multiplayer

> **Status:** Complete. Interviewed and specced 2026-04-11.

## Summary

Two accounts, one shared household. Symmetric capabilities for both partners. The entire point of the product. This spec covers the invite flow, both first-run experiences, the single-user state, notifications, household membership, recognition moments, the breakup/unlink model, and all multiplayer edge cases.

## In scope (v1)

- Two user accounts linked to one household entity
- Both partners see the full shared task list
- Either partner can create, edit, complete, delete, reassign any task
- Clear visual attribution: who created it, who's assigned to it, who completed it
- Invite flow: email (primary) or shareable link (fallback), one active invite at a time
- Organizer first-run: sign up → dump tasks → invite partner
- Willing Partner first-run: click invite → sign up → see the shared list → one soft suggested action
- Single-user state that works for one and visibly misses its other half
- In-app notifications for three high-signal events
- Recognition moments: Done accordion attribution, subtle points visibility
- Partner placeholder assignment (assign to future partner before they join)
- Household merge when invited partner already has a solo household

## Out of scope (v1)

- SMS nudging (deferred)
- Push notifications beyond in-app (deferred to PWA/iOS phase)
- Real-time presence ("Krista is viewing this")
- Real-time sync animations ("Krista just completed this")
- Rich activity feed
- Per-task permissions
- Editorial summarization ("You two knocked out 7 things today") — deferred, hard to get tone right
- Solo mode toggle in settings (post-v1)
- Self-service unlink UI (post-v1; support action in v1)
- Self-service account deletion (post-v1; support action in v1)

## Data model

### User (app-side, synced from Clerk)

```
User
  id                    uuid, primary key (matches Clerk user ID)
  household_id          uuid, nullable, FK → Household
  display_name          text
  timezone              text (e.g., 'America/New_York')
  theme                 text, default 'cozy' (per-user, not per-household)
  swipe_mode            enum: 'direct', 'reveal', default 'direct'
  created_at            timestamptz
  updated_at            timestamptz
```

`household_id` is nullable because a user exists briefly before household assignment during sign-up, and because a future unlink nulls it out.

### Household (additions to tasks spec)

```
Household (additions to existing schema in specs/tasks.md)
  ...existing fields (id, name, created_at)...
  deleted_at            timestamptz, nullable (soft-delete for abandoned households)
```

### Invite

```
Invite
  id                    uuid, primary key
  household_id          uuid, FK → Household
  invited_by_user_id    uuid, FK → User
  email                 text, nullable (null if link-only invite)
  token                 text, unique (the shareable link token — always generated)
  status                enum: 'pending', 'accepted', 'cancelled'
  accepted_by_user_id   uuid, nullable, FK → User
  accepted_at           timestamptz, nullable
  created_at            timestamptz
```

Notes:
- `token` is always generated regardless of whether the Organizer used email or copy-link, so either path resolves the same invite.
- No `expires_at` — invites don't expire. They stay valid until accepted or cancelled.
- Status lifecycle: `pending` on creation → `accepted` when partner joins, or `cancelled` if the Organizer generates a new invite (which invalidates the old one).
- One active invite per household at a time. To create a new one, the Organizer must cancel the current one. Cancelling flags the old token as invalid immediately.

### Notification

```
Notification
  id                    uuid, primary key
  household_id          uuid, FK → Household
  recipient_user_id     uuid, FK → User
  type                  enum: 'task_assigned', 'task_completed_by_partner',
                              'partner_joined'
  actor_user_id         uuid, FK → User (who triggered it)
  task_id               uuid, nullable, FK → Task
  read_at               timestamptz, nullable
  created_at            timestamptz
```

Lean table. Three event types only. `read_at` null means unread. Not a full activity feed — just high-signal moments.

### Partner placeholder (sentinel UUID)

Before the partner joins, the Organizer can assign tasks to "Partner." These are stored with `assignee_user_id` set to a well-known sentinel UUID constant (e.g., `00000000-0000-0000-0000-000000000000`). When the partner accepts the invite, a single migration query swaps all sentinel values in the household to the partner's real user ID.

## Invite flow

### Mechanics

**Two paths, one invite:**
- **Email (primary):** Organizer enters partner's email. Branded invite sent via Resend. The invite landing page knows who invited them.
- **Copy link (secondary):** Organizer copies a shareable link to send via text, iMessage, WhatsApp, etc. Same token, same invite. Presented as a secondary action alongside the email field.

Both paths produce the same invite record with the same token. The link works regardless of which path generated it.

**One active invite at a time.** If the Organizer wants to generate a new invite, they must first cancel the current one. Cancelling immediately invalidates the old token — if someone clicks an old link, they get a clear "this invite is no longer valid" message. The email can't be recalled, but the backend rejects the token.

**Re-send:** The Organizer can re-send the email or re-copy the link for the same active invite at any time.

**No expiration.** Invites stay valid until accepted or cancelled.

### Invite email/link content

The invite landing page is branded (not generic Clerk sign-up). It knows who invited the partner:

> "[Organizer name] invited you. This is where you two run the house."

Warm, brief. No feature list, no marketing. Just enough to orient and a clear CTA to sign up or sign in.

## Organizer first-run

The Organizer sought this app out. They're motivated. The goal is to get them from sign-up to a populated shared list as fast as possible.

### Flow

**1. Sign up.** Clerk handles auth. Minimal friction.

**2. Household creation (automatic).** No setup wizard, no "name your household" step. Behind the scenes: household created, seeded categories added, Organizer is the sole member. Household name stays as just the Organizer's name until the partner joins, then auto-updates to "Partner1 & Partner2."

**3. The dump moment.** Empty Today view. The empty state *is* the onboarding:

> "Welcome. Let's get what's in your head out of there."

Strong CTA to add the first task. Task creation surface immediately available. The goal is rapid-fire adding — type, enter, type, enter. No tutorial, no feature tour. The product teaches itself through use.

**4. Invite prompt.** After the Organizer has added a few tasks (exact trigger TBD — could be task count, time-based, or both), a gentle but visible prompt appears:

> "Ready to bring your person in?"

This is not a blocker — dismissible, fires once. Plus a persistent quiet affordance in the UI ("Bring your person in" button in nav/sidebar area) that stays until the partner joins. The nudge fires once; the affordance stays.

**5. Send the invite.** Email field (primary) + copy link (secondary). Invite sent. Clear "waiting on [partner]" state:

> "Waiting on [Partner]. You'll know when they're in."

### Assignment during solo phase

Three assignee options are available even before the partner joins: **Me, Partner, Shared.** "Partner" uses the sentinel UUID. This lets the Organizer capture intent ("this is Krista's thing") during the dump, which is how they naturally think about tasks. When the partner accepts, sentinel values are swapped to the real user ID.

## Willing Partner first-run

The most important flow in the product. The partner didn't seek this out. They got a link from someone they love. Zero pressure, warm, the "oh" moment.

### Flow

**1. Click the invite link.** Branded landing page. Knows who invited them:

> "[Organizer name] invited you. This is where you two run the house."

**2. Sign up.** Clerk auth. Minimal friction. As soon as authenticated, they're in.

**3. The reveal.** Land directly in the Today view. The Organizer's tasks are right there. The framing copy adapts:

- If nothing assigned to the partner:
  > "You're in. This is everything [Organizer] has been carrying around."
  > *"Nothing's assigned to you yet. Take a look around."*

- If the Organizer pre-assigned tasks to the partner:
  > "You're in. This is everything [Organizer] has been carrying around."
  > *"[Organizer] already put a few things on your plate."*

**4. One soft suggested action.** A single non-blocking CTA:

> "Want to grab one?"

Dismissible, fires once. Gives them a toehold without a tutorial. If they dismiss it, it's gone. No feature tour, no multi-step onboarding.

### Behind the scenes on partner accept

1. Partner's user record gets `household_id` set to the Organizer's household.
2. If the partner had a solo household with tasks: tasks migrate into the Organizer's household (`household_id` updated). Custom categories merge in as additional categories. Partner's "Uncategorized" tasks map to the Organizer's "Uncategorized." TaskEvents migrate with tasks. Abandoned household soft-deleted.
3. Sentinel UUID values for `assignee_user_id` in the household are swapped to the partner's real user ID.
4. Household `name` auto-updates to "Partner1 & Partner2" (editable).
5. Organizer receives a `partner_joined` notification: "Krista's in. You two are in business."
6. Invite status set to `accepted`.

## Single-user state

Before the partner joins, the app works for one and visibly misses its other half.

### What works normally

The full core loop. Create, complete, edit, delete, repeat, postpone, roll over. All three views. Categories. Points. The Organizer gets real value from the app on day one, alone.

### What acknowledges the missing half

- **Filter toggle** is present. "Theirs" is available but empty — tapping it shows a warm message (not an error). Subtle reminder the app is designed for two.
- **Invite affordance** stays visible — a persistent, quiet element in the nav/sidebar area. Shows pending invite status if one is outstanding.
- **Recognition moments don't fire** in solo mode. No "Dave got it. Trash is out." when you're the only one. Those activate when the partner joins.
- **Household name** stays as just the Organizer's name until the partner joins.

### The partner who never accepts

The app keeps working. No degradation, no time limit. The "missing other half" signals are warm, not nagging. After the initial invite prompt, the app doesn't pester. One gentle re-engage after a reasonable interval:

> "Krista hasn't joined yet. Want to send the invite again?"

Then quiet. No escalation.

**Post-v1:** Explicit solo mode toggle in user settings that removes partner references and affordances entirely for users who want a permanent single-player experience.

## Notification philosophy

**Quiet by default.** In-app only for v1.

### Events that generate a notification

| Event | Recipient | Example copy |
|---|---|---|
| Partner assigned a task to you | The assignee | "Krista put 'Pick up dry cleaning' on your plate." |
| Partner completed a task you assigned to them | The assigner | "Dave got it. Trash is out." |
| Partner joined the household | The Organizer | "Krista's in. You two are in business." |

### Events that do NOT generate a notification

Everything else — partner creates, edits, postpones, deletes tasks, or completes their own/shared tasks. These changes are visible on the next open or poll (every 5 seconds). No notification.

**Shared task completion:** No notification in v1. The completion is visible in the Done accordion and the points update. If this feels like a gap in practice, it's easy to add later.

### Presentation

Lightweight notification indicator — badge or dot. Tapping shows a simple list of recent notifications. Read/unread state (`read_at` null = unread). Auto-clear when seen. Not a full activity feed.

### Settings

No per-event notification settings in v1. The set is small and curated. Post-v1, when push/SMS/email arrive, per-event toggles become necessary.

## Recognition moments (v1)

### Done accordion attribution

Tasks in the Done accordion show who completed them. Simple, passive attribution — "Dave" or "Krista" next to the completed task. Always there, no special trigger. Low-cost recognition that makes contribution visible.

### Points visibility

Both partners' point balances are visible to both partners — in a profile or settings area, not front-and-center on the Today view. Framed collaboratively, not competitively:

> "Between you two: Dave 245 · Krista 312"

Not a leaderboard. A shared scoreboard.

### What's deferred

Editorial summarization ("You two knocked out 7 things today," "Krista handled 4 things while you were out") is deferred to post-v1. High-value but hard to get the tone right when numbers are lopsided. Needs dedicated design attention.

## Household membership

### Max two members

Enforced on the backend. If a household already has two members, invite creation is blocked. The invite affordance disappears from the UI once the partner joins.

### Third-person attempt

If someone somehow tries to join a full household, the backend rejects it cleanly. No effect on the existing household.

### Both-signed-up merge

If the invited partner already has a solo household:
- Their tasks migrate into the inviter's household. `created_by_user_id` stays as the partner.
- Custom categories merge in as additional categories. Same-name categories both exist (the couple cleans up manually). Partner's "Uncategorized" tasks map to the inviter's "Uncategorized" — no duplicate catch-all.
- TaskEvents migrate with the tasks.
- Abandoned household soft-deleted (`deleted_at` set).
- No dedup of tasks. If both partners created "Take out trash," both tasks coexist.

### Already in a two-person household

If the accepting user is already a member of a different two-person household, the invite acceptance fails with a clear message:

> "You're already in a household with [other person]. You'd need to leave that one first."

This is not a v1 flow (unlink is a support action), but the backend rejects it cleanly.

## The breakup / unlink model

No UI in v1. The data model supports it. Unlink is a support/manual operation in v1; post-v1 gets a settings flow with appropriate gravity (per voice doc: treat it as a significant event, no jokes).

### Conceptual model: clean split with data export

1. **Both partners can export full household data** before the unlink finalizes (tasks, history, points).
2. **Tasks assigned to you go with you.** Tasks assigned to your ex-partner stay with them. Shared tasks stay with the original household.
3. **A new household is created for the departing partner.** They're not left account-less.
4. **Points reset for both partners.** Points are derived from task completion, and the task set has split. Clean slate.
5. **The original household stays with the remaining partner** (or the original creator).

### Architectural implication for v1

Tasks must be movable between households. The data model supports this: `household_id` is a FK on the Task, not embedded in the task's identity. No household-scoped UUIDs or anything that would make a task un-movable.

## Edge cases

### Invite to an email that already has an account

- **Solo household:** Merge flow (see "Both-signed-up merge" above).
- **Two-person household:** Accept fails with a clear message. Backend rejects cleanly.
- **No household (fresh account):** Normal accept flow.

### Invite to yourself

Caught client-side. Organizer's own email is blocked with a warm message ("That's you!"). Simple validation.

### Partner signs up on a different device

The invite token is in the URL. For v1, the link is the path — if they need to switch devices, they open the same link on the other device (text it to themselves, etc.). The token is stable and doesn't expire. Cross-device QR code or short code is a post-v1 consideration.

### Two devices, same partner

Polling (every 5 seconds) keeps both devices in sync. No special handling. Clerk handles multi-session auth.

### Both partners on two devices simultaneously

The normal case. Polling handles sync. Per-field last-write-wins handles concurrent edits (see specs/tasks.md).

### Organizer deletes their account while partner is linked

Support action in v1. Handled via the unlink flow — partner gets their own household with their tasks.

### Invite cancelled after partner clicked link but before sign-up

The invite token is checked on sign-up completion (not on landing page load). If cancelled between landing page view and sign-up submission, the partner sees a clear "this invite is no longer valid" message after signing up. They still have an account; they just need a new invite.

## Acceptance criteria

- Both partners can perform every task-related action (create, complete, edit, delete, reassign, postpone)
- Partner changes propagate within 5 seconds (polling interval)
- Invite can be sent via email, copied as link, re-sent, and cancelled
- Cancelled invite tokens are immediately invalid
- One active invite at a time enforced
- Organizer first-run: sign up → empty Today with dump CTA → rapid task creation → invite prompt after a few tasks
- Willing Partner first-run: branded landing page → sign up → reveal moment with adaptive copy → one soft CTA
- Partner placeholder assignment works: tasks assigned to sentinel UUID before partner joins, swapped to real ID on accept
- Household merge: partner's solo tasks, categories, and TaskEvents migrate correctly on accept
- Household name auto-updates to "Partner1 & Partner2" on partner join
- Single-user state: full core loop works, filter toggle present with empty "Theirs," invite affordance visible
- Recognition moments don't fire in solo mode
- Notifications generated for: task assigned to you, partner completed your assigned task, partner joined
- Notifications NOT generated for other actions
- Notification badge/list works correctly: unread indicator, read on view
- Done accordion shows who completed each task
- Points visible for both partners in profile/settings area
- Max two members per household enforced on backend
- Third-person join attempt rejected cleanly
- Self-invite blocked client-side
- Already-in-a-household accept rejected with clear message
- Backend supports task migration between households (for future unlink)

## Test coverage

Happy paths *and* edge cases:

- Organizer sign-up creates household and seeded categories automatically
- Organizer can create tasks in solo mode with full functionality
- Invite sent via email: invite record created, email dispatched via Resend
- Invite copied as link: same invite record, token in URL works
- Re-send invite: same token, new email sent
- Cancel invite: old token immediately invalid, new invite can be created
- Attempt to create second active invite without cancelling first: blocked
- Partner clicks invite link: branded landing page shows Organizer's name
- Partner signs up and accepts: joins household, sees Organizer's tasks
- Partner accepts with existing solo household: tasks migrate, categories merge, abandoned household soft-deleted
- Partner accepts with same-name category as Organizer: both categories exist post-merge
- Partner's "Uncategorized" tasks map to Organizer's "Uncategorized" — no duplicate catch-all
- Sentinel UUID tasks swapped to real partner user ID on accept
- Household name updates to "Partner1 & Partner2" on partner join
- Organizer receives `partner_joined` notification
- Tasks assigned to partner before join appear on partner's plate after join
- Filter toggle "Theirs" in solo mode shows warm empty message
- Recognition copy doesn't fire in solo mode
- Notification generated when partner assigns task to you
- Notification generated when partner completes task you assigned
- No notification for partner creating/editing/completing their own or shared tasks
- Notification badge shows unread count; clears on view
- Done accordion shows completer attribution ("Dave — Take out trash")
- Both partners' points visible in profile area
- Max two members: invite creation blocked when household is full
- Third-person join attempt: rejected cleanly, no effect on household
- Self-invite: blocked client-side with friendly message
- Partner already in two-person household: accept fails with clear message
- Cancelled invite clicked after cancellation: clear "no longer valid" message
- Partner clicks invite on device A, signs up on device B with same link: works
- Both partners logged in simultaneously: polling keeps both in sync
- Both partners edit different fields of same task: both saves succeed (per-field LWW)
- Both partners edit same field: last write wins, next poll shows current state
- Organizer's gentle re-engage prompt after partner hasn't accepted for a reasonable interval
- Invite with no email (link-only): works correctly
- Multiple invite cancel/re-create cycles: only latest token is valid
