# Spec: Tasks

> **Status:** Complete. Interviewed and specced 2026-04-11.

## Summary

The core task primitive: create, complete, edit, delete, repeat, assign, postpone. This is the surface where the "feels as good as Linear" bar gets set. Every interaction is optimistic-first and instant-feeling.

## In scope (v1)

- Create with: title, due date (required, context-aware default), flexible flag, time (optional), category, assignee, repeat rule, points
- Complete / un-complete (swipe right, or tap)
- Edit all fields
- Delete (with undo toast)
- Reassign between partners (or to shared)
- Postpone (swipe left → Tomorrow / Next Week / Next Month / Pick a Date)
- Points visible, editable, and pre-filled from seeded task database
- Repeat rules: daily, weekly (multi-day), monthly (with clamping), custom N-interval
- Seeded task database providing default point values for common household tasks

## Out of scope (v1)

- Natural language / smart task creation (parse "Take out trash daily Krista" into fields) — post-v1
- Smart point suggestions from task history — post-v1
- Task templates — post-v1
- Keyword auto-complete
- Sub-tasks
- Tags beyond categories
- Attachments
- Comments / discussion threads
- Bounty reward field surfaced in UI (data field exists)
- Yearly repeat rule (noted for post-v1; trivially simple but not in v1 UI)

## Data model

```
Household
  id                    uuid, primary key
  name                  text (auto-generated as "Partner1 & Partner2", editable)
  created_at            timestamptz

Category
  id                    uuid, primary key
  household_id          uuid, FK → Household
  name                  text
  position              int (for ordering)
  is_default            boolean (the "Uncategorized" catch-all)
  created_at            timestamptz
  updated_at            timestamptz

SeededTask
  id                    uuid, primary key
  name                  text ("Take out trash", "Mow the lawn", etc.)
  default_points        int
  suggested_category    text (hint, not FK — maps to a category name)
  created_at            timestamptz

Task
  id                    uuid, primary key
  household_id          uuid, FK → Household
  title                 text, required
  notes                 text, nullable
  due_date              date, required (context-aware default)
  due_time              time, nullable (date-only if null)
  flexible              boolean, default false ("when you can" if true)
  category_id           uuid, FK → Category (default: household's "Uncategorized")
  assignee_user_id      uuid, nullable (null = shared; user ID = assigned to that partner)
  created_by_user_id    uuid, FK → User
  completed_at          timestamptz, nullable
  completed_by_user_id  uuid, nullable
  points                int, default 0 (pre-filled from SeededTask match, editable)
  bounty_reward         text, nullable (hidden in v1, prepared for v2)
  repeat_rule           jsonb, nullable (structured — see Repeat Rules section)
  parent_task_id        uuid, nullable, FK → Task (links spawned occurrences to the original)
  deleted_at            timestamptz, nullable (soft delete)
  created_at            timestamptz
  updated_at            timestamptz

TaskEvent
  id                    uuid, primary key
  task_id               uuid, FK → Task
  household_id          uuid, FK → Household
  event_type            enum: 'created', 'completed', 'uncompleted', 'reassigned',
                              'postponed', 'edited', 'deleted', 'restored',
                              'points_earned', 'points_lost'
  actor_user_id         uuid, FK → User
  metadata              jsonb (e.g., { from_user_id, to_user_id } for reassignment,
                               { old_date, new_date } for postpone,
                               { points } for points_earned/lost)
  created_at            timestamptz
```

### Notes on the data model

- **`assignee_user_id` nullable = shared task.** A null assignee means the task is shared — either partner can complete it. A non-null value means it's assigned to that specific partner.
- **`TaskEvent` is write-only in v1.** Events are logged but not surfaced in the UI. Post-v1 features (activity feed, "Dave took this off your plate," points ledger) read from this table.
- **`parent_task_id`** links spawned repeat occurrences back to the original task for grouping and "delete all future occurrences" support.
- **`points` is per-user, not per-household.** The points a user earns from completing a task are tracked via TaskEvent. The user's total balance is derived from summing their points_earned minus points_lost events.
- **`SeededTask`** is a read-only reference table. It ships with ~100 pre-populated common household tasks with point values on a relative scale (e.g., take out trash = 5, mow the lawn = 15, rake and bag leaves = 30). Used to auto-fill points during creation when the title matches.

## Assignee model

Three options when creating or editing a task:

| Option | `assignee_user_id` | Behavior |
|---|---|---|
| Me | Current user's ID | On my plate. Shows in my "Mine" filter. |
| Partner | Partner's user ID | On their plate. Shows in their "Mine" filter, my "Theirs" filter. |
| Shared | null | Either partner can grab it. Shows in every filter state. |

Default on creation: **Me** (the person creating the task).

## Due date model

Every task has a due date. The due date is context-aware:

| Creating from | Default due date |
|---|---|
| Today view | Today |
| Week view (Thursday selected) | Thursday |
| Month view (23rd selected) | The 23rd |

The user can always change the date after creation.

### Flexible flag

Each due date carries a `flexible` boolean:

