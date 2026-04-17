import { describe, it, expect } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { households, users, tasks, notifications } from "@/db/schema";
import {
  dispatchTaskAssigned,
  dispatchTaskCompletedByPartner,
} from "./dispatch";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";

async function seedPair(name: string) {
  const [h] = await db.insert(households).values({ name }).returning();
  const suf = `${Date.now()}_${Math.random()}`;
  const [a] = await db.insert(users).values({ clerkUserId: `d_a_${suf}`, householdId: h.id, displayName: "A" }).returning();
  const [b] = await db.insert(users).values({ clerkUserId: `d_b_${suf}`, householdId: h.id, displayName: "B" }).returning();
  return { h, a, b };
}

async function insertTask(opts: { householdId: string; creator: string; assignee: string | null }) {
  const [t] = await db.insert(tasks).values({
    householdId: opts.householdId,
    title: "T",
    dueDate: "2026-04-16",
    createdByUserId: opts.creator,
    assigneeUserId: opts.assignee,
  }).returning();
  return t;
}

describe("dispatchTaskAssigned", () => {
  it("writes a notification when assignee is a real partner and differs from actor", async () => {
    const { h, a, b } = await seedPair("Assign");
    const t = await insertTask({ householdId: h.id, creator: a.id, assignee: b.id });
    await dispatchTaskAssigned({ task: t, actorUserId: a.id });
    const rows = await db.select().from(notifications).where(eq(notifications.recipientUserId, b.id));
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("task_assigned");
  });

  it("no-ops when assignee equals actor (self-assign)", async () => {
    const { h, a } = await seedPair("SelfAssign");
    const t = await insertTask({ householdId: h.id, creator: a.id, assignee: a.id });
    await dispatchTaskAssigned({ task: t, actorUserId: a.id });
    const rows = await db.select().from(notifications).where(eq(notifications.recipientUserId, a.id));
    expect(rows.length).toBe(0);
  });

  it("no-ops when assignee is the SHARED sentinel", async () => {
    const { h, a } = await seedPair("Shared");
    const t = await insertTask({ householdId: h.id, creator: a.id, assignee: SHARED_ASSIGNEE_SENTINEL });
    await dispatchTaskAssigned({ task: t, actorUserId: a.id });
    const rows = await db.select().from(notifications).where(eq(notifications.householdId, h.id));
    expect(rows.length).toBe(0);
  });

  it("no-ops when household is solo (single user)", async () => {
    const [h] = await db.insert(households).values({ name: "Solo" }).returning();
    const [a] = await db.insert(users).values({ clerkUserId: `dsolo_${Date.now()}`, householdId: h.id, displayName: "A" }).returning();
    const t = await insertTask({ householdId: h.id, creator: a.id, assignee: a.id });
    await dispatchTaskAssigned({ task: t, actorUserId: a.id });
    const rows = await db.select().from(notifications).where(eq(notifications.householdId, h.id));
    expect(rows.length).toBe(0);
  });
});

describe("dispatchTaskCompletedByPartner", () => {
  it("notifies creator when completer != creator", async () => {
    const { h, a, b } = await seedPair("Completion");
    const t = await insertTask({ householdId: h.id, creator: a.id, assignee: b.id });
    await dispatchTaskCompletedByPartner({ task: t, completerUserId: b.id });
    const rows = await db.select().from(notifications).where(eq(notifications.recipientUserId, a.id));
    expect(rows.length).toBe(1);
    expect(rows[0].type).toBe("task_completed_by_partner");
  });

  it("no-ops when completer IS the creator", async () => {
    const { h, a, b } = await seedPair("SelfCompletion");
    const t = await insertTask({ householdId: h.id, creator: a.id, assignee: a.id });
    await dispatchTaskCompletedByPartner({ task: t, completerUserId: a.id });
    const rows = await db.select().from(notifications).where(eq(notifications.householdId, h.id));
    expect(rows.length).toBe(0);
  });
});
