"use client";

import { motion, AnimatePresence, useReducedMotion, type PanInfo } from "framer-motion";
import { EASE_OUT_QUART } from "../../lib/motion";
import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Clock, CalendarClock, Check, ArrowRight, MoreVertical, Pencil, Trash2, RotateCw, UsersRound } from "lucide-react";
import { Checkbox } from "../checkbox/checkbox";
import { Avatar } from "../avatar/avatar";
import { Tooltip } from "../tooltip/tooltip";
import { formatRepeatRule } from "../repeat-picker/format-repeat";
import type { RepeatRule } from "../repeat-picker/parse-repeat";

export interface Task {
  id: string;
  title: string;
  dueTime?: string;
  flexible: boolean;
  /** Display name of the single assignee. `undefined` when shared (see `isShared`) or truly unassigned. */
  assigneeName?: string;
  /** Task is assigned to both partners. Renders a two-person circle instead of an avatar. */
  isShared?: boolean;
  categoryName?: string;
  completedAt?: string;
  completedByName?: string;
  createdByName: string;
  overdueDays?: number;
  repeatRule?: RepeatRule | null;
  /** Point value earned on completion. Hidden on the row when 0. */
  points?: number | null;
  /** Free-form notes. Not rendered on the row; needed for edit-sheet round-tripping. */
  notes?: string | null;
}

interface TaskListItemProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onUncomplete: (taskId: string) => void;
  onPostpone: (taskId: string) => void;
  onTap: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
  showAssignee?: boolean;
  variant?: "active" | "done";
  /** Show a one-time swipe-right nudge on mobile to teach the gesture. */
  showSwipeHint?: boolean;
}

const SWIPE_THRESHOLD = 80;

/** Maps a category name to a color slot index (1–5) deterministically. */
function getCategoryColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 5) + 1;
}

/** Well-known category → slot overrides for consistent, meaningful colors. */
const CATEGORY_COLOR_MAP: Record<string, number> = {
  Errands: 1,  // terracotta
  Health: 2,   // sage
  Home: 3,     // honey
  Bills: 4,    // plum
};

