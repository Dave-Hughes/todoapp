"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { taskListVariants } from "@/lib/motion";
import { FilterToggle, type FilterValue } from "@/components/filter-toggle/filter-toggle";
import { TaskListItem, type Task as UITask } from "@/components/task-list-item/task-list-item";
import { DoneAccordion } from "@/components/done-accordion/done-accordion";
import { EmptyState } from "@/components/empty-state/empty-state";
import { Fab } from "@/components/fab/fab";
import { TaskSheet, type TaskFormData } from "@/components/task-sheet/task-sheet";
import { Toast } from "@/components/toast/toast";
import { InviteBanner } from "@/components/invite-banner/invite-banner";
import { TaskListSkeleton } from "@/components/task-list-skeleton/task-list-skeleton";
import { WeekDayStrip, type WeekDay } from "@/components/week-day-strip/week-day-strip";
import { useMe } from "@/lib/hooks/use-me";
import { useCategories } from "@/lib/hooks/use-categories";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useUncompleteTask,
} from "@/lib/hooks/use-tasks";
import type { CreateTaskInput } from "@/lib/api/validators";
import {
  todayIso as currentIso,
  addDaysIso,
  emptyDayCopy,
  toUITask,
  uiTaskToFormData,
  formDataToCreateInput,
} from "@/lib/task-adapters";

/* ================================================================
 * Week math — Sunday-anchored calendar weeks (US convention)
 * ================================================================ */

/** Returns the Sunday that starts the calendar week containing `iso`. */
function startOfWeekIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  const dow = dt.getUTCDay(); // 0 = Sunday
  return addDaysIso(iso, -dow);
}

function buildWeekDays(weekStartIso: string, tasksByDate: Map<string, number>, todayIsoStr: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysIso(weekStartIso, i);
    const dt = new Date(`${iso}T00:00:00`);
    return {
      iso,
      shortName: dt.toLocaleDateString("en-US", { weekday: "short" }),
      dayOfMonth: dt.getDate(),
      count: tasksByDate.get(iso) ?? 0,
      isToday: iso === todayIsoStr,
    };
  });
}

