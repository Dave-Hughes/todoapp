import { eq } from "drizzle-orm";
import { db } from "@/db";
import { households, users } from "@/db/schema";
import {
  findInviteByToken,
  markInviteAccepted,
} from "@/lib/db/queries/invites";
import { createNotification } from "@/lib/db/queries/notifications";
import { mergeSoloHousehold } from "./merge";
import { swapSentinelAssignees } from "./swap-sentinel";

export type AcceptResult =
  | { kind: "ok"; householdId: string }
  | { kind: "invalid_token" }
  | { kind: "self_invite" }
  | { kind: "household_full" }
  | { kind: "acceptor_in_two_person_household" };

/**
 * Redeem an invite token on behalf of the accepting user.
 *
 * Sequence (see specs/multiplayer.md "Behind the scenes on partner accept"):
 *  1. Validate token is pending.
 *  2. Reject if accepting user is already in the target household.
 *  3. Reject if target household already has >= 2 members.
 *  4. Reject if acceptor is already in a two-person household (unlink is a
 *     support action in v1 — we can't merge two populated households).
 *  5. Merge the accepting user's solo household (if any) into the target.
 *  6. Swap sentinel assignee UUIDs to the accepting user's real ID.
 *  7. Rename the target household "Organizer & Partner".
 *  8. Create a `partner_joined` notification for the organizer.
 *  9. Mark the invite accepted.
 */
export async function acceptInvite(args: {
  token: string;
  acceptingUserId: string;
}): Promise<AcceptResult> {
  const invite = await findInviteByToken(args.token);
  if (!invite || invite.status !== "pending") {
    return { kind: "invalid_token" };
  }

  const [accepting] = await db
    .select()
    .from(users)
    .where(eq(users.id, args.acceptingUserId))
    .limit(1);
  if (!accepting) return { kind: "invalid_token" };

  if (accepting.householdId === invite.householdId) {
    return { kind: "self_invite" };
  }

  const members = await db
    .select()
    .from(users)
    .where(eq(users.householdId, invite.householdId));
  if (members.length >= 2) {
    return { kind: "household_full" };
  }

  // If the acceptor is already in a household with another member, reject —
  // we can't merge a two-person household into another. Per specs/multiplayer.md
  // "Already in a two-person household": unlink is a support action in v1.
  if (accepting.householdId) {
    const acceptorHouseholdMembers = await db
      .select()
      .from(users)
      .where(eq(users.householdId, accepting.householdId));
    if (acceptorHouseholdMembers.length > 1) {
      return { kind: "acceptor_in_two_person_household" };
    }
  }

  // Merge (or simply assign if acceptingUser has no prior household).
  await mergeSoloHousehold({
    fromHouseholdId: accepting.householdId,
    intoHouseholdId: invite.householdId,
    movingUserId: accepting.id,
  });

  // Swap sentinel assignees — any "Partner" placeholder becomes this user.
  await swapSentinelAssignees(invite.householdId, accepting.id);

  // Rename household: "Organizer & Partner".
  const [organizer] = await db
    .select()
    .from(users)
    .where(eq(users.id, invite.invitedByUserId))
    .limit(1);
  if (organizer) {
    await db
      .update(households)
      .set({ name: `${organizer.displayName} & ${accepting.displayName}` })
      .where(eq(households.id, invite.householdId));
  }

  // Notification for the organizer.
  if (organizer) {
    await createNotification({
      householdId: invite.householdId,
      recipientUserId: organizer.id,
      actorUserId: accepting.id,
      type: "partner_joined",
    });
  }

  await markInviteAccepted(invite.id, accepting.id);

  return { kind: "ok", householdId: invite.householdId };
}