- **`flexible: false`** (default) — hard deadline. Must happen that day. Shows in the primary section of the Today view. If missed, stays on its original day in Week/Month views with a gentle "still hanging around" indicator. Does not auto-move.
- **`flexible: true`** — "when you can." Shows in the secondary section of the Today view. If the date passes, auto-surfaces in Today's secondary section and disappears from its original day. Rolls forward gently, no shame.

### Time

`due_time` is nullable. If set, the task shows the time in the list. Stored and generated in the user's local timezone (timezone on user profile). Times are relevant for repeat rule generation across DST — see below.

## Repeat rules

### Supported rules in v1

| Rule | Example | `repeat_rule` JSON |
|---|---|---|
| Every N days | Every day, every 3 days | `{ "type": "daily", "interval": 1 }` |
| Every N weeks on specific days | Every Tue & Thu, every other Monday | `{ "type": "weekly", "interval": 1, "days": ["tue", "thu"] }` |
| Every N months on a date | 15th of every month, 31st every 2 months | `{ "type": "monthly", "interval": 1, "day_of_month": 15 }` |

**Not in v1:** Yearly (`{ "type": "yearly" }`) — noted for post-v1.

### Edge cases

**Monthly clamping:** A task due on the 31st of every month fires on the last day of months with fewer days (Feb 28/29, Apr 30, etc.). The user's intent is "end of month."

**DST handling:** Tasks with times repeat at the same local time, not the same UTC offset. "7am every day" means 7am in the user's timezone even on spring-forward/fall-back days. The repeat engine generates the next occurrence as "7am in user's timezone on the next applicable day" and converts to UTC for storage.

### Spawn-next model

Completing a repeating task **spawns the next occurrence as a new task row.** The completed occurrence stays in history with its own `completed_at`, `completed_by_user_id`, and points earned. Each occurrence is independent.

- **Rolling window generation:** Occurrences are pre-generated at least 60 days ahead. Exact window tuned during build. Generated lazily (on-demand when user views a date range) or by background job.
- **`parent_task_id`** links all occurrences back to the original for grouping.
- **"Delete all future occurrences"** deletes all unfinished tasks sharing the same `parent_task_id` with a due date after the selected one, and clears the repeat rule on the selected task.
- **"Delete just this one"** soft-deletes the single occurrence. Future occurrences are unaffected.

### Repeat + Roll Over interaction

If a daily repeating task's occurrence for today goes incomplete and the user triggers Roll Over, the occurrence is **absorbed** if tomorrow already has its own scheduled occurrence. No duplicate instances of the same repeating task on the same day. Non-repeating tasks always land on the next day.

## Points system (v1)

Points are **per-user, not per-household.** Each partner earns their own points.

### Point assignment during creation

1. User types a task title.
2. If the title matches (or closely matches) a seeded task, points auto-fill from the seeded database.
3. The user can always override the pre-filled value.
4. If no match, points default to 0 and the user sets them manually.

### Point invariant

**You only hold points for tasks that are currently completed and not deleted.**

| Action | Points effect |
|---|---|
| Complete a task | Earn its points (optimistic, instant) |
| Uncomplete a task | Lose those points |
| Delete a completed task | Lose those points |
| Delete an uncompleted task | No points impact |
| Undo a deletion (during toast window) | Restores previous state including points |

All points changes are logged as `TaskEvent` rows (`points_earned`, `points_lost`) for the post-v1 ledger.

### Seeded task database

Ships with ~100 common household tasks on a relative scale:

- Take out trash: 5 points
- Unload dishwasher: 5 points
- Mow the lawn: 15 points
- Get groceries: 15 points
- Rake and bag leaves: 30 points

The exact list and values will be curated before launch. The scale establishes a reference so couples can judge the relative difficulty of custom tasks they create.

## Task creation flow

1. **Tap the persistent add button** (always visible, placement determined in design phase).
2. **Quick-entry surface opens.** Title field focused, ready to type. Smart defaults pre-filled:
   - Due date: context-aware (today, selected day, etc.)
   - Flexible: false
   - Category: Uncategorized
   - Assignee: Me
   - Points: from seeded database match, or 0
   - Repeat: none
   - Time: none
3. **Type title, hit enter.** Task appears in the list instantly (optimistic UI). Two seconds, done.
4. **Optionally expand** to reveal full fields (time, category, assignee, repeat rule, points, flexible flag, notes) and adjust before or after saving.

### Title is the only field requiring user input. Everything else has a default.

## Task completion flow

1. **Swipe right** (direct swipe by default) or tap the checkbox.
2. **Optimistic update:** checkbox animates, points balance increments, completion copy shows ("Nice. One less thing.") — all instant.
3. **Task moves to collapsed "Done" section** at the bottom of the view.
4. **Server confirms within 300ms.** If it fails, everything rolls back with a gentle error.

### Swipe mode setting (per-user)

- **Direct swipe (default):** Swipe right completes immediately. Swipe left opens postpone menu.
- **Reveal swipe:** Swipe reveals action buttons; requires a second tap to confirm. Available in settings.
- **First-time tooltip:** On the user's first swipe-to-complete, a non-blocking tooltip says: "Prefer to confirm before completing? You can change this in settings."

