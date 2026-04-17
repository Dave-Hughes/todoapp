# Invite UX follow-ups — Design

> **Status:** Design approved 2026-04-16. Ready for implementation planning.
> **Scope:** Six multiplayer-polish items surfaced in Phase 17 (see CLAUDE.md and `docs/open-questions.md`). Closes the gap between the shipped invite spine and the "Willing Partner first-run" spec in [specs/multiplayer.md](../../../specs/multiplayer.md).

## Summary

Six interlocking pieces that turn the invite spine into a working couples experience:

1. First-run reveal on `/today?welcomed=1` for the invited partner
2. Notifications UI (bell + popover/sheet) for the three v1 notification types
3. Done-accordion completer attribution ("— Krista")
4. Shared points display (mostly verification — wiring already exists)
5. Warm "Theirs" empty state for solo mode
6. Gentle re-engage prompt (7 days after invite sent, once per invite)

Plus the server-side work to generate notifications in the three trigger paths.

## Data model — no schema changes

Every field we need already exists (verified 2026-04-16):

| Need | Existing field / path |
|---|---|
| Who completed a task | `tasks.completedByUserId` — populated in `POST /api/tasks/[id]/complete` |
| Per-user points split | `getUserPointsTotals()` in `src/lib/db/queries/users.ts`; `/api/me` returns `{ user, partner }` |
| Notification storage | `notifications` table + `notification_type` enum |
| Task event history | `task_events` table |
| Pending invite for re-engage | `invites.status = 'pending'`, `invites.createdAt` |

No migrations required for this spec.

## Part A — Notification generation (server-side)

Three triggers. Each fires only when the household has two users (solo-mode guard). Each is written inside the existing mutation route as a side-effect after the primary write succeeds.

| Event | Route | Condition | Recipient | Copy source |
|---|---|---|---|---|
| `task_assigned` | `POST /api/tasks` + `PATCH /api/tasks/[id]` | `assigneeUserId` is a real user ID (not self, not sentinel) and differs from `actorUserId` | `assigneeUserId` | "[Actor] put '[Task title]' on your plate." |
| `task_completed_by_partner` | `POST /api/tasks/[id]/complete` | `completedByUserId !== task.createdByUserId` AND `createdByUserId` is a real user (not just "solo me from before they joined") | `task.createdByUserId` | "[Completer] got it. [Task title]." |
| `partner_joined` | `POST /api/invites/[token]/accept` | always (one-time event) | Organizer | "[Partner] is in. You two are in business." |

**Notification row structure:** `{ householdId, recipientUserId, type, actorUserId, taskId?, createdAt }`. Unread = `readAt IS NULL`.

**Solo guard:** helper `householdIsPaired(householdId): boolean` that short-circuits the insert when user count < 2. Reuses existing user-household query.

**Reassignment edge case:** if a task is reassigned from A → B, generate `task_assigned` for B only. No notification for A losing the task (per spec).

## Part B — Notifications UI

### Placement

- **Mobile:** bell icon in `MobileHeader`, left of the avatar. Badge (unread count, capped at "9+") overlays the bell.
- **Desktop/tablet:** bell icon in the sidebar utility row. Collapsed rail: icon + badge dot. Expanded: icon + "Notifications" label + small count pill.
- **Solo mode:** the bell is hidden. No partner = no notifications fire, no need for the surface.

### Interaction

Tap the bell →
- **Mobile:** opens a `BottomSheet` with the notification list.
- **Desktop:** opens a `Popover` anchored to the bell.

Opening the list marks all currently-unread as read via `POST /api/notifications/read-all` (fire-and-forget, optimistic UI).

### List item

```
●  [Copy sentence with bold task title]
   2m ago
```

- Unread: visible dot on the left + subtle background tint.
- Read: no dot, default background.
- Time: relative ("just now", "2m ago", "1h ago", "yesterday", `MMM d`).
- Tapping a row with a `taskId` navigates to the relevant view and highlights the task briefly. The reveal-CTA and the notification list share a small helper `scrollToTaskAndHighlight(taskId)` (new, lives in `src/lib/ui/scroll-to-task.ts`) — 2-second accent-border flash, then fade. Introduced as part of this spec.
- `partner_joined` rows have no `taskId` and are non-interactive (just informational).

### Data hook

New `useNotifications()` TanStack hook:

- Key: `["notifications"]`
- Fetches from new `GET /api/notifications` (returns last 30, desc by `createdAt`)
- Polls every 5s (`POLL_INTERVAL_MS` from `src/lib/constants.ts`)
- Invalidated on mutation settle for any task mutation (same pattern as `["me"]`)

### New API routes

| Route | Purpose |
|---|---|
| `GET /api/notifications` | last 30 for the current user, desc |
| `POST /api/notifications/read-all` | set `readAt = now()` for all unread rows where `recipientUserId = me` |
| `PATCH /api/notifications/[id]/read` | set `readAt = now()` for a single row (future-proof; not wired in v1 UI) |

## Part C — Done-accordion completer attribution

### Component changes

