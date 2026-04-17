import { getAuthedContext } from "@/lib/auth-context";
import { markNotificationRead } from "@/lib/db/queries/notifications";
import { handleRouteError, json, error } from "@/lib/api/responses";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { user } = await getAuthedContext();
    const ok = await markNotificationRead(id, user.id);
    return ok ? json({ ok: true }) : error("not_found", 404);
  } catch (err) {
    return handleRouteError(err);
  }
}
