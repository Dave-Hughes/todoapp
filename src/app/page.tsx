"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { EASE_OUT_QUART } from "../lib/motion";
import { AppShell } from "../components/app-shell/app-shell";
import { FilterToggle, type FilterValue } from "../components/filter-toggle/filter-toggle";
import { TaskListItem, type Task as UITask } from "../components/task-list-item/task-list-item";
import { DoneAccordion } from "../components/done-accordion/done-accordion";
import { EmptyState } from "../components/empty-state/empty-state";
import { Fab } from "../components/fab/fab";
import { TaskSheet, type TaskFormData } from "../components/task-sheet/task-sheet";
import { Toast } from "../components/toast/toast";
import { ConfirmDialog } from "../components/confirm-dialog/confirm-dialog";
import type { Task as DBTask } from "@/db/schema";
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
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";
import type { AssigneeValue } from "../components/assignee-picker/assignee-picker";
import type { CategoryValue } from "../components/category-picker/category-picker";
import type { RepeatRule } from "../components/repeat-picker/parse-repeat";
import type { CreateTaskInput } from "@/lib/api/validators";

/* ================================================================
 * Helpers
 * ================================================================ */

function formatTodayDate(): { dayName: string; fullDate: string; iso: string } {
  const now = new Date();
  return {
    dayName: now.toLocaleDateString("en-US", { weekday: "long" }),
    fullDate: now.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    iso: now.toISOString().split("T")[0],
  };
}

