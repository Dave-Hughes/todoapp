import { db } from "@/db";
import { households, type Household } from "@/db/schema";
import { seedCategoriesForHousehold } from "./categories";

/**
 * Creates a new household with auto-generated name and seeds default
 * categories. Name is just the creator's display name until the partner
 * joins (per specs/multiplayer.md).
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
