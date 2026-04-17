import { describe, it, expect } from "vitest";
import {
  daysBetween,
  todayIso,
  addDaysIso,
  dbRepeatRuleToUI,
  toApiRepeatRule,
  toUITask,
  uiTaskToFormData,
  formDataToCreateInput,
} from "./task-adapters";
import type { Task as DBTask } from "@/db/schema";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";

/* ================================================================
 * Date helpers
 * ================================================================ */

describe("daysBetween", () => {
  it("returns 0 for same date", () => {
    expect(daysBetween("2026-04-15", "2026-04-15")).toBe(0);
  });
  it("returns positive when A is after B", () => {
    expect(daysBetween("2026-04-17", "2026-04-15")).toBe(2);
  });
  it("returns negative when A is before B", () => {
    expect(daysBetween("2026-04-13", "2026-04-15")).toBe(-2);
  });
  it("handles month boundaries", () => {
    expect(daysBetween("2026-05-01", "2026-04-30")).toBe(1);
  });
  it("handles year boundaries", () => {
    expect(daysBetween("2027-01-01", "2026-12-31")).toBe(1);
  });
});

describe("todayIso", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("matches the current date", () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    expect(todayIso()).toBe(`${y}-${m}-${d}`);
  });
});

describe("addDaysIso", () => {
  it("adds days forward", () => {
    expect(addDaysIso("2026-04-15", 3)).toBe("2026-04-18");
  });
  it("subtracts days backward", () => {
    expect(addDaysIso("2026-04-15", -5)).toBe("2026-04-10");
  });
  it("crosses month boundary forward", () => {
    expect(addDaysIso("2026-04-29", 3)).toBe("2026-05-02");
  });
  it("crosses month boundary backward", () => {
    expect(addDaysIso("2026-05-02", -3)).toBe("2026-04-29");
  });
  it("handles Feb 28 → Mar 1 in non-leap year", () => {
    expect(addDaysIso("2026-02-28", 1)).toBe("2026-03-01");
  });
  it("handles Feb 28 → Feb 29 in leap year", () => {
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
  });
  it("returns same date for delta=0", () => {
    expect(addDaysIso("2026-04-15", 0)).toBe("2026-04-15");
  });
});

/* ================================================================
 * Repeat rule conversions
 * ================================================================ */

describe("dbRepeatRuleToUI", () => {
  it("returns null for falsy input", () => {
    expect(dbRepeatRuleToUI(null)).toBeNull();
    expect(dbRepeatRuleToUI(undefined)).toBeNull();
    expect(dbRepeatRuleToUI("")).toBeNull();
  });

  it("converts daily rule", () => {
    expect(dbRepeatRuleToUI({ type: "daily", interval: 3 })).toEqual({
      type: "daily",
      interval: 3,
    });
  });

  it("converts weekly rule with days array", () => {
    expect(
      dbRepeatRuleToUI({ type: "weekly", interval: 1, days: [1, 3, 5] }),
    ).toEqual({
      type: "weekly",
      interval: 1,
      days: [1, 3, 5],
    });
  });

  it("converts monthly rule (snake_case → camelCase)", () => {
    expect(
      dbRepeatRuleToUI({ type: "monthly", interval: 1, day_of_month: 15 }),
    ).toEqual({
      type: "monthly",
      interval: 1,
      dayOfMonth: 15,
    });
  });

  it("returns null for unknown type", () => {
    expect(dbRepeatRuleToUI({ type: "yearly", interval: 1 })).toBeNull();
  });
});

describe("toApiRepeatRule", () => {
  it("returns null for null input", () => {
    expect(toApiRepeatRule(null)).toBeNull();
  });

  it("passes daily rule through unchanged", () => {
    const rule = { type: "daily" as const, interval: 2 };
    expect(toApiRepeatRule(rule)).toEqual(rule);
  });

  it("converts monthly camelCase to snake_case", () => {
    expect(
      toApiRepeatRule({ type: "monthly", interval: 1, dayOfMonth: 15 }),
    ).toEqual({
      type: "monthly",
      interval: 1,
      day_of_month: 15,
    });
  });
});

/* ================================================================
 * toUITask
 * ================================================================ */

