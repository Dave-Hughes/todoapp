# Phase 4: Edit Mode + Delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the task CRUD lifecycle — edit all fields via TaskSheet in edit mode, delete with undo toast, repeating-task branching delete.

**Architecture:** Reuse TaskSheet with `mode="edit"` and a new `initialData` prop. Add a lightweight `ConfirmDialog` component for delete confirmations. Expand the TaskListItem overflow menu with Edit and Delete. Wire all state management in page.tsx using local demo data (no DB).

**Tech Stack:** React 19, Next.js App Router, Framer Motion, Tailwind CSS v4, Lucide icons, Playwright for E2E.

**Design spec:** `docs/superpowers/specs/2026-04-14-edit-mode-delete-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/components/confirm-dialog/confirm-dialog.tsx` | Centered modal dialog for delete confirmations |
| Create | `src/components/confirm-dialog/confirm-dialog.md` | Component doc |
| Modify | `src/components/task-sheet/task-sheet.tsx` | Add header, edit mode, `initialData` prop, delete button, CTA/hint variants |
| Modify | `src/components/task-sheet/task-sheet.md` | Update docs for edit mode |
| Modify | `src/components/task-list-item/task-list-item.tsx` | Wire onTap to clickable area, expand overflow menu (Edit/Delete), inline delete confirmation, enable menu on done tasks |
| Modify | `src/components/task-list-item/task-list-item.md` | Update docs for new menu items |
| Modify | `src/components/done-accordion/done-accordion.tsx` | Pass `onDelete` and `onEdit` through to TaskListItem |
| Modify | `src/app/page.tsx` | Edit state tracking, edit/delete handlers, ConfirmDialog wiring |
| Modify | `tests/task-sheet.spec.ts` | Edit mode + delete tests |

---

## Task 1: ConfirmDialog Component

**Files:**
- Create: `src/components/confirm-dialog/confirm-dialog.tsx`
- Create: `src/components/confirm-dialog/confirm-dialog.md`

- [ ] **Step 1: Create the ConfirmDialog component**

```tsx
// src/components/confirm-dialog/confirm-dialog.tsx
"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useCallback } from "react";

export interface ConfirmDialogAction {
  label: string;
  onClick: () => void;
  variant?: "destructive" | "default";
}

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: ConfirmDialogAction[];
  cancelLabel?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  actions,
  cancelLabel = "Never mind",
}: ConfirmDialogProps) {
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the element that had focus before the dialog opened
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isOpen]);

  // Focus trap + keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the first action button
    requestAnimationFrame(() => {
      const firstButton = dialogRef.current?.querySelector<HTMLElement>(
        'button[data-action]'
      );
      firstButton?.focus();
    });

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Restore focus on close
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.25, 1, 0.5, 1] }
            }
            className="
              relative z-10
              w-[min(calc(100vw-var(--space-8)),20rem)]
              bg-[var(--color-surface-elevated)]
              rounded-[var(--radius-xl)]
              shadow-[var(--shadow-lg)]
              border border-[var(--color-border-subtle)]
              p-[var(--space-6)]
              flex flex-col gap-[var(--space-4)]
            "
          >
            <h2
              id="confirm-dialog-title"
              className="
                text-[length:var(--text-base)] font-[var(--weight-semibold)]
                text-[color:var(--color-text-primary)]
                text-center
              "
            >
              {title}
            </h2>

            <div className="flex flex-col gap-[var(--space-2)]">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  data-action
                  onClick={action.onClick}
                  className={`
                    w-full py-[var(--space-3)] px-[var(--space-4)]
                    rounded-[var(--radius-md)]
                    text-[length:var(--text-sm)] font-[var(--weight-semibold)]
                    min-h-[var(--touch-target-min)]
                    transition-colors duration-[var(--duration-instant)]
                    ${
                      action.variant === "destructive"
                        ? "bg-[var(--color-destructive)] text-[color:var(--color-text-inverse)] hover:opacity-90"
                        : "bg-[var(--color-surface-dim)] text-[color:var(--color-text-primary)] hover:bg-[var(--color-border-subtle)]"
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}

              <button
                type="button"
                onClick={onClose}
                className="
                  w-full py-[var(--space-3)] px-[var(--space-4)]
                  rounded-[var(--radius-md)]
                  text-[length:var(--text-sm)] font-[var(--weight-medium)]
                  text-[color:var(--color-text-tertiary)]
                  hover:text-[color:var(--color-text-secondary)]
                  hover:bg-[var(--color-surface-dim)]
                  min-h-[var(--touch-target-min)]
                  transition-colors duration-[var(--duration-instant)]
                "
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Create the component doc**

