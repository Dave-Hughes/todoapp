import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json } from "@/lib/api/responses";

export async function GET() {
  try {
    const { householdId, user } = await getAuthedContext();
    const partners = await db
      .select()
      .from(users)
      .where(and(eq(users.householdId, householdId), ne(users.id, user.id)))
      .limit(1);
    return json({ me: user, partner: partners[0] ?? null });
  } catch (err) {
    return handleRouteError(err);
  }
}