function makeDBTask(overrides: Partial<DBTask> = {}): DBTask {
  return {
    id: "task-1",
    householdId: "hh-1",
    title: "Pick up groceries",
    notes: null,
    dueDate: "2026-04-15",
    dueTime: null,
    flexible: false,
    categoryId: null,
    assigneeUserId: "user-me",
    createdByUserId: "user-me",
    completedAt: null,
    completedByUserId: null,
    points: 5,
    bountyReward: null,
    repeatRule: null,
    parentTaskId: null,
    deletedAt: null,
    createdAt: new Date("2026-04-14"),
    updatedAt: new Date("2026-04-14"),
    ...overrides,
  };
}

const ME = { id: "user-me", displayName: "Dave" };
const PARTNER = { id: "user-partner", displayName: "Krista" };
const EMPTY_CAT_MAP = new Map<string, string>();

describe("toUITask", () => {
  it("maps basic fields", () => {
    const ui = toUITask(makeDBTask(), ME, PARTNER, EMPTY_CAT_MAP, "2026-04-15");
    expect(ui.id).toBe("task-1");
    expect(ui.title).toBe("Pick up groceries");
    expect(ui.flexible).toBe(false);
    expect(ui.points).toBe(5);
  });

  it("resolves my name as assignee", () => {
    const ui = toUITask(
      makeDBTask({ assigneeUserId: "user-me" }),
      ME, PARTNER, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.assigneeName).toBe("Dave");
    expect(ui.isShared).toBe(false);
  });

  it("resolves partner name as assignee", () => {
    const ui = toUITask(
      makeDBTask({ assigneeUserId: "user-partner" }),
      ME, PARTNER, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.assigneeName).toBe("Krista");
  });

  it("marks shared tasks", () => {
    const ui = toUITask(
      makeDBTask({ assigneeUserId: SHARED_ASSIGNEE_SENTINEL }),
      ME, PARTNER, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.isShared).toBe(true);
    expect(ui.assigneeName).toBeUndefined();
  });

  it("computes overdue days", () => {
    const ui = toUITask(
      makeDBTask({ dueDate: "2026-04-13" }),
      ME, PARTNER, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.overdueDays).toBe(2);
  });

  it("no overdue for today tasks", () => {
    const ui = toUITask(
      makeDBTask({ dueDate: "2026-04-15" }),
      ME, PARTNER, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.overdueDays).toBeUndefined();
  });

  it("no overdue for completed tasks", () => {
    const ui = toUITask(
      makeDBTask({ dueDate: "2026-04-13", completedAt: new Date() }),
      ME, PARTNER, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.overdueDays).toBeUndefined();
  });

  it("resolves category name from map", () => {
    const catMap = new Map([["cat-1", "Errands"]]);
    const ui = toUITask(
      makeDBTask({ categoryId: "cat-1" }),
      ME, PARTNER, catMap, "2026-04-15",
    );
    expect(ui.categoryName).toBe("Errands");
  });
});

/* ================================================================
 * toUITask completedByLabel
 * ================================================================ */

describe("toUITask completedByLabel", () => {
  const me = { id: "user-me", displayName: "Dave" };
  const partner = { id: "user-partner", displayName: "Krista" };

  it("labels a task completed by the current user", () => {
    const ui = toUITask(
      makeDBTask({ completedAt: new Date(), completedByUserId: "user-me" }),
      me, partner, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.completedByLabel).toBe("Dave");
  });

  it("labels a task completed by the partner", () => {
    const ui = toUITask(
      makeDBTask({ completedAt: new Date(), completedByUserId: "user-partner" }),
      me, partner, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.completedByLabel).toBe("Krista");
  });

  it("omits the label in solo mode (no partner)", () => {
    const ui = toUITask(
      makeDBTask({ completedAt: new Date(), completedByUserId: "user-me" }),
      me, null, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.completedByLabel).toBeUndefined();
  });

  it("omits the label when completedByUserId is null", () => {
    const ui = toUITask(
      makeDBTask({ completedAt: null, completedByUserId: null }),
      me, partner, EMPTY_CAT_MAP, "2026-04-15",
    );
    expect(ui.completedByLabel).toBeUndefined();
  });
});

/* ================================================================
 * uiTaskToFormData
 * ================================================================ */

