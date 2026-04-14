"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent,
} from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ChevronDown, ChevronUp, Plus, Minus, Trash2 } from "lucide-react";
import { IconButton } from "../icon-button/icon-button";
import { BottomSheet } from "../bottom-sheet/bottom-sheet";
import { TaskChip } from "../task-chip/task-chip";
import { Popover } from "../popover/popover";
import { DatePicker } from "../date-picker/date-picker";
import { SegmentedControl } from "../segmented-control/segmented-control";
import {
  AssigneePicker,
  type AssigneeValue,
} from "../assignee-picker/assignee-picker";
import {
  CategoryPicker,
  type CategoryValue,
} from "../category-picker/category-picker";
import {
  RepeatPicker,
  type RepeatRule,
} from "../repeat-picker/repeat-picker";
import { formatRepeatRule } from "../repeat-picker/format-repeat";

/* ================================================================
 * Types
 * ================================================================ */

export type TaskSheetMode = "create" | "edit";

/** All field values managed by the sheet. Parent receives these on submit. */
export interface TaskFormData {
  title: string;
  date: string;
  assignee: AssigneeValue;
  category: CategoryValue;
  repeatRule: RepeatRule | null;
  time: string | null;
  flexible: boolean;
  notes: string;
  points: number | null;
}

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

/* ================================================================
 * Flexible toggle options (for SegmentedControl)
 * ================================================================ */

const FLEXIBLE_OPTIONS = [
  { value: "hard" as const, label: "Hard deadline" },
  { value: "flexible" as const, label: "When you can" },
];

/* ================================================================
 * Points auto-fill table
 * ================================================================ */

const POINTS_AUTO: Record<string, number> = {
  trash: 5,
  dishwasher: 5,
  lawn: 15,
  groceries: 15,
  leaves: 30,
};

function getAutoPoints(title: string): number | null {
  const lower = title.toLowerCase();
  for (const [keyword, pts] of Object.entries(POINTS_AUTO)) {
    if (lower.includes(keyword)) return pts;
  }
  return null;
}

