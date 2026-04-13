# Today View Delight — Design Spec

> Three micro-delight features for the Today view that enhance the daily ritual of completing tasks as a couple.

## 1. Varied Completion Toast Copy

### What changes
The `handleComplete` callback in `src/app/page.tsx` currently hardcodes `"Nice. One less thing."` for every task completion. Replace with a rotating pool of context-aware messages selected by task context.

### Copy pools

**General completions (default):**
- "Nice. One less thing."
- "Done and done."
- "Off the list."
- "Handled."
- "One down."

**Partner-created tasks (task.createdByName !== current user):**
- "{Partner} asked, you delivered."
- "That's off {Partner}'s mind now."
- "{Partner}'s gonna notice that."

**Self-created tasks (task.createdByName === current user):**
- "Handled your own business."
- "Self-assigned and self-handled."

### Selection logic
- Partner-aware copy takes priority when the completing user is not the task creator.
- Selection is pseudo-random, seeded by `task.id` so that hitting Undo and re-completing shows the same message.
- A simple hash of the task ID modulo pool length is sufficient.

### Files touched
- `src/app/page.tsx` — `handleComplete` callback, new helper function for copy selection.

---

## 2. Completion Micro-Celebration

### What changes
The `Checkbox` component gains a brief radial bloom effect when transitioning from unchecked to checked.

### Animation spec
- **Scale pulse:** Checkbox background scales from 1.0 → 1.15 → 1.0 over 300ms, ease-out-quart.
- **Radial ring:** A faint accent-colored ring expands outward from the checkbox center. Opacity 0.4 → 0, scale 1.0 → 2.0, duration 400ms, ease-out-quart.
- **Existing checkmark:** The path-length draw animation (250ms) remains unchanged. The bloom layers behind it.
- **Reduced motion:** Both effects collapse to instant opacity-only transitions.
- **Uncheck:** No bloom. Just the reverse checkmark animation (already implemented).

### Implementation
- A new `<motion.span>` inside the checkbox `<button>`, absolutely positioned behind the SVG.
- Keyed on a `celebrateKey` state that increments on check (not on uncheck), so AnimatePresence fires the enter animation only on completion.
- The ring element is a second `<motion.span>` with `rounded-full`, `border` styling in accent color, animated with scale and opacity.

### Files touched
- `src/components/checkbox/checkbox.tsx` — new bloom and ring motion elements, new `onCelebrate` trigger logic.

---

## 3. Caught-Up Summary

### What changes
The `EmptyState` component's `caught-up` variant shows a secondary line summarizing what the couple accomplished today.

### New prop
- `completedCount?: number` — total number of tasks completed today (unfiltered).

### Copy variants (rotated by date, matching existing pattern)
- "You two knocked out {n} things today."
- "{n} things handled between you two."
- "That's {n} off the list. Not bad."

Singular variants for n === 1:
- "You two knocked out one thing today."
- "One thing handled between you two."
- "That's one off the list. Not bad."

### Display
- Shown below the main caught-up copy headline.
- Display font (`--font-display`), `--text-base` size, `--color-text-secondary` color.
- Only rendered when `completedCount > 0`.
- Entrance: fades in 200ms after the headline (staggered).

### Data flow
- `page.tsx` passes `doneTasks.length` (the full unfiltered done list length) as `completedCount` to `EmptyState` when `variant="caught-up"`.

### Files touched
- `src/components/empty-state/empty-state.tsx` — new prop, new summary line, new copy pool.
- `src/app/page.tsx` — pass `completedCount={doneTasks.length}` to EmptyState.

---

## Accessibility

- All animations respect `prefers-reduced-motion` (existing pattern).
- Toast copy remains in a `role="status"` `aria-live="polite"` region (existing).
- The caught-up summary is plain text within the existing empty state landmark.
- The checkbox bloom is purely decorative (`aria-hidden` on the motion spans).

## Testing

- Existing Playwright tests cover completion flow, toast display, empty state variants, and reduced motion. New behavior should not break existing assertions.
- Toast text assertions in tests that check for exact "Nice. One less thing." will need updating to match any of the new copy pool variants (use regex or `toContainText` with partial match).
- New assertions to add: caught-up summary text appears when all tasks are completed, summary count matches done task count.