```markdown
<!-- src/components/confirm-dialog/confirm-dialog.md -->
# ConfirmDialog

## Purpose

A lightweight centered modal dialog for confirming destructive actions (e.g., delete). Renders a title, one or more action buttons, and a cancel button. Focus-trapped and keyboard-accessible.

## Non-purpose

- Not for form input or complex content — use BottomSheet for that.
- Not for non-blocking feedback — use Toast for that.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `isOpen` | `boolean` | required | Controls visibility. |
| `onClose` | `() => void` | required | Called on Escape, backdrop click, or cancel button. |
| `title` | `string` | required | Dialog heading (e.g., "Delete it for good?"). |
| `actions` | `ConfirmDialogAction[]` | required | Action buttons. Each has `label`, `onClick`, optional `variant` ("destructive" or "default"). |
| `cancelLabel` | `string` | `"Never mind"` | Cancel button text. |

## States

| State | Behavior |
|---|---|
| Closed | Not in DOM (AnimatePresence). |
| Opening | Backdrop fades in, dialog scales up from 0.95. |
| Open | Focus trapped. First action button auto-focused. |
| Closing | Reverse of opening animation. Focus returns to previously focused element. |
| Reduced motion | Opacity only, no scale. Duration 0. |

## Accessibility

- `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby` pointing to the title.
- Focus trapped: Tab/Shift+Tab cycle within dialog buttons.
- Escape closes the dialog.
- Focus restored to the previously focused element on close.
- All buttons meet touch target minimum (44px).

## Changelog

| Date | Change |
|---|---|
| 2026-04-14 | Phase 4: Initial implementation for delete confirmation flows. |
```

- [ ] **Step 3: Verify the dev server renders without errors**

Run: Open `http://localhost:3000` and check browser console — the component isn't mounted yet but importing it shouldn't break anything.

- [ ] **Step 4: Commit**

```bash
git add src/components/confirm-dialog/confirm-dialog.tsx src/components/confirm-dialog/confirm-dialog.md
git commit -m "feat: add ConfirmDialog component for delete confirmations"
```

---

## Task 2: TaskSheet — Edit Mode Props and Header

**Files:**
- Modify: `src/components/task-sheet/task-sheet.tsx`

- [ ] **Step 1: Replace `initialTitle` with `initialData` prop and add `onDelete`**

In `task-sheet.tsx`, update the `TaskSheetProps` interface and component signature.

Replace:
```tsx
export interface TaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void> | void;
  mode?: TaskSheetMode;
  initialTitle?: string;
  userName?: string;
  partnerName?: string;
}
```

With:
```tsx
export interface TaskSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void> | void;
  onDelete?: () => void;
  mode?: TaskSheetMode;
  /** Pre-populate fields for edit mode. Ignored in create mode. */
  initialData?: Partial<TaskFormData>;
  userName?: string;
  partnerName?: string;
}
```

Update the destructured props in the component function:
```tsx
export function TaskSheet({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  mode = "create",
  initialData,
  userName = "Me",
  partnerName = "Krista",
}: TaskSheetProps) {
```

- [ ] **Step 2: Update the reset effect to use `initialData` in edit mode**

Replace the existing reset `useEffect` (the one triggered by `[isOpen, mode, initialTitle, todayISO]`):

```tsx
  useEffect(() => {
    if (isOpen) {
      const isEdit = mode === "edit";
      setTitle(isEdit ? (initialData?.title ?? "") : "");
      setDate(isEdit ? (initialData?.date ?? todayISO) : todayISO);
      setAssignee(isEdit ? (initialData?.assignee ?? "me") : "me");
      setCategory(isEdit ? (initialData?.category ?? "Uncategorized") : "Uncategorized");
      setRepeatRule(isEdit ? (initialData?.repeatRule ?? null) : null);
      setTime(isEdit ? (initialData?.time ?? null) : null);
      setFlexible(isEdit ? (initialData?.flexible ?? false) : false);
      setNotes(isEdit ? (initialData?.notes ?? "") : "");
      setPoints(isEdit ? (initialData?.points ?? null) : null);
      setPointsManual(isEdit && initialData?.points != null);
      setSubmitError(false);
      setIsSubmitting(false);
      setActivePicker(null);

      // Auto-expand More section in edit mode if any expanded fields have values
      const hasExpandedValues = isEdit && (
        (initialData?.time != null) ||
        (initialData?.flexible === true) ||
        (initialData?.notes != null && initialData.notes !== "") ||
        (initialData?.points != null)
      );
      setIsExpanded(hasExpandedValues);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          textareaRef.current?.focus();
        });
      });
    }
  }, [isOpen, mode, initialData, todayISO]);
```

- [ ] **Step 3: Add the header row**

In the render, replace the existing header row (the `div` with `flex items-center justify-between mb-[var(--space-3)]` containing the close button) with:

```tsx
        {/* ---- Header row ---- */}
        <div className="flex items-center justify-between mb-[var(--space-3)]">
          <h2 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-tertiary)]">
            {mode === "edit" ? "Editing" : "New task"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="
              p-[var(--space-2)] -mr-[var(--space-2)]
              rounded-[var(--radius-md)]
              text-[color:var(--color-text-tertiary)]
              hover:text-[color:var(--color-text-secondary)]
              hover:bg-[var(--color-surface-dim)]
              min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
              flex items-center justify-center
              transition-colors duration-[var(--duration-instant)]
            "
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
```

- [ ] **Step 4: Update CTA row for edit mode**

Replace the CTA button text and aria-label to vary by mode:

```tsx
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label={
                isSubmitting
                  ? mode === "edit" ? "Saving\u2026" : "Adding task\u2026"
                  : mode === "edit" ? "Save" : "Add it"
              }
              className="/* ...existing classes unchanged... */"
            >
              {isSubmitting ? (
                <span
                  className="inline-block w-4 h-4 border-2 border-[color:var(--color-accent-text)] border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {isSubmitting
                ? mode === "edit" ? "Saving\u2026" : "Adding\u2026"
                : mode === "edit" ? "Save" : "Add it"}
            </button>
```

