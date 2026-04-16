import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json } from "@/lib/api/responses";
import { getUserPointsTotals } from "@/lib/db/queries/users";

export async function GET() {
  try {
    const { householdId, user } = await getAuthedContext();
    const [partners, mePoints] = await Promise.all([
      db
        .select()
        .from(users)
        .where(and(eq(users.householdId, householdId), ne(users.id, user.id)))
        .limit(1),
      getUserPointsTotals(user.id),
    ]);
    const partner = partners[0] ?? null;
    const partnerPoints = partner
      ? await getUserPointsTotals(partner.id)
      : null;
    return json({ me: user, partner, mePoints, partnerPoints });
  } catch (err) {
    return handleRouteError(err);
  }
}
