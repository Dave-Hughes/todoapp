# Phase 4 Design Spec: Edit Mode + Delete

> **Status:** Approved 2026-04-14. Ready for implementation planning.
> **Scope:** Edit mode for TaskSheet, delete flow with undo, repeating-task branching delete.
> **STOP boundary:** No DB persistence, no Week/Month views, no partner notifications.

## Feature Summary

Edit mode and delete complete the task CRUD lifecycle. Users can tap any task to edit all its fields in the same sheet used for creation, and delete tasks via the overflow menu or from within the edit sheet. Repeating tasks get branching delete logic. All interactions use local state with demo data — no real DB persistence.

## Primary User Action

Tap a task, edit it quickly, save. Most edits are a single field change. The edit sheet should feel like a fast correction, not a heavy form.

## Design Decisions (from shaping session)

### Edit entry points

- **Primary:** Tap the task row content area → opens TaskSheet in edit mode.
- **Secondary:** "Edit" option in the overflow menu → same result.
- Both paths open the same `TaskSheet` with `mode="edit"`.

### TaskSheet changes for edit mode

| Aspect | Create mode | Edit mode |
|---|---|---|
| Header | "New task" | "Editing" |
| CTA label | "Add it" | "Save" |
| CTA submitting | "Adding..." | "Saving..." |
| Keyboard hint | "↵ to add" | "↵ to save" |
| Fields | All defaults | Pre-populated from task state |
| Delete button | Not shown | Destructive text button below CTA |
| Close behavior | Discards input, no warning | Discards changes, no warning |

### Props changes

- Replace `initialTitle?: string` with `initialData?: Partial<TaskFormData>`.
- Create mode passes nothing (all defaults). Edit mode passes the full task state.
- `onSubmit` signature unchanged — parent tracks which task is being edited in its own state.
- Add `onDelete?: () => void` callback for the delete button inside the edit sheet.

### Auto-expand "More" section in edit mode

If any expanded-section field has a non-default value (time is set, flexible is true, notes is non-empty, points is non-null), auto-expand the "More" section when the sheet opens in edit mode. Otherwise the user might not realize those fields have values.

## Overflow Menu Redesign

### Active tasks

| Position | Item | Icon | Color |
|---|---|---|---|
| 1 | Edit | Pencil (lucide `Pencil`) | Default text |
| 2 | Done | Check | Success |
| 3 | Tomorrow | ArrowRight | Warning |
| — | Divider | — | Border subtle |
| 4 | Delete | Trash2 | Destructive |

### Completed (done) tasks

Same menu structure, but Done and Tomorrow are **disabled** (reduced opacity, non-interactive, `aria-disabled="true"`). Arrow-key navigation skips disabled items. Edit and Delete remain active.

| Position | Item | State |
|---|---|---|
| 1 | Edit | Enabled |
| 2 | Done | Disabled |
| 3 | Tomorrow | Disabled |
| — | Divider | — |
| 4 | Delete | Enabled |

## Delete Flow

### Non-repeating tasks (from overflow menu)

1. User taps "Delete" in overflow menu.
2. The Delete menu item transforms inline into a confirmation:
   - Small header: "Delete it for good?"
   - Two actions: "Delete" (destructive) / "Never mind" (subtle)
3. On confirm: task soft-deleted, disappears with exit animation.
4. Toast appears: "Deleted." with "Undo" action, 6-second duration.
5. Undo restores full previous state (including points if task was completed).
6. After toast expires: delete is permanent.

### Non-repeating tasks (from edit sheet)

1. User taps "Delete" button at the bottom of the edit sheet.
2. Edit sheet closes first.
3. A small centered dialog appears: "Delete it for good?" with "Delete" / "Never mind".
4. Same toast/undo flow as above.

**Rationale:** Using a dialog (not inline menu) when deleting from the edit sheet because there's no overflow menu context to transform inline. The sheet closing first avoids stacking a dialog on top of a bottom sheet.

### Repeating tasks (from either entry point)

1. User taps "Delete" (from overflow menu or edit sheet).
2. If from edit sheet: sheet closes first.
3. A centered dialog appears:
   - Header: "Delete it for good?"
   - Option 1: "Just this one"
   - Option 2: "All future ones too"
   - Cancel: "Never mind"
4. "Just this one" → soft-deletes the single occurrence. Future occurrences unaffected.
5. "All future ones too" → deletes all unfinished tasks sharing the same `parent_task_id` with due dates after this one, clears the repeat rule on this task.
6. Same toast/undo flow. Undo restores whichever scope was deleted.

## Confirmation Dialog Component

A new lightweight dialog component is needed for the repeating-task delete flow and the edit-sheet delete flow.

**Requirements:**
- Centered overlay with backdrop dim
- Accessible: `role="alertdialog"`, `aria-labelledby`, `aria-describedby`
- Focus trapped inside the dialog
- Escape closes (triggers cancel)
- Click outside closes (triggers cancel)
- Respects `prefers-reduced-motion` for entry/exit animation
- Uses theme tokens throughout (no hard-coded values)
- Touch targets >= 44px on all actions

**Layout:**
- Header text (e.g., "Delete it for good?")
- Action buttons stacked vertically for clarity
- Cancel action at the bottom, subtle styling
- Destructive actions use `--color-destructive`

## Key States