Update the keyboard hint text (the `<p>` element with `hidden lg:block`):

```tsx
            <p
              className="
                hidden lg:block
                text-[length:var(--text-xs)] text-[color:var(--color-text-disabled)]
              "
              aria-hidden="true"
            >
              <kbd className="font-[family-name:var(--font-mono)]">↵</kbd> to {mode === "edit" ? "save" : "add"}
              &nbsp;&middot;&nbsp;
              <kbd className="font-[family-name:var(--font-mono)]">⇧↵</kbd> newline
              &nbsp;&middot;&nbsp;
              <kbd className="font-[family-name:var(--font-mono)]">Esc</kbd> to cancel
            </p>
```

- [ ] **Step 5: Add the Delete button below the CTA row (edit mode only)**

After the CTA row `</div>`, before `</form>`, add:

```tsx
          {/* ---- Delete button (edit mode only) ---- */}
          {mode === "edit" && onDelete && (
            <div className="mt-[var(--space-3)] pt-[var(--space-3)] border-t border-[var(--color-border-subtle)]">
              <button
                type="button"
                onClick={onDelete}
                className="
                  w-full py-[var(--space-2)]
                  text-[length:var(--text-sm)] font-[var(--weight-medium)]
                  text-[color:var(--color-destructive)]
                  hover:text-[color:var(--color-destructive)] hover:bg-[var(--color-destructive-subtle,var(--color-surface-dim))]
                  rounded-[var(--radius-md)]
                  min-h-[var(--touch-target-min)]
                  transition-colors duration-[var(--duration-instant)]
                "
              >
                Delete
              </button>
            </div>
          )}
```

- [ ] **Step 6: Update handleSubmit — don't clear title in edit mode**

In the `handleSubmit` function, the line `setTitle("")` should only run in create mode:

```tsx
      await onSubmit({
        title: trimmed,
        date,
        assignee,
        category,
        repeatRule,
        time,
        flexible,
        notes: notes.trim(),
        points,
      });
      if (mode !== "edit") {
        setTitle("");
      }
      onClose();
```

- [ ] **Step 7: Commit**

```bash
git add src/components/task-sheet/task-sheet.tsx
git commit -m "feat: TaskSheet edit mode — header, initialData, CTA variants, delete button"
```

---

## Task 3: TaskListItem — Overflow Menu Expansion

**Files:**
- Modify: `src/components/task-list-item/task-list-item.tsx`

- [ ] **Step 1: Add new props for edit and delete**

Update the `TaskListItemProps` interface to add the new callbacks:

```tsx
interface TaskListItemProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
  onPostpone: (taskId: string) => void;
  onTap: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  showAssignee?: boolean;
  variant?: "active" | "done";
  showSwipeHint?: boolean;
}
```

Destructure `onDelete` in the component:

```tsx
export function TaskListItem({
  task,
  onComplete,
  onUncomplete,
  onPostpone,
  onTap,
  onDelete,
  showAssignee = true,
  variant = "active",
  showSwipeHint = false,
}: TaskListItemProps) {
```

- [ ] **Step 2: Add inline delete confirmation state**

Add state for the delete confirmation mode inside the component, near the other state declarations:

```tsx
  const [deleteConfirming, setDeleteConfirming] = useState(false);
```

Also, reset deleteConfirming when the menu closes:

In the `useEffect` that handles `menuOpen`, add a cleanup in the dependency effect. Actually, simpler: reset when menu opens/closes. Add to the existing `setMenuOpen` toggle:

Find the menu button `onClick`:
```tsx
onClick={(e) => {
  e.stopPropagation();
  setMenuOpen((prev) => !prev);
}}
```

Replace with:
```tsx
onClick={(e) => {
  e.stopPropagation();
  setMenuOpen((prev) => {
    if (prev) setDeleteConfirming(false);
    return !prev;
  });
}}
```

- [ ] **Step 3: Make the task content area clickable for edit**

Find the task info `<div>` (the one with `className="flex-1 min-w-0 text-left cursor-default"`). Make it a button for accessibility:

Replace:
```tsx
        <div
          className="flex-1 min-w-0 text-left cursor-default"
        >
```

With:
```tsx
        <button
          type="button"
          onClick={() => onTap(task.id)}
          className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)]"
          aria-label={`Edit "${task.title}"`}
        >
```

And change the closing `</div>` to `</button>` (the one right after the metadata section ends).

- [ ] **Step 4: Rewrite the overflow menu content with Edit, Delete, and inline confirmation**

Import `Pencil` and `Trash2` from lucide-react at the top of the file. Add to the existing import:

```tsx
import { Clock, CalendarClock, Check, ArrowRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
```

Replace the entire menu portal content (inside `createPortal(...)`) with the expanded menu. The key change is replacing the existing two-button menu with the four-item menu including inline delete confirmation.

Replace the `<motion.div ref={menuRef} role="menu" ...>` and its children with:

```tsx
                  <motion.div
                    ref={menuRef}
                    role="menu"
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15, ease: [0.25, 1, 0.5, 1] }}
                    style={{
                      position: "fixed",
                      top: menuPosition.top,
                      right: menuPosition.right,
                    }}
                    className="
                      z-[var(--z-dropdown)]
                      min-w-[11rem]
                      bg-[var(--color-surface-elevated)] rounded-[var(--radius-lg)]
                      shadow-[var(--shadow-md)] border border-[var(--color-border-subtle)]
                      py-[var(--space-2)]
                    "
                  >
                    {deleteConfirming ? (
                      /* Inline delete confirmation */
                      <>
                        <p className="px-[var(--space-4)] py-[var(--space-1)] text-[length:var(--text-xs)] font-[var(--weight-semibold)] text-[color:var(--color-text-secondary)]">
                          Delete it for good?
                        </p>
                        <button
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(task.id);
                            setMenuOpen(false);
                            setDeleteConfirming(false);
                          }}
                          className="
                            w-full flex items-center gap-[var(--space-3)]
                            px-[var(--space-4)] py-[var(--space-2)]
                            text-[length:var(--text-sm)] font-[var(--weight-semibold)]
                            text-[color:var(--color-destructive)]
                            hover:bg-[var(--color-surface-dim)]
                            rounded-[var(--radius-sm)]
                            transition-colors duration-[var(--duration-instant)]
                            min-h-[var(--touch-target-min)]
                          "
                        >
                          <Trash2 size={15} strokeWidth={2} />
                          Delete
                        </button>
                        <button
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirming(false);
                          }}
                          className="
                            w-full flex items-center gap-[var(--space-3)]
                            px-[var(--space-4)] py-[var(--space-2)]
                            text-[length:var(--text-sm)] font-[var(--weight-medium)]
                            text-[color:var(--color-text-tertiary)]
                            hover:bg-[var(--color-surface-dim)]
                            rounded-[var(--radius-sm)]
                            transition-colors duration-[var(--duration-instant)]
                            min-h-[var(--touch-target-min)]
                          "
                        >
                          Never mind
                        </button>
                      </>
                    ) : (
                      /* Normal menu */
                      <>
                        {/* Edit */}
                        <button
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTap(task.id);
                            setMenuOpen(false);
                          }}
                          className="
                            w-full flex items-center gap-[var(--space-3)]
                            px-[var(--space-4)] py-[var(--space-2)]
                            text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-primary)]
                            hover:bg-[var(--color-surface-dim)]
                            rounded-[var(--radius-sm)]
                            transition-colors duration-[var(--duration-instant)]
                            min-h-[var(--touch-target-min)]
                          "
                        >
                          <Pencil size={15} strokeWidth={2} className="text-[color:var(--color-text-secondary)]" />
                          Edit
                        </button>

                        {/* Done */}
                        <button
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDone) {
                              celebrateAndComplete(task.id);
                            }
                            setMenuOpen(false);
                          }}
                          disabled={isDone}
                          aria-disabled={isDone}
                          className={`
                            w-full flex items-center gap-[var(--space-3)]
                            px-[var(--space-4)] py-[var(--space-2)]
                            text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-primary)]
                            hover:bg-[var(--color-success-subtle)]
                            rounded-[var(--radius-sm)]
                            transition-colors duration-[var(--duration-instant)]
                            min-h-[var(--touch-target-min)]
                            ${isDone ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}
                          `}
                        >
                          <Check size={15} strokeWidth={2.5} className="text-[color:var(--color-success)]" />
                          Done
                        </button>

                        {/* Tomorrow */}
                        <button
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isDone) {
                              onPostpone(task.id);
                            }
                            setMenuOpen(false);
                          }}
                          disabled={isDone}
                          aria-disabled={isDone}
                          className={`
                            w-full flex items-center gap-[var(--space-3)]
                            px-[var(--space-4)] py-[var(--space-2)]
                            text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-primary)]
                            hover:bg-[var(--color-warning-subtle)]
                            rounded-[var(--radius-sm)]
                            transition-colors duration-[var(--duration-instant)]
                            min-h-[var(--touch-target-min)]
                            ${isDone ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""}
                          `}
                        >
                          <ArrowRight size={15} strokeWidth={2} className="text-[color:var(--color-warning)]" />
                          Tomorrow
                        </button>

                        {/* Divider */}
                        <div className="my-[var(--space-1)] mx-[var(--space-3)] border-t border-[var(--color-border-subtle)]" role="separator" />

                        {/* Delete */}
                        <button
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirming(true);
                          }}
                          className="
                            w-full flex items-center gap-[var(--space-3)]
                            px-[var(--space-4)] py-[var(--space-2)]
                            text-[length:var(--text-sm)] font-[var(--weight-medium)]
                            text-[color:var(--color-destructive)]
                            hover:bg-[var(--color-surface-dim)]
                            rounded-[var(--radius-sm)]
                            transition-colors duration-[var(--duration-instant)]
                            min-h-[var(--touch-target-min)]
                          "
                        >
                          <Trash2 size={15} strokeWidth={2} />
                          Delete
                        </button>
                      </>
                    )}
                  </motion.div>
```

- [ ] **Step 5: Show the overflow menu on done-variant tasks**

Currently the overflow menu `<div>` is wrapped in `{!isDone && (...)}`. Remove this condition so the menu renders for both active and done tasks.

