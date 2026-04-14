# TaskSheet

## Purpose

The primary task creation and editing surface. A bottom-anchored sheet that slides up from the screen bottom on both mobile and desktop. Phase 2 adds **inline pickers** for all chip fields and an **expanded section** with time, flexible toggle, notes, and points.

Designed for 2-second task capture: type a title → Enter → done. The sheet is always full-bleed on mobile (true bottom sheet). On desktop it is a floating card bottom-anchored with `max-w-[--content-max-width]` for muscle-memory parity.

`TaskSheet` **composes `BottomSheet`** for its shell (backdrop, drag handle, ARIA dialog role, focus trap, body-scroll lock, entrance/exit motion). `TaskSheet` owns only form lifecycle state (`title`, `isSubmitting`, `submitError`), form content, and the CTA row.

## Non-purpose

- Not a general-purpose bottom sheet (use `BottomSheet` for that).
- Not the place for confirmation dialogs, destructive actions, or non-task content.
- Not the place for confirmation dialogs or destructive actions — use `ConfirmDialog` for that. The edit sheet's Delete button delegates to the parent.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility. |
| `onClose` | `() => void` | required | Called on dismiss: Esc, backdrop tap, drag-down, X button. Silent discard — nothing was saved. |
| `onSubmit` | `(data: TaskFormData) => Promise<void> \| void` | required | Called with all form fields on submit. Parent handles optimistic UI + server sync. Return a rejected Promise to trigger error rollback. |
| `mode` | `"create" \| "edit"` | `"create"` | `"edit"` shows "Editing" header, "Save" CTA, auto-expands More if fields populated, and shows Delete button. |
| `initialData` | `Partial<TaskFormData>` | — | Pre-populate fields for edit mode. Ignored in create mode. |
| `onDelete` | `() => void` | — | Called when the Delete button is tapped in edit mode. Parent handles confirmation and deletion. |
| `userName` | `string` | `"Me"` | Current user's display name (used by AssigneePicker). |
| `partnerName` | `string` | `"Krista"` | Partner's display name (used by AssigneePicker). |

## States

| State | Visual |
|---|---|
| Closed | Not mounted (AnimatePresence via BottomSheet). |
| Opening | Sheet slides up from `y: 100%` in 350ms ease-out-quart. Overlay fades in 200ms. |
| Default (empty title) | Placeholder visible. "Add it" CTA disabled. |
| Title focused | System cursor in textarea. No additional visual change. |
| Title with content | Placeholder hidden. "Add it" CTA enabled. |
| Chip focus-visible | 2px accent outline on focused chip. |
| CTA hover | Deeper accent bg + stronger glow shadow. |
| CTA focus-visible | 2px accent outline. |
| CTA active | `scale(0.97)`. |
| CTA disabled | 50% opacity, no shadow, cursor blocked. |
| Edit mode open | Header says "Editing". All fields pre-populated from `initialData`. More section auto-expanded if any expanded fields have values. CTA says "Save". |
| Edit submit | "Saving…" spinner. On success, sheet closes. Title not cleared. |
| Delete button visible | Edit mode only. Destructive text below CTA row, separated by a border. |
| Submitting | CTA shows spinner + "Adding…" (create) or "Saving…" (edit). All chips disabled. Textarea disabled. |
| Server error | Error message fades in below textarea: "That didn't save. Try again?" Toast shown by parent (if sheet already dismissed). CTA re-enabled. |
| Dismissing | Sheet slides out `y: 100%`. Overlay fades out. |
| Reduced motion | Opacity crossfade only, no translate. Duration 0ms. |

## Keyboard behavior

| Key | Behavior |
|---|---|
| Tab | Cycles: textarea → chips → CTA → close button → back to textarea |
| Shift+Tab | Reverse cycle |
| Enter (in textarea, no modifier) | **Submit** — same as clicking "Add it" |
| Shift+Enter (in textarea) | Insert newline |
| Cmd/Ctrl+Enter (anywhere in sheet) | Submit — power-user symmetry with the global open shortcut |
| Escape | Dismiss silently — same as clicking backdrop or X |

Note: Enter was changed from "newline" to "submit" in Phase 1b. This matches common form UX: the textarea auto-grows so multi-line input is still possible via Shift+Enter.

## Accessibility

