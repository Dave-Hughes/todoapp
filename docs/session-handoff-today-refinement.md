# Session Handoff: Today View Refinement

> **For:** Claude Code session
> **Date:** 2026-04-12
> **Prerequisite:** Step 5 (design system bootstrap) is complete. Today view exists with 13 components, token system, Cozy theme, and 402 passing e2e tests.

## What to read first

Read these files in this order before doing anything. This is not optional.

1. `CLAUDE.md` — full project orientation, stack, conventions, test coverage
2. `.impeccable.md` — the Design Context (brand, aesthetic, references, constraints)
3. `docs/voice-and-tone.md` — the app's character
4. `design-system/README.md` — the design system rules

Then read the source files you'll be modifying:

5. `src/app/page.tsx` — Today view page (the main file)
6. `src/app/globals.css` — global styles + token wiring
7. `src/styles/tokens.css` — token contract
8. `src/styles/themes/cozy.css` — Cozy theme values
9. `src/components/task-list-item/task-list-item.tsx` — the task row (most changes here)
10. `src/components/checkbox/checkbox.tsx`
11. `src/components/filter-toggle/filter-toggle.tsx`
12. `src/components/sidebar/sidebar.tsx`
13. `src/components/mobile-header/mobile-header.tsx`
14. `src/components/toast/toast.tsx`
15. `src/components/bottom-sheet/bottom-sheet.tsx`
16. `src/components/empty-state/empty-state.tsx`
17. `src/components/done-accordion/done-accordion.tsx`
18. `src/components/fab/fab.tsx`
19. `src/components/app-shell/app-shell.tsx`
20. `src/components/avatar/avatar.tsx`
21. `src/components/bottom-tabs/bottom-tabs.tsx`

Also read the Impeccable reference files relevant to this work:
- `~/.agents/skills/impeccable/SKILL.md`
- `~/.agents/skills/impeccable/reference/interaction-design.md`
- `~/.agents/skills/impeccable/reference/spatial-design.md`
- `~/.agents/skills/impeccable/reference/motion-design.md`

## Where we are

### What exists

- **Token system:** `src/styles/tokens.css` (70+ semantic CSS variables) + `src/styles/themes/cozy.css` (OKLCH Cozy theme, warm terracotta accent ~42°, tinted neutrals ~55°)
- **Typography:** Bricolage Grotesque (body) + Gabarito (display), loaded via `next/font/google`
- **13 components:** AppShell, Avatar, BottomSheet, BottomTabs, Checkbox, DoneAccordion, EmptyState, Fab, FilterToggle, MobileHeader, Sidebar, TaskListItem, Toast — each with a sibling `.md` doc
- **Today view:** `src/app/page.tsx` with demo data, page header (day + date + count), filter toggle, primary/flexible sections, done accordion, FAB, bottom sheet for task creation, toast notifications
- **Tests:** `tests/today-view.spec.ts` — 134 tests × 3 viewports = 402 passing (desktop Chrome, Pixel 7, iPhone 14)
- **Playwright config:** `playwright.config.ts` with webServer auto-start

### Last critique score: 25/40

Run on 2026-04-12 after two iteration passes. The visual foundation is solid; the interaction layer needs work.

## What needs to be fixed

### Priority issues (from critique)

**P0 — Swipe gestures are completely undiscoverable**
- Zero visual affordance that tasks are swipeable on mobile or desktop
- The Willing Partner will never find postpone
- Accidental swipe-to-complete during scroll is a real risk
- **Fix:** Add a per-task overflow menu (three dots / ellipsis button) as the always-visible action fallback. Consider a one-time onboarding swipe hint. The swipe-behind backgrounds work correctly now (green "Done" on right-swipe, amber "Postpone" on left-swipe) — the gap is discoverability, not visuals.