Find:
```tsx
        {/* Overflow menu — always visible on mobile, visible on hover/focus on desktop */}
        {!isDone && (
```

Replace with:
```tsx
        {/* Overflow menu — always visible on mobile, visible on hover/focus on desktop */}
        {(
```

And remove the corresponding closing `)}` — change it to just `)`.

Also, update the arrow-key handler in the `useEffect` for `menuOpen` to skip disabled items. In the arrow-key navigation section, replace:

```tsx
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
        if (!items || items.length === 0) return;
        const currentIndex = Array.from(items).indexOf(document.activeElement as HTMLElement);
        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        items[nextIndex].focus();
      }
```

With:

```tsx
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []
        );
        if (items.length === 0) return;
        const currentIndex = items.indexOf(document.activeElement as HTMLElement);
        let nextIndex: number;
        if (e.key === "ArrowDown") {
          nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        }
        items[nextIndex].focus();
      }
```

- [ ] **Step 6: Commit**

```bash
git add src/components/task-list-item/task-list-item.tsx
git commit -m "feat: expand overflow menu with Edit, Delete, inline confirmation, done-task support"
```

---

## Task 4: DoneAccordion — Pass Through New Callbacks

**Files:**
- Modify: `src/components/done-accordion/done-accordion.tsx`

- [ ] **Step 1: Add `onDelete` prop and pass through to TaskListItem**

Update `DoneAccordionProps` and the component:

```tsx
interface DoneAccordionProps {
  tasks: Task[];
  onUncomplete: (taskId: string) => void;
  onTap: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function DoneAccordion({ tasks, onUncomplete, onTap, onDelete }: DoneAccordionProps) {
```

Update the `TaskListItem` render inside the accordion. Find:

```tsx
              {tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onComplete={() => {}}
                  onUncomplete={onUncomplete}
                  onPostpone={() => {}}
                  onTap={onTap}
                  showAssignee={false}
                  variant="done"
                />
              ))}
```

Replace with:

```tsx
              {tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onComplete={() => {}}
                  onUncomplete={onUncomplete}
                  onPostpone={() => {}}
                  onTap={onTap}
                  onDelete={onDelete}
                  showAssignee={false}
                  variant="done"
                />
              ))}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/done-accordion/done-accordion.tsx
git commit -m "feat: pass onDelete through DoneAccordion to TaskListItem"
```

---

## Task 5: Page.tsx — Wire Edit Mode and Delete Handlers

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add edit and delete state**

Near the top of `TodayPage`, after `const [sheetOpen, setSheetOpen] = useState(false);`, add:

```tsx
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    taskId: string;
    isRepeating: boolean;
  } | null>(null);
```

Also add the import for `ConfirmDialog` at the top of the file:

```tsx
import { ConfirmDialog } from "../components/confirm-dialog/confirm-dialog";
```

- [ ] **Step 2: Add `taskToFormData` helper**

Add this helper function inside the component (or above it, near the other helpers):

```tsx
  /** Convert a Task (list item shape) to TaskFormData (sheet shape) for edit mode. */
  function taskToFormData(task: Task): Partial<TaskFormData> {
    let assignee: import("../components/assignee-picker/assignee-picker").AssigneeValue = "shared";
    if (task.assigneeName === DEMO_USER) assignee = "me";
    else if (task.assigneeName === DEMO_PARTNER) assignee = "partner";

    return {
      title: task.title,
      date: new Date().toISOString().split("T")[0], // demo: always today
      assignee,
      category: task.categoryName ?? "Uncategorized",
      repeatRule: null, // demo data doesn't have repeat rules
      time: task.dueTime ?? null,
      flexible: task.flexible,
      notes: "", // demo data doesn't have notes
      points: null, // demo data doesn't have points
    };
  }
```

- [ ] **Step 3: Update `handleTap` to open edit mode**

Replace the existing `handleTap`:

```tsx
  const handleTap = useCallback((_taskId: string) => {
    // Opens task detail — placeholder for now
  }, []);
```

With:

```tsx
  const handleTap = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId) ?? doneTasks.find((t) => t.id === taskId);
    if (!task) return;
    setEditingTask(task);
    setSheetOpen(true);
  }, [tasks, doneTasks]);
```

- [ ] **Step 4: Add `handleEditSubmit` handler**

```tsx
  const handleEditSubmit = useCallback(async (data: TaskFormData): Promise<void> => {
    if (!editingTask) return;

    const assigneeName =
      data.assignee === "me"
        ? DEMO_USER
        : data.assignee === "partner"
          ? DEMO_PARTNER
          : undefined;

    const updatedTask: Task = {
      ...editingTask,
      title: data.title,
      flexible: data.flexible,
      dueTime: data.time ?? undefined,
      assigneeName,
      categoryName: data.category === "Uncategorized" ? undefined : data.category,
    };

    // Update in the correct list (active or done)
    if (editingTask.completedAt) {
      setDoneTasks((prev) => prev.map((t) => t.id === editingTask.id ? updatedTask : t));
    } else {
      setTasks((prev) => prev.map((t) => t.id === editingTask.id ? updatedTask : t));
    }

    // Simulate server delay
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }, [editingTask]);
```

- [ ] **Step 5: Add `handleDelete` and `handleDeleteFromSheet` handlers**

