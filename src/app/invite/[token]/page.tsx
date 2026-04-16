import { findInviteByToken } from "@/lib/db/queries/invites";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { InviteLanding } from "@/components/invite-landing/invite-landing";

export const dynamic = "force-dynamic";

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await findInviteByToken(token);

  if (!invite || invite.status === "cancelled") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8 bg-[color:var(--color-bg)]">
        <p className="text-[color:var(--color-text-secondary)] max-w-[360px] text-center">
          This invite is no longer valid. Ask your partner to send a new one.
        </p>
      </main>
    );
  }
  if (invite.status === "accepted") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8 bg-[color:var(--color-bg)]">
        <p className="text-[color:var(--color-text-secondary)] max-w-[360px] text-center">
          This invite has already been accepted.
        </p>
      </main>
    );
  }

  const [organizer] = await db
    .select()
    .from(users)
    .where(eq(users.id, invite.invitedByUserId))
    .limit(1);
  const organizerName = organizer?.displayName ?? "Someone";

  return <InviteLanding organizerName={organizerName} token={token} />;
}
