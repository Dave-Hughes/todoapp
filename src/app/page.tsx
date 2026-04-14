"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { AppShell } from "../components/app-shell/app-shell";
import { FilterToggle, type FilterValue } from "../components/filter-toggle/filter-toggle";
import { TaskListItem, type Task } from "../components/task-list-item/task-list-item";
import { DoneAccordion } from "../components/done-accordion/done-accordion";
import { EmptyState } from "../components/empty-state/empty-state";
import { Fab } from "../components/fab/fab";
import { TaskSheet, type TaskFormData } from "../components/task-sheet/task-sheet";
import { Toast } from "../components/toast/toast";
import { ConfirmDialog } from "../components/confirm-dialog/confirm-dialog";

/* ================================================================
 * DEMO DATA — replaced by real data fetching in the walking skeleton
 * ================================================================ */

const DEMO_USER = "Dave";
const DEMO_PARTNER = "Krista";

const DEMO_TASKS: Task[] = [
  {
    id: "1",
    title: "Pick up dry cleaning",
    dueTime: "10:00 AM",
    flexible: false,
    assigneeName: "Dave",
    categoryName: "Errands",
    createdByName: "Krista",
  },
  {
    id: "2",
    title: "Schedule dentist appointment",
    flexible: false,
    assigneeName: "Dave",
    categoryName: "Health",
    createdByName: "Dave",
    overdueDays: 1,
  },
  {
    id: "3",
    title: "Take out recycling",
    dueTime: "7:00 PM",
    flexible: false,
    assigneeName: "Krista",
    categoryName: "Home",
    createdByName: "Dave",
  },
  {
    id: "4",
    title: "Pay electric bill",
    flexible: false,
    assigneeName: undefined,
    categoryName: "Bills",
    createdByName: "Dave",
  },
  {
    id: "5",
    title: "Return Amazon package",
    flexible: false,
    assigneeName: "Dave",
    categoryName: "Errands",
    createdByName: "Krista",
  },
  {
    id: "6",
    title: "Organize junk drawer",
    flexible: true,
    assigneeName: undefined,
    categoryName: "Home",
    createdByName: "Krista",
  },
  {
    id: "7",
    title: "Research new vacuum",
    flexible: true,
    assigneeName: "Dave",
    createdByName: "Dave",
  },
  {
    id: "8",
    title: "Wipe down kitchen counters",
    flexible: true,
    assigneeName: "Krista",
    categoryName: "Home",
    createdByName: "Krista",
  },
];

const DEMO_DONE: Task[] = [
  {
    id: "d1",
    title: "Take out trash",
    flexible: false,
    completedAt: new Date().toISOString(),
    completedByName: "Dave",
    createdByName: "Krista",
  },
  {
    id: "d2",
    title: "Unload dishwasher",
    flexible: false,
    completedAt: new Date().toISOString(),
    completedByName: "Krista",
    createdByName: "Krista",
  },
  {
    id: "d3",
    title: "Water the plants",
    flexible: true,
    completedAt: new Date().toISOString(),
    completedByName: "Dave",
    createdByName: "Dave",
  },
];

/* ================================================================
 * Helpers
 * ================================================================ */

function formatTodayDate(): { dayName: string; fullDate: string } {
  const now = new Date();
  const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
  const fullDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  return { dayName, fullDate };
}

/**
 * Simple string hash → positive integer. Deterministic per task ID
 * so that undo + re-complete shows the same message.
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

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

function getCompletionCopy(task: Task, currentUser: string): string {
  const isPartnerCreated = task.createdByName && task.createdByName !== currentUser;
  const isSelfCreated = task.createdByName === currentUser;

  if (isPartnerCreated) {
    const pool = COMPLETION_COPY_PARTNER_CREATED;
    const msg = pool[hashString(task.id) % pool.length];
    return msg.replace("{partner}", task.createdByName);
  }

  if (isSelfCreated) {
    const pool = COMPLETION_COPY_SELF_CREATED;
    return pool[hashString(task.id) % pool.length];
  }

  return COMPLETION_COPY_GENERAL[hashString(task.id) % COMPLETION_COPY_GENERAL.length];
}

function taskToFormData(task: Task): Partial<TaskFormData> {
  let assignee: import("../components/assignee-picker/assignee-picker").AssigneeValue = "shared";
  if (task.assigneeName === DEMO_USER) assignee = "me";
  else if (task.assigneeName === DEMO_PARTNER) assignee = "partner";

  return {
    title: task.title,
    date: new Date().toISOString().split("T")[0],
    assignee,
    category: (task.categoryName ?? "Uncategorized") as import("../components/category-picker/category-picker").CategoryValue,
    repeatRule: null,
    time: task.dueTime ?? null,
    flexible: task.flexible,
    notes: "",
    points: null,
  };
}

/* ================================================================ */

