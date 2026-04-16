import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, type Invite } from "@/db/schema";

export async function createInvite(args: {
  householdId: string;
  invitedByUserId: string;
  email: string | null;
  token: string;
}): Promise<Invite> {
  const [row] = await db.insert(invites).values(args).returning();
  return row;
}

export async function findActiveInviteForHousehold(
  householdId: string,
): Promise<Invite | null> {
  const [row] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.householdId, householdId), eq(invites.status, "pending")),
    )
    .limit(1);
  return row ?? null;
}

export async function findInviteByToken(token: string): Promise<Invite | null> {
  const [row] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);
  return row ?? null;
}

export async function cancelInvite(id: string): Promise<void> {
  await db
    .update(invites)
    .set({ status: "cancelled" })
    .where(eq(invites.id, id));
}

export async function markInviteAccepted(
  id: string,
  acceptedByUserId: string,
): Promise<void> {
  await db
    .update(invites)
    .set({ status: "accepted", acceptedByUserId, acceptedAt: new Date() })
    .where(eq(invites.id, id));
}