## Postpone flow

1. **Swipe left** on a task (or via task menu).
2. **Quick menu appears:** Tomorrow, Next Week (Monday), Next Month, Pick a Date.
3. **Task's due date updates** to the selected date. Time and flexible flag are preserved.
4. **Optimistic update:** task animates out of the current day's list.

## Roll Over flow

1. **Action available in Today view** when there are incomplete tasks.
2. **Pushes all incomplete tasks from today to tomorrow.**
3. **Repeating tasks are absorbed** if tomorrow already has a scheduled occurrence. Non-repeating tasks always move.
4. Exact UI trigger (button, prompted suggestion, etc.) determined in design phase.

## Delete flow

1. **Delete action** via task menu or swipe gesture.
2. **Confirmation:** "Delete it for good?" (per voice doc).
3. **Soft delete:** task disappears, `deleted_at` is set. Undo toast appears for 5–8 seconds.
4. **If undo:** `deleted_at` is cleared, task reappears in its previous state (including points if completed).
5. **After toast expires:** delete is permanent. Points lost if the task was completed.
6. **Repeating tasks:** "Just this one" or "This and all future occurrences."

## Concurrent editing

**Per-field last-write-wins.** If Dave edits the title while Krista edits the due date, both saves succeed — they touched different fields. If both edit the same field, the last save to reach the server wins. The next poll (every 5 seconds) shows both partners the current state. No locking, no conflict dialogs.

## Latency targets

| Moment | Target |
|---|---|
| Task creation (tap to visible in list) | Instant (optimistic UI). Server confirm < 300ms. |
| Task completion (tap to visual state flip) | Instant (optimistic). Animation begins within one frame (~16ms). Server confirm < 300ms. |
| Points increment on completion | Instant (part of optimistic completion update). |
| Cross-partner sync | Poll every 5 seconds in foreground. Worst case 5s, best case near-instant. |
| View switching | Instant, no loading spinner. Data already client-side. |

Architecture is ready to swap polling for websockets or SSE post-v1.

## Category system

- **Household-level.** Categories belong to the household, shared by both partners.
- **Pre-seeded:** 2–3 sensible defaults ship with every new household (exact defaults TBD). One of them is "Uncategorized" (the catch-all default).
- **User-editable:** Either partner can add, rename, reorder, and delete categories.
- **One category per task.** Single `category_id` FK, no multi-category.
- **Per-user categories** noted for post-v1 as an advanced option.

## Acceptance criteria

- Creating a task: instant in list via optimistic UI; server confirm < 300ms
- Completing a task: animation begins within one frame; points increment instantly; server confirm < 300ms
- Partner sees new/changed task within 5 seconds (polling interval)
- Every repeat rule is tested across DST and month-length edge cases
- Clamping works correctly for monthly-on-31st in February, April, June, September, November
- Multi-day weekly repeat generates correct occurrences (e.g., Tue & Thu every week)
- Spawn-next creates the next occurrence on completion; rolling window stays filled
- Points invariant holds: complete → earn, uncomplete → lose, delete completed → lose
- Seeded task match auto-fills points during creation
- Postpone updates due date correctly; flexible flag and time preserved
- Roll Over moves all incomplete hard-deadline tasks to tomorrow; repeating tasks absorbed
- Flexible tasks auto-surface in Today when their date passes
- Delete shows undo toast; undo within window restores full state; past window is permanent
- Repeating task delete offers "just this one" vs "all future"
- Swipe-to-complete works in both direct and reveal modes
- Per-field last-write-wins resolves concurrent edits without data loss for different fields
- All task CRUD operations have real loading, error, and empty states

## Test coverage

Happy paths *and* edge cases. Non-exhaustive:

- Create with all defaults, verify smart defaults applied
- Create from each view context, verify due date default
- Complete, uncomplete, verify points earned and lost
- Delete completed task, verify points lost
- Delete uncompleted task, verify no points change
- Undo delete within toast window, verify full state restored
- Reassign task between partners, verify TaskEvent logged
- Postpone to tomorrow, next week, next month, custom date
- Roll Over with mix of repeating and non-repeating tasks
- Roll Over where repeating task's next occurrence already exists (absorption)
- Both partners edit different fields of the same task concurrently
- Both partners edit the same field concurrently (last-write-wins)
- Repeat rule firing across DST boundary (spring forward and fall back)
- Repeat rule monthly-on-31st in February, April, November
- Multi-day weekly repeat (e.g., Tue & Thu) generates correct occurrences
- Spawn-next creates new occurrence on completion
- Rolling window generation fills at least 60 days ahead
- "Delete all future occurrences" removes correct set
- "Delete just this one" leaves other occurrences intact
- Seeded task match auto-fills points; user override persists
- Flexible task past its date auto-surfaces in Today
- Hard-deadline task past its date stays on original day in Week/Month
- Task created offline, synced later (if offline support is in scope)
- Session expires mid-edit
- Category CRUD: create, rename, reorder, delete
- Deleting a category reassigns its tasks to Uncategorized
