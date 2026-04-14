import { getAuthedContext } from "@/lib/auth-context";
import { listCategoriesForHousehold } from "@/lib/db/queries/categories";
import { handleRouteError, json } from "@/lib/api/responses";

export async function GET() {
  try {
    const { householdId } = await getAuthedContext();
    const rows = await listCategoriesForHousehold(householdId);
    return json({ categories: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}