/** Returns positive number of days task is overdue (past due), or undefined if not. */
function daysBetween(isoA: string, isoB: string): number {
  const a = Date.parse(`${isoA}T00:00:00Z`);
  const b = Date.parse(`${isoB}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

/**
 * Simple string hash → positive integer. Deterministic per task ID
 * so that undo + re-complete shows the same message.
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

/* ================================================================
 * Completion copy
 * ================================================================ */

const COMPLETION_COPY_GENERAL = [
  "Nice. One less thing.",
  "Done and done.",
  "Off the list.",
  "Handled.",
  "One down.",
];
const COMPLETION_COPY_PARTNER_CREATED = [
  "{partner} asked, you delivered.",
  "That's off {partner}'s mind now.",
  "{partner}'s gonna notice that.",
];
const COMPLETION_COPY_SELF_CREATED = [
  "Handled your own business.",
  "Self-assigned and self-handled.",
];

function getCompletionCopy(task: DBTask, myUserId: string, partnerName: string | null): string {
  const seed = hashString(task.id);
  const isPartnerCreated = task.createdByUserId !== myUserId && partnerName;
  const isSelfCreated = task.createdByUserId === myUserId;
  if (isPartnerCreated) {
    const msg = COMPLETION_COPY_PARTNER_CREATED[seed % COMPLETION_COPY_PARTNER_CREATED.length];
    return msg.replace("{partner}", partnerName);
  }
  if (isSelfCreated) return COMPLETION_COPY_SELF_CREATED[seed % COMPLETION_COPY_SELF_CREATED.length];
  return COMPLETION_COPY_GENERAL[seed % COMPLETION_COPY_GENERAL.length];
}

/* ================================================================
 * DB → UI task projection
 * ================================================================ */

function toUITask(
  t: DBTask,
  me: { id: string; displayName: string },
  partner: { id: string; displayName: string } | null,
  categoryNameById: Map<string, string>,
  todayIso: string,
): UITask {
  const assigneeName =
    t.assigneeUserId === me.id
      ? me.displayName
      : t.assigneeUserId === partner?.id
        ? partner.displayName
        : t.assigneeUserId === SHARED_ASSIGNEE_SENTINEL
          ? partner?.displayName ?? "Partner"
          : undefined;

  const completedByName =
    t.completedByUserId === me.id
      ? me.displayName
      : t.completedByUserId === partner?.id
        ? partner?.displayName
        : undefined;

  const createdByName =
    t.createdByUserId === me.id
      ? me.displayName
      : t.createdByUserId === partner?.id
        ? partner?.displayName
        : undefined;

  const overdueDays = (() => {
    if (t.completedAt) return undefined;
    const diff = daysBetween(todayIso, t.dueDate);
    return diff > 0 ? diff : undefined;
  })();

  return {
    id: t.id,
    title: t.title,
    dueTime: t.dueTime ?? undefined,
    flexible: t.flexible,
    assigneeName,
    categoryName: t.categoryId ? categoryNameById.get(t.categoryId) : undefined,
    createdByName: createdByName ?? "",
    completedAt: t.completedAt ? t.completedAt.toString() : undefined,
    completedByName,
    overdueDays,
  };
}

/* ================================================================
 * UITask → TaskFormData (for edit mode pre-population)
 * ================================================================ */

function uiTaskToFormData(
  task: UITask,
  me: { displayName: string },
  partner: { displayName: string } | null,
  categoryIdByName: Map<string, string>,
  todayIso: string,
): Partial<TaskFormData> {
  let assignee: AssigneeValue = "me";
  if (task.assigneeName === me.displayName) {
    assignee = "me";
  } else if (partner && task.assigneeName === partner.displayName) {
    assignee = "partner";
  } else {
    assignee = "shared";
  }

  // Find a valid CategoryValue — fall back to "Uncategorized" if not found
  const category: CategoryValue =
    (task.categoryName && categoryIdByName.has(task.categoryName)
      ? task.categoryName
      : "Uncategorized") as CategoryValue;

  return {
    title: task.title,
    date: todayIso,
    assignee,
    category,
    repeatRule: null,
    time: task.dueTime ?? null,
    flexible: task.flexible,
    notes: "",
    points: null,
  };
}

/* ================================================================
 * RepeatRule conversion: front-end camelCase → API snake_case
 *
 * parse-repeat.ts uses `dayOfMonth` but the API validator expects `day_of_month`.
 * ================================================================ */

function toApiRepeatRule(rule: RepeatRule | null): CreateTaskInput["repeatRule"] {
  if (!rule) return null;
  if (rule.type === "monthly") {
    return { type: "monthly", interval: rule.interval, day_of_month: rule.dayOfMonth };
  }
  return rule;
}

/* ================================================================
 * FormData → API create input
 * ================================================================ */

function formDataToCreateInput(
  data: TaskFormData,
  me: { id: string },
  partner: { id: string } | null,
  categoryIdByName: Map<string, string>,
  todayIso: string,
): CreateTaskInput {
  const assigneeUserId =
    data.assignee === "me"
      ? me.id
      : data.assignee === "partner"
        ? partner?.id ?? SHARED_ASSIGNEE_SENTINEL
        : null;

  return {
    title: data.title.trim(),
    notes: data.notes || null,
    dueDate: data.date || todayIso,
    dueTime: data.time || null,
    flexible: data.flexible,
    categoryId: data.category && data.category !== "Uncategorized"
      ? categoryIdByName.get(data.category) ?? null
      : null,
    assigneeUserId,
    points: data.points ?? 0,
    repeatRule: toApiRepeatRule(data.repeatRule),
  };
}

/* ================================================================
 * Page component
 * ================================================================ */

export default function TodayPage() {
  const shouldReduceMotion = useReducedMotion();
  const { dayName, fullDate, iso: todayIso } = formatTodayDate();

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

  // Category lookup maps
  const categoryNameById = useMemo(
    () => new Map(cats.map((c) => [c.id, c.name])),
    [cats],
  );
  const categoryIdByName = useMemo(
    () => new Map(cats.map((c) => [c.name, c.id])),
    [cats],
  );

  // Only show tasks for today (or past-due carry-forward)
  const visibleDbTasks = useMemo(() => {
    return dbTasks.filter((t) => {
      if (t.flexible) return daysBetween(todayIso, t.dueDate) >= 0; // today or past
      return t.dueDate === todayIso || daysBetween(todayIso, t.dueDate) > 0;
    });
  }, [dbTasks, todayIso]);

  // Project DB tasks to UI tasks
  const uiTasks = useMemo(() => {
    if (!me) return [] as UITask[];
    return visibleDbTasks.map((t) => toUITask(t, me, partner, categoryNameById, todayIso));
  }, [visibleDbTasks, me, partner, categoryNameById, todayIso]);

  const active = uiTasks.filter((t) => !t.completedAt);
  const done = uiTasks.filter((t) => !!t.completedAt);

  // UI state
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<UITask | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    action?: { label: string; onClick: () => void };
    duration?: number;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ taskId: string; isRepeating: boolean } | null>(
    null,
  );
  const swipeHintShown = useRef(false);
  const sheetOpenRef = useRef(sheetOpen);

  // Filter active/done tasks
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

  // Split active into hard-deadline (primary) and flexible (secondary)
  const primary = filteredActive.filter((t) => !t.flexible);
  const secondary = filteredActive.filter((t) => t.flexible);

  const isEmpty = !isLoading && active.length === 0 && done.length === 0;
  const isCaughtUp = !isEmpty && filteredActive.length === 0 && filteredDone.length > 0;

  /* ----------------------------------------------------------------
   * Handlers
   * ---------------------------------------------------------------- */

  const handleComplete = useCallback(
    (id: string) => {
      if (!me) return;
      const dbTask = dbTasks.find((t) => t.id === id);
      if (!dbTask) return;
      completeTask.mutate(id);
      setToast({
        message: getCompletionCopy(dbTask, me.id, partner?.displayName ?? null),
        action: {
          label: "Undo",
          onClick: () => {
            uncompleteTask.mutate(id);
            setToast(null);
          },
        },
      });
    },
    [me, partner, dbTasks, completeTask, uncompleteTask],
  );

  const handleUncomplete = useCallback(
    (id: string) => {
      uncompleteTask.mutate(id);
    },
    [uncompleteTask],
  );

  const handlePostpone = useCallback(
    (id: string) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString().split("T")[0];
      updateTask.mutate({ id, patch: { dueDate: tomorrowIso } });
      setToast({
        message: "Moved to tomorrow.",
        action: {
          label: "Undo",
          onClick: () => {
            updateTask.mutate({ id, patch: { dueDate: todayIso } });
            setToast(null);
          },
        },
      });
    },
    [updateTask, todayIso],
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

  const handleAddTask = useCallback(() => setSheetOpen(true), []);

  const handleCreateTask = useCallback(
    async (data: TaskFormData) => {
      if (!me || !data.title.trim()) return;
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, todayIso);
      try {
        await createTask.mutateAsync(input);
      } catch {
        if (!sheetOpenRef.current) setToast({ message: "That didn't save. Try again?" });
        throw new Error("Failed to create task");
      }
    },
    [me, partner, categoryIdByName, todayIso, createTask],
  );

  const handleEditSubmit = useCallback(
    async (data: TaskFormData) => {
      if (!editingTask || !me) return;
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, todayIso);
      await updateTask.mutateAsync({ id: editingTask.id, patch: input });
    },
    [editingTask, me, partner, categoryIdByName, todayIso, updateTask],
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
              // repeatRule stored as JSONB — pass through as-is; the API validator
              // will accept it if it conforms to the schema.
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

  /* ----------------------------------------------------------------
   * Effects
   * ---------------------------------------------------------------- */

  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  useEffect(() => {
    swipeHintShown.current = true;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !sheetOpen) {
        e.preventDefault();
        handleAddTask();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, handleAddTask]);

  /* ----------------------------------------------------------------
   * Animation variants
   * ---------------------------------------------------------------- */

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.04 } },
  };
  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 },
    visible: shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT_QUART } },
  };

  /* ----------------------------------------------------------------
   * Edit mode initial data — map UITask back to TaskFormData shape
   * ---------------------------------------------------------------- */

  const editInitialData: Partial<TaskFormData> | undefined = useMemo(() => {
    if (!editingTask || !me) return undefined;
    return uiTaskToFormData(editingTask, me, partner, categoryIdByName, todayIso);
  }, [editingTask, me, partner, categoryIdByName, todayIso]);

  /* ----------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------- */

  return (
    <AppShell
      activePath="/today"
      userName={me?.displayName ?? ""}
      partnerName={partner?.displayName ?? ""}
      userPoints={0}
      partnerPoints={0}
      userPointsToday={0}
      partnerPointsToday={0}
      hasNotification={false}
      todayCount={filteredActive.length}
      weekCount={0}
      monthLabel={new Date().toLocaleDateString("en-US", { month: "long" })}
    >
      {/* ---- Page header ---- */}
      <div className="mb-[var(--space-6)]">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-[var(--weight-bold)] text-[color:var(--color-text-primary)] leading-[var(--leading-tight)]">
          {dayName}
        </h1>
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] mt-[var(--space-1)]">
          {fullDate}
          {filteredActive.length > 0 && !isCaughtUp && (
            <span className="ml-[var(--space-2)] text-[color:var(--color-text-secondary)]">
              &middot; {filteredActive.length} {filteredActive.length === 1 ? "task" : "tasks"} to do
            </span>
          )}
        </p>
      </div>

      {/* ---- Toolbar ---- */}
      <div className="flex items-center justify-between gap-[var(--space-3)] mb-[var(--space-4)]">
        <FilterToggle value={filter} onChange={setFilter} partnerName={partner?.displayName ?? ""} />
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            onClick={handleAddTask}
            aria-keyshortcuts="Meta+Enter"
            className="hidden lg:inline-flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-[var(--weight-semibold)] bg-[var(--color-accent)] text-[color:var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-accent-glow)] active:scale-[0.98] transition-all duration-[var(--duration-instant)] min-h-[var(--touch-target-min)]"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Add task
            <kbd className="ml-[var(--space-1)] px-[var(--space-1)] py-[var(--space-0-5)] rounded-[var(--radius-sm)] bg-[var(--color-accent-hover)] text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-accent-text)] opacity-80">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>

      {/* ---- Content ---- */}
      {isEmpty ? (
        <EmptyState variant="no-tasks" onAddTask={handleAddTask} />
      ) : isCaughtUp ? (
        <>
          <EmptyState variant="caught-up" completedCount={done.length} />
          <DoneAccordion tasks={filteredDone} onUncomplete={handleUncomplete} onTap={handleTap} onDelete={handleDelete} />
        </>
      ) : (
        <>
          {/* Primary section — hard-deadline tasks */}
          {primary.length > 0 && (
            <motion.section
              variants={listVariants}
              initial="hidden"
              animate="visible"
              aria-label="Tasks due today"
            >
              <h2 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-accent)] px-[var(--space-1)] mb-[var(--space-2)]">
                Due today
              </h2>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] bg-[var(--color-surface)]">
                <AnimatePresence mode="popLayout">
                  {primary.map((task, index) => (
                    <motion.div
                      key={task.id}
                      variants={itemVariants}
                      layout="position"
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, x: -40, transition: { duration: 0.2 } }
                      }
                    >
                      <TaskListItem
                        task={task}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        onPostpone={handlePostpone}
                        onTap={handleTap}
                        onDelete={handleDelete}
                        showSwipeHint={index === 0 && !swipeHintShown.current}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {/* Secondary section — flexible tasks */}
          {secondary.length > 0 && (
            <motion.section
              variants={listVariants}
              initial="hidden"
              animate="visible"
              aria-label="When you can"
              className="mt-[var(--space-8)]"
            >
              <h2 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-tertiary)] px-[var(--space-1)] mb-[var(--space-2)]">
                When you can
              </h2>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)]">
                <AnimatePresence mode="popLayout">
                  {secondary.map((task) => (
                    <motion.div
                      key={task.id}
                      variants={itemVariants}
                      layout="position"
                      exit={
                        shouldReduceMotion
                          ? { opacity: 0 }
                          : { opacity: 0, x: -40, transition: { duration: 0.2 } }
                      }
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

          {/* Done accordion */}
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

      {/* ---- FAB (mobile) ---- */}
      <Fab onClick={handleAddTask} isSheetOpen={sheetOpen} />

      {/* ---- Task sheet ---- */}
      <TaskSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditSubmit : handleCreateTask}
        onDelete={editingTask ? handleDeleteFromSheet : undefined}
        mode={editingTask ? "edit" : "create"}
        initialData={editInitialData}
        userName={me?.displayName ?? ""}
        partnerName={partner?.displayName ?? ""}
      />

      {/* ---- Toast ---- */}
      <Toast
        message={toast?.message ?? ""}
        action={toast?.action}
        isVisible={!!toast}
        onDismiss={() => setToast(null)}
        duration={toast?.duration}
      />

      {/* ---- Confirm dialog (delete) ---- */}
      <ConfirmDialog
        isOpen={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        title="Delete it for good?"
        actions={[
          {
            label: "Delete",
            variant: "destructive" as const,
            onClick: () => {
              if (deleteDialog) executeDelete(deleteDialog.taskId);
              setDeleteDialog(null);
            },
          },
        ]}
      />
    </AppShell>
  );
}