function getOverdueLabel(days: number): string {
  if (days === 1) return "from yesterday";
  if (days <= 3) return `from ${days} days ago`;
  return "still hanging around";
}

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
  const shouldReduceMotion = useReducedMotion();
  const [isCompleting, setIsCompleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; openUp: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const constraintsRef = useRef(null);
  const [hintPlayed, setHintPlayed] = useState(false);

  const isDone = variant === "done";

  // Swipe discovery hint: nudge the card right briefly on mobile
  useEffect(() => {
    if (!showSwipeHint || shouldReduceMotion || hintPlayed || isDone) return;

    const timer = setTimeout(() => {
      setHintPlayed(true);
    }, 800);

    return () => clearTimeout(timer);
  }, [showSwipeHint, shouldReduceMotion, hintPlayed, isDone]);

  // Position and close the overflow menu
  useEffect(() => {
    if (!menuOpen) return;

    // Calculate position from button — flip upward if near viewport bottom
    if (menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      // 4 items (44px each) + separator (8px) + padding (16px) ~ 200px. Use 240px with margin.
      const menuHeight = 240;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > menuHeight;

      setMenuPosition({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        right: window.innerWidth - rect.right,
        openUp,
      });
    }

    function handleClick(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Tab") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
        if (e.key === "Tab") e.preventDefault();
        return;
      }
      // Arrow-key navigation within the menu
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])');
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
    }

    // Auto-focus first menu item on open
    requestAnimationFrame(() => {
      const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      firstItem?.focus();
    });

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  // Micro-celebration: hold the checked state briefly before signaling completion
  const celebrateAndComplete = useCallback((taskId: string) => {
    if (isCompleting) return;
    setIsCompleting(true);
    const delay = shouldReduceMotion ? 0 : 150;
    setTimeout(() => {
      onComplete(taskId);
    }, delay);
  }, [isCompleting, shouldReduceMotion, onComplete]);

  // True between drag-start and the click that follows the drag-end.
  // Prevents quick swipes from also firing the title's onClick → edit sheet.
  const wasDraggedRef = useRef(false);

  const handleDragStart = useCallback(() => {
    wasDraggedRef.current = false;
  }, []);

  const handleDrag = useCallback((_: unknown, info: PanInfo) => {
    // 4px is the smallest movement we consider a "real" drag (matches Framer's
    // default minimum). Below that, the gesture should still register as a tap.
    if (Math.abs(info.offset.x) > 4) wasDraggedRef.current = true;
  }, []);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const { offset } = info;
    if (offset.x > SWIPE_THRESHOLD && !isDone) {
      celebrateAndComplete(task.id);
    } else if (offset.x < -SWIPE_THRESHOLD && !isDone) {
      onPostpone(task.id);
    }
  }, [isDone, celebrateAndComplete, onPostpone, task.id]);

  const handleTitleClick = useCallback(() => {
    if (wasDraggedRef.current) {
      wasDraggedRef.current = false;
      return;
    }
    onTap(task.id);
  }, [onTap, task.id]);

  return (
    <div
      ref={constraintsRef}
      data-task-id={task.id}
      className="relative overflow-hidden group"
    >
      {/* Swipe action backgrounds — each on its own side */}
      {!isDone && (
        <>
          {/* Complete (revealed when swiping right) — sits behind on the left */}
          <div
            className="absolute inset-y-0 left-0 right-1/2 flex items-center pl-[var(--space-4)] bg-[var(--color-success)] rounded-l-[inherit]"
            style={{ color: "var(--color-text-inverse)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}
            aria-hidden="true"
          >
            <Check size={16} strokeWidth={2.5} className="mr-[var(--space-2)]" />
            Done
          </div>
          {/* Postpone (revealed when swiping left) — sits behind on the right */}
          <div
            className="absolute inset-y-0 left-1/2 right-0 flex items-center justify-end pr-[var(--space-4)] bg-[var(--color-warning-subtle)] rounded-r-[inherit]"
            style={{ color: "var(--color-warning)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)" }}
            aria-hidden="true"
          >
            Postpone
            <ArrowRight size={14} strokeWidth={2} className="ml-[var(--space-1)]" />
          </div>
        </>
      )}

      {/* Task content — draggable */}
      <motion.div
        drag={isDone ? false : "x"}
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.2}
        dragSnapToOrigin
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        {...(showSwipeHint && hintPlayed && !isDone
          ? {
              animate: { x: [0, 48, 0] },
              transition: {
                x: {
                  duration: 0.7,
                  ease: EASE_OUT_QUART,
                  times: [0, 0.4, 1],
                },
              },
            }
          : {})}
        className={`
          relative flex items-center gap-[var(--space-3)]
          px-[var(--space-4)] py-[var(--space-3)]
          bg-[var(--color-surface)]
          ${!isDone ? "touch-pan-y" : ""}
        `}
      >
        {/* Checkbox */}
        <Tooltip label={isDone ? "Undo" : "Complete"}>
          <Checkbox
            checked={isDone || isCompleting}
            onChange={() => (isDone ? onUncomplete(task.id) : celebrateAndComplete(task.id))}
            disabled={isCompleting}
            label={isDone ? `Mark "${task.title}" incomplete` : `Complete "${task.title}"`}
          />
        </Tooltip>

        {/* Task info */}
        <button
          type="button"
          onClick={handleTitleClick}
          className="flex-1 min-w-0 text-left cursor-pointer bg-transparent border-none p-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] rounded-[var(--radius-sm)] group/edit"
          aria-label={`Edit "${task.title}"`}
        >
          <p
            className={`
              text-[length:var(--text-base)] font-[var(--weight-medium)] leading-[var(--leading-tight)]
              truncate underline-offset-[3px] decoration-[color:var(--color-text-tertiary)]
              ${
                isDone
                  ? "line-through text-[color:var(--color-text-disabled)] font-[var(--weight-normal)]"
                  : "text-[color:var(--color-text-primary)] lg:group-hover/edit:underline"
              }
            `}
          >
            {task.title}
          </p>

          {/* Metadata — minimal, scannable */}
          {((!isDone && (task.dueTime || task.categoryName || task.repeatRule || (task.points && task.points > 0) || (task.overdueDays && task.overdueDays > 0))) || (isDone && task.completedByName)) && (
            <div className="flex items-center gap-[var(--space-2)] mt-[var(--space-0-5)]">
              {task.dueTime && !isDone && (
                <span className="inline-flex items-center gap-[var(--space-0-5)] text-[length:var(--text-xs)] text-[color:var(--color-text-secondary)] tabular-nums">
                  <Clock size={11} strokeWidth={2} aria-hidden="true" className="opacity-50" />
                  {task.dueTime}
                </span>
              )}

              {task.repeatRule && !isDone && (
                <span
                  className="inline-flex items-center gap-[var(--space-0-5)] text-[length:var(--text-xs)] text-[color:var(--color-text-secondary)]"
                  aria-label={`Repeats: ${formatRepeatRule(task.repeatRule)}`}
                >
                  <RotateCw size={11} strokeWidth={2} aria-hidden="true" className="opacity-50" />
                  {formatRepeatRule(task.repeatRule)}
                </span>
              )}

              {task.overdueDays && task.overdueDays > 0 && !isDone && (
                <span className="inline-flex items-center gap-[var(--space-0-5)] px-[var(--space-1-5)] rounded-[var(--radius-full)] bg-[var(--color-warning-subtle)] text-[length:var(--text-xs)] leading-[var(--leading-tight)] text-[color:var(--color-warning)]">
                  <CalendarClock size={10} strokeWidth={2} aria-hidden="true" />
                  {getOverdueLabel(task.overdueDays)}
                </span>
              )}

              {task.points != null && task.points > 0 && !isDone && (
                <span
                  className="
                    inline-flex items-center
                    px-[var(--space-1-5)] rounded-[var(--radius-full)]
                    bg-[var(--color-accent-subtle)] text-[color:var(--color-accent-hover)]
                    text-[length:var(--text-xs)] leading-[var(--leading-tight)] font-[var(--weight-semibold)]
                    tabular-nums
                  "
                  aria-label={`Worth ${task.points} ${task.points === 1 ? "point" : "points"}`}
                >
                  {task.points}&nbsp;pts
                </span>
              )}

              {task.categoryName && !isDone && (() => {
                const slot = CATEGORY_COLOR_MAP[task.categoryName] ?? getCategoryColorIndex(task.categoryName);
                return (
                  <span
                    className="
                      inline-flex items-center
                      px-[var(--space-1-5)] rounded-[var(--radius-full)]
                      text-[length:var(--text-xs)] leading-[var(--leading-tight)]
                    "
                    style={{
                      backgroundColor: `var(--color-category-${slot}-subtle)`,
                      color: `var(--color-category-${slot})`,
                    }}
                  >
                    {task.categoryName}
                  </span>
                );
              })()}

              {isDone && task.completedByName && (
                <span className="text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)]">
                  {task.completedByName}
                </span>
              )}
            </div>
          )}
        </button>

        {/* Inline actions — desktop: appear on hover/focus, always in DOM for keyboard */}
        {!isDone && (
          <div className="hidden lg:flex items-center gap-[var(--space-1)] shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-[var(--duration-instant)]">
            <Tooltip label="Done">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  celebrateAndComplete(task.id);
                }}
                aria-label={`Complete "${task.title}"`}
                className="
                  p-[var(--space-2)] rounded-[var(--radius-sm)]
                  text-[color:var(--color-success)] hover:bg-[var(--color-success-subtle)]
                  transition-colors duration-[var(--duration-instant)]
                  min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
                  flex items-center justify-center
                "
              >
                <Check size={16} strokeWidth={2.5} />
              </button>
            </Tooltip>
            <Tooltip label="Tomorrow">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPostpone(task.id);
                }}
                aria-label={`Postpone "${task.title}"`}
                className="
                  p-[var(--space-2)] rounded-[var(--radius-sm)]
                  text-[color:var(--color-warning)] hover:bg-[var(--color-warning-subtle)]
                  transition-colors duration-[var(--duration-instant)]
                  min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
                  flex items-center justify-center
                "
              >
                <ArrowRight size={16} strokeWidth={2} />
              </button>
            </Tooltip>
          </div>
        )}

        {/* Overflow menu — always visible on mobile, visible on hover/focus on desktop */}
        <div className="relative shrink-0 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity duration-[var(--duration-instant)]">
          <Tooltip label="More">
            <button
              ref={menuButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              aria-label={`Actions for "${task.title}"`}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="
                p-[var(--space-2)] rounded-[var(--radius-sm)]
                text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]
                hover:bg-[var(--color-canvas)]
                transition-colors duration-[var(--duration-instant)]
                min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
                flex items-center justify-center
              "
            >
              <MoreVertical size={16} strokeWidth={2} />
            </button>
          </Tooltip>

          {/* Portal-rendered dropdown to escape overflow:hidden ancestors */}
          {typeof document !== "undefined" && createPortal(
            <AnimatePresence>
              {menuOpen && menuPosition && (
                <motion.div
                  ref={menuRef}
                  role="menu"
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
                  transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15, ease: EASE_OUT_QUART }}
                  style={{
                    position: "fixed",
                    ...(menuPosition.openUp
                      ? { bottom: window.innerHeight - menuPosition.top }
                      : { top: menuPosition.top }),
                    right: menuPosition.right,
                  }}
                  className="
                    z-[var(--z-dropdown)]
                    min-w-[11rem]
                    bg-[var(--color-surface-elevated)] rounded-[var(--radius-lg)]
                    shadow-[var(--shadow-md)] border border-[var(--color-border-subtle)]
                    py-[var(--space-2)]
                    overflow-hidden
                  "
                >
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
                          hover:bg-[var(--color-canvas)]
                          transition-colors duration-[var(--duration-instant)]
                          min-h-[var(--touch-target-min)]
                          outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]
                        "
                      >
                        <Pencil size={15} strokeWidth={2} className="text-[color:var(--color-text-secondary)]" />
                        Edit
                      </button>
                      <button
                        role="menuitem"
                        disabled={isDone}
                        aria-disabled={isDone}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDone) return;
                          celebrateAndComplete(task.id);
                          setMenuOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-[var(--space-3)]
                          px-[var(--space-4)] py-[var(--space-2)]
                          text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-primary)]
                          hover:bg-[var(--color-success-subtle)]
                          transition-colors duration-[var(--duration-instant)]
                          min-h-[var(--touch-target-min)]
                          outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]
                          ${isDone ? "opacity-40 cursor-not-allowed" : ""}
                        `}
                      >
                        <Check size={15} strokeWidth={2.5} className="text-[color:var(--color-success)]" />
                        Done
                      </button>
                      <button
                        role="menuitem"
                        disabled={isDone}
                        aria-disabled={isDone}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDone) return;
                          onPostpone(task.id);
                          setMenuOpen(false);
                        }}
                        className={`
                          w-full flex items-center gap-[var(--space-3)]
                          px-[var(--space-4)] py-[var(--space-2)]
                          text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-primary)]
                          hover:bg-[var(--color-warning-subtle)]
                          transition-colors duration-[var(--duration-instant)]
                          min-h-[var(--touch-target-min)]
                          outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]
                          ${isDone ? "opacity-40 cursor-not-allowed" : ""}
                        `}
                      >
                        <ArrowRight size={15} strokeWidth={2} className="text-[color:var(--color-warning)]" />
                        Tomorrow
                      </button>
                      <div role="separator" className="border-t border-[var(--color-border-subtle)] my-[var(--space-1)]" />
                      <button
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(task.id);
                          setMenuOpen(false);
                        }}
                        className="
                          w-full flex items-center gap-[var(--space-3)]
                          px-[var(--space-4)] py-[var(--space-2)]
                          text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-destructive)]
                          hover:bg-[var(--color-destructive-subtle)]
                          transition-colors duration-[var(--duration-instant)]
                          min-h-[var(--touch-target-min)]
                          outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)]
                        "
                      >
                        <Trash2 size={15} strokeWidth={2} />
                        Delete
                      </button>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>

        {/* Assignee indicator — avatar for single assignee, two-person circle for shared */}
        {showAssignee && task.isShared && (
          <div
            role="img"
            aria-label="Shared with partner"
            className={`inline-flex shrink-0 items-center justify-center h-7 w-7 rounded-[var(--radius-full)] bg-[var(--color-accent-subtle)] text-[color:var(--color-accent-hover)] ${isDone ? "opacity-40" : ""}`}
          >
            <UsersRound size={14} strokeWidth={2} aria-hidden="true" />
          </div>
        )}
        {showAssignee && !task.isShared && task.assigneeName && (
          <Avatar name={task.assigneeName} size="sm" className={isDone ? "opacity-40" : ""} />
        )}
      </motion.div>
    </div>
  );
}
