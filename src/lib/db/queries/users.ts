import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

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
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: args.clerkUserId,
      displayName: args.displayName,
      householdId: args.householdId,
    })
    .returning();
  return row;
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
