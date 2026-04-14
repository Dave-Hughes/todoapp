import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tasks, type NewTask, type Task } from "@/db/schema";

/**
 * Every function in this file MUST filter by `householdId`. Routes never
 * pass Clerk user IDs to drizzle directly — they pass the household ID
 * resolved via getAuthedContext(). This is the ONE place that scoping is
 * enforced; do not scatter it across route handlers.
 */

export async function listTasksForHousehold(
  householdId: string,
): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt)));
}

export async function getTaskForHousehold(
  householdId: string,
  taskId: string,
): Promise<Task | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.householdId, householdId),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createTask(data: NewTask): Promise<Task> {
  const [row] = await db.insert(tasks).values(data).returning();
  return row;
}

export async function updateTaskForHousehold(
  householdId: string,
  taskId: string,
  patch: Partial<NewTask>,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.householdId, householdId),
        isNull(tasks.deletedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function softDeleteTaskForHousehold(
  householdId: string,
  taskId: string,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.householdId, householdId),
        isNull(tasks.deletedAt),
      ),
    )
    .returning();
  return row ?? null;
}