```tsx
  const lastDeletedRef = useRef<{ task: Task; wasCompleted: boolean } | null>(null);

  const executeDelete = useCallback((taskId: string) => {
    const activeTask = tasks.find((t) => t.id === taskId);
    const doneTask = doneTasks.find((t) => t.id === taskId);
    const task = activeTask ?? doneTask;
    if (!task) return;

    const wasCompleted = !!doneTask;
    lastDeletedRef.current = { task, wasCompleted };

    if (wasCompleted) {
      setDoneTasks((prev) => prev.filter((t) => t.id !== taskId));
      const earned = 5; // demo points
      setUserPoints((p) => p - earned);
      setUserPointsToday((p) => p - earned);
    } else {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }

    setToast({
      message: "Deleted.",
      action: {
        label: "Undo",
        onClick: () => {
          const restored = lastDeletedRef.current;
          if (restored) {
            if (restored.wasCompleted) {
              setDoneTasks((prev) => [restored.task, ...prev]);
              const earned = 5;
              setUserPoints((p) => p + earned);
              setUserPointsToday((p) => p + earned);
            } else {
              setTasks((prev) => [...prev, restored.task]);
            }
            lastDeletedRef.current = null;
          }
          setToast(null);
        },
      },
    });
  }, [tasks, doneTasks]);

  /** Called from overflow menu inline delete confirmation (non-repeating). */
  const handleDelete = useCallback((taskId: string) => {
    executeDelete(taskId);
  }, [executeDelete]);

  /** Called from the Delete button inside the edit sheet. */
  const handleDeleteFromSheet = useCallback(() => {
    if (!editingTask) return;
    const taskId = editingTask.id;
    // Close the sheet first, then show the dialog
    setSheetOpen(false);
    setEditingTask(null);
    // For demo data, no tasks are repeating, so just show the simple dialog
    setDeleteDialog({ taskId, isRepeating: false });
  }, [editingTask]);
```

- [ ] **Step 6: Update sheet close handler to reset edit state**

Replace:
```tsx
        onClose={() => setSheetOpen(false)}
```

With:
```tsx
        onClose={() => {
          setSheetOpen(false);
          setEditingTask(null);
        }}
```

- [ ] **Step 7: Update TaskSheet render to support edit mode**

Replace the existing `<TaskSheet>` render:

```tsx
      <TaskSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditSubmit : handleCreateTask}
        onDelete={editingTask ? handleDeleteFromSheet : undefined}
        mode={editingTask ? "edit" : "create"}
        initialData={editingTask ? taskToFormData(editingTask) : undefined}
        userName={DEMO_USER}
        partnerName={DEMO_PARTNER}
      />
```

- [ ] **Step 8: Pass `onDelete` to TaskListItem in all list renders and DoneAccordion**

In the primary tasks section, add `onDelete={handleDelete}` to `TaskListItem`:

```tsx
                      <TaskListItem
                        task={task}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        onPostpone={handlePostpone}
                        onTap={handleTap}
                        onDelete={handleDelete}
                        showSwipeHint={index === 0 && !swipeHintShown.current}
                      />
```

Same for secondary tasks:

```tsx
                      <TaskListItem
                        task={task}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        onPostpone={handlePostpone}
                        onTap={handleTap}
                        onDelete={handleDelete}
                      />
```

And in DoneAccordion renders (there are two — in the caught-up block and the normal block):

```tsx
          <DoneAccordion
            tasks={filteredDone}
            onUncomplete={handleUncomplete}
            onTap={handleTap}
            onDelete={handleDelete}
          />
```

- [ ] **Step 9: Add ConfirmDialog for delete-from-sheet flow**

After the `<Toast>` component and before the closing `</AppShell>`, add:

```tsx
      {/* ---- Delete confirmation dialog (from edit sheet) ---- */}
      <ConfirmDialog
        isOpen={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        title="Delete it for good?"
        actions={
          deleteDialog?.isRepeating
            ? [
                {
                  label: "Just this one",
                  variant: "destructive" as const,
                  onClick: () => {
                    if (deleteDialog) executeDelete(deleteDialog.taskId);
                    setDeleteDialog(null);
                  },
                },
                {
                  label: "All future ones too",
                  variant: "destructive" as const,
                  onClick: () => {
                    if (deleteDialog) executeDelete(deleteDialog.taskId);
                    setDeleteDialog(null);
                  },
                },
              ]
            : [
                {
                  label: "Delete",
                  variant: "destructive" as const,
                  onClick: () => {
                    if (deleteDialog) executeDelete(deleteDialog.taskId);
                    setDeleteDialog(null);
                  },
                },
              ]
        }
      />
```

- [ ] **Step 10: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: wire edit mode and delete flows in page.tsx"
```

---

## Task 6: Update Component Docs

**Files:**
- Modify: `src/components/task-sheet/task-sheet.md`
- Modify: `src/components/task-list-item/task-list-item.md`

- [ ] **Step 1: Update task-sheet.md**

Add to the Props table — replace the `initialTitle` row with `initialData` and add `onDelete`:

In the Props table, replace `| \`initialTitle\` | \`string\` | \`""\` | Pre-fill for Edit mode. |` with:

```
| `initialData` | `Partial<TaskFormData>` | — | Pre-populate fields for edit mode. Ignored in create mode. |
| `onDelete` | `() => void` | — | Called when the Delete button is tapped in edit mode. Parent handles confirmation and deletion. |
```

Add to the States table:

```
| Edit mode open | Header says "Editing". All fields pre-populated from `initialData`. More section auto-expanded if any expanded fields have values. CTA says "Save". |
| Edit submit | "Saving…" spinner. On success, sheet closes. Title not cleared. |
| Delete button visible | Edit mode only. Destructive text below CTA row, separated by a border. |
```

Add to the Changelog:

```
| 2026-04-14 | Phase 4: Edit mode — header ("New task" / "Editing"), `initialData` replaces `initialTitle`, CTA/hint variants ("Save" / "↵ to save"), auto-expand More when expanded fields have values, Delete button in edit mode, `onDelete` callback. |
```

- [ ] **Step 2: Update task-list-item.md**

Add `onDelete` to the Props table:

```
| `onDelete` | `(taskId: string) => void` | — | Called when delete is confirmed via inline menu confirmation. |
```

Update the Accessibility section to describe the new menu items:

Add to the overflow menu description:
```
- **Overflow menu (Phase 4)**: Expanded to four items — Edit, Done, Tomorrow, Delete — with a divider above Delete. For done-variant tasks, Done and Tomorrow are disabled (`aria-disabled="true"`) and skipped by arrow-key navigation. Delete triggers an inline confirmation ("Delete it for good?" with "Delete" / "Never mind"). The task content area is now a `<button>` with `aria-label="Edit ..."` for tap-to-edit accessibility.
```

Add to the Changelog:

```
| 2026-04-14 | Phase 4: Expanded overflow menu (Edit, Done, Tomorrow, Delete with divider). Inline delete confirmation. Done-variant tasks get the menu with Done/Tomorrow disabled. Task content area is now a `<button>` for tap-to-edit. Arrow-key nav skips disabled items. |
```

- [ ] **Step 3: Commit**

```bash
git add src/components/task-sheet/task-sheet.md src/components/task-list-item/task-list-item.md
git commit -m "docs: update TaskSheet and TaskListItem docs for Phase 4"
```

---

## Task 7: Playwright Tests — Edit Mode

**Files:**
- Modify: `tests/task-sheet.spec.ts`

- [ ] **Step 1: Add edit mode test section**

Append these tests to `tests/task-sheet.spec.ts`:

```ts
// ===========================================================================
// EDIT MODE (Phase 4)
// ===========================================================================

test.describe("Task sheet — edit mode", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("tapping a task row opens the edit sheet with pre-populated title", async ({ page }) => {
    await page.goto("/");
    // Click the first task's title area
    const firstTask = page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ });
    await firstTask.click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog).toBeVisible();
    // Title should be pre-populated
    const textarea = dialog.getByLabel("Task title");
    await expect(textarea).toHaveValue("Pick up dry cleaning");
  });

  test("edit sheet shows 'Editing' header and 'Save' CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByText("Editing")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("edit sheet shows '↵ to save' keyboard hint on desktop", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByText("to save")).toBeVisible();
  });

  test("create sheet shows 'New task' header", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByText("New task")).toBeVisible();
  });

  test("edit mode saves updated title to the task list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const textarea = dialog.getByLabel("Task title");
    await textarea.fill("Pick up laundry instead");
    await dialog.getByRole("button", { name: "Save" }).click();
    // Sheet should close
    await expect(dialog).not.toBeVisible();
    // Updated title should appear in the list
    await expect(page.getByText("Pick up laundry instead")).toBeVisible();
  });

  test("closing edit sheet without saving leaves task unchanged", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const textarea = dialog.getByLabel("Task title");
    await textarea.fill("Something completely different");
    // Close via Escape
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    // Original title should still be there
    await expect(page.getByText("Pick up dry cleaning")).toBeVisible();
    await expect(page.getByText("Something completely different")).not.toBeVisible();
  });

  test("edit mode auto-expands More section when task has time set", async ({ page }) => {
    await page.goto("/");
    // "Pick up dry cleaning" has dueTime: "10:00 AM"
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // The time stepper should be visible (More section auto-expanded)
    await expect(dialog.getByText("When today?")).toBeVisible();
  });

  test("Edit option in overflow menu opens edit sheet", async ({ page }) => {
    await page.goto("/");
    // Hover to reveal overflow menu, then click it
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Task title")).toHaveValue("Pick up dry cleaning");
  });

  test("edit sheet shows Delete button", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByRole("button", { name: "Delete" })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the edit mode tests**

Run: `npx playwright test tests/task-sheet.spec.ts --grep "edit mode" --project=desktop-chrome`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/task-sheet.spec.ts
git commit -m "test: add edit mode Playwright tests for Phase 4"
```

---

## Task 8: Playwright Tests — Delete Flow

**Files:**
- Modify: `tests/task-sheet.spec.ts`

- [ ] **Step 1: Add delete flow test section**

Append to `tests/task-sheet.spec.ts`:

```ts
// ===========================================================================
// DELETE FLOW (Phase 4)
// ===========================================================================

test.describe("Task sheet — delete flow", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("overflow menu shows Delete option with divider", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    // Verify all four menu items exist
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Done" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Tomorrow" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    // Verify divider exists
    await expect(page.getByRole("separator")).toBeVisible();
  });

  test("clicking Delete shows inline confirmation", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByText("Delete it for good?")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Never mind" })).toBeVisible();
  });

  test("Never mind cancels inline delete and returns to menu", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("menuitem", { name: "Never mind" }).click();
    // Should be back to normal menu
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByText("Delete it for good?")).not.toBeVisible();
  });

  test("confirming Delete removes task and shows undo toast", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    // Click the destructive "Delete" in the confirmation
    await page.getByRole("menuitem", { name: "Delete" }).click();
    // Task should be gone
    await expect(page.getByText("Pick up dry cleaning")).not.toBeVisible();
    // Undo toast should appear
    await expect(page.getByRole("status")).toContainText("Deleted.");
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  test("undo restores deleted task", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByText("Pick up dry cleaning")).not.toBeVisible();
    // Click Undo
    await page.getByRole("button", { name: "Undo" }).click();
    // Task should be back
    await expect(page.getByText("Pick up dry cleaning")).toBeVisible();
  });

  test("delete from edit sheet closes sheet then shows dialog", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog).toBeVisible();
    // Click Delete inside the sheet
    await dialog.getByRole("button", { name: "Delete" }).click();
    // Sheet should close
    await expect(dialog).not.toBeVisible();
    // Confirmation dialog should appear
    const confirmDialog = page.getByRole("alertdialog");
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByText("Delete it for good?")).toBeVisible();
  });

  test("confirming delete from dialog removes task", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const sheet = page.getByRole("dialog", { name: "What needs doing?" });
    await sheet.getByRole("button", { name: "Delete" }).click();
    // Confirm in dialog
    const confirmDialog = page.getByRole("alertdialog");
    await confirmDialog.getByRole("button", { name: "Delete" }).click();
    // Task gone, toast visible
    await expect(page.getByText("Pick up dry cleaning")).not.toBeVisible();
    await expect(page.getByRole("status")).toContainText("Deleted.");
  });

  test("done tasks have overflow menu with Edit and Delete enabled", async ({ page }) => {
    await page.goto("/");
    // Expand the Done accordion
    await page.getByRole("button", { name: /Done/ }).click();
    // Hover the first done task to reveal menu
    const doneTask = page.getByText("Take out trash").locator('..');
    await doneTask.hover();
    const menuBtn = page.getByRole("button", { name: /Actions for "Take out trash"/ });
    await menuBtn.click();
    // Edit and Delete should be enabled
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeEnabled();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeEnabled();
    // Done and Tomorrow should be disabled
    const doneItem = page.getByRole("menuitem", { name: "Done" });
    await expect(doneItem).toHaveAttribute("aria-disabled", "true");
  });
});
```

- [ ] **Step 2: Run the delete flow tests**

Run: `npx playwright test tests/task-sheet.spec.ts --grep "delete flow" --project=desktop-chrome`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/task-sheet.spec.ts
git commit -m "test: add delete flow Playwright tests for Phase 4"
```

---

## Task 9: Run Full Test Suite and Fix

**Files:**
- Possibly any of the above if tests fail

- [ ] **Step 1: Run the full task-sheet test suite across all viewports**

Run: `npx playwright test tests/task-sheet.spec.ts`

Expected: All tests pass across desktop-chrome, mobile-chrome (Pixel 7), and mobile-safari (iPhone 14).

- [ ] **Step 2: Fix any failures**

If any tests fail, read the error, diagnose, and fix. Common issues:
- Mobile viewport tests may need different selectors (FAB vs toolbar button).
- Hover-to-reveal menus don't work on mobile — tests should tap the always-visible menu button.
- The `openSheet` helper uses "Add task" button which may need updating if the create header changed the dialog's aria-label.

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve Phase 4 test failures across viewports"
```

---

## Task 10: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the build flow checkboxes**

Find the build flow section and check off Phase 4:

```markdown
   - ✅ Phase 3: Repeat picker with NLP (presets + natural language input, client-side parser)
   - ✅ Phase 4: Edit mode + Delete (edit sheet, inline delete confirmation, ConfirmDialog, undo toast)
```

- [ ] **Step 2: Update the file structure**

Add the new component to the file structure:

```markdown
    │   ├── confirm-dialog/    ← centered modal for delete confirmations
```

- [ ] **Step 3: Update the test coverage section**

Update the test counts and add Phase 4 coverage descriptions:

```markdown
Covers (task-sheet): ...existing coverage..., edit mode (tap-to-edit, overflow menu edit, pre-populated fields, header/CTA variants, auto-expand More, save updates list, close without saving preserves task), delete flow (inline menu confirmation, "Never mind" cancel, delete removes task, undo toast, undo restores task, delete from edit sheet via dialog, done tasks menu with disabled items).
```

- [ ] **Step 4: Update the design system conventions table**

Add:

```markdown
| Delete confirmation (non-repeating) | Inline in overflow menu — transforms to confirmation row |
| Delete confirmation (repeating) | Centered ConfirmDialog with branching options |
| Edit sheet entry | Tap task row (primary) or "Edit" in overflow menu (secondary) |
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Phase 4 completion"
```