describe("uiTaskToFormData", () => {
  const catIdByName = new Map([["Errands", "cat-1"]]);

  it("maps basic fields for edit mode", () => {
    const form = uiTaskToFormData(
      {
        id: "task-1",
        title: "Pick up groceries",
        flexible: false,
        isShared: false,
        assigneeName: "Dave",
        categoryName: "Errands",
        createdByName: "Dave",
        repeatRule: null,
        points: 5,
        notes: "Get milk",
      },
      ME,
      PARTNER,
      catIdByName,
      "2026-04-15",
    );
    expect(form.title).toBe("Pick up groceries");
    expect(form.assignee).toBe("me");
    expect(form.category).toBe("Errands");
    expect(form.notes).toBe("Get milk");
    expect(form.points).toBe(5);
    expect(form.date).toBe("2026-04-15");
  });

  it("resolves shared assignee", () => {
    const form = uiTaskToFormData(
      {
        id: "t", title: "T", flexible: false, isShared: true,
        createdByName: "Dave", notes: null,
      },
      ME, PARTNER, catIdByName, "2026-04-15",
    );
    expect(form.assignee).toBe("shared");
  });

  it("resolves partner assignee", () => {
    const form = uiTaskToFormData(
      {
        id: "t", title: "T", flexible: false, isShared: false,
        assigneeName: "Krista", createdByName: "Dave", notes: null,
      },
      ME, PARTNER, catIdByName, "2026-04-15",
    );
    expect(form.assignee).toBe("partner");
  });

  it("prefers dbDueDate when provided", () => {
    const form = uiTaskToFormData(
      {
        id: "t", title: "T", flexible: false, isShared: false,
        createdByName: "Dave", notes: null,
      },
      ME, PARTNER, catIdByName, "2026-04-15", "2026-04-20",
    );
    expect(form.date).toBe("2026-04-20");
  });
});

/* ================================================================
 * formDataToCreateInput
 * ================================================================ */

describe("formDataToCreateInput", () => {
  const catIdByName = new Map([["Errands", "cat-1"]]);

  it("maps create form data to API shape", () => {
    const input = formDataToCreateInput(
      {
        title: "  Pick up groceries  ",
        date: "2026-04-17",
        assignee: "me",
        category: "Errands" as never,
        repeatRule: null,
        time: null,
        flexible: false,
        notes: "",
        points: 5,
      },
      ME, PARTNER, catIdByName, "2026-04-15",
    );
    expect(input.title).toBe("Pick up groceries"); // trimmed
    expect(input.dueDate).toBe("2026-04-17");
    expect(input.assigneeUserId).toBe("user-me");
    expect(input.categoryId).toBe("cat-1");
    expect(input.points).toBe(5);
  });

  it("maps partner assignee to partner id", () => {
    const input = formDataToCreateInput(
      {
        title: "Test", date: "2026-04-15", assignee: "partner",
        category: "Uncategorized" as never, repeatRule: null,
        time: null, flexible: false, notes: "", points: null,
      },
      ME, PARTNER, catIdByName, "2026-04-15",
    );
    expect(input.assigneeUserId).toBe("user-partner");
  });

  it("maps shared assignee to sentinel", () => {
    const input = formDataToCreateInput(
      {
        title: "Test", date: "2026-04-15", assignee: "shared",
        category: "Uncategorized" as never, repeatRule: null,
        time: null, flexible: false, notes: "", points: null,
      },
      ME, PARTNER, catIdByName, "2026-04-15",
    );
    expect(input.assigneeUserId).toBe(SHARED_ASSIGNEE_SENTINEL);
  });

  it("falls back to fallbackDateIso when date is empty", () => {
    const input = formDataToCreateInput(
      {
        title: "Test", date: "", assignee: "me",
        category: "Uncategorized" as never, repeatRule: null,
        time: null, flexible: false, notes: "", points: null,
      },
      ME, null, catIdByName, "2026-04-15",
    );
    expect(input.dueDate).toBe("2026-04-15");
  });

  it("solo user picking partner → sentinel", () => {
    const input = formDataToCreateInput(
      {
        title: "Test", date: "2026-04-15", assignee: "partner",
        category: "Uncategorized" as never, repeatRule: null,
        time: null, flexible: false, notes: "", points: null,
      },
      ME, null, catIdByName, "2026-04-15",
    );
    expect(input.assigneeUserId).toBe(SHARED_ASSIGNEE_SENTINEL);
  });
});
