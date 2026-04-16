import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { households, users, tasks, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";
import { swapSentinelAssignees } from "./swap-sentinel";

async function seedHousehold() {
  const [h] = await db.insert(households).values({ name: "T" }).returning();
  const [organizer] = await db
    .insert(users)
    .values({
      clerkUserId: `org_${crypto.randomUUID()}`,
      displayName: "Organizer",
      householdId: h.id,
    })
    .returning();
  const [partner] = await db
    .insert(users)
    .values({
      clerkUserId: `ptr_${crypto.randomUUID()}`,
      displayName: "Partner",
      householdId: h.id,
    })
    .returning();
  const [cat] = await db
    .insert(categories)
    .values({ householdId: h.id, name: "Misc" })
    .returning();
  return { household: h, organizer, partner, cat };
}

describe("swapSentinelAssignees", () => {
  it("replaces sentinel UUID with real partner ID on tasks in the household", async () => {
    const { household, organizer, partner, cat } = await seedHousehold();
    await db.insert(tasks).values([
      {
        householdId: household.id,
        title: "For partner",
        dueDate: "2026-04-20",
        categoryId: cat.id,
        assigneeUserId: SHARED_ASSIGNEE_SENTINEL,
        createdByUserId: organizer.id,
      },
      {
        householdId: household.id,
        title: "Mine",
        dueDate: "2026-04-20",
        categoryId: cat.id,
        assigneeUserId: organizer.id,
        createdByUserId: organizer.id,
      },
    ]);

    const count = await swapSentinelAssignees(household.id, partner.id);
    expect(count).toBe(1);

    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.householdId, household.id));
    const forPartner = rows.find((r) => r.title === "For partner");
    const mine = rows.find((r) => r.title === "Mine");
    expect(forPartner?.assigneeUserId).toBe(partner.id);
    expect(mine?.assigneeUserId).toBe(organizer.id);

    await db.delete(households).where(eq(households.id, household.id));
  });

  it("returns 0 when there are no sentinel rows", async () => {
    const { household, partner } = await seedHousehold();
    const count = await swapSentinelAssignees(household.id, partner.id);
    expect(count).toBe(0);
    await db.delete(households).where(eq(households.id, household.id));
  });
});
