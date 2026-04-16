"use client";

import { useState, useCallback, useMemo, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { EASE_OUT_QUART, taskListVariants } from "@/lib/motion";
import { FilterToggle, type FilterValue } from "@/components/filter-toggle/filter-toggle";
import { TaskListItem, type Task as UITask } from "@/components/task-list-item/task-list-item";
import { DoneAccordion } from "@/components/done-accordion/done-accordion";
import { Fab } from "@/components/fab/fab";
import { TaskSheet, type TaskFormData } from "@/components/task-sheet/task-sheet";
import { Toast } from "@/components/toast/toast";
import { InviteBanner } from "@/components/invite-banner/invite-banner";
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
 * Month math
 * ================================================================ */

/** Returns YYYY-MM-DD for the 1st of the given year/month. */
function monthStartIso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Number of days in a month. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Day of week (0=Sun) for the 1st of the month. */
function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

/** Format "April 2026" for the header. */
function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Returns an ISO date for a day within the viewed month. */
function dayIso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/* ================================================================
 * Density dots — adapted from WeekDayStrip for grid cells
 * ================================================================ */

function CellDensityDots({ count }: { count: number }) {
  if (count === 0) return null;
  const dots = Math.min(count, 3);
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center gap-[var(--space-0-5)] h-[var(--space-1)] mt-[var(--space-0-5)]"
    >
      {Array.from({ length: dots }).map((_, i) => (
        <span
          key={i}
          className="h-[var(--space-1)] w-[var(--space-1)] rounded-[var(--radius-full)] bg-[var(--color-accent)] opacity-70"
        />
      ))}
      {count > 3 && (
        <span className="ml-[var(--space-0-5)] text-[length:var(--text-xs)] font-[var(--weight-semibold)] leading-none text-[color:var(--color-accent)] opacity-70">
          +
        </span>
      )}
    </span>
  );
}

/* ================================================================
 * Day names header
 * ================================================================ */

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ================================================================
 * Page
 * ================================================================ */