/** Format "Apr 13 – 19" or "Apr 28 – May 4" for the week heading. */
function formatWeekRange(weekStartIso: string): string {
  const startDt = new Date(`${weekStartIso}T00:00:00`);
  const endDt = new Date(`${addDaysIso(weekStartIso, 6)}T00:00:00`);
  const sameMonth = startDt.getMonth() === endDt.getMonth();
  const startStr = startDt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = sameMonth
    ? String(endDt.getDate())
    : endDt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${startStr} – ${endStr}`;
}

/* ================================================================
 * Page
 * ================================================================ */

export default function WeekPage() {
  const shouldReduceMotion = useReducedMotion();
  const todayIsoStr = useMemo(() => currentIso(), []);

  // Server data
  const { data: meData } = useMe();
  const { data: cats = [] } = useCategories();
  const { data: dbTasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();

  const me = meData?.me ?? null;
  const partner = meData?.partner ?? null;
  // Points + counts for the sidebar chrome are owned by (views)/layout.tsx now.

  const categoryNameById = useMemo(
    () => new Map(cats.map((c) => [c.id, c.name])),
    [cats],
  );
  const categoryIdByName = useMemo(
    () => new Map(cats.map((c) => [c.name, c.id])),
    [cats],
  );

  // ---- Week navigation state ----
  //
  // `weekStartIso` and `selectedIso` are kept in sync by the nav handlers
  // below (not by an effect) so React doesn't need a render pass to
  // reconcile an out-of-range selection.
  const [weekStartIso, setWeekStartIso] = useState(() => startOfWeekIso(todayIsoStr));
  const [selectedIso, setSelectedIso] = useState(todayIsoStr);

  // ---- Counts per day across the whole horizon (pre-filter, hard-deadline only) ----
  //
  // Density indicators reflect "hard things on that day" — the spec treats the
  // strip as a planning signal. Flexible tasks roll with the user and don't
  // create a meaningful anchor point, so they're excluded from the dot count
  // (they still render in the "When you can" section below).
  const tasksByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of dbTasks) {
      if (t.completedAt) continue;
      if (t.flexible) continue;
      m.set(t.dueDate, (m.get(t.dueDate) ?? 0) + 1);
    }
    return m;
  }, [dbTasks]);

  const weekDays = useMemo(
    () => buildWeekDays(weekStartIso, tasksByDate, todayIsoStr),
    [weekStartIso, tasksByDate, todayIsoStr],
  );

  // Tasks on the currently selected day
  const selectedDayDbTasks = useMemo(() => {
    return dbTasks.filter((t) => {
      if (t.dueDate === selectedIso) return true;
      // For the day that is "today", carry flexible past-due tasks forward
      // into the secondary section — mirrors Today view's behavior so the user
      // doesn't see the same task in two places.
      if (selectedIso === todayIsoStr && t.flexible && !t.completedAt) {
        return t.dueDate <= todayIsoStr;
      }
      return false;
    });
  }, [dbTasks, selectedIso, todayIsoStr]);

  const uiTasks = useMemo(() => {
    if (!me) return [] as UITask[];
    return selectedDayDbTasks.map((t) =>
      toUITask(t, me, partner, categoryNameById, todayIsoStr),
    );
  }, [selectedDayDbTasks, me, partner, categoryNameById, todayIsoStr]);

  const active = uiTasks.filter((t) => !t.completedAt);
  const done = uiTasks.filter((t) => !!t.completedAt);

  // ---- UI state ----
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<UITask | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    action?: { label: string; onClick: () => void };
  } | null>(null);
  const sheetOpenRef = useRef(sheetOpen);

  const filteredActive = useMemo(() => {
    if (!me) return active;
    return active.filter((t) => {
      if (filter === "all") return true;
      if (filter === "mine") return t.assigneeName === me.displayName || !t.assigneeName;
      return t.assigneeName === partner?.displayName || !t.assigneeName;
    });
  }, [active, filter, me, partner]);

  const filteredDone = useMemo(() => {
    if (!me) return done;
    return done.filter((t) => {
      if (filter === "all") return true;
      if (filter === "mine") return t.completedByName === me.displayName;
      return t.completedByName === partner?.displayName;
    });
  }, [done, filter, me, partner]);

  const primary = filteredActive.filter((t) => !t.flexible);
  const secondary = filteredActive.filter((t) => t.flexible);

  const totalWeekActive = useMemo(() => {
    const set = new Set(weekDays.map((d) => d.iso));
    return dbTasks.filter((t) => !t.completedAt && !t.flexible && set.has(t.dueDate)).length;
  }, [dbTasks, weekDays]);

  const isWeekEmpty =
    !isLoading &&
    weekDays.every((d) => d.count === 0) &&
    !dbTasks.some((t) => !t.completedAt && t.flexible);
  const isDayEmpty = !isLoading && !isWeekEmpty && filteredActive.length === 0 && filteredDone.length === 0;

  const selectedDayLabel = useMemo(() => {
    const dt = new Date(`${selectedIso}T00:00:00`);
    return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }, [selectedIso]);

  const isSelectedToday = selectedIso === todayIsoStr;

  /* ----------------------------------------------------------------
   * Handlers
   * ---------------------------------------------------------------- */

  const handleComplete = useCallback(
    (id: string) => {
      if (!me) return;
      completeTask.mutate(id);
      setToast({
        message: "Done and done.",
        action: {
          label: "Undo",
          onClick: () => {
            uncompleteTask.mutate(id);
            setToast(null);
          },
        },
      });
    },
    [me, completeTask, uncompleteTask],
  );

  const handleUncomplete = useCallback(
    (id: string) => uncompleteTask.mutate(id),
    [uncompleteTask],
  );

  const handlePostpone = useCallback(
    (id: string) => {
      const nextIso = addDaysIso(selectedIso, 1);
      updateTask.mutate({ id, patch: { dueDate: nextIso } });
      setToast({
        message: "Moved a day.",
        action: {
          label: "Undo",
          onClick: () => {
            updateTask.mutate({ id, patch: { dueDate: selectedIso } });
            setToast(null);
          },
        },
      });
    },
    [updateTask, selectedIso],
  );

  const handleTap = useCallback(
    (id: string) => {
      const t = uiTasks.find((x) => x.id === id);
      if (t) {
        setEditingTask(t);
        setSheetOpen(true);
      }
    },
    [uiTasks],
  );

  const handleAddTask = useCallback(() => {
    setEditingTask(null);
    setSheetOpen(true);
  }, []);

  const handleCreateTask = useCallback(
    async (data: TaskFormData) => {
      if (!me || !data.title.trim()) return;
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, selectedIso);
      try {
        await createTask.mutateAsync(input);
      } catch {
        if (!sheetOpenRef.current) setToast({ message: "That didn't save. Try again?" });
        throw new Error("Failed to create task");
      }
    },
    [me, partner, categoryIdByName, selectedIso, createTask],
  );

  const handleEditSubmit = useCallback(
    async (data: TaskFormData) => {
      if (!editingTask || !me) return;
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, selectedIso);
      await updateTask.mutateAsync({ id: editingTask.id, patch: input });
    },
    [editingTask, me, partner, categoryIdByName, selectedIso, updateTask],
  );

  const executeDelete = useCallback(
    (id: string) => {
      const deleted = dbTasks.find((t) => t.id === id);
      deleteTask.mutate(id);
      setToast({
        message: "Deleted.",
        action: {
          label: "Undo",
          onClick: () => {
            if (!deleted || !me) return;
            createTask.mutate({
              title: deleted.title,
              notes: deleted.notes,
              dueDate: deleted.dueDate,
              dueTime: deleted.dueTime,
              flexible: deleted.flexible,
              categoryId: deleted.categoryId,
              assigneeUserId: deleted.assigneeUserId,
              points: deleted.points,
              repeatRule: deleted.repeatRule as CreateTaskInput["repeatRule"],
            });
            setToast(null);
          },
        },
      });
    },
    [dbTasks, deleteTask, createTask, me],
  );

  const handleDelete = useCallback((id: string) => executeDelete(id), [executeDelete]);

  const handleDeleteFromSheet = useCallback(() => {
    if (!editingTask) return;
    const id = editingTask.id;
    setSheetOpen(false);
    setEditingTask(null);
    executeDelete(id);
  }, [editingTask, executeDelete]);

  const goPrevWeek = useCallback(() => {
    const nextStart = addDaysIso(weekStartIso, -7);
    setWeekStartIso(nextStart);
    // Shift the selected day back by a full week so the user's relative pick
    // (e.g. "Thursday") persists as they scan earlier/later weeks.
    setSelectedIso((s) => addDaysIso(s, -7));
  }, [weekStartIso]);
  const goNextWeek = useCallback(() => {
    const nextStart = addDaysIso(weekStartIso, 7);
    setWeekStartIso(nextStart);
    setSelectedIso((s) => addDaysIso(s, 7));
  }, [weekStartIso]);
  const goThisWeek = useCallback(() => {
    setWeekStartIso(startOfWeekIso(todayIsoStr));
    setSelectedIso(todayIsoStr);
  }, [todayIsoStr]);

  /* ----------------------------------------------------------------
   * Effects
   * ---------------------------------------------------------------- */

  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inInput || sheetOpen) return;

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleAddTask();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, handleAddTask]);

  /* ----------------------------------------------------------------
   * Initial data for edit sheet — carries the task's REAL due date
   * (not the currently-selected Week day) so editing from Wednesday
   * doesn't silently rewrite a Friday task to Wednesday.
   * ---------------------------------------------------------------- */
  const editInitialData: Partial<TaskFormData> | undefined = useMemo(() => {
    if (!editingTask || !me) return undefined;
    const dbTask = dbTasks.find((t) => t.id === editingTask.id);
    return uiTaskToFormData(
      editingTask,
      me,
      partner,
      categoryIdByName,
      dbTask?.dueDate ?? selectedIso,
      dbTask?.dueDate,
    );
  }, [editingTask, me, partner, categoryIdByName, selectedIso, dbTasks]);

  /* ----------------------------------------------------------------
   * Animation
   * ---------------------------------------------------------------- */
  const { list: listVariants, item: itemVariants, exit: exitVariant } =
    taskListVariants(shouldReduceMotion);

  return (
    <>
      <InviteBanner hidden={Boolean(partner)} />

      {/* ---- Header: week range + nav ---- */}
      {/*
       * At <lg the h1 stacks above the nav row. Without this, the h1
       * competes with the prev/this-week/next cluster inside a single flex
       * row and wraps into 3 lines on a 375px viewport ("Week of / Apr 12 –
       * / 18"). Stacking keeps the header readable at mobile widths.
       */}
      <div className="mb-[var(--space-4)]">
        <div className="flex flex-col gap-[var(--space-3)] lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-[var(--weight-bold)] text-[color:var(--color-text-primary)] leading-[var(--leading-tight)]">
              Week of {formatWeekRange(weekStartIso)}
            </h1>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] mt-[var(--space-1)]">
              {isLoading
                ? "Loading\u2026"
                : totalWeekActive > 0
                  ? `${totalWeekActive} ${totalWeekActive === 1 ? "thing" : "things"} ahead`
                  : "A quiet week."}
            </p>
          </div>

          <div className="flex items-center gap-[var(--space-1)] shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={goPrevWeek}
              aria-label="Previous week"
              className="inline-flex items-center justify-center h-[var(--touch-target-min)] w-[var(--touch-target-min)] rounded-[var(--radius-md)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-dim)] hover:text-[color:var(--color-text-primary)] transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)]"
            >
              <ChevronLeft size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goThisWeek}
              disabled={weekStartIso === startOfWeekIso(todayIsoStr) && selectedIso === todayIsoStr}
              className="
                relative
                px-[var(--space-3)] h-[var(--touch-target-min)]
                rounded-[var(--radius-md)]
                text-[length:var(--text-sm)] font-[var(--weight-semibold)]
                text-[color:var(--color-text-secondary)]
                hover:bg-[var(--color-surface-dim)] hover:text-[color:var(--color-text-primary)]
                disabled:opacity-[var(--opacity-disabled)] disabled:cursor-default disabled:hover:bg-transparent
                transition-colors duration-[var(--duration-fast)]
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)]
              "
            >
              This week
              {/* Dot indicator when viewing a different week */}
              {weekStartIso !== startOfWeekIso(todayIsoStr) && (
                <span
                  aria-hidden="true"
                  className="absolute -top-[var(--space-0-5)] right-[var(--space-1)] h-[var(--space-1-5)] w-[var(--space-1-5)] rounded-[var(--radius-full)] bg-[var(--color-accent)]"
                />
              )}
            </button>
            <button
              type="button"
              onClick={goNextWeek}
              aria-label="Next week"
              className="inline-flex items-center justify-center h-[var(--touch-target-min)] w-[var(--touch-target-min)] rounded-[var(--radius-md)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-dim)] hover:text-[color:var(--color-text-primary)] transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)]"
            >
              <ChevronRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Day strip ---- */}
      <div className="mb-[var(--space-6)]">
        <WeekDayStrip days={weekDays} selectedIso={selectedIso} onSelect={setSelectedIso} />
      </div>

      {/* ---- Toolbar: filter left, add right ----
       *
       * No per-day heading here. The week header above ("Week of Apr 12 –
       * 18") and the selected day pill in the strip together communicate
       * which day the list below represents — repeating "Today · Wednesday
       * April 15" in a third place was redundant chrome.
       */}
      <div className="flex items-center justify-between gap-[var(--space-3)] mb-[var(--space-4)]">
        <FilterToggle value={filter} onChange={setFilter} partnerName={partner?.displayName ?? ""} />
        <button
          onClick={handleAddTask}
          aria-keyshortcuts="Meta+Enter"
          className="hidden lg:inline-flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-[var(--weight-semibold)] bg-[var(--color-accent)] text-[color:var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-accent-glow)] active:scale-[0.98] transition-all duration-[var(--duration-instant)] min-h-[var(--touch-target-min)]"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          Add for {new Date(`${selectedIso}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}
          <span
            aria-hidden="true"
            className="ml-[var(--space-1)] inline-flex items-center gap-[var(--space-0-5)]"
          >
            <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-[var(--space-1)] rounded-[var(--radius-sm)] bg-[var(--color-accent-hover)] text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-accent-text)] opacity-80 leading-none">
              ⌘
            </kbd>
            <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-[1.25rem] px-[var(--space-1)] rounded-[var(--radius-sm)] bg-[var(--color-accent-hover)] text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-accent-text)] opacity-80 leading-none">
              ↵
            </kbd>
          </span>
        </button>
      </div>

      {/* ---- Content ---- */}
      {isLoading ? (
        <TaskListSkeleton />
      ) : filter === "theirs" && !partner ? (
        <EmptyState variant="theirs-solo" />
      ) : isWeekEmpty ? (
        <EmptyState variant="no-tasks" onAddTask={handleAddTask} />
      ) : isDayEmpty ? (
        <div className="flex flex-col items-center justify-center py-[var(--space-16)] px-[var(--space-6)] text-center">
          <div
            className="
              mb-[var(--space-4)]
              h-16 w-16
              rounded-[var(--radius-full)]
              bg-[var(--color-accent-subtle)]
              flex items-center justify-center
            "
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="h-8 w-8"
              strokeWidth={1.5}
              stroke="var(--color-accent)"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="24" cy="24" r="16" />
              <path d="M16 26c3 2 13 2 16 0" />
            </svg>
          </div>
          <p className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)] max-w-[22ch] leading-[var(--leading-tight)]">
            {emptyDayCopy(selectedIso)}
          </p>
          <button
            onClick={handleAddTask}
            className="
              mt-[var(--space-4)]
              inline-flex items-center gap-[var(--space-2)]
              px-[var(--space-4)] py-[var(--space-2)]
              rounded-[var(--radius-full)]
              bg-[var(--color-accent-subtle)] text-[color:var(--color-accent)]
              text-[length:var(--text-sm)] font-[var(--weight-semibold)]
              hover:bg-[var(--color-accent)] hover:text-[color:var(--color-accent-text)]
              transition-colors duration-[var(--duration-fast)]
              min-h-[var(--touch-target-min)]
            "
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Add something for {isSelectedToday ? "today" : new Date(`${selectedIso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" })}
          </button>
        </div>
      ) : (
        <>
          {primary.length > 0 && (
            <motion.section
              key={`primary-${selectedIso}`}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              aria-label={`Tasks for ${selectedDayLabel}`}
            >
              <h3 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-accent)] px-[var(--space-1)] mb-[var(--space-2)]">
                {isSelectedToday ? "Due today" : "On the books"}
              </h3>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] bg-[var(--color-surface)]">
                <AnimatePresence mode="popLayout">
                  {primary.map((task) => (
                    <motion.div
                      key={task.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      layout="position"
                      exit={exitVariant}
                    >
                      <TaskListItem
                        task={task}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        onPostpone={handlePostpone}
                        onTap={handleTap}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {secondary.length > 0 && (
            <motion.section
              key={`secondary-${selectedIso}`}
              variants={listVariants}
              initial="hidden"
              animate="visible"
              aria-label="When you can"
              className="mt-[var(--space-8)]"
            >
              <h3 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-tertiary)] px-[var(--space-1)] mb-[var(--space-2)]">
                When you can
              </h3>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] bg-[var(--color-surface)]">
                <AnimatePresence mode="popLayout">
                  {secondary.map((task) => (
                    <motion.div
                      key={task.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      layout="position"
                      exit={exitVariant}
                    >
                      <TaskListItem
                        task={task}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        onPostpone={handlePostpone}
                        onTap={handleTap}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {filteredDone.length > 0 && (
            <DoneAccordion
              tasks={filteredDone}
              onUncomplete={handleUncomplete}
              onTap={handleTap}
              onDelete={handleDelete}
            />
          )}
        </>
      )}

      <Fab onClick={handleAddTask} isSheetOpen={sheetOpen} />

      <TaskSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditSubmit : handleCreateTask}
        onDelete={editingTask ? handleDeleteFromSheet : undefined}
        mode={editingTask ? "edit" : "create"}
        initialData={
          editingTask
            ? editInitialData
            : // Create-in-context: pre-fill the day the user is looking at
              { date: selectedIso }
        }
        userName={me?.displayName ?? ""}
        partnerName={partner?.displayName ?? ""}
      />

      <Toast
        message={toast?.message ?? ""}
        action={toast?.action}
        isVisible={!!toast}
        onDismiss={() => setToast(null)}
      />
    </>
  );
}
