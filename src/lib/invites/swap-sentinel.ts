import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";

/**
 * Replace every sentinel-UUID `assigneeUserId` in the household with the
 * real partner user ID. Called once, atomically-ish, on invite accept.
 * Returns the number of rows updated.
 */
export async function swapSentinelAssignees(
  householdId: string,
  partnerUserId: string,
): Promise<number> {
  const updated = await db
    .update(tasks)
    .set({ assigneeUserId: partnerUserId })
    .where(
      and(
        eq(tasks.householdId, householdId),
        eq(tasks.assigneeUserId, SHARED_ASSIGNEE_SENTINEL),
      ),
    )
    .returning({ id: tasks.id });
  return updated.length;
}
