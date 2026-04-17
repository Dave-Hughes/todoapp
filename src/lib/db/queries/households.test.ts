import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { households, users } from "@/db/schema";
import { householdIsPaired } from "./households";

describe("householdIsPaired", () => {
  it("returns false when household has one user", async () => {
    const [h] = await db.insert(households).values({ name: "Solo" }).returning();
    await db.insert(users).values({
      clerkUserId: "test_solo_" + Date.now(),
      householdId: h.id,
      displayName: "A",
    });
    expect(await householdIsPaired(h.id)).toBe(false);
  });

  it("returns true when household has two users", async () => {
    const [h] = await db.insert(households).values({ name: "Paired" }).returning();
    const suffix = Date.now();
    await db.insert(users).values([
      { clerkUserId: `test_paired_a_${suffix}`, householdId: h.id, displayName: "A" },
      { clerkUserId: `test_paired_b_${suffix}`, householdId: h.id, displayName: "B" },
    ]);
    expect(await householdIsPaired(h.id)).toBe(true);
  });

  it("returns false for a non-existent household", async () => {
    expect(
      await householdIsPaired("00000000-0000-0000-0000-000000000001"),
    ).toBe(false);
  });
});
