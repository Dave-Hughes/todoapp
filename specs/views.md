# Spec: Views (stub)

> **Status:** Stub. Fill out in detail immediately before building.

## Summary
Three views of the same underlying task list at three zoom levels: Today, Week, Month.

## In scope (v1)
- Today view — load-bearing, gets the most design attention
- Week view — seven-day look-ahead for planning
- Month view — full month for must-not-slip tasks
- Switchable with one tap
- Clear visual attribution of which partner owns which task
- Simple filter: "mine" / "theirs" / "both"

## Out of scope (v1)
- Dedicated "planning mode"
- Calendar integration
- Filters beyond owner
- Custom views
- Drag-to-reschedule across days (consider for fast-follow)

## Design priorities
- **Today** is the hero. 70% of design energy. Opened ten times a day.
- **Week** is for Sunday-night and Monday-morning planning moments.
- **Month** is about the tasks that must not slip by (rent, quarterly bills, anniversary). Density indicators over full detail.

## Open questions
- How are overdue tasks surfaced in Today without being scolding? (principles.md #4)
- Is there a distinct "up next" section in Today, or is everything one flat list?
- What's the empty state for each view at each zoom level? (voice-and-tone.md has starter copy)
- How does the month view render a day with 20 tasks vs. 1 task?

## Acceptance criteria (draft)
- Switching between views is instant (no loading state)
- Today view renders before any network round-trip when returning to the app
- Every view has real empty, loading, and error states
- All three views pass keyboard navigation and screen reader checks

## Test coverage (draft)
- Task completed in Today disappears (or visually marks done) correctly
- Partner completes a task while Today is open — update propagates smoothly
- Week view correctly handles tasks that span multiple days
- Month view correctly handles repeat-rule expansion
- Each view's empty state renders as specified
