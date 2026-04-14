import { db } from "@/db";
import { households, type Household } from "@/db/schema";
import { seedCategoriesForHousehold } from "./categories";

/**
 * Creates a new household with auto-generated name and seeds default
 * categories. Name is just the creator's display name until the partner
 * joins (per specs/multiplayer.md).
 *
 * NOTE: This sequence (household insert → category seed → user insert) is NOT
 * atomic. The neon-http driver does not support transactions, so a concurrent
 * first-request or a mid-sequence failure can leave an orphan household with
 * no associated user. This is an acceptable trade-off for v1; a cleanup job
 * can reap orphans post-v1 once we have usage data to inform the policy.
 */
export async function createHouseholdForUser(args: {
  creatorDisplayName: string;
}): Promise<Household> {
  const [household] = await db
    .insert(households)
    .values({ name: args.creatorDisplayName })
    .returning();
  await seedCategoriesForHousehold(household.id);
  return household;
}
