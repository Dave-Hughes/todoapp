# Spec: Multiplayer (stub)

> **Status:** Stub. Fill out in detail immediately before building. The partner onboarding flow especially needs its own mini-interview.

## Summary
Two accounts, one shared household. Symmetric capabilities for both partners. The entire point of the product.

## In scope (v1)
- Two user accounts linked to one household entity
- Both partners see the full shared task list
- Either partner can create, edit, complete, delete, reassign any task
- Clear visual attribution: who created it, who's assigned to it, who completed it
- Invite flow: partner invited by email or shareable link
- Minimal "welcomed in" first-run for the invited partner, distinct from the Organizer's first-run
- In-app indication when a partner acts (e.g., "Krista completed: trash")

## Out of scope (v1)
- SMS nudging (deferred)
- Real-time presence ("Krista is viewing this")
- Push notifications beyond in-app (native push deferred to PWA/iOS phase)
- Rich activity feed
- Per-task permissions

## The two-sided onboarding problem
The Organizer sought this app out. The Willing Partner did not. Their first-run experiences are different products.

**Organizer first run (rough shape):**
1. Sign up, create household
2. "Get what's in your head out of there" — empty Today view, strong CTA to add tasks
3. Add a few tasks to seed the list
4. Invite partner — framed as "bring your person in"
5. See the waiting-on-partner state clearly but not annoyingly

**Willing Partner first run (rough shape):**
1. Click invite link, sign up
2. *Immediately* see the shared list the Organizer has been building
3. No tasks assigned to them yet — the framing is "look around, here's what's on their plate"
4. Light, warm, zero-pressure intro
5. Maybe a single suggested action (e.g., "Take one thing off their plate")

**This needs its own dedicated interview before building.** It is the single most important UX flow in the whole product and the one most likely to sink the app if done wrong.

## Open questions
- Partner invite: email vs. shareable link vs. both? (#4)
- Household creation race — both partners sign up first, then try to link. How? (#3)
- Concurrent edit strategy (#8) — this is a multiplayer-specific concern
- What if the partner never accepts? (#12) — graceful single-user state
- Notification philosophy (#6)
- The breakup / unlink flow (#11) — not in v1 UI but data model must not preclude

## Data model sketch (non-binding)
```
Household
  id
  created_at

User
  id
  email
  household_id (nullable until joined)
  role_in_household: enum { organizer, willing_partner } OR just `member`

Invite
  id
  household_id
  invited_by_user_id
  email_or_link_token
  accepted_at (nullable)
  expires_at
```

Note: `role_in_household` may or may not exist. The symmetric-roles principle argues *against* encoding Organizer/Willing Partner as account-level state, since the roles are per-moment not per-person. Default to: no role field, both members are equal members of the household.

## Acceptance criteria (draft)
- Both partners can perform every task-related action
- Partner changes propagate within Z seconds (Z TBD)
- Invite can be sent, accepted, and expired
- Waiting-on-partner state is clear but not nagging
- Invited partner's first-run is visibly different from the first user's first-run

## Test coverage (draft)
- Invite sent, accepted, both see the same list
- Invite sent, never accepted, Organizer's solo experience remains usable
- Two partners edit the same task concurrently
- Partner completes a task while the other is offline
- Household with exactly two users cannot add a third
- Unlink scenario (even if not UI-exposed in v1, the backend should handle it)
