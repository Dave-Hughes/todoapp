import { describe, it, expect } from "vitest";
import { db } from "@/db";
import {
  households,
  users,
  tasks,
  categories,
  taskEvents,
} from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { mergeSoloHousehold } from "./merge";

async function seedHousehold(name: string) {
  const [h] = await db.insert(households).values({ name }).returning();
  const [u] = await db
    .insert(users)
    .values({
      clerkUserId: `${name}_${crypto.randomUUID()}`,
      displayName: name,
      householdId: h.id,
    })
    .returning();
  const [uncat] = await db
    .insert(categories)
    .values({ householdId: h.id, name: "Uncategorized", isDefault: true })
    .returning();
  return { household: h, user: u, uncategorized: uncat };
}

describe("mergeSoloHousehold", () => {
  it("moves tasks and categories from partner's household into organizer's", async () => {
    const org = await seedHousehold("Org");
    const ptr = await seedHousehold("Ptr");

    const [customCat] = await db
      .insert(categories)
      .values({ householdId: ptr.household.id, name: "Yardwork" })
      .returning();

    const [partnerTask] = await db
      .insert(tasks)
      .values({
        householdId: ptr.household.id,
        title: "Trim hedges",
        dueDate: "2026-05-01",
        categoryId: customCat.id,
        createdByUserId: ptr.user.id,
        assigneeUserId: ptr.user.id,
      })
      .returning();

    const [partnerUncatTask] = await db
      .insert(tasks)
      .values({
        householdId: ptr.household.id,
        title: "Random",
        dueDate: "2026-05-02",
        categoryId: ptr.uncategorized.id,
        createdByUserId: ptr.user.id,
        assigneeUserId: ptr.user.id,
      })
      .returning();

    await db.insert(taskEvents).values({
      taskId: partnerTask.id,
      householdId: ptr.household.id,
      eventType: "created",
      actorUserId: ptr.user.id,
    });

    await mergeSoloHousehold({
      fromHouseholdId: ptr.household.id,
      intoHouseholdId: org.household.id,
      movingUserId: ptr.user.id,
    });

    // Partner's user is now in organizer's household.
    const [movedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, ptr.user.id));
    expect(movedUser.householdId).toBe(org.household.id);

    // Partner's custom category is now in org's household.
    const orgCats = await db
      .select()
      .from(categories)
      .where(eq(categories.householdId, org.household.id));
    expect(orgCats.some((c) => c.name === "Yardwork")).toBe(true);
    // Partner's Uncategorized did NOT migrate (both had one; partner's mapped away).
    expect(
      orgCats.filter((c) => c.name === "Uncategorized").length,
    ).toBe(1);

    // Partner's non-Uncategorized task migrated with its category.
    const [movedTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, partnerTask.id));
    expect(movedTask.householdId).toBe(org.household.id);
    const movedCat = orgCats.find((c) => c.name === "Yardwork");
    expect(movedTask.categoryId).toBe(movedCat?.id);

    // Partner's Uncategorized task migrated and was remapped to org's Uncategorized.
    const [movedUncat] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, partnerUncatTask.id));
    expect(movedUncat.householdId).toBe(org.household.id);
    expect(movedUncat.categoryId).toBe(org.uncategorized.id);

    // Event followed its task.
    const events = await db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, partnerTask.id));
    expect(events[0].householdId).toBe(org.household.id);

    // Abandoned household is soft-deleted.
    const [abandoned] = await db
      .select()
      .from(households)
      .where(eq(households.id, ptr.household.id));
    expect(abandoned.deletedAt).not.toBeNull();

    await db.delete(households).where(eq(households.id, org.household.id));
    await db.delete(households).where(eq(households.id, ptr.household.id));
  });

  it("is a no-op when fromHouseholdId is null", async () => {
    const org = await seedHousehold("Org2");
    const orphanUser = await db
      .insert(users)
      .values({
        clerkUserId: `orphan_${crypto.randomUUID()}`,
        displayName: "Orphan",
        householdId: null,
      })
      .returning();
    await mergeSoloHousehold({
      fromHouseholdId: null,
      intoHouseholdId: org.household.id,
      movingUserId: orphanUser[0].id,
    });
    const [moved] = await db
      .select()
      .from(users)
      .where(eq(users.id, orphanUser[0].id));
    expect(moved.householdId).toBe(org.household.id);
    await db.delete(households).where(eq(households.id, org.household.id));
    await db.delete(users).where(eq(users.id, orphanUser[0].id));
  });
});
