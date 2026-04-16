import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";
import { households, users, invites } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createInvite,
  findActiveInviteForHousehold,
  findInviteByToken,
  cancelInvite,
  markInviteAccepted,
} from "./invites";
import { generateInviteToken } from "@/lib/invites/token";

async function seedHouseholdWithUser() {
  const [h] = await db.insert(households).values({ name: "T" }).returning();
  const [u] = await db
    .insert(users)
    .values({
      clerkUserId: `test_${crypto.randomUUID()}`,
      displayName: "Organizer",
      householdId: h.id,
    })
    .returning();
  return { household: h, user: u };
}

async function cleanupHousehold(id: string) {
  await db.delete(households).where(eq(households.id, id));
}

describe("invites queries", () => {
  let householdId: string;
  let userId: string;

  beforeEach(async () => {
    const { household, user } = await seedHouseholdWithUser();
    householdId = household.id;
    userId = user.id;
    return () => cleanupHousehold(householdId);
  });

  it("createInvite inserts a pending row with a token", async () => {
    const inv = await createInvite({
      householdId,
      invitedByUserId: userId,
      email: "p@example.com",
      token: generateInviteToken(),
    });
    expect(inv.status).toBe("pending");
    expect(inv.email).toBe("p@example.com");
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("findActiveInviteForHousehold returns the pending row when there is one", async () => {
    await createInvite({
      householdId,
      invitedByUserId: userId,
      email: null,
      token: generateInviteToken(),
    });
    const active = await findActiveInviteForHousehold(householdId);
    expect(active).not.toBeNull();
    expect(active?.status).toBe("pending");
  });

  it("findActiveInviteForHousehold ignores cancelled and accepted rows", async () => {
    const inv = await createInvite({
      householdId,
      invitedByUserId: userId,
      email: null,
      token: generateInviteToken(),
    });
    await cancelInvite(inv.id);
    expect(await findActiveInviteForHousehold(householdId)).toBeNull();
  });

  it("findInviteByToken looks up by the token string", async () => {
    const token = generateInviteToken();
    const inv = await createInvite({
      householdId,
      invitedByUserId: userId,
      email: null,
      token,
    });
    const found = await findInviteByToken(token);
    expect(found?.id).toBe(inv.id);
  });

  it("markInviteAccepted sets status, accepted_by, and accepted_at", async () => {
    const inv = await createInvite({
      householdId,
      invitedByUserId: userId,
      email: null,
      token: generateInviteToken(),
    });
    await markInviteAccepted(inv.id, userId);
    const found = await findInviteByToken(inv.token);
    expect(found?.status).toBe("accepted");
    expect(found?.acceptedByUserId).toBe(userId);
    expect(found?.acceptedAt).toBeTruthy();
  });
});