- **`TaskListItem`** gains an optional `completedByLabel?: string` prop. In `variant="done"`, renders a subtle tertiary label (`— Krista`) under or beside the task title, using `text-text-tertiary` at `text-xs`. In other variants, ignored.
- **`DoneAccordion`** resolves the label from the task's `completedByUserId` against the household roster and passes it down. When there's no partner (solo household), pass `undefined` — no attribution rendered.

### Label resolution

```
completedBy = completedByUserId === me.id ? me.displayName
            : completedByUserId === partner.id ? partner.displayName
            : undefined  // null / deleted / stale — suppress
```

### Backfill

`completedByUserId` has been populated on every complete since persistence landed (Phase 11). Historical solo-era completions have the Organizer's ID — after partner joins, those display as "— [Organizer]" which is correct.

### Adapter

Extend `toUITask()` (`src/lib/task-adapters.ts`) to resolve the label once. Views pass the `partner` object from `/api/me` into the adapter.

## Part D — Shared points display

**Already wired** — this section is mostly verification work.

- `MobilePoints` renders partner block when paired (existing — `src/components/points-display/points-display.tsx`).
- Sidebar expanded state shows both partners stacked with today deltas (existing).
- `/api/me` returns both `user.points` and `partner.points`.
- `useTasks()` invalidates `["me"]` on every task mutation's `onSettled`, so a partner's completion lands in the other partner's hero within 5s.

### Verification work

- E2E: in a two-browser-context test (same fixture as `tests/invite-flow.spec.ts`), complete a task as Partner A, confirm Partner B's header reflects the new total within the polling window.
- Visual: confirm the sidebar "between you two" area matches the Cozy theme after second user joins (no regression from solo state).

### No new "profile" surface

The multiplayer spec said "profile or settings area." We don't have one, and we don't need to build one for v1. The header + sidebar hero already satisfy the spec's intent ("both partners' point balances visible to both partners, framed collaboratively").

## Part E — First-run reveal banner

### Component

New `RevealBanner` at `src/components/reveal-banner/reveal-banner.tsx` (with co-located `.md` per project rules).

### Visual

Matches the `InviteBanner` family — warm amber gradient, `shadow-sm` lift, generous padding. Small "×" dismiss in the top-right.

Structure:
```
[kicker] Welcome
[title, Gabarito] You're in. This is everything [Organizer] has been carrying around.
[body] [Adaptive second line]
[CTA, conditional] Want to grab one? ↓
```

### Adaptive copy

Computed from `tasks.filter(t => t.assigneeUserId === me.id && !t.completedAt).length`:

- `> 0`: body = `"[Organizer] already put a few things on your plate."` CTA visible: `"Want to grab one? ↓"`
- `=== 0`: body = `"Nothing's assigned to you yet. Take a look around."` CTA omitted.

Organizer's name from `/api/me` `partner.displayName`.

### Mechanism

- Show only when `searchParams.get("welcomed") === "1"` AND `localStorage.getItem("reveal-dismissed") !== "1"`.
- On mount, call `router.replace("/today")` to strip the query param (refresh-proof).
- Dismiss (×) or clicking the CTA sets `reveal-dismissed=1` in localStorage.
- CTA click also scrolls to and briefly highlights the first task where `assigneeUserId === me.id && !completedAt`.

### Loading guard

If `partner.displayName` isn't available at render time (first-render race with `/api/me`), render a `RevealBanner` skeleton (single-line shimmer) until it resolves. Prevents the copy from flickering with "undefined."

### Where it lives

Renders at the top of `/today`'s page content, above the task list, below the sticky header. Only on `/today` — not on `/week` or `/month`.

## Part F — "Theirs" empty state

### Trigger

Filter = `"theirs"` AND household has no partner user (`me.household.users.length === 1`).

### Component

Reuse `EmptyState` component with a new `variant="theirs-solo"`. Copy:

- Title: "This is where your person's tasks will live."
- Body: "Once they're in, their stuff shows up right here."
- Action: `"Bring your person in →"` link routing to `/invite`.

### After partner joins

Unreachable. `theirs` filter shows the partner's real task list. If that list is empty on a given day, the standard "no tasks" empty state renders (existing behavior).

### Rotating copy

Per `docs/open-questions.md` §16, empty states should have 3–4 rotating variants. Add 3 more title lines to cycle (using the same date-hash function from `emptyDayCopy` in `src/lib/task-adapters.ts`):

- "This is where your person's tasks will live."
- "Your person's side is waiting."
- "Nothing here yet — that's their column."
- "Once they're in, this page fills up."

All four keep the "warm, not an error" tone from the spec.

## Part G — Re-engage prompt

### Trigger

On every `/today` render, check: is there a `pending` invite for my household where `createdAt > 7 days ago` AND `localStorage.getItem("reengage-dismissed-${invite.id}") !== "1"`?

The "7 days" threshold is a judgment call. Rationale:
- 3 days feels naggy — partner may just have been busy.
- 14 days feels too late; the original ask is stale.
- 7 days = one weekly cycle, polite reminder.

