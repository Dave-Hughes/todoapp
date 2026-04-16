import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, households, tasks, taskEvents, users } from "@/db/schema";

/**
 * Merge the partner's solo household into the organizer's household.
 *
 * Per specs/multiplayer.md:
 * - Tasks migrate: host_id updated. `created_by_user_id` stays as partner.
 * - Categories migrate, EXCEPT the partner's "Uncategorized" — its tasks
 *   remap to the organizer's "Uncategorized" (no duplicate catch-all).
 *   Same-name duplicates coexist; the couple cleans up manually.
 * - task_events migrate with their tasks.
 * - Moving user's household_id updates.
 * - Abandoned household soft-deleted (deleted_at set).
 *
 * If fromHouseholdId is null, we only set the moving user's household_id
 * and return.
 */
export async function mergeSoloHousehold(args: {
  fromHouseholdId: string | null;
  intoHouseholdId: string;
  movingUserId: string;
}): Promise<void> {
  const { fromHouseholdId, intoHouseholdId, movingUserId } = args;

  if (!fromHouseholdId) {
    await db
      .update(users)
      .set({ householdId: intoHouseholdId })
      .where(eq(users.id, movingUserId));
    return;
  }

  // 1. Find both "Uncategorized" category IDs so we can remap tasks.
  const partnerUncat = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, fromHouseholdId),
        eq(categories.name, "Uncategorized"),
      ),
    );

  const [intoUncat] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, intoHouseholdId),
        eq(categories.name, "Uncategorized"),
      ),
    );

  // 2. Migrate partner's tasks whose category is the partner's "Uncategorized"
  //    onto the organizer's "Uncategorized" (if both exist).
  if (partnerUncat[0] && intoUncat) {
    await db
      .update(tasks)
      .set({ categoryId: intoUncat.id, householdId: intoHouseholdId })
      .where(
        and(
          eq(tasks.householdId, fromHouseholdId),
          eq(tasks.categoryId, partnerUncat[0].id),
        ),
      );
  }

  // 3. Move all remaining partner tasks (with their existing categoryIds —
  //    those categories get migrated in step 4 so the FK stays valid).
  await db
    .update(tasks)
    .set({ householdId: intoHouseholdId })
    .where(eq(tasks.householdId, fromHouseholdId));

  // 4. Migrate task_events for the partner's tasks (follow them by household).
  await db
    .update(taskEvents)
    .set({ householdId: intoHouseholdId })
    .where(eq(taskEvents.householdId, fromHouseholdId));

  // 5. Migrate partner's categories — EXCEPT the "Uncategorized" one.
  if (partnerUncat[0]) {
    await db
      .delete(categories)
      .where(eq(categories.id, partnerUncat[0].id));
  }
  await db
    .update(categories)
    .set({ householdId: intoHouseholdId })
    .where(eq(categories.householdId, fromHouseholdId));

  // 6. Move the user.
  await db
    .update(users)
    .set({ householdId: intoHouseholdId })
    .where(eq(users.id, movingUserId));

  // 7. Soft-delete the abandoned household.
  await db
    .update(households)
    .set({ deletedAt: new Date() })
    .where(eq(households.id, fromHouseholdId));
}
