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

**3. How is a "household" represented in the data model?**
v1 supports exactly two accounts in one shared household. The household entity is what tasks, points, and (eventually) Vault items belong to. Decisions needed: is the household created by the first user and joined by the second? What's the unique identifier? What happens if both partners try to create a household independently before linking?

**4. Partner onboarding flow — the two-sided problem.**
The Organizer's first run and the Willing Partner's first run are different experiences. The Willing Partner did not seek out this app; they were invited. Their first screen cannot feel like work. Needs a dedicated interview before building multiplayer. See [specs/multiplayer.md](../specs/multiplayer.md).

## Blocking during build

These can be deferred until the relevant feature is being built, but must be resolved then.

**5. What does "snappy" mean in concrete numbers?**
The foundation docs say the app must feel snappy. Before building the task creation flow, pin down the targets: max time-to-interactive after tapping "new task," max latency between tapping complete and the visual state flipping, max time between a partner completing a task and it appearing on the other partner's screen. Specifics go in [specs/tasks.md](../specs/tasks.md).

**6. Notification philosophy.**
How and when does the app nudge either partner? What's the default — loud or quiet? Per-task opt-in or household-level setting? What about the Willing Partner who doesn't live in the app — do they get email for every assignment, or only for explicit nudges from the Organizer? This has to be figured out before multiplayer sync/notifications are built.

**7. Repeat-rule edge cases.**
What exactly are the supported repeat rules for v1? Daily is obvious. Weekly is obvious. Monthly gets weird (31st of every month in a February?). Custom intervals — how custom? DST and time-zone handling for tasks with times attached. Goes in [specs/tasks.md](../specs/tasks.md) just before building.

**8. Concurrent-edit behavior.**
Both partners open the same task at the same time and edit it. What happens? Last-write-wins is the simplest answer; it's also the one that causes the most "why did my edit disappear" moments. Needs a decision before building the task editor.

**9. Category system.**
Tasks have categories in v1. Open questions: are categories pre-seeded or user-created? Shared between partners or personal? How many is too many? Can a task belong to more than one category? This is a surprisingly deep design decision for something that looks like a dropdown.

**10. "Assigned to both partners" — does it exist?**
Some household tasks belong to *both* people ("decide together where to go for dinner Saturday"). Does v1 support that, or is every task assigned to exactly one person? Leaning toward: every task has exactly one owner, and "decide together" is a category or tag. But not decided.

## Long-horizon questions

These don't block v1 but the *existence* of the question shapes how v1 is built. Each of these has been flagged because the architecture needs to not preclude an answer.

**11. The breakup question.**
A couples app has to have an answer for what happens when a couple breaks up. Account split? Data export? Graceful degradation to a solo mode? This doesn't need a UI in v1, but the data model needs to not make it impossible to answer later. Worth at least a paragraph of thinking before schema finalization.

**12. What about the "list person" whose partner refuses to join?**
The Willing Partner who never accepts the invite is a real failure mode. Does the app punish the Organizer by being useless? Or does it work fine as a solo app with a persistent "invite your partner" affordance? This affects how the core loop is built. Leaning toward: the app works for one, but visibly misses its other half. The single-user state is a "waiting room," not a full product.

**13. Billing model.**
Free? Freemium? Per-household subscription? Stripe is in the stack; the decision of *what* to charge for is deferred. Probably a post-v1 question, but v1 architecture should not make any of those impossible.

**14. The iOS question.**
v1 is web. A native iOS app is on the long-term roadmap but only if the web version validates with real users. The question is whether the web version is built as a PWA that can be installed on iOS homescreens (leaning yes) and whether any v1 API decisions would make a future native client painful (they shouldn't).

**15. What does "recognition" actually look like in product, concretely?**
The foundation docs make "recognition" load-bearing. We have a few examples (partner completes a task you assigned, Today view summarizing the day's contributions, the two-minute-dump moment during onboarding). But the full design space of "moments of recognition" has not been explored. Worth a dedicated brainstorm session post-foundation and pre-build.

**16. Tone calibration over time.**
The voice is playful. How playful before it gets annoying on day 60? Users habituate to jokes. The app needs a plan for tone that doesn't rely on any single joke landing twice. Possibly: a rotating copy library for common surfaces so "the empty Today view" is never the same line two days in a row. Needs design attention before v1 ships but doesn't block the data model.

## Parking lot

Ideas that came up during interviews that are explicitly *not* being decided now, but shouldn't be lost.

- Habit stacks (mentioned in "not in v1")
- Weekly email digests
- Calendar two-way sync
- Integration with smart home / IoT triggers
- Shared grocery lists as a special task type
- Birthday and anniversary reminders pre-loaded for the couple
- "Surprise mode" where one partner can hide tasks from the other as part of planning a gift or event

## Process notes (not questions, just sequencing)

- **When to run the `design:design-system` skill:** *After* the tech stack is provisioned and CLI access verified, and *before* the first real component is built. Its output populates `src/styles/tokens.css`, the first theme file (`src/styles/themes/cozy.css`), and the initial base components with sibling `.md` docs. It does *not* go into `docs/`; the foundation docs stay strategic. The rules governing all of this live in `design-system/README.md`, which already exists as the contract.
- **When to run `design:ux-copy`:** per-surface, as copy is written. Not a one-time pass.
- **When to run `design:accessibility-review`:** before merging any new component or flow, and again before v1 ships as a full-audit pass.
