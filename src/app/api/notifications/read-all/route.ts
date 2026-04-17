import { getAuthedContext } from "@/lib/auth-context";
import { markAllNotificationsRead } from "@/lib/db/queries/notifications";
import { handleRouteError, json } from "@/lib/api/responses";

export async function POST() {
  try {
    const { user } = await getAuthedContext();
    const count = await markAllNotificationsRead(user.id);
    return json({ updated: count });
  } catch (err) {
    return handleRouteError(err);
  }
}
