import { eq, and } from "drizzle-orm";
import { getAuthedContext } from "@/lib/auth-context";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { renderInviteEmail } from "@/lib/email/invite-email";
import { sendEmail } from "@/lib/email/send";
import { handleRouteError, json, error } from "@/lib/api/responses";

// Dir name is [token] because Next.js requires sibling dynamic routes under
// /api/invites/ to share a slug name (see [token]/accept/). The caller
// passes the invite UUID (invites.id), so we rename locally to `id`.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token: id } = await params;
    const { householdId, user } = await getAuthedContext();

    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.id, id), eq(invites.householdId, householdId)))
      .limit(1);
    if (!invite) return error("not_found", 404);
    if (invite.status !== "pending") return error("invite_not_pending", 409);
    if (!invite.email) return json({ ok: true, skippedEmail: true });

    const origin = new URL(req.url).origin;
    const inviteUrl = `${origin}/invite/${invite.token}`;
    const rendered = renderInviteEmail({
      organizerName: user.displayName,
      inviteUrl,
    });
    await sendEmail({
      to: invite.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });

    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