| State | What the user sees |
|---|---|
| Edit sheet open | Sheet rises with all fields pre-populated. Title focused. Header says "Editing." |
| Edit with no changes | Save button still enabled (no dirty tracking). |
| Edit submit | "Saving..." with spinner. On success, sheet closes. |
| Edit submit error | Inline: "That didn't save. Try again?" (same as create). |
| Edit close without saving | Sheet closes silently. Task unchanged. |
| Delete confirmation (non-repeating, from menu) | Inline menu transforms to confirmation row. |
| Delete confirmation (non-repeating, from edit sheet) | Dialog appears after sheet closes. |
| Delete confirmation (repeating) | Dialog with two scope options + cancel. |
| Delete undo window | Task gone, toast with Undo for 6 seconds. |
| Delete undo triggered | Task reappears in previous position/state, points restored if completed. |

## Content / Copy

| Surface | Copy |
|---|---|
| Create header | "New task" |
| Edit header | "Editing" |
| Create CTA | "Add it" |
| Edit CTA | "Save" |
| Create CTA (submitting) | "Adding..." |
| Edit CTA (submitting) | "Saving..." |
| Create keyboard hint | "↵ to add · ⇧↵ newline · Esc to cancel" |
| Edit keyboard hint | "↵ to save · ⇧↵ newline · Esc to cancel" |
| Edit sheet delete button | "Delete" |
| Overflow: Edit | "Edit" |
| Overflow: Delete | "Delete" |
| Inline delete confirmation header | "Delete it for good?" |
| Inline delete confirm | "Delete" |
| Inline delete cancel | "Never mind" |
| Dialog header (all delete dialogs) | "Delete it for good?" |
| Dialog: single delete | "Delete" / "Never mind" |
| Dialog: repeating option 1 | "Just this one" |
| Dialog: repeating option 2 | "All future ones too" |
| Dialog cancel | "Never mind" |
| Delete toast | "Deleted." |
| Delete toast action | "Undo" |

## Interaction Model

### Edit flow
1. User taps task row OR taps "Edit" in overflow menu.
2. Parent sets `editingTask` state + opens TaskSheet with `mode="edit"` and `initialData` from the task.
3. User modifies fields using same pickers as create mode.
4. Enter or tap "Save" → `onSubmit` fires with updated `TaskFormData`.
5. Parent updates the task in local state using the tracked `editingTask.id`.
6. Sheet closes on success.

### Delete flow (non-repeating, from overflow menu)
1. Tap overflow "..." → tap "Delete".
2. Menu item transforms to inline confirmation: "Delete it for good?" / "Delete" / "Never mind".
3. "Delete" → task removed with exit animation → toast with Undo.
4. "Never mind" or Escape → menu returns to normal state.

### Delete flow (non-repeating, from edit sheet)
1. Tap "Delete" at bottom of edit sheet.
2. Sheet closes.
3. Dialog appears: "Delete it for good?" / "Delete" / "Never mind".
4. "Delete" → task removed → toast with Undo.

### Delete flow (repeating, from either entry)
1. Tap "Delete" (from menu or edit sheet; if edit sheet, it closes first).
2. Dialog: "Delete it for good?" / "Just this one" / "All future ones too" / "Never mind".
3. Choice determines deletion scope.
4. Task(s) removed → toast with Undo.

## Components Affected

| Component | Change |
|---|---|
| `task-sheet` | Add header, edit mode behavior, `initialData` prop, delete button, CTA/hint variants |
| `task-list-item` | Wire `onTap` to open edit mode, expand overflow menu with Edit/Delete, inline delete confirmation, enable menu on done tasks |
| `page.tsx` | Track `editingTask` state, wire edit submit/delete handlers, delete confirmation dialog state |
| **New: `confirm-dialog`** | Centered dialog for repeating-task delete and edit-sheet delete |
| `toast` | No changes needed — already supports message + action |

## Test Coverage (to add in Phase 4)

### Edit mode tests
- Tap task row opens edit sheet with pre-populated fields
- "Edit" in overflow menu opens edit sheet
- All fields pre-populated correctly (title, date, assignee, category, repeat, time, flexible, notes, points)
- Header shows "Editing", CTA shows "Save"
- Keyboard hint shows "↵ to save"
- More section auto-expands when expanded fields have values
- Submit updates the task in the list
- Close without saving leaves task unchanged
- Error state shows inline message
- Edit works for completed tasks (from done section menu)

### Delete tests
- "Delete" appears in overflow menu with divider above
- Non-repeating: inline confirmation shows "Delete it for good?"
- "Never mind" cancels and returns to menu
- "Delete" removes task, shows undo toast
- Undo restores task to previous state
- Undo restores points if task was completed
- Toast auto-dismisses after ~6 seconds
- Delete from edit sheet: sheet closes, dialog appears
- Repeating task: dialog with "Just this one" / "All future ones too"
- "Just this one" removes single occurrence
- "All future ones too" removes all future occurrences
- Escape closes dialog (triggers cancel)
- Click outside dialog closes it
- Done tasks can be deleted (menu available, delete works)
- Keyboard accessibility on all confirmation surfaces

### Overflow menu tests
- Active tasks: Edit, Done, Tomorrow, divider, Delete
- Done tasks: Edit enabled, Done disabled, Tomorrow disabled, divider, Delete enabled
- Arrow key navigation through menu items (skips disabled)
- Edit in menu opens edit sheet