**P1 — Completion toast has no Undo**
- Postpone shows "Moved to tomorrow." with Undo. Completion shows "Nice. One less thing." without Undo.
- The `lastPostponedRef` pattern already works for postpone — use the same approach for completion.
- **Fix:** Store the completed task in a ref before moving it to done. Add `action: { label: "Undo", onClick: ... }` to the completion toast. Wire the undo to move the task back from doneTasks to tasks.

**P1 — Desktop hover action buttons are keyboard-inaccessible**
- The Complete/Postpone buttons in `task-list-item.tsx` only render when `isHovered` is true
- Keyboard users can't Tab to them because they vanish from the DOM without mouse hover
- **Fix:** Always render the buttons. Use CSS to toggle visibility: `opacity-0 group-hover:opacity-100 focus-within:opacity-100`. This keeps them in the Tab order and makes them visible on keyboard focus.

**P2 — Quick-default pills in add sheet are false affordances**
- "Today" and "Assigned to me" pills in the bottom sheet look interactive (rounded, bordered) but have no click handler
- Users will tap them expecting something to happen
- **Fix:** Either make them interactive (tap to cycle due date / assignee) or restyle as plain non-interactive labels (remove border, remove pill shape, use muted text).

**P2 — Filter label asymmetry: "Mine" / "Krista" / "All"**
- Mixed grammatical persons — possessive, proper noun, universal
- **Fix:** Use "Mine" / "Theirs" / "All" consistently. The filter-toggle component already uses "Theirs" as the value — the label override to partner name was added during build. Revert to "Theirs" or show partner name as secondary text below "Theirs."

### Minor issues to also fix

1. **`onTap` is a no-op** — clicking a task title does nothing with no visual feedback. Either wire it to open a detail view or change the cursor to indicate it's not yet interactive.
2. **Bottom sheet title should use Gabarito** — "Add task" header is an anticipatory moment. Use the display font here.
3. **"Add task" label redundancy** — appears on desktop button, FAB aria-label, and sheet title. The sheet could say "What needs doing?" instead (already the input label).
4. **Mobile "pts" suffix** — styling feels like an afterthought. If points are worth showing, style them with intention.
5. **Toast `fontWeight as string` cast** — move to a Tailwind class `font-[var(--weight-semibold)]` to eliminate the TypeScript workaround.
6. **Raw 2px/3px spacing in task metadata** — below the 4pt grid floor. Either accept and document, or add a `--space-0-5` token.
7. **Overdue "from yesterday" offers no action path** — just an indicator. Consider surfacing a postpone nudge.
8. **`dragConstraints` hardcoded** — `{ left: -120, right: 120 }` is tight on larger phones. Consider making this relative to container width.

### Provocative questions worth considering during refinement

1. Should the filter default to "Mine" instead of "All" for the Organizer's 10x/day use?
2. Points are a number without context — what would it look like if they told a story?
3. "When you can" tasks have no time pressure — what makes a user do them today vs. never?
4. Where is the multiplayer feeling? If Krista completes something, does Dave get a signal?

## How to work

1. Read all files listed above
2. Fix the P0 issue first (swipe discoverability), then P1s, then P2s, then minors
3. After each fix, run `npx playwright test --project=desktop-chrome` to verify nothing broke
4. Add new tests for new functionality (overflow menu, completion undo, keyboard-accessible actions)
5. After all fixes: run `/critique` to re-score. Target: 30+/40
6. Then run `/audit` for accessibility
7. Fix any audit findings
8. Run full test suite: `npx playwright test` (all 3 viewports)
9. Update component `.md` docs for any components you modified
10. Update `CLAUDE.md` — especially the test coverage section and any new conventions

## Commands

```bash
npm run dev                    # Start dev server (localhost:3000)
npm run test:e2e               # All Playwright tests (3 viewports)
npx playwright test --project=desktop-chrome  # Desktop only (faster iteration)
npx next build                 # Type check + build verify
```

## The quality bar

"Would I show this to a paying customer as an example of my work." This is a commercial product. The Today view is the hero surface — 70% of the design energy goes here. Make it count.