export default function MonthPage() {
  const shouldReduceMotion = useReducedMotion();
  const todayIsoStr = useMemo(() => currentIso(), []);

  // Parse today for month/year defaults
  const [todayYear, todayMonth] = useMemo(() => {
    const [y, m] = todayIsoStr.split("-").map(Number);
    return [y, m];
  }, [todayIsoStr]);

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

  const categoryNameById = useMemo(
    () => new Map(cats.map((c) => [c.id, c.name])),
    [cats],
  );
  const categoryIdByName = useMemo(
    () => new Map(cats.map((c) => [c.name, c.id])),
    [cats],
  );

  // ---- Month navigation state ----
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  // ---- Task counts per day (non-completed, non-flexible) ----
  const tasksByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of dbTasks) {
      if (t.completedAt) continue;
      if (t.flexible) continue;
      m.set(t.dueDate, (m.get(t.dueDate) ?? 0) + 1);
    }
    return m;
  }, [dbTasks]);

  // ---- Grid cells: padding + month days ----
  const gridCells = useMemo(() => {
    const totalDays = daysInMonth(viewYear, viewMonth);
    const startDow = firstDayOfWeek(viewYear, viewMonth);
    const cells: Array<{ day: number; iso: string } | null> = [];

    // Leading empty cells for days before the 1st
    for (let i = 0; i < startDow; i++) cells.push(null);
    // Days of the month
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ day: d, iso: dayIso(viewYear, viewMonth, d) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  // Total active tasks for this month (for subtitle)
  const totalMonthActive = useMemo(() => {
    const start = monthStartIso(viewYear, viewMonth);
    const end = dayIso(viewYear, viewMonth, daysInMonth(viewYear, viewMonth));
    return dbTasks.filter(
      (t) => !t.completedAt && !t.flexible && t.dueDate >= start && t.dueDate <= end,
    ).length;
  }, [dbTasks, viewYear, viewMonth]);

  // Tasks on the currently selected day
  const selectedDayDbTasks = useMemo(() => {
    if (!selectedIso) return [];
    return dbTasks.filter((t) => t.dueDate === selectedIso);
  }, [dbTasks, selectedIso]);

  const uiTasks = useMemo(() => {
    if (!me || !selectedIso) return [] as UITask[];
    return selectedDayDbTasks.map((t) =>
      toUITask(t, me, partner, categoryNameById, todayIsoStr),
    );
  }, [selectedDayDbTasks, me, partner, categoryNameById, todayIsoStr, selectedIso]);

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

  const isDayEmpty =
    !isLoading && selectedIso && filteredActive.length === 0 && filteredDone.length === 0;

  const isCurrentMonth = viewYear === todayYear && viewMonth === todayMonth;

  // ---- Effective date for task creation (selected day or today) ----
  const effectiveDateIso = selectedIso ?? todayIsoStr;

  /* ----------------------------------------------------------------
   * Task titles for desktop cells — up to 2 titles + overflow
   * ---------------------------------------------------------------- */
  const taskTitlesByDate = useMemo(() => {
    const m = new Map<string, { titles: string[]; total: number }>();
    for (const t of dbTasks) {
      if (t.completedAt) continue;
      if (t.flexible) continue;
      const existing = m.get(t.dueDate);
      if (existing) {
        existing.total++;
        if (existing.titles.length < 2) existing.titles.push(t.title);
      } else {
        m.set(t.dueDate, { titles: [t.title], total: 1 });
      }
    }
    return m;
  }, [dbTasks]);

  /* ----------------------------------------------------------------
   * Handlers — mirrors Week view patterns
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
      if (!selectedIso) return;
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
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, effectiveDateIso);
      try {
        await createTask.mutateAsync(input);
      } catch {
        if (!sheetOpenRef.current) setToast({ message: "That didn't save. Try again?" });
        throw new Error("Failed to create task");
      }
    },
    [me, partner, categoryIdByName, effectiveDateIso, createTask],
  );

  const handleEditSubmit = useCallback(
    async (data: TaskFormData) => {
      if (!editingTask || !me) return;
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, effectiveDateIso);
      await updateTask.mutateAsync({ id: editingTask.id, patch: input });
    },
    [editingTask, me, partner, categoryIdByName, effectiveDateIso, updateTask],
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

  const goPrevMonth = useCallback(() => {
    setSelectedIso(null);
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }, [viewMonth]);

  const goNextMonth = useCallback(() => {
    setSelectedIso(null);
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }, [viewMonth]);

  const goThisMonth = useCallback(() => {
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    setSelectedIso(null);
  }, [todayYear, todayMonth]);

  const gridRef = useRef<HTMLDivElement>(null);

  const handleDayClick = useCallback(
    (iso: string) => {
      // Toggle: clicking the already-selected day deselects it
      setSelectedIso((prev) => (prev === iso ? null : iso));
    },
    [],
  );

  /** Arrow-key grid navigation for calendar cells. */
  const handleGridKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLButtonElement>, day: number) => {
      const totalDays = daysInMonth(viewYear, viewMonth);
      let nextDay: number | null = null;

      if (e.key === "ArrowRight") nextDay = Math.min(day + 1, totalDays);
      else if (e.key === "ArrowLeft") nextDay = Math.max(day - 1, 1);
      else if (e.key === "ArrowDown") nextDay = Math.min(day + 7, totalDays);
      else if (e.key === "ArrowUp") nextDay = Math.max(day - 7, 1);
      else if (e.key === "Home") nextDay = 1;
      else if (e.key === "End") nextDay = totalDays;

      if (nextDay != null && nextDay !== day) {
        e.preventDefault();
        const nextIso = dayIso(viewYear, viewMonth, nextDay);
        setSelectedIso(nextIso);
        // Focus the target cell button
        const btn = gridRef.current?.querySelector<HTMLButtonElement>(
          `[data-day="${nextDay}"]`,
        );
        btn?.focus();
      }
    },
    [viewYear, viewMonth],
  );

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

      // Escape closes drill-down
      if (e.key === "Escape" && selectedIso) {
        e.preventDefault();
        setSelectedIso(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, handleAddTask, selectedIso]);

  /* ----------------------------------------------------------------
   * Edit sheet initial data — preserves DB due date
   * ---------------------------------------------------------------- */
  const editInitialData: Partial<TaskFormData> | undefined = useMemo(() => {
    if (!editingTask || !me) return undefined;
    const dbTask = dbTasks.find((t) => t.id === editingTask.id);
    return uiTaskToFormData(
      editingTask,
      me,
      partner,
      categoryIdByName,
      dbTask?.dueDate ?? effectiveDateIso,
      dbTask?.dueDate,
    );
  }, [editingTask, me, partner, categoryIdByName, effectiveDateIso, dbTasks]);

  /* ----------------------------------------------------------------
   * Animation
   * ---------------------------------------------------------------- */
  const { list: listVariants, item: itemVariants, exit: exitVariant } =
    taskListVariants(shouldReduceMotion);

  /* ----------------------------------------------------------------
   * Selected day label for ARIA
   * ---------------------------------------------------------------- */
  const selectedDayLabel = useMemo(() => {
    if (!selectedIso) return "";
    const dt = new Date(`${selectedIso}T00:00:00`);
    return dt.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  }, [selectedIso]);

  // Determine which grid row the selected day is in (for inline drill-down placement)
  const selectedRowIndex = useMemo(() => {
    if (!selectedIso) return -1;
    const dayNum = parseInt(selectedIso.split("-")[2], 10);
    const startDow = firstDayOfWeek(viewYear, viewMonth);
    const cellIndex = startDow + dayNum - 1;
    return Math.floor(cellIndex / 7);
  }, [selectedIso, viewYear, viewMonth]);

  // Split grid cells into rows for drill-down insertion
  const gridRows = useMemo(() => {
    const rows: Array<Array<{ day: number; iso: string } | null>> = [];
    for (let i = 0; i < gridCells.length; i += 7) {
      rows.push(gridCells.slice(i, i + 7));
    }
    // Pad the last row to 7 cells
    const lastRow = rows[rows.length - 1];
    while (lastRow && lastRow.length < 7) lastRow.push(null);
    return rows;
  }, [gridCells]);

  const addButtonDateLabel = useMemo(() => {
    if (!selectedIso) return "today";
    if (selectedIso === todayIsoStr) return "today";
    return new Date(`${selectedIso}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [selectedIso, todayIsoStr]);

  return (
    <>
      <InviteBanner hidden={Boolean(partner)} />

      {/* ---- Header: month + year + nav ---- */}
      <div className="mb-[var(--space-4)]">
        <div className="flex flex-col gap-[var(--space-3)] lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-[var(--weight-bold)] text-[color:var(--color-text-primary)] leading-[var(--leading-tight)]">
              {formatMonthYear(viewYear, viewMonth)}
            </h1>
            <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] mt-[var(--space-1)]">
              {isLoading
                ? "Loading\u2026"
                : totalMonthActive > 0
                  ? `${totalMonthActive} ${totalMonthActive === 1 ? "thing" : "things"} this month`
                  : "A quiet month."}
            </p>
          </div>

          <div className="flex items-center gap-[var(--space-1)] shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="inline-flex items-center justify-center h-[var(--touch-target-min)] w-[var(--touch-target-min)] rounded-[var(--radius-md)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-dim)] hover:text-[color:var(--color-text-primary)] transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)]"
            >
              <ChevronLeft size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goThisMonth}
              disabled={isCurrentMonth && !selectedIso}
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
              This month
              {/* Dot indicator when viewing a different month */}
              {!isCurrentMonth && (
                <span
                  aria-hidden="true"
                  className="absolute -top-[var(--space-0-5)] right-[var(--space-1)] h-[var(--space-1-5)] w-[var(--space-1-5)] rounded-[var(--radius-full)] bg-[var(--color-accent)]"
                />
              )}
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="inline-flex items-center justify-center h-[var(--touch-target-min)] w-[var(--touch-target-min)] rounded-[var(--radius-md)] text-[color:var(--color-text-secondary)] hover:bg-[var(--color-surface-dim)] hover:text-[color:var(--color-text-primary)] transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-canvas)]"
            >
              <ChevronRight size={18} strokeWidth={2.25} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Toolbar: filter left, add right ---- */}
      <div className="flex items-center justify-between gap-[var(--space-3)] mb-[var(--space-4)]">
        <FilterToggle value={filter} onChange={setFilter} partnerName={partner?.displayName ?? ""} />
        <button
          onClick={handleAddTask}
          aria-keyshortcuts="Meta+Enter"
          className="hidden lg:inline-flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-[var(--weight-semibold)] bg-[var(--color-accent)] text-[color:var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-accent-glow)] active:scale-[0.98] transition-all duration-[var(--duration-instant)] min-h-[var(--touch-target-min)]"
        >
          <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
          Add for {addButtonDateLabel}
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

      {/* ---- Calendar grid ---- */}
      <div
        ref={gridRef}
        role="grid"
        aria-label={`${formatMonthYear(viewYear, viewMonth)} calendar`}
        className="rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        {/* Day name headers */}
        <div
          role="row"
          className="grid grid-cols-7 border-b border-[var(--color-border-subtle)]"
        >
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              role="columnheader"
              className="py-[var(--space-2)] text-center text-[length:var(--text-xs)] font-[var(--weight-semibold)] uppercase tracking-[0.08em] text-[color:var(--color-text-tertiary)]"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Grid rows with inline drill-down insertion */}
        {gridRows.map((row, rowIdx) => (
          <div key={rowIdx} role="rowgroup">
            {/* The actual calendar row */}
            <div
              role="row"
              className={`grid grid-cols-7 ${rowIdx > 0 ? "border-t border-[var(--color-border-subtle)]" : ""}`}
            >
              {row.map((cell, colIdx) => {
                if (!cell) {
                  return (
                    <div
                      key={`empty-${colIdx}`}
                      role="gridcell"
                      className={`min-h-[3.5rem] lg:min-h-[5.5rem] bg-[var(--color-surface-dim)] ${colIdx > 0 ? "border-l border-[var(--color-border-subtle)]" : ""}`}
                    />
                  );
                }

                const isToday = cell.iso === todayIsoStr;
                const isSelected = cell.iso === selectedIso;
                const count = tasksByDate.get(cell.iso) ?? 0;
                const titleData = taskTitlesByDate.get(cell.iso);

                return (
                  <button
                    key={cell.day}
                    type="button"
                    role="gridcell"
                    data-day={cell.day}
                    tabIndex={
                      isSelected
                        ? 0
                        : !selectedIso && ((isCurrentMonth && isToday) || (!isCurrentMonth && cell.day === 1))
                          ? 0
                          : -1
                    }
                    aria-selected={isSelected}
                    aria-current={isToday ? "date" : undefined}
                    aria-label={`${new Date(`${cell.iso}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}${isToday ? ", today" : ""}${count > 0 ? `, ${count} ${count === 1 ? "task" : "tasks"}` : ", no tasks"}`}
                    onClick={() => handleDayClick(cell.iso)}
                    onKeyDown={(e) => handleGridKeyDown(e, cell.day)}
                    className={`
                      relative text-left
                      min-h-[3.5rem] lg:min-h-[5.5rem]
                      p-[var(--space-1)] lg:p-[var(--space-2)]
                      transition-colors duration-[var(--duration-fast)]
                      outline-none
                      focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--color-border-focus)]
                      ${colIdx > 0 ? "border-l border-[var(--color-border-subtle)]" : ""}
                      ${isSelected
                        ? "bg-[var(--color-accent-subtle)]"
                        : isToday
                          ? "bg-[var(--color-surface)]"
                          : "bg-[var(--color-surface)] hover:bg-[var(--color-surface-dim)]"
                      }
                    `}
                  >
                    {/* Date number */}
                    <span
                      className={`
                        inline-flex items-center justify-center
                        h-[1.75rem] w-[1.75rem]
                        rounded-[var(--radius-full)]
                        text-[length:var(--text-sm)] font-[var(--weight-semibold)]
                        tabular-nums leading-none
                        ${isToday
                          ? "bg-[var(--color-accent)] text-[color:var(--color-accent-text)]"
                          : isSelected
                            ? "text-[color:var(--color-accent)]"
                            : "text-[color:var(--color-text-primary)]"
                        }
                      `}
                    >
                      {cell.day}
                    </span>

                    {/* Desktop: task title previews */}
                    {titleData && (
                      <div className="hidden lg:block mt-[var(--space-1)]">
                        {titleData.titles.map((title, ti) => (
                          <p
                            key={ti}
                            className="text-[length:var(--text-xs)] text-[color:var(--color-text-secondary)] leading-[var(--leading-tight)] truncate"
                          >
                            {title}
                          </p>
                        ))}
                        {titleData.total > 2 && (
                          <p className="text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)] leading-[var(--leading-tight)]">
                            +{titleData.total - 2} more
                          </p>
                        )}
                      </div>
                    )}

                    {/* Mobile: density dots */}
                    <div className="lg:hidden">
                      <CellDensityDots count={count} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Drill-down panel — inserted after the row containing the selected day.
             * Uses grid-template-rows: 0fr → 1fr for smooth height animation
             * without animating the `height` layout property directly. */}
            <AnimatePresence>
              {selectedIso && rowIdx === selectedRowIndex && (
                <motion.div
                  key={`drilldown-${selectedIso}`}
                  initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, gridTemplateRows: "0fr" }}
                  animate={{ opacity: 1, gridTemplateRows: "1fr" }}
                  exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, gridTemplateRows: "0fr" }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : { duration: 0.3, ease: EASE_OUT_QUART }
                  }
                  data-drilldown
                  className="grid border-t border-[var(--color-border-subtle)]"
                >
                  <div className="overflow-hidden min-h-0">
                  <div className="p-[var(--space-4)] lg:p-[var(--space-6)] bg-[var(--color-canvas)]">
                    {/* Day content */}
                    {isDayEmpty ? (
                      <div className="flex flex-col items-center justify-center py-[var(--space-6)] text-center">
                        <div
                          className="mb-[var(--space-3)] h-12 w-12 rounded-[var(--radius-full)] bg-[var(--color-accent-subtle)] flex items-center justify-center"
                          aria-hidden="true"
                        >
                          <svg
                            viewBox="0 0 48 48"
                            fill="none"
                            className="h-6 w-6"
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
                          Add something
                        </button>
                      </div>
                    ) : (
                      <>
                        {filteredActive.length > 0 && (
                          <motion.section
                            key={`month-tasks-${selectedIso}`}
                            variants={listVariants}
                            initial="hidden"
                            animate="visible"
                            aria-label={`Tasks for ${selectedDayLabel}`}
                          >
                            <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] bg-[var(--color-surface)]">
                              <AnimatePresence mode="popLayout">
                                {filteredActive.map((task) => (
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
                  </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

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
            : { date: effectiveDateIso }
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
