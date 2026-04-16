import { db } from "@/db";
import { invites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json, error } from "@/lib/api/responses";
import { cancelInvite } from "@/lib/db/queries/invites";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { householdId } = await getAuthedContext();
    const { id } = await params;

    // Scope check: the invite must belong to the caller's household.
    const [row] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.id, id), eq(invites.householdId, householdId)))
      .limit(1);
    if (!row) return error("not_found", 404);
    if (row.status !== "pending") return error("not_cancellable", 409);

    await cancelInvite(id);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
