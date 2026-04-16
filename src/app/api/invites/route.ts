import { z } from "zod";
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json, error } from "@/lib/api/responses";
import {
  createInvite,
  findActiveInviteForHousehold,
} from "@/lib/db/queries/invites";
import { generateInviteToken } from "@/lib/invites/token";
import { renderInviteEmail } from "@/lib/email/invite-email";
import { sendEmail } from "@/lib/email/send";

const createInviteSchema = z.object({
  email: z.string().email().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const { householdId, user } = await getAuthedContext();
    const body = createInviteSchema.parse(await req.json());
    const email = body.email ?? null;

    // Enforce one active invite at a time (per spec).
    const existing = await findActiveInviteForHousehold(householdId);
    if (existing) {
      return error("active_invite_exists", 409, { inviteId: existing.id });
    }

    const token = generateInviteToken();
    const invite = await createInvite({
      householdId,
      invitedByUserId: user.id,
      email,
      token,
    });

    if (email) {
      const origin = new URL(req.url).origin;
      const inviteUrl = `${origin}/invite/${token}`;
      const rendered = renderInviteEmail({
        organizerName: user.displayName,
        inviteUrl,
      });
      await sendEmail({
        to: email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
    }

    return json({ invite }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function GET() {
  try {
    const { householdId } = await getAuthedContext();
    const invite = await findActiveInviteForHousehold(householdId);
    return json({ invite });
  } catch (err) {
    return handleRouteError(err);
  }
}
