import { getAuthedContext } from "@/lib/auth-context";
import { listNotificationsForUser } from "@/lib/db/queries/notifications";
import { handleRouteError, json } from "@/lib/api/responses";

const LIMIT = 30;

export async function GET() {
  try {
    const { user } = await getAuthedContext();
    const rows = await listNotificationsForUser(user.id, LIMIT);
    return json({ notifications: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}
