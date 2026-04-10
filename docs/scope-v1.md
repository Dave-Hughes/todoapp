# Scope: v1

**v1 is defined as:** the version Dave and Krista would actually use in their own house, full-time, instead of reverting to an Apple Note.

That's the bar. Apple Notes is free, instant, cross-device, and already works. v1 has to be meaningfully better *on day one*, not "better once phase 3 lands."

## Guiding constraint

**Narrow surface, deep craft.** Ruthlessly few features. The features that *are* in v1 are built to showcase quality — snappy interactions, real empty states, real loading states, real error states, real keyboard shortcuts, real animation, real accessibility. The information architecture is nailed for the v1 surface area only, but *designed with the post-v1 features in mind* so nothing has to be refactored later.

This is the difference between "scoping down v1" and "building a throwaway prototype." We're doing the first.

## In scope for v1

### 1. Tasks: create, complete, edit, delete

The core loop has to feel *great*. Snappy creation, snappy completion, satisfying micro-interactions. This is the surface where Dave's "feels as good as Linear" bar gets set.

**In scope:**
- Create task with title, due date, category, assignment (self or partner)
- Repeat rules: daily, weekly, monthly, custom interval
- Edit and delete
- Complete and un-complete
- Assign and reassign between partners
- A `points` field on every task (not user-visible in v1, but present in the data model — this is what Vault will eventually spend)

**Out of scope for v1 (even though tempting):**
- Natural-language parsing ("trash tuesday 6pm")
- Auto-complete based on keywords in task names
- Sub-tasks
- Task templates
- Tags beyond categories
- Attachments
- Task comments or discussion threads

**Reason:** the core create/complete/repeat loop is where the "feels snappy" bar gets set. Each of the deferred items is a rabbit hole that trades craft for surface area. We want craft.

See [specs/tasks.md](../specs/tasks.md) for the detailed spec (to be filled in just before building).

### 2. Views: Today, Week, Month

Three views of the same underlying list, at three zoom levels.

- **Today** is load-bearing. It gets opened ten times a day. It's where 70% of the design energy goes.
- **Week** is for planning moments. Sunday-night look-ahead, Monday-morning triage.
- **Month** is for the tasks that must not slip by (rent, quarterly bills, anniversary).

**In scope:**
- Three views, switchable with one tap
- Today view shows tasks due today for both partners, clearly attributed
- Week view shows a seven-day horizon with assignment visible
- Month view shows the full month with density indicators

**Out of scope for v1:**
- A dedicated "planning mode"
- Calendar integration (deferred to a fast-follow)
- Filters beyond "whose tasks"
- Custom views

See [specs/views.md](../specs/views.md).

### 3. Multi-player mode

The whole point. Both partners, one shared space.

**In scope:**
- Two accounts linked to one shared household
- Both partners see the full shared list
- Either partner can create, complete, edit, delete any task
- Either partner can assign tasks to self or partner
- Clear visual attribution of who created what and who's assigned what
- Partner invited by email or shareable link
- A minimal "welcomed into the app" flow for the invited partner, distinct from the Organizer's first-run setup

**Out of scope for v1:**
- SMS nudging of the partner (deferred)
- Real-time sync animations ("Krista just completed this")
- Presence indicators
- Rich partner notifications beyond in-app

**Reason:** the emotional payoff of "I can see what my partner has on their plate" is ~90% delivered by shared visibility alone. The rest is polish that can come after v1 ships. See [specs/multiplayer.md](../specs/multiplayer.md).

### 4. Foundational quality (this is a bar, not a feature)

Called out separately because it's a *quality constraint*, not a scope item. It applies to everything else in v1.

- IA designed knowing the post-v1 features are coming. Vault, Bounties, Themes, SMS, digests, habit stacks all get navigational slots *reserved* even if empty.
- All components built against theme tokens. No hard-coded colors, fonts, spacing, or motion values.
- Accessibility baseline: WCAG 2.1 AA from day one. Keyboard navigable. Screen-reader labeled. Color contrast verified.
- Every interaction has real empty, loading, and error states. No "TODO: empty state" in the shipped product.
- Animation is tuned by hand, not left at framework defaults.

## Not in v1 (but the data model and IA are prepared for them)

These are deferred. The *architecture* assumes they will arrive. The *v1 surface* doesn't show them.

- **Vault and rewards.** Task `points` field exists but nothing spends it yet. No Vault tab, no prize approval flow. Deferred to v2.
- **Bounty tasks.** Task data model allows a `bounty_reward` field but it's not surfaced. Deferred to v2.
- **Themes beyond the default.** The theme *system* ships in v1. The *default theme* (warm/playful/cheeky-cozy) ships in v1. Additional themes (e.g. Cyberpunk, neutral/minimal) come after.
- **SMS integration.** Partner nudging over SMS. Deferred.
- **Weekly email digests.** Deferred.
- **Habit stacks.** Deferred.
- **Calendar sync (two-way with Google / Apple Calendar).** Deferred.
- **iOS app.** Deferred. The web app is mobile-responsive and installable as a PWA. Native iOS comes after browser-based v1 has been validated with real users beyond Dave and Krista.

## Success criteria for v1

v1 is done when *all* of the following are true:

1. Dave and Krista have been using it in their own house, daily, for at least two weeks without reverting to Apple Notes.
2. At least three other couples (from Dave's network of tech-forward friends) have been onboarded and used it for at least a week.
3. The app ships with real empty states, real error states, real keyboard shortcuts, and passes a basic WCAG 2.1 AA audit.
4. The test suite exercises both happy paths and meaningful edge cases across the core loops (task create/complete/repeat, partner invite, assignment changes).
5. The app is presentable as a showcase for Dave's agentic software company — meaning it passes the "would I show this to a paying customer as an example of my work" test.
