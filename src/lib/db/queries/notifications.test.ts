import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { households, users, notifications } from "@/db/schema";
import {
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications";

async function seedHousehold(name: string) {
  const [h] = await db.insert(households).values({ name }).returning();
  const suffix = Date.now() + Math.random();
  const [u1] = await db
    .insert(users)
    .values({ clerkUserId: `t_n_a_${suffix}`, householdId: h.id, displayName: "A" })
    .returning();
  const [u2] = await db
    .insert(users)
    .values({ clerkUserId: `t_n_b_${suffix}`, householdId: h.id, displayName: "B" })
    .returning();
  return { h, u1, u2 };
}

describe("notifications queries", () => {
  it("lists last N notifications desc, newest first", async () => {
    const { h, u1, u2 } = await seedHousehold("List");
    await createNotification({
      householdId: h.id,
      recipientUserId: u1.id,
      actorUserId: u2.id,
      type: "partner_joined",
    });
    await createNotification({
      householdId: h.id,
      recipientUserId: u1.id,
      actorUserId: u2.id,
      type: "task_assigned",
    });
    const rows = await listNotificationsForUser(u1.id, 30);
    expect(rows.length).toBe(2);
    expect(rows[0].type).toBe("task_assigned");
  });

  it("markAllNotificationsRead stamps readAt on every unread row for user", async () => {
    const { h, u1, u2 } = await seedHousehold("MarkAll");
    await createNotification({
      householdId: h.id,
      recipientUserId: u1.id,
      actorUserId: u2.id,
      type: "partner_joined",
    });
    await createNotification({
      householdId: h.id,
      recipientUserId: u1.id,
      actorUserId: u2.id,
      type: "task_assigned",
    });
    const updated = await markAllNotificationsRead(u1.id);
    expect(updated).toBe(2);
    const rows = await listNotificationsForUser(u1.id, 30);
    expect(rows.every((r) => r.readAt !== null)).toBe(true);
  });

  it("markNotificationRead only stamps the row for the recipient", async () => {
    const { h, u1, u2 } = await seedHousehold("MarkOne");
    const n = await createNotification({
      householdId: h.id,
      recipientUserId: u1.id,
      actorUserId: u2.id,
      type: "task_assigned",
    });
    const ok = await markNotificationRead(n.id, u1.id);
    expect(ok).toBe(true);
    // Wrong user — no-op
    const notOk = await markNotificationRead(n.id, u2.id);
    expect(notOk).toBe(false);
  });
});
