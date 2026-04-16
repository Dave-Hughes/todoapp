/**
 * Task adapters
 * =============
 * Shared projections between the DB task shape (`DBTask` from Drizzle) and
 * the UI-layer shapes (`UITask`, `TaskFormData`, `CreateTaskInput`).
 *
 * These used to live inline in `src/app/page.tsx`. Week and Month views need
 * the same transforms, so they were lifted here with no behavior change.
 */

import type { Task as DBTask } from "@/db/schema";
import type { Task as UITask } from "@/components/task-list-item/task-list-item";
import type { TaskFormData } from "@/components/task-sheet/task-sheet";
import type { AssigneeValue } from "@/components/assignee-picker/assignee-picker";
import type { CategoryValue } from "@/components/category-picker/category-picker";
import type { RepeatRule } from "@/components/repeat-picker/parse-repeat";
import type { CreateTaskInput } from "@/lib/api/validators";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";

/* ================================================================
 * Date helpers
 * ================================================================ */

/** Returns signed integer days between two ISO dates (A − B). Positive = A after B. */
export function daysBetween(isoA: string, isoB: string): number {
  const a = Date.parse(`${isoA}T00:00:00Z`);
  const b = Date.parse(`${isoB}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

/** Today's ISO date (YYYY-MM-DD) in local time. */
export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ================================================================
 * Empty-day copy
 *
 * Rotating micro-copy for empty day states. Uses a deterministic hash
 * of the ISO date string so the same day always gets the same line,
 * but different days vary. Shared across Week and Month views.
 * ================================================================ */

const EMPTY_DAY_LINES = [
  "Nothing on the books for this one.",
  "A clear day. Enjoy the quiet.",
  "Blank slate. Perfect for last-minute plans.",
  "No commitments. Take the afternoon.",
  "Wide open. Enjoy it.",
  "Nothing here yet.",
  "A blank canvas.",
  "Free day. For now.",
];

/** Deterministic per-ISO-date rotating empty-day copy. */
export function emptyDayCopy(iso: string): string {
  let h = 0;
  for (let i = 0; i < iso.length; i++) h = ((h << 5) - h + iso.charCodeAt(i)) | 0;
  return EMPTY_DAY_LINES[Math.abs(h) % EMPTY_DAY_LINES.length];
}

/** ISO date offset by `delta` days from `iso`. */
export function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/* ================================================================
 * Repeat rule conversions
 * ================================================================ */

/**
 * DB stores `repeatRule` as JSONB shaped to match the API validator
 * (snake_case `day_of_month`). The UI's `RepeatRule` uses camelCase
 * `dayOfMonth`. This converts the DB shape to the UI shape.
 */
export function dbRepeatRuleToUI(rule: unknown): RepeatRule | null {
  if (!rule || typeof rule !== "object") return null;
  const r = rule as { type?: string; interval?: number; days?: unknown; day_of_month?: number };
  if (r.type === "daily" && typeof r.interval === "number") {
    return { type: "daily", interval: r.interval };
  }
  if (r.type === "weekly" && typeof r.interval === "number" && Array.isArray(r.days)) {
    return {
      type: "weekly",
      interval: r.interval,
      days: r.days as RepeatRule extends { type: "weekly"; days: infer D } ? D : never,
    };
  }
  if (r.type === "monthly" && typeof r.interval === "number" && typeof r.day_of_month === "number") {
    return { type: "monthly", interval: r.interval, dayOfMonth: r.day_of_month };
  }
  return null;
}

/** UI camelCase → API snake_case for the monthly repeat rule. */
export function toApiRepeatRule(rule: RepeatRule | null): CreateTaskInput["repeatRule"] {
  if (!rule) return null;
  if (rule.type === "monthly") {
    return { type: "monthly", interval: rule.interval, day_of_month: rule.dayOfMonth };
  }
  return rule;
}

/* ================================================================
 * DB → UI projection
 * ================================================================ */

export function toUITask(
  t: DBTask,
  me: { id: string; displayName: string },
  partner: { id: string; displayName: string } | null,
  categoryNameById: Map<string, string>,
  referenceIso: string,
): UITask {
  const isShared = t.assigneeUserId === SHARED_ASSIGNEE_SENTINEL;
  const assigneeName = isShared
    ? undefined
    : t.assigneeUserId === me.id
      ? me.displayName
      : t.assigneeUserId === partner?.id
        ? partner.displayName
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
    const diff = daysBetween(referenceIso, t.dueDate);
    return diff > 0 ? diff : undefined;
  })();

  return {
    id: t.id,
    title: t.title,
    dueTime: t.dueTime ?? undefined,
    flexible: t.flexible,
    assigneeName,
    isShared,
    categoryName: t.categoryId ? categoryNameById.get(t.categoryId) : undefined,
    createdByName: createdByName ?? "",
    completedAt: t.completedAt ? t.completedAt.toString() : undefined,
    completedByName,
    overdueDays,
    repeatRule: dbRepeatRuleToUI(t.repeatRule),
    points: t.points,
    notes: t.notes,
  };
}

/* ================================================================
 * UITask → TaskFormData (edit-mode pre-population)
 * ================================================================ */

export function uiTaskToFormData(
  task: UITask,
  me: { displayName: string },
  partner: { displayName: string } | null,
  categoryIdByName: Map<string, string>,
  dueDateIso: string,
  dbDueDate?: string,
): Partial<TaskFormData> {
  let assignee: AssigneeValue = "me";
  if (task.isShared) {
    assignee = "shared";
  } else if (task.assigneeName === me.displayName) {
    assignee = "me";
  } else if (partner && task.assigneeName === partner.displayName) {
    assignee = "partner";
  } else {
    assignee = "shared";
  }

  const category: CategoryValue =
    (task.categoryName && categoryIdByName.has(task.categoryName)
      ? task.categoryName
      : "Uncategorized") as CategoryValue;

  return {
    title: task.title,
    // Prefer the true DB-side date when provided (Week/Month look at past/future
    // days); fall back to reference date (Today view passes today).
    date: dbDueDate ?? dueDateIso,
    assignee,
    category,
    repeatRule: task.repeatRule ?? null,
    time: task.dueTime ?? null,
    flexible: task.flexible,
    notes: task.notes ?? "",
    points: task.points ?? null,
  };
}

/* ================================================================
 * TaskFormData → CreateTaskInput
 * ================================================================ */

export function formDataToCreateInput(
  data: TaskFormData,
  me: { id: string },
  partner: { id: string } | null,
  categoryIdByName: Map<string, string>,
  fallbackDateIso: string,
): CreateTaskInput {
  // "shared" → sentinel; "partner" with no partner yet → also sentinel (solo
  // user picking Partner means "this is for whoever joins"). "me" → my id.
  const assigneeUserId =
    data.assignee === "me"
      ? me.id
      : data.assignee === "partner"
        ? partner?.id ?? SHARED_ASSIGNEE_SENTINEL
        : SHARED_ASSIGNEE_SENTINEL;

  return {
    title: data.title.trim(),
    notes: data.notes || null,
    dueDate: data.date || fallbackDateIso,
    dueTime: data.time || null,
    flexible: data.flexible,
    categoryId:
      data.category && data.category !== "Uncategorized"
        ? categoryIdByName.get(data.category) ?? null
        : null,
    assigneeUserId,
    points: data.points ?? 0,
    repeatRule: toApiRepeatRule(data.repeatRule),
  };
}
