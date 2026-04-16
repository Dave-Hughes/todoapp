import { and, eq, isNull, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users, type User } from "@/db/schema";

export async function findUserByClerkId(
  clerkUserId: string,
): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

export async function insertUser(args: {
  clerkUserId: string;
  displayName: string;
  householdId: string;
}): Promise<User | null> {
  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: args.clerkUserId,
      displayName: args.displayName,
      householdId: args.householdId,
    })
    .onConflictDoNothing({ target: users.clerkUserId })
    .returning();
  return row ?? null;
}

export async function setUserHousehold(
  userId: string,
  householdId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ householdId })
    .where(eq(users.id, userId));
}

export interface UserPointsTotals {
  lifetime: number;
  today: number;
}

/**
 * Sum of points from tasks the user has completed.
 * - `lifetime` = all tasks where `completedByUserId = userId` (and not soft-deleted).
 * - `today`    = subset where `completedAt >= start of today (UTC)`.
 *
 * UTC matches the rest of the app's todayIso convention (`new Date().toISOString().split("T")[0]`).
 * Per-user-timezone refinement is a follow-up if it matters in practice.
 */
export async function getUserPointsTotals(
  userId: string,
): Promise<UserPointsTotals> {
  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      lifetime: sql<number>`COALESCE(SUM(${tasks.points}), 0)::int`,
      today: sql<number>`COALESCE(SUM(${tasks.points}) FILTER (WHERE ${tasks.completedAt} >= ${startOfTodayUtc.toISOString()}), 0)::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.completedByUserId, userId),
        isNotNull(tasks.completedAt),
        isNull(tasks.deletedAt),
      ),
    );

  return { lifetime: row?.lifetime ?? 0, today: row?.today ?? 0 };
}

