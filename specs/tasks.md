# Spec: Tasks (stub)

> **Status:** Stub. Fill out in detail immediately before building, using `product-management:write-spec`.

## Summary
The core task primitive: create, complete, edit, delete, repeat, assign.

## In scope (v1)
- Create with: title, due date, category, assignee (self or partner), repeat rule
- Complete / un-complete
- Edit all fields
- Delete
- Reassign between partners
- `points` field present in the data model (not user-visible in v1)
- Repeat rules: daily, weekly, monthly, custom interval

## Out of scope (v1)
- Natural language parsing
- Keyword auto-complete
- Sub-tasks
- Templates
- Tags beyond categories
- Attachments
- Comments / discussion threads
- Bounty reward field surfaced in UI (data field may exist)

## Open questions (to resolve before building)
- What does "snappy" mean in concrete latency targets? (see open-questions.md #5)
- Exact repeat-rule semantics for monthly-on-31st, DST, timezone shifts (#7)
- Concurrent-edit behavior (#8)
- Category system: pre-seeded or user-created? shared or personal? (#9)
- Does "assigned to both" exist, or is every task single-owner? (#10)

## Data model sketch (non-binding)
```
Task
  id
  household_id
  title
  notes (optional)
  due_at (nullable)
  category_id
  assignee_user_id
  created_by_user_id
  completed_at (nullable)
  completed_by_user_id (nullable)
  points (int, default 0)
  bounty_reward (nullable text, hidden in v1)
  repeat_rule (nullable, structured)
  created_at
  updated_at
```

## Acceptance criteria (draft)
- Creating a task takes less than X ms from tap to visible in list (X TBD)
- Completing a task animates within Y ms (Y TBD)
- Partner sees the new task within Z seconds (Z TBD; depends on sync strategy)
- Every repeat rule is tested across DST and month-length edge cases
- Deleting a task is confirmed, reversible within the session, and permanent after

## Test coverage (draft)
Happy paths *and* edge cases. Non-exhaustive:
- Create, complete, uncomplete, delete
- Reassign mid-completion
- Both partners edit the same task concurrently
- Repeat rule firing across DST boundary
- Repeat rule on the 31st in February
- Task created offline, synced later
- Session expires mid-edit
