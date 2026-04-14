# BottomSheet

## Purpose

A modal overlay that slides up from the bottom of the screen. Used for the new-task form, task edit form, and any other focused interaction that doesn't warrant full page navigation. Supports Escape key to close, backdrop tap to close, and downward drag-to-dismiss (threshold: 100px). Locks body scroll while open. Animated entry/exit respects `prefers-reduced-motion`.

`BottomSheet` is the **shell** — it owns backdrop, drag handle, ARIA dialog role, focus trap, body-scroll lock, and entrance/exit motion. Feature-specific content and form lifecycle state live in the composing component (e.g. `TaskSheet`).

## Non-purpose

- Not a persistent panel or sidebar — it is a temporary, modal overlay. Use `Sidebar` for persistent navigation.
- Not a confirmation dialog — for destructive confirmations, use a `<dialog>` with `role="alertdialog"` (not yet built in v1).
- Not for long-form content that requires full-page real estate (default mode is capped at 85vh).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility. Mount/unmount is handled internally via `AnimatePresence`. |
| `onClose` | `() => void` | required | Called when the user dismisses the sheet (Escape, backdrop tap, or drag-to-dismiss). |
| `title` | `string \| undefined` | — | Optional heading rendered inside the sheet below the drag handle. Also used as `aria-label` if `ariaLabel` is not provided. |
| `ariaLabel` | `string \| undefined` | — | Explicit ARIA label for the dialog element. Overrides `title` as the accessible name. Use when you want to label the dialog without rendering a visible heading (e.g. TaskSheet manages its own header). Defaults to `"Bottom sheet"` if neither `title` nor `ariaLabel` is provided. |
| `variant` | `"sheet" \| "card"` | `"sheet"` | Layout variant. `"sheet"` = full-bleed bottom-anchored (mobile-idiomatic). `"card"` = centered floating card raised from viewport bottom. |
| `cardMaxWidth` | `string \| undefined` | — | CSS max-width value for the `"card"` variant. Defaults to `var(--content-max-width)` (768px). |
| `heightMode` | `"auto" \| "fit"` | `"auto"` | `"auto"` caps at 85dvh and scrolls tall content. `"fit"` shrinks to content height (no cap). |
| `showDragHandle` | `boolean \| undefined` | true for `"sheet"`, false for `"card"` | Whether to show the drag handle pill. Pass explicitly to override the variant default. |
| `sheetClassName` | `string \| undefined` | — | Additional className merged onto the sheet's outermost `motion.div`. Use for responsive overrides (e.g. `lg:bottom-[var(--space-6)]`). Prefer `variant`/`heightMode` for structural concerns. |
| `contentClassName` | `string \| undefined` | — | Additional className merged onto the content wrapper div. Use to adjust padding per consumer. |
| `dragHandleClassName` | `string \| undefined` | — | Additional className merged onto the drag handle container div. Use to hide the handle at specific breakpoints (e.g. `lg:hidden`). |
| `children` | `React.ReactNode` | required | The sheet's content area. |

## States

| State | Behavior |
|---|---|
| Closed | Not rendered in the DOM (unmounted via `AnimatePresence`). |
| Opening | Sheet slides up from `y: 100%` to `y: 0` over 0.35s. Overlay fades in over 0.2s. |
| Open | Body scroll locked. Escape and backdrop tap active. Focus trapped. |
| Drag in progress | Sheet follows pointer vertically downward (upward constrained at `top: 0`). Only active when `showDragHandle` is truthy. |
| Drag released < 100px | Sheet snaps back to `y: 0`. |
| Drag released ≥ 100px | `onClose` fires. Sheet animates out. |
| Closing | Sheet slides to `y: 100%`. Overlay fades to 0. |
| Reduced motion | `opacity` fade only (no y-translate). `duration: 0`. |

## Accessibility

- Sheet element has `role="dialog"`, `aria-modal="true"`, and `aria-label` set to `ariaLabel` (preferred) or `title` (fallback) or `"Bottom sheet"` (default).
- Escape key closes the sheet via a `keydown` listener added when `isOpen` is true and removed on cleanup.
- Body scroll is locked (`overflow: hidden`) while open to prevent background content scrolling.
- The overlay is `aria-hidden="true"` and handles backdrop-tap dismissal.
- The drag handle is `aria-hidden="true"` — it is a visual affordance only.
- **Focus trap:** Tab key cycles within focusable elements inside the sheet. Shift+Tab reverses. Focus is restored to the triggering element on close.
- On open, the first focusable element (input, textarea, select, button) receives focus automatically via `requestAnimationFrame`.

## Composition pattern

`BottomSheet` is designed to be composed by feature sheets. The composing component owns form/data state and content; `BottomSheet` owns the shell:

```tsx
// TaskSheet composes BottomSheet — shell delegated, form state owned locally
<BottomSheet
  isOpen={isOpen}
  onClose={onClose}
  ariaLabel="What needs doing?"
  variant="sheet"
  heightMode="fit"
  showDragHandle={true}
  dragHandleClassName="lg:hidden"
  sheetClassName="
    lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2
    lg:w-full lg:max-w-[var(--content-max-width)]
    lg:rounded-[var(--radius-xl)]
    lg:bottom-[var(--space-6)]
  "
  contentClassName="pt-[var(--space-2)] lg:px-[var(--space-6)]"
>
  {/* Form content here */}
</BottomSheet>
```

## Usage examples

```tsx
const [open, setOpen] = useState(false);

<>
  <Fab onClick={() => setOpen(true)} />

  <BottomSheet
    isOpen={open}
    onClose={() => setOpen(false)}
    title="New task"
  >
    <NewTaskForm onSubmit={(task) => { addTask(task); setOpen(false); }} />
  </BottomSheet>
</>
```

```tsx
// Without a title (handle-only header) — ariaLabel provides accessible name
<BottomSheet isOpen={open} onClose={() => setOpen(false)} ariaLabel="Settings">
  <SettingsContent />
</BottomSheet>
```

```tsx
// Desktop floating card variant
<BottomSheet
  isOpen={open}
  onClose={() => setOpen(false)}
  title="Quick note"
  variant="card"
  heightMode="fit"
>
  <NoteForm />
</BottomSheet>
```

## Do / Don't

**Do** use `ariaLabel` when the composing component manages its own visible heading. This prevents `BottomSheet` from rendering a duplicate `<h2>` alongside the component's own header.

**Don't** nest interactive components that also capture vertical swipe gestures inside the sheet without testing — the drag-to-dismiss gesture fires on any downward swipe of ≥ 100px on the sheet element itself.

**Do** keep children under ~85vh (in `"auto"` mode). Use `heightMode="fit"` for short forms that should shrink to content.

**Don't** stack multiple `BottomSheet` instances. One sheet at a time is the intended UX.

**Do** pass `sheetClassName` for responsive positioning overrides rather than duplicating animation/positioning logic in the composing component.

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial implementation. Slide-up animation, drag-to-dismiss, Escape/backdrop close, body scroll lock, reduced-motion support. |
| 2026-04-13 | Phase 1b: Added `variant` (`"sheet"` / `"card"`), `heightMode` (`"auto"` / `"fit"`), `ariaLabel` (decouples accessible name from visible heading), `showDragHandle`, `sheetClassName`, `contentClassName`, `dragHandleClassName` props. Focus trap implementation hardened. Designed as a composable shell for `TaskSheet` and future feature sheets. |