/* ================================================================
 * Time helpers — 15-min stepper
 * ================================================================ */

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hDisplay = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hDisplay}:${String(m).padStart(2, "0")} ${ampm}`;
}

function timeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

/* ================================================================
 * Picker IDs — union type for active picker tracking
 * ================================================================ */

type ActivePicker = "date" | "assignee" | "category" | "repeat" | null;

/* ================================================================
 * TaskSheet
 * ================================================================ */

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
  const shouldReduceMotion = useReducedMotion();
  const todayISO = useMemo(() => new Date().toISOString().split("T")[0], []);

  /* ---------------------------------------------------------------
   * Form state
   * --------------------------------------------------------------- */

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [date, setDate] = useState(todayISO);
  const [assignee, setAssignee] = useState<AssigneeValue>("me");
  const [category, setCategory] = useState<CategoryValue>("Uncategorized");
  const [repeatRule, setRepeatRule] = useState<RepeatRule | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [flexible, setFlexible] = useState(false);
  const [notes, setNotes] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const [pointsManual, setPointsManual] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dateChipRef = useRef<HTMLButtonElement>(null);
  const assigneeChipRef = useRef<HTMLButtonElement>(null);
  const categoryChipRef = useRef<HTMLButtonElement>(null);
  const repeatChipRef = useRef<HTMLButtonElement>(null);

  /* ---------------------------------------------------------------
   * Detect mobile for date picker divergence
   * --------------------------------------------------------------- */

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ---------------------------------------------------------------
   * Reset state when sheet opens/closes
   * --------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------
   * Auto-points: update when title changes (unless manually set)
   * --------------------------------------------------------------- */

  useEffect(() => {
    if (pointsManual) return;
    const auto = getAutoPoints(title);
    setPoints(auto);
  }, [title, pointsManual]);

  /* ---------------------------------------------------------------
   * Textarea auto-grow
   * --------------------------------------------------------------- */

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  /* ---------------------------------------------------------------
   * Picker toggle helpers
   * --------------------------------------------------------------- */

  const togglePicker = useCallback(
    (picker: ActivePicker) => {
      setActivePicker((prev) => (prev === picker ? null : picker));
    },
    [],
  );

  const closePicker = useCallback(() => {
    // Capture which chip to refocus before clearing state
    const refToFocus =
      activePicker === "date"
        ? dateChipRef
        : activePicker === "assignee"
          ? assigneeChipRef
          : activePicker === "category"
            ? categoryChipRef
            : activePicker === "repeat"
              ? repeatChipRef
              : null;

    setActivePicker(null);

    // Defer focus until after React has flushed the state update and
    // the Popover portal has begun its exit animation. Without this,
    // the portal unmount can steal focus back to document.body.
    requestAnimationFrame(() => {
      refToFocus?.current?.focus();
    });
  }, [activePicker]);

  /* ---------------------------------------------------------------
   * Date label
   * --------------------------------------------------------------- */

  const dateLabel = useMemo(() => {
    const d = new Date(date + "T00:00:00");
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    ) {
      return "Today";
    }
    if (
      d.getFullYear() === tomorrow.getFullYear() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getDate() === tomorrow.getDate()
    ) {
      return "Tomorrow";
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [date]);

  /* ---------------------------------------------------------------
   * Assignee label
   * --------------------------------------------------------------- */

  const assigneeLabel = useMemo(() => {
    switch (assignee) {
      case "me":
        return userName;
      case "partner":
        return partnerName;
      case "shared":
        return "Shared";
    }
  }, [assignee, userName, partnerName]);

  /* ---------------------------------------------------------------
   * Time stepper
   * --------------------------------------------------------------- */

  const timeMinutes = time ? timeToMinutes(time) : null;

  const incrementTime = useCallback(() => {
    if (timeMinutes === null) {
      // Default to 9:00 AM when first setting time
      setTime(formatTime(540));
    } else {
      const next = (timeMinutes + 15) % (24 * 60);
      setTime(formatTime(next));
    }
  }, [timeMinutes]);

  const decrementTime = useCallback(() => {
    if (timeMinutes === null) {
      setTime(formatTime(540));
    } else {
      const prev = (timeMinutes - 15 + 24 * 60) % (24 * 60);
      setTime(formatTime(prev));
    }
  }, [timeMinutes]);

  const clearTime = useCallback(() => setTime(null), []);

  /* ---------------------------------------------------------------
   * Submit logic
   * --------------------------------------------------------------- */

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(false);
    setActivePicker(null);

    try {
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
    } catch {
      setSubmitError(true);
      setIsSubmitting(false);
    }
  }, [
    title,
    isSubmitting,
    mode,
    onSubmit,
    onClose,
    date,
    assignee,
    category,
    repeatRule,
    time,
    flexible,
    notes,
    points,
  ]);

  /* ---------------------------------------------------------------
   * Keyboard handling
   * --------------------------------------------------------------- */

  function handleTextareaKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") {
      if (e.shiftKey) return;
      e.preventDefault();
      handleSubmit();
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    function handleGlobalKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    }
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, handleSubmit]);

  /* ---------------------------------------------------------------
   * Expand/collapse More
   * --------------------------------------------------------------- */

  function handleExpand() {
    setIsExpanded((prev) => !prev);
  }

  const canSubmit = title.trim().length > 0 && !isSubmitting;

  /* ---------------------------------------------------------------
   * Mobile date sheet state (date picker in secondary bottom sheet)
   * --------------------------------------------------------------- */

  const [mobileDateOpen, setMobileDateOpen] = useState(false);

  const handleDateChipClick = useCallback(() => {
    if (isMobile) {
      setMobileDateOpen(true);
      setActivePicker(null);
    } else {
      togglePicker("date");
    }
  }, [isMobile, togglePicker]);

  const handleMobileDateClose = useCallback(() => {
    setMobileDateOpen(false);
    dateChipRef.current?.focus();
  }, []);

  /* ---------------------------------------------------------------
   * Render
   * --------------------------------------------------------------- */

  return (
    <>
      <BottomSheet
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel="What needs doing?"
        variant="sheet"
        heightMode="fit"
        showDragHandle={true}
        dragHandleClassName="lg:hidden"
        sheetClassName="
          lg:inset-x-auto lg:left-1/2 lg:right-auto lg:-translate-x-1/2
          lg:w-full lg:max-w-[var(--content-max-width)]
          lg:rounded-[var(--radius-xl)]
          lg:bottom-[var(--space-6)]
        "
        contentClassName="
          pt-[var(--space-2)] pb-[var(--space-4)]
          lg:px-[var(--space-6)] lg:pt-[var(--space-4)] lg:pb-[var(--space-6)]
        "
      >
        {/* ---- Header row ---- */}
        <div className="flex items-center justify-between mb-[var(--space-3)]">
          <h2 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-tertiary)]">
            {mode === "edit" ? "Editing" : "New task"}
          </h2>
          <div className="flex items-center gap-[var(--space-1)] -mr-[var(--space-2)]">
            {mode === "edit" && onDelete && (
              <IconButton
                icon={<Trash2 size={18} strokeWidth={2} />}
                label="Delete task"
                variant="destructive"
                onClick={onDelete}
              />
            )}
            <IconButton
              icon={<X size={18} strokeWidth={2} />}
              label="Close"
              onClick={onClose}
            />
          </div>
        </div>

        {/* ---- Title textarea ---- */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <textarea
            ref={textareaRef}
            id="task-title"
            aria-label="Task title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              resizeTextarea();
              if (submitError) setSubmitError(false);
            }}
            onKeyDown={handleTextareaKeyDown}
            placeholder="What's rattling around up there?"
            rows={1}
            disabled={isSubmitting}
            className="
              w-full
              resize-none overflow-hidden
              bg-transparent
              text-[length:var(--text-lg)] font-[var(--weight-medium)]
              text-[color:var(--color-text-primary)]
              placeholder:text-[color:var(--color-text-disabled)]
              placeholder:font-[var(--weight-normal)]
              leading-[var(--leading-relaxed)]
              outline-none
              min-h-[var(--size-title-input-min)]
              pb-[var(--space-2)]
              disabled:opacity-60
              transition-opacity duration-[var(--duration-instant)]
            "
            style={{ height: "auto" }}
          />

          {/* ---- Error state ---- */}
          <AnimatePresence>
            {submitError && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="
                  text-[length:var(--text-sm)] text-[color:var(--color-destructive)]
                  mb-[var(--space-3)]
                "
              >
                That didn&rsquo;t save. Try again?
              </motion.p>
            )}
          </AnimatePresence>

          {/* ---- Chip row ---- */}
          <div className="relative mb-[var(--space-4)]">
            <div
              className="
                flex items-center gap-[var(--space-2)]
                overflow-x-auto
                pb-[var(--space-1)]
                -mx-[var(--space-1)] px-[var(--space-1)]
                scrollbar-hide
                [mask-image:linear-gradient(to_right,black_85%,transparent)]
                lg:[mask-image:none]
              "
              role="group"
              aria-label="Task field shortcuts"
            >
              {/* Date chip */}
              <TaskChip
                ref={dateChipRef}
                icon="📅"
                label={dateLabel}
                ariaLabel={`Set due date — currently ${dateLabel}`}
                disabled={isSubmitting}
                isActive={activePicker === "date" || mobileDateOpen}
                onClick={handleDateChipClick}
                className="shrink-0"
              />

              {/* Assignee chip */}
              <TaskChip
                ref={assigneeChipRef}
                icon="👤"
                label={assigneeLabel}
                ariaLabel={`Set assignee — currently ${assigneeLabel}`}
                disabled={isSubmitting}
                isActive={activePicker === "assignee"}
                onClick={() => togglePicker("assignee")}
                className="shrink-0"
              />

              {/* Category chip */}
              <TaskChip
                ref={categoryChipRef}
                icon="🏷"
                label={category}
                ariaLabel={`Set category — currently ${category}`}
                disabled={isSubmitting}
                isActive={activePicker === "category"}
                onClick={() => togglePicker("category")}
                className="shrink-0"
              />

              {/* Repeat chip */}
              <TaskChip
                ref={repeatChipRef}
                icon="🔁"
                label={repeatRule ? formatRepeatRule(repeatRule) : "Doesn't repeat"}
                ariaLabel={`Set repeat rule — currently ${repeatRule ? formatRepeatRule(repeatRule) : "doesn't repeat"}`}
                disabled={isSubmitting}
                isActive={activePicker === "repeat"}
                onClick={() => togglePicker("repeat")}
                className="shrink-0"
              />

              {/* Details chip */}
              <TaskChip
                icon={isExpanded ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
                label="Details"
                ariaLabel={isExpanded ? "Hide details" : "Show details"}
                disabled={isSubmitting}
                isActive={isExpanded}
                onClick={handleExpand}
                className="shrink-0"
              />
            </div>
          </div>

          {/* ---- Date popover (desktop) ---- */}
          <Popover
            isOpen={activePicker === "date" && !isMobile}
            onClose={closePicker}
            anchorRef={dateChipRef}
            placement="bottom-start"
            ariaLabel="Pick a date"
          >
            <DatePicker
              value={date}
              onChange={(d) => {
                setDate(d);
                closePicker();
              }}
            />
          </Popover>

          {/* ---- Assignee popover ---- */}
          <Popover
            isOpen={activePicker === "assignee"}
            onClose={closePicker}
            anchorRef={assigneeChipRef}
            placement="bottom-start"
            ariaLabel="Set assignee"
          >
            <AssigneePicker
              value={assignee}
              onChange={(v) => {
                setAssignee(v);
                closePicker();
              }}
              userName={userName}
              partnerName={partnerName}
            />
          </Popover>

          {/* ---- Category popover ---- */}
          <Popover
            isOpen={activePicker === "category"}
            onClose={closePicker}
            anchorRef={categoryChipRef}
            placement="bottom-start"
            ariaLabel="File it where?"
          >
            <CategoryPicker
              value={category}
              onChange={(v) => {
                setCategory(v);
                closePicker();
              }}
            />
          </Popover>

          {/* ---- Repeat popover ---- */}
          <Popover
            isOpen={activePicker === "repeat"}
            onClose={closePicker}
            anchorRef={repeatChipRef}
            placement="bottom-start"
            ariaLabel="Set repeat rule"
          >
            <RepeatPicker
              value={repeatRule}
              onChange={(rule) => {
                setRepeatRule(rule);
                closePicker();
              }}
            />
          </Popover>

          {/* ---- Expanded section (More) ---- */}
          {/*
            Height animation uses grid-template-rows: 0fr → 1fr for
            GPU-compositable transitions (no layout reflow per frame).
          */}
          <div
            className="grid transition-[grid-template-rows,visibility] duration-[var(--duration-normal)] ease-[var(--ease-out-quart)]"
            style={{
              gridTemplateRows: isExpanded ? "1fr" : "0fr",
              visibility: isExpanded ? "visible" : "hidden",
            }}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[var(--color-border-subtle)] pt-[var(--space-4)] mb-[var(--space-4)] flex flex-col gap-[var(--space-4)]">
                {/* --- Time stepper --- */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="task-time"
                    className="text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-secondary)]"
                  >
                    When today?
                  </label>
                  <div className="flex items-center gap-[var(--space-1)]">
                    <button
                      type="button"
                      aria-label="Earlier time"
                      onClick={decrementTime}
                      disabled={isSubmitting}
                      className="
                        p-[var(--space-2)] rounded-[var(--radius-md)]
                        text-[color:var(--color-text-tertiary)]
                        hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-dim)]
                        min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
                        flex items-center justify-center
                        transition-colors duration-[var(--duration-instant)]
                        disabled:opacity-50
                      "
                    >
                      <Minus size={14} strokeWidth={2} />
                    </button>
                    <span
                      id="task-time"
                      className="
                        min-w-[5rem] text-center
                        text-[length:var(--text-sm)] font-[var(--weight-medium)]
                        text-[color:var(--color-text-primary)]
                      "
                    >
                      {time ?? "No time"}
                    </span>
                    <button
                      type="button"
                      aria-label="Later time"
                      onClick={incrementTime}
                      disabled={isSubmitting}
                      className="
                        p-[var(--space-2)] rounded-[var(--radius-md)]
                        text-[color:var(--color-text-tertiary)]
                        hover:text-[color:var(--color-text-primary)] hover:bg-[var(--color-surface-dim)]
                        min-h-[var(--touch-target-min)] min-w-[var(--touch-target-min)]
                        flex items-center justify-center
                        transition-colors duration-[var(--duration-instant)]
                        disabled:opacity-50
                      "
                    >
                      <Plus size={14} strokeWidth={2} />
                    </button>
                    {time && (
                      <button
                        type="button"
                        aria-label="Clear time"
                        onClick={clearTime}
                        disabled={isSubmitting}
                        className="
                          ml-[var(--space-1)]
                          px-[var(--space-2)] py-[var(--space-1)]
                          min-h-[var(--touch-target-min)]
                          flex items-center justify-center
                          rounded-[var(--radius-md)]
                          text-[length:var(--text-xs)] text-[color:var(--color-text-tertiary)]
                          hover:text-[color:var(--color-text-secondary)]
                          hover:bg-[var(--color-surface-dim)]
                          transition-colors duration-[var(--duration-instant)]
                        "
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* --- Flexible toggle (shared SegmentedControl) --- */}
                <div className="flex items-center justify-between">
                  <span className="text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-secondary)]">
                    Deadline type
                  </span>
                  <SegmentedControl
                    options={FLEXIBLE_OPTIONS}
                    value={flexible ? "flexible" : "hard"}
                    onChange={(v) => setFlexible(v === "flexible")}
                    ariaLabel="Deadline type"
                    disabled={isSubmitting}
                    size="compact"
                  />
                </div>

                {/* --- Notes --- */}
                <div>
                  <label
                    htmlFor="task-notes"
                    className="block text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-secondary)] mb-[var(--space-1)]"
                  >
                    Notes
                  </label>
                  <textarea
                    id="task-notes"
                    aria-label="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Anything else worth saying?"
                    rows={2}
                    disabled={isSubmitting}
                    className="
                      w-full resize-none
                      bg-[var(--color-surface-dim)]
                      rounded-[var(--radius-md)]
                      px-[var(--space-3)] py-[var(--space-2)]
                      text-[length:var(--text-sm)] text-[color:var(--color-text-primary)]
                      placeholder:text-[color:var(--color-text-disabled)]
                      leading-[var(--leading-relaxed)]
                      outline-none
                      border border-[var(--color-border-subtle)]
                      focus:border-[var(--color-border-focus)]
                      transition-colors duration-[var(--duration-instant)]
                      disabled:opacity-60
                    "
                  />
                </div>

                {/* --- Points --- */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="task-points"
                    className="text-[length:var(--text-sm)] font-[var(--weight-medium)] text-[color:var(--color-text-secondary)]"
                  >
                    Points
                  </label>
                  <div className="flex items-center gap-[var(--space-2)]">
                    <input
                      id="task-points"
                      type="number"
                      min={0}
                      max={100}
                      value={points ?? ""}
                      onChange={(e) => {
                        setPointsManual(true);
                        const v = e.target.value;
                        if (v === "") {
                          setPoints(null);
                        } else {
                          const n = Math.min(
                            100,
                            Math.max(0, parseInt(v) || 0),
                          );
                          setPoints(n);
                        }
                      }}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="
                        w-16 text-center
                        bg-[var(--color-surface-dim)]
                        rounded-[var(--radius-md)]
                        px-[var(--space-2)] py-[var(--space-1-5)]
                        text-[length:var(--text-sm)] font-[var(--weight-medium)]
                        text-[color:var(--color-text-primary)]
                        border border-[var(--color-border-subtle)]
                        focus:border-[var(--color-border-focus)]
                        outline-none
                        transition-colors duration-[var(--duration-instant)]
                        disabled:opacity-60
                        [appearance:textfield]
                        [&::-webkit-inner-spin-button]:appearance-none
                        [&::-webkit-outer-spin-button]:appearance-none
                      "
                    />
                    {!pointsManual && points !== null && (
                      <span className="text-[length:var(--text-xs)] text-[color:var(--color-text-disabled)] italic">
                        auto
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- CTA row ---- */}
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <p
              className="
                hidden lg:block
                text-[length:var(--text-xs)] text-[color:var(--color-text-disabled)]
              "
              aria-hidden="true"
            >
              <kbd className="font-[family-name:var(--font-mono)]">↵</kbd> {mode === "edit" ? "to save" : "to add"}
              &nbsp;&middot;&nbsp;
              <kbd className="font-[family-name:var(--font-mono)]">⇧↵</kbd> newline
              &nbsp;&middot;&nbsp;
              <kbd className="font-[family-name:var(--font-mono)]">Esc</kbd> to cancel
            </p>

            <div className="lg:hidden" aria-hidden="true" />

            <button
              type="submit"
              disabled={!canSubmit}
              aria-label={isSubmitting ? (mode === "edit" ? "Saving\u2026" : "Adding task\u2026") : (mode === "edit" ? "Save" : "Add it")}
              className="
                inline-flex items-center gap-[var(--space-2)]
                px-[var(--space-6)] py-[var(--space-3)]
                rounded-[var(--radius-md)]
                text-[length:var(--text-sm)] font-[var(--weight-semibold)]
                bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
                shadow-[var(--shadow-accent-glow)]
                hover:bg-[var(--color-accent-hover)]
                hover:shadow-[var(--shadow-accent-glow-strong,var(--shadow-accent-glow))]
                active:scale-[0.97]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:scale-100
                transition-all duration-[var(--duration-instant)]
                min-h-[var(--touch-target-min)]
              "
            >
              {isSubmitting ? (
                <span
                  className="inline-block w-4 h-4 border-2 border-[color:var(--color-accent-text)] border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                />
              ) : null}
              {isSubmitting ? (mode === "edit" ? "Saving\u2026" : "Adding\u2026") : (mode === "edit" ? "Save" : "Add it")}
            </button>
          </div>

        </form>
      </BottomSheet>

      {/* ---- Mobile date sheet (secondary bottom sheet) ---- */}
      {isMobile && (
        <BottomSheet
          isOpen={mobileDateOpen}
          onClose={handleMobileDateClose}
          title="Pick a date"
          variant="sheet"
          heightMode="fit"
          showDragHandle={true}
          dragHandleClassName="lg:hidden"
        >
          <DatePicker
            value={date}
            onChange={(d) => {
              setDate(d);
              handleMobileDateClose();
            }}
          />
        </BottomSheet>
      )}
    </>
  );
}
