import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json, error } from "@/lib/api/responses";
import { acceptInvite } from "@/lib/invites/accept";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    // getAuthedContext is fine here: it'll lazily create a household for a
    // brand-new signed-up partner. acceptInvite handles the "merge / already
    // in target / full target" cases explicitly.
    const { user } = await getAuthedContext();
    const { token } = await params;

    const result = await acceptInvite({ token, acceptingUserId: user.id });
    switch (result.kind) {
      case "ok":
        return json({ ok: true, householdId: result.householdId });
      case "invalid_token":
        return error("invalid_token", 410);
      case "self_invite":
        return error("self_invite", 409);
      case "household_full":
        return error("household_full", 409);
      case "acceptor_in_two_person_household":
        return error("acceptor_in_two_person_household", 409);
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