### Component

New `ReengageBanner` at `src/components/reengage-banner/`. Visual: quieter than `RevealBanner` — warm beige (`--color-surface-dim`), thin border, no gradient. Two actions (primary + ghost) + "×".

Structure:
```
[title] [Partner] hasn't joined yet.
[body] Want to send the invite again?
[primary] Re-send invite
[ghost] Not now
[×]
```

**Copy:** "Your person hasn't joined yet. Want to send the invite again?" — no dynamic name (avoids fragile logic for link-only invites where no email is on file).

### Actions

- **Re-send invite:** calls the existing resend path on the active invite (`POST /api/invites/[id]/resend`, added as part of this spec — thin wrapper that re-runs `renderInviteEmail` + `sendEmail` for the same token). If the invite has no email (link-only), the button label flips to "Copy link again" and copies the URL to clipboard. Sets dismissed flag on success. Fires a toast: "Invite sent again." or "Link copied."
- **Not now** / ×: sets `reengage-dismissed-${invite.id}` flag. One fire per invite. If the Organizer later cancels + creates a new invite, the new `invite.id` = fresh flag key = can fire again for the new ask.

### Placement

Banner at the top of Today, above the task list. Coexists with `RevealBanner`? No — `RevealBanner` is for the invited partner, `ReengageBanner` is for the Organizer. The roles are disjoint in the same household.

## Component inventory

| New | Type |
|---|---|
| `RevealBanner` | Component + co-located `.md` |
| `ReengageBanner` | Component + co-located `.md` |
| `NotificationBell` | Component (icon + badge; wraps a popover/bottom-sheet trigger) |
| `NotificationList` | Component (the list rendered inside popover or sheet) |
| `useNotifications` | Hook |

| Modified | Change |
|---|---|
| `TaskListItem` | New `completedByLabel` prop |
| `DoneAccordion` | Resolve + pass label; solo suppresses |
| `EmptyState` | New `theirs-solo` variant |
| `FilterToggle` | No change (partner-name already supported) |
| `MobileHeader` | Insert `NotificationBell` when paired; keep `UserPlus` when solo |
| `Sidebar` | Insert `NotificationBell` in utility row when paired |
| `POST /api/tasks` | Write `task_assigned` notification on assignee match |
| `PATCH /api/tasks/[id]` | Same as above on assignee change |
| `POST /api/tasks/[id]/complete` | Write `task_completed_by_partner` notification |

| New routes | Method + path |
|---|---|
| List | `GET /api/notifications` |
| Mark all read | `POST /api/notifications/read-all` |
| Mark one read | `PATCH /api/notifications/[id]/read` (future-proof) |
| Resend invite | `POST /api/invites/[id]/resend` |

## Testing strategy

### Unit / integration (Vitest)

- `householdIsPaired(householdId)` — single-user returns false, two-user returns true.
- Notification write helpers — one test per trigger including the solo-guard path (must not write).
- `useNotifications()` — polls on the expected interval, invalidates on mutation.
- `RevealBanner` — shows only with query param + no dismissed flag; adaptive copy renders per assignment count; CTA hidden when count = 0.
- `ReengageBanner` — shows only when invite pending and > 7 days; dismissed flag suppresses; fresh invite ID resets.
- Completer label resolution — me / partner / unknown all handled.

### E2E (Playwright — extend existing `invite-flow.spec.ts`)

- Two-context fixture already launches Organizer + Partner. Add:
  - Partner lands on `/today?welcomed=1` after accepting, sees the reveal banner, dismisses it, reloads — banner stays dismissed.
  - Organizer assigns task to Partner → Partner's bell shows unread badge within polling window → Partner opens popover → badge clears.
  - Partner completes task Organizer created → Organizer's bell shows "task_completed_by_partner" notification.
  - Partner completes their own task → Organizer's bell does NOT show a notification (no-op case).
- Separate solo-state spec:
  - Solo Organizer, switch to "Theirs" filter → warm empty state renders with invite link.
  - Solo Organizer, simulate `invite.createdAt = 8 days ago` → re-engage banner renders → dismiss → banner stays gone.

## Out of scope (deferred)

- Rich activity feed (spec explicitly defers this).
- Push notifications (PWA/iOS phase).
- Per-event notification settings.
- Editorial summarization ("You two knocked out 7 today").
- Full profile/settings page (the existing surfaces cover points).
- Touch / hover polish passes (separate polish PR after this lands).

## Open follow-ups surfaced during design

- **Solo-era historical completions:** after partner joins, backfilled Done rows show "— [Organizer]" attribution. This is technically correct but might feel weird (attribution appearing retroactively on tasks the partner never saw being completed). Acceptable for v1; monitor.
- **Reassignment notification suppression:** if A assigns to B then immediately reassigns to A (within seconds), B gets a notification that points at a task no longer theirs. Low probability, low harm; not deduped in v1.
- **Notification volume:** if a couple assigns 30 tasks to each other in one sitting, the bell count could spike. Capped display at "9+" covers visual, but no server-side batching for v1.