- `role="dialog"`, `aria-modal="true"`, `aria-label="What needs doing?"` — provided by the composited `BottomSheet`.
- Focus moves to the textarea (`aria-label="Task title"`) on open (double-RAF after BottomSheet's initial focus RAF).
- Focus returns to the element that triggered the sheet on close (managed by BottomSheet).
- Focus trapped inside the sheet while open — Tab/Shift+Tab cycle (managed by BottomSheet).
- `role="alert"` on the server error paragraph — announced immediately by screen readers.
- `role="group"` + `aria-label="Task field shortcuts"` on the chip row.
- Each chip has a descriptive `aria-label` naming the field and current value.
- Drag handle hidden on desktop (`lg:hidden`) — desktop users use Esc and the X button.
- Close button has `aria-label="Close"`.
- CTA button `aria-label` updates to "Adding task…" during submission.
- Body scroll locked while open (managed by BottomSheet).
- Touch targets ≥ 44px on all interactive elements.

## Entry points (Phase 1)

1. **Cmd/Ctrl+Enter anywhere** — wired in `page.tsx` global keydown listener.
2. **Mobile FAB** — FAB `onClick` → `setSheetOpen(true)`.
3. **Desktop toolbar "Add task" button** — `onClick` → `setSheetOpen(true)`.

## Submit flow

1. Parent calls `onSubmit(title)` — parent adds task to list optimistically.
2. On `Promise.resolve`: sheet closes, title cleared.
3. On `Promise.reject`: error state shown inline ("That didn't save. Try again?"), CTA re-enabled.

## Error strategy

**Inline vs. toast — mutually exclusive, not simultaneous:**

- **Sheet open at time of error**: `TaskSheet` shows the inline error message below the textarea. No toast — it would be redundant noise while the sheet is visible.
- **Sheet closed at time of error** (background sync failure — sheet was dismissed before the async call resolved): inline message is unreachable. The parent (`page.tsx`) surfaces a toast: "That didn't save. Try again?" using the `Toast` component.

`page.tsx` uses a `sheetOpenRef` (a `useRef` mirror of `sheetOpen` state) to check the sheet's open state at the moment the error lands — `useState` setters in async callbacks would capture stale closures.

## Phase 2: Inline pickers and expanded section

### Pickers

Each chip opens an inline popover (or BottomSheet for Date on mobile). Closing the picker commits the value — no save button inside pickers.

| Chip | Picker | Component | Mobile behavior |
|---|---|---|---|
| Date | Calendar grid + presets | `DatePicker` in `Popover` (desktop) / `BottomSheet` (mobile) | Secondary bottom sheet |
| Assignee | List with avatars | `AssigneePicker` in `Popover` | Inline popover |
| Category | List with color dots | `CategoryPicker` in `Popover` | Inline popover |
| Repeat | Presets + NLP input | `RepeatPicker` in `Popover` | Inline popover |

Chips show `aria-expanded` when their picker is open and an active visual state (accent-subtle bg + accent border).

### Expanded section ("More")

Toggled by the More chip. Contains:
- **Time**: 15-min stepper, nullable. Shows "No time" or the selected time.
- **Flexible toggle**: radio group, "Hard deadline" / "When you can". Default: Hard deadline.
- **Notes**: multi-line textarea. Placeholder: "Anything else worth saying?"
- **Points**: number input 0–100. Auto-filled from keyword match table, "auto" hint shown when auto-filled.

### Points auto-fill table

| Keyword | Points |
|---|---|
| trash | 5 |
| dishwasher | 5 |
| lawn | 15 |
| groceries | 15 |
| leaves | 30 |

## Desktop behavior

On `lg:` breakpoints the sheet is positioned as a floating card via `sheetClassName` overrides passed to `BottomSheet`:
- `lg:left-1/2 lg:-translate-x-1/2` — horizontally centered.
- `lg:max-w-[--content-max-width]` — capped at 768px.
- `lg:bottom-[--space-6]` — 24px from viewport bottom.
- `lg:rounded-[--radius-xl]` — fully rounded (not just top corners).

The drag handle is `lg:hidden` (via `dragHandleClassName`) — desktop users use Esc and the X button.

## Chip row (mobile scroll)

On mobile the chip row is `overflow-x: auto` with `scrollbar-hide`. A right-edge fade mask (`mask-image: linear-gradient(to right, black 85%, transparent)`) signals there is more content to scroll. On desktop (`lg:`) the mask is removed — all chips fit at desktop width.

## Files

```
src/components/task-sheet/
├── task-sheet.tsx   ← component (source of truth)
└── task-sheet.md    ← this doc
```

## Do / Don't

**Do** pass `onSubmit` as an async function so the sheet can handle server errors and show the retry message.

**Don't** put real DB calls inside `onSubmit` during Phase 1 — the parent hooks into the demo data mechanism.

**Do** keep the chip row non-interactive in Phase 1. Pass `onClick={undefined}` on all chips.

**Don't** open a second `TaskSheet` while one is already open. One sheet at a time.

**Do** test the sheet with a realistic title — "Pick up dry cleaning" — not just "test".

## Changelog

| Date | Change |
|---|---|
| 2026-04-13 | Phase 1: Create mode, peek state, textarea, chip row, CTA, server-error inline + toast, Esc/backdrop/drag-down dismiss, Cmd+Enter submit, keyboard Tab cycle, focus trap, reduced-motion support, desktop floating card variant. |
| 2026-04-13 | Phase 1b: Refactored to compose `<BottomSheet>` for shell (backdrop, drag handle, ARIA, focus trap, motion). TaskSheet now owns only form state + content + CTA. Added `variant`/`heightMode`/`sheetClassName` usage. Enter key changed from newline to submit; Shift+Enter inserts newline. Desktop hint copy updated to show `↵` (Enter) and `⇧↵` (Shift+Enter). Chip row mobile horizontal scroll + right-edge fade mask added. |
| 2026-04-14 | Phase 2: Inline pickers for Date (calendar grid + presets), Assignee (listbox), Category (listbox). Expanded section with time stepper, flexible toggle, notes textarea, auto-fill points. Popover primitive. TaskChip active state + aria-expanded. `onSubmit` now receives `TaskFormData` instead of bare string. Mobile date picker uses secondary BottomSheet. |
| 2026-04-14 | Phase 3: Repeat picker with NLP. Presets (Daily, Weekdays, Weekly, Monthly) + natural language text input for custom rules. Client-side parser handles "every Tuesday and Thursday", "every 3 days", "monthly on the 15th", etc. `TaskFormData` extended with `repeatRule: RepeatRule \| null`. |
| 2026-04-14 | Phase 4: Edit mode — header ("New task" / "Editing"), `initialData` replaces `initialTitle`, CTA/hint variants ("Save" / "↵ to save"), auto-expand More when expanded fields have values, Delete button in edit mode, `onDelete` callback. |
