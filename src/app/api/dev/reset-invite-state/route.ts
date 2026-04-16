import { db } from "@/db";
import { invites, users, households } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleRouteError, json, error } from "@/lib/api/responses";
import { auth } from "@clerk/nextjs/server";

/**
 * DEV-ONLY: reset the signed-in user's invite state to fresh solo.
 *
 * - Cancels all invites owned by the user's household.
 * - If the household has a second member, detaches them (household_id = null),
 *   leaving the caller alone in the household.
 * - Does NOT delete the caller's tasks, categories, or household.
 *
 * Gated by NODE_ENV !== "production" AND a matching DEV_RESET_SECRET header,
 * so it's safe to keep shipped but impossible to hit without intent.
 */
export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return error("not_available", 404);
    }
    const secret = req.headers.get("x-dev-reset-secret");
    if (!secret || secret !== process.env.DEV_RESET_SECRET) {
      return error("forbidden", 403);
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return error("unauthenticated", 401);

    const [caller] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);
    if (!caller || !caller.householdId) return json({ ok: true });

    // Cancel any active invites owned by this household.
    await db
      .update(invites)
      .set({ status: "cancelled" })
      .where(eq(invites.householdId, caller.householdId));

    // Detach any other members (leave caller alone).
    await db
      .update(users)
      .set({ householdId: null })
      .where(eq(users.householdId, caller.householdId));

    // Re-attach the caller (the bulk update above nuked them too).
    await db
      .update(users)
      .set({ householdId: caller.householdId })
      .where(eq(users.id, caller.id));

    // Restore household name to just the caller's display name.
    await db
      .update(households)
      .set({ name: caller.displayName, deletedAt: null })
      .where(eq(households.id, caller.householdId));

    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