export default function TodayPage() {
  const shouldReduceMotion = useReducedMotion();
  const { dayName, fullDate } = formatTodayDate();

  // State
  const [filter, setFilter] = useState<FilterValue>("all");
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
  const [doneTasks, setDoneTasks] = useState<Task[]>(DEMO_DONE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    action?: { label: string; onClick: () => void };
    duration?: number;
  } | null>(null);
  const [userPoints, setUserPoints] = useState(245);
  const [userPointsToday, setUserPointsToday] = useState(15);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    taskId: string;
    isRepeating: boolean;
  } | null>(null);

  // Swipe hint — show once on initial page load only
  const swipeHintShown = useRef(false);

  // Ref mirror of sheetOpen — used in handleCreateTask to decide toast vs inline error.
  const sheetOpenRef = useRef(sheetOpen);

  // Undo refs — store last-removed state for recovery
  const lastCompletedRef = useRef<Task | null>(null);
  const lastPostponedRef = useRef<Task | null>(null);
  const lastRolledRef = useRef<Task[]>([]);

  // Filter logic
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "all") return true;
      if (filter === "mine") {
        return task.assigneeName === DEMO_USER || !task.assigneeName;
      }
      if (filter === "theirs") {
        return task.assigneeName === DEMO_PARTNER || !task.assigneeName;
      }
      return true;
    });
  }, [tasks, filter]);

  const filteredDone = useMemo(() => {
    return doneTasks.filter((task) => {
      if (filter === "all") return true;
      if (filter === "mine") {
        return task.completedByName === DEMO_USER || !task.assigneeName;
      }
      if (filter === "theirs") {
        return task.completedByName === DEMO_PARTNER || !task.assigneeName;
      }
      return true;
    });
  }, [doneTasks, filter]);

  // Split into primary (hard-deadline) and secondary (flexible)
  const primaryTasks = filteredTasks.filter((t) => !t.flexible);
  const secondaryTasks = filteredTasks.filter((t) => t.flexible);
  const totalActive = filteredTasks.length;

  const isEmpty = tasks.length === 0 && doneTasks.length === 0;
  const isCaughtUp =
    !isEmpty && filteredTasks.length === 0 && filteredDone.length > 0;

  // Handlers
  const handleComplete = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      lastCompletedRef.current = task;
      const completedTask = {
        ...task,
        completedAt: new Date().toISOString(),
        completedByName: DEMO_USER,
      };

      const earned = 5; // demo: each completion earns 5 points
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setDoneTasks((prev) => [completedTask, ...prev]);
      setUserPoints((prev) => prev + earned);
      setUserPointsToday((prev) => prev + earned);
      setToast({
        message: getCompletionCopy(task, DEMO_USER),
        action: {
          label: "Undo",
          onClick: () => {
            const restored = lastCompletedRef.current;
            if (restored) {
              setDoneTasks((prev) =>
                prev.filter((t) => t.id !== restored.id)
              );
              setTasks((prev) => [...prev, restored]);
              setUserPoints((p) => p - earned);
              setUserPointsToday((p) => p - earned);
              lastCompletedRef.current = null;
            }
            setToast(null);
          },
        },
      });
    },
    [tasks]
  );

  const handleUncomplete = useCallback(
    (taskId: string) => {
      const task = doneTasks.find((t) => t.id === taskId);
      if (!task) return;

      setDoneTasks((prev) => prev.filter((t) => t.id !== taskId));
      setTasks((prev) => [
        { ...task, completedAt: undefined, completedByName: undefined },
        ...prev,
      ]);
    },
    [doneTasks]
  );

  const handlePostpone = useCallback((taskId: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === taskId);
      if (task) lastPostponedRef.current = task;
      return prev.filter((t) => t.id !== taskId);
    });
    setToast({
      message: "Moved to tomorrow.",
      action: {
        label: "Undo",
        onClick: () => {
          const restored = lastPostponedRef.current;
          if (restored) {
            setTasks((prev) => [...prev, restored]);
            lastPostponedRef.current = null;
          }
          setToast(null);
        },
      },
    });
  }, []);

  const handleTap = useCallback((taskId: string) => {
    const task = tasks.find((t) => t.id === taskId) ?? doneTasks.find((t) => t.id === taskId);
    if (!task) return;
    setEditingTask(task);
    setSheetOpen(true);
  }, [tasks, doneTasks]);

  const handleAddTask = useCallback(() => {
    setSheetOpen(true);
  }, []);

  /**
   * Called by TaskSheet with the trimmed title.
   * Optimistic: task appears in list instantly.
   * Phase 1: always resolves — no real server call.
   * Phase 2+: replace with real server call; reject on failure to trigger
   * TaskSheet's inline error state and parent toast.
   *
   * Error strategy: TaskSheet shows the inline "That didn't save. Try again?"
   * message while the sheet is open (sheet stays open on rejection). The parent
   * also receives the rejection and surfaces a toast ONLY if the sheet is no
   * longer open at the time of the error (e.g. a background sync failure after
   * the sheet was dismissed). This prevents the inline + toast redundancy when
   * both are visible simultaneously.
   */
  const handleCreateTask = useCallback(async (data: TaskFormData): Promise<void> => {
    if (!data.title.trim()) return;

    const assigneeName =
      data.assignee === "me"
        ? DEMO_USER
        : data.assignee === "partner"
          ? DEMO_PARTNER
          : undefined;

    const newTask: Task = {
      id: `new-${Date.now()}`,
      title: data.title.trim(),
      flexible: data.flexible,
      dueTime: data.time ?? undefined,
      assigneeName,
      categoryName: data.category === "Uncategorized" ? undefined : data.category,
      createdByName: DEMO_USER,
    };

    // Optimistic: add to list immediately
    setTasks((prev) => [newTask, ...prev]);

    try {
      // Phase 1: simulate server confirm < 300ms — always succeeds in demo mode.
      // Phase 2+: replace with: await createTask(newTask); and let rejections propagate.
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    } catch {
      // Roll back the optimistic task addition
      setTasks((prev) => prev.filter((t) => t.id !== newTask.id));

      // Error display strategy:
      // - Sheet open  → TaskSheet shows the inline "That didn't save. Try again?"
      //                 message. No toast (would be redundant and visually noisy).
      // - Sheet closed → Sheet already dismissed; inline message unreachable.
      //                  Surface a toast instead.
      if (!sheetOpenRef.current) {
        setToast({ message: "That didn't save. Try again?" });
      }

      // Re-throw so TaskSheet can show the inline error when the sheet is open.
      throw new Error("Failed to create task");
    }
  }, []);

  const handleRollOver = useCallback(() => {
    const count = filteredTasks.length;
    lastRolledRef.current = [...tasks];
    setTasks([]);
    setToast({
      message: count === 1 ? "Tomorrow's problem now." : `All ${count} pushed to tomorrow.`,
      duration: 12000,
      action: {
        label: "Undo",
        onClick: () => {
          const restored = lastRolledRef.current;
          if (restored.length > 0) {
            setTasks(restored);
            lastRolledRef.current = [];
          }
          setToast(null);
        },
      },
    });
  }, [filteredTasks.length, tasks]);

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

    if (editingTask.completedAt) {
      setDoneTasks((prev) => prev.map((t) => t.id === editingTask.id ? updatedTask : t));
    } else {
      setTasks((prev) => prev.map((t) => t.id === editingTask.id ? updatedTask : t));
    }

    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }, [editingTask]);

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
      const earned = 5;
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

  const handleDelete = useCallback((taskId: string) => {
    executeDelete(taskId);
  }, [executeDelete]);

  const handleDeleteFromSheet = useCallback(() => {
    if (!editingTask) return;
    const taskId = editingTask.id;
    // TODO: check if task has a repeat rule to determine isRepeating
    const isRepeating = false; // demo data has no repeating tasks
    setSheetOpen(false);
    setEditingTask(null);
    if (isRepeating) {
      setDeleteDialog({ taskId, isRepeating: true });
    } else {
      executeDelete(taskId);
    }
  }, [editingTask, executeDelete]);

  // Keep sheetOpenRef in sync with sheetOpen state
  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  // Mark swipe hint as shown after first render
  useEffect(() => {
    swipeHintShown.current = true;
  }, []);

  // Global Cmd+Enter: opens sheet when closed.
  // When the sheet is open, TaskSheet itself handles Cmd+Enter for submission
  // via its internal keydown listener — no need to duplicate here.
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!sheetOpen) {
          e.preventDefault();
          handleAddTask();
        }
        // When sheetOpen, TaskSheet's own listener handles submission.
      }
    }
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [sheetOpen, handleAddTask]);

  // Stagger animation variants
  const listVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.04,
      },
    },
  };

  const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 },
    visible: shouldReduceMotion
      ? { opacity: 1 }
      : {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: easeOutQuart },
        },
  };

  return (
    <AppShell
      activePath="/today"
      userName={DEMO_USER}
      partnerName={DEMO_PARTNER}
      userPoints={userPoints}
      partnerPoints={312}
      userPointsToday={userPointsToday}
      partnerPointsToday={60}
      hasNotification={true}
      todayCount={filteredTasks.length}
      weekCount={12}
      monthLabel={new Date().toLocaleDateString("en-US", { month: "long" })}
    >
      {/* ---- Page header ---- */}
      <div className="mb-[var(--space-6)]">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-[var(--weight-bold)] text-[color:var(--color-text-primary)] leading-[var(--leading-tight)]">
          {dayName}
        </h1>
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] mt-[var(--space-1)]">
          {fullDate}
          {totalActive > 0 && !isCaughtUp && (
            <span className="ml-[var(--space-2)] text-[color:var(--color-text-secondary)]">
              &middot; {totalActive} {totalActive === 1 ? "task" : "tasks"} to do
            </span>
          )}
        </p>
      </div>

      {/* ---- Toolbar ---- */}
      <div className="flex items-center justify-between gap-[var(--space-3)] mb-[var(--space-4)]">
        <FilterToggle
          value={filter}
          onChange={setFilter}
          partnerName={DEMO_PARTNER}
        />

        <div className="flex items-center gap-[var(--space-2)]">
          {filteredTasks.length > 0 && (
            <button
              onClick={handleRollOver}
              aria-label="Roll all tasks to tomorrow"
              className="
                inline-flex items-center gap-[var(--space-1)]
                px-[var(--space-3)] py-[var(--space-2)]
                rounded-[var(--radius-md)]
                text-[length:var(--text-sm)] font-[var(--weight-medium)]
                text-[color:var(--color-text-secondary)]
                hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface)]
                transition-colors duration-[var(--duration-instant)]
                min-h-[var(--touch-target-min)]
              "
            >
              <span className="hidden lg:inline">Roll to tomorrow</span>
              <span className="lg:hidden">Roll all</span>
              <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {/* Desktop add button */}
          <button
            onClick={handleAddTask}
            aria-keyshortcuts="Meta+Enter"
            className="
              hidden lg:inline-flex items-center gap-[var(--space-2)]
              px-[var(--space-4)] py-[var(--space-2)]
              rounded-[var(--radius-md)]
              text-[length:var(--text-sm)] font-[var(--weight-semibold)]
              bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
              hover:bg-[var(--color-accent-hover)]
              shadow-[var(--shadow-accent-glow)]
              hover:shadow-[var(--shadow-accent-glow-strong,var(--shadow-accent-glow))]
              active:scale-[0.98]
              transition-all duration-[var(--duration-instant)]
              min-h-[var(--touch-target-min)]
            "
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Add task
            <kbd className="
              ml-[var(--space-1)] px-[var(--space-1)] py-[var(--space-0-5)]
              rounded-[var(--radius-sm)]
              bg-[var(--color-accent-hover)]
              text-[length:var(--text-xs)] font-[var(--weight-medium)]
              text-[color:var(--color-accent-text)]
              opacity-80
            ">
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
          <EmptyState variant="caught-up" completedCount={doneTasks.length} />
          <DoneAccordion
            tasks={filteredDone}
            onUncomplete={handleUncomplete}
            onTap={handleTap}
            onDelete={handleDelete}
          />
        </>
      ) : (
        <>
          {/* Primary section — hard-deadline tasks */}
          {primaryTasks.length > 0 && (
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
                  {primaryTasks.map((task, index) => (
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
          {secondaryTasks.length > 0 && (
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
                  {secondaryTasks.map((task) => (
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

      {/* ---- FAB (mobile) — hidden when the sheet is open ---- */}
      <Fab onClick={handleAddTask} isSheetOpen={sheetOpen} />

      {/* ---- Add task sheet ---- */}
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

      {/* ---- Toast ---- */}
      <Toast
        message={toast?.message ?? ""}
        action={toast?.action}
        isVisible={!!toast}
        onDismiss={() => setToast(null)}
        duration={toast?.duration}
      />

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
    </AppShell>
  );
}
