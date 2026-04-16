import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { households, users, notifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { createInvite } from "@/lib/db/queries/invites";
import { generateInviteToken } from "./token";
import { acceptInvite } from "./accept";

async function seedHouseholdWithUser(name: string) {
  const [h] = await db.insert(households).values({ name }).returning();
  const [u] = await db
    .insert(users)
    .values({
      clerkUserId: `${name}_${crypto.randomUUID()}`,
      displayName: name,
      householdId: h.id,
    })
    .returning();
  return { household: h, user: u };
}

describe("acceptInvite", () => {
  it("joins partner into organizer's household, renames, notifies", async () => {
    const org = await seedHouseholdWithUser("Dave");
    const ptr = await seedHouseholdWithUser("Krista");

    const inv = await createInvite({
      householdId: org.household.id,
      invitedByUserId: org.user.id,
      email: null,
      token: generateInviteToken(),
    });

    const result = await acceptInvite({
      token: inv.token,
      acceptingUserId: ptr.user.id,
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") throw new Error("unreachable");
    expect(result.householdId).toBe(org.household.id);

    // Household was renamed "Dave & Krista".
    const [renamed] = await db
      .select()
      .from(households)
      .where(eq(households.id, org.household.id));
    expect(renamed.name).toBe("Dave & Krista");

    // Organizer got a partner_joined notification.
    const notes = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, org.user.id),
          eq(notifications.type, "partner_joined"),
        ),
      );
    expect(notes.length).toBe(1);

    await db.delete(households).where(eq(households.id, org.household.id));
    await db.delete(households).where(eq(households.id, ptr.household.id));
  });

  it("returns invalid_token when token is missing or cancelled", async () => {
    const ptr = await seedHouseholdWithUser("K2");
    const bad = await acceptInvite({
      token: "nope",
      acceptingUserId: ptr.user.id,
    });
    expect(bad.kind).toBe("invalid_token");
    await db.delete(households).where(eq(households.id, ptr.household.id));
  });

  it("returns already_in_household when accepting user is already in the target household", async () => {
    const org = await seedHouseholdWithUser("O3");
    const inv = await createInvite({
      householdId: org.household.id,
      invitedByUserId: org.user.id,
      email: null,
      token: generateInviteToken(),
    });
    const result = await acceptInvite({
      token: inv.token,
      acceptingUserId: org.user.id,
    });
    expect(result.kind).toBe("self_invite");
    await db.delete(households).where(eq(households.id, org.household.id));
  });

  it("returns household_full when target already has two members", async () => {
    const org = await seedHouseholdWithUser("O4");
    // Add a second member to fill the household.
    await db
      .insert(users)
      .values({
        clerkUserId: `member_${crypto.randomUUID()}`,
        displayName: "Already Here",
        householdId: org.household.id,
      })
      .returning();
    const third = await seedHouseholdWithUser("Third");
    const inv = await createInvite({
      householdId: org.household.id,
      invitedByUserId: org.user.id,
      email: null,
      token: generateInviteToken(),
    });
    const result = await acceptInvite({
      token: inv.token,
      acceptingUserId: third.user.id,
    });
    expect(result.kind).toBe("household_full");
    await db.delete(households).where(eq(households.id, org.household.id));
    await db.delete(households).where(eq(households.id, third.household.id));
  });

  it("rejects when acceptor is already in a different two-person household", async () => {
    const org = await seedHouseholdWithUser("O5");
    const other = await seedHouseholdWithUser("Other");
    // Put the acceptor in a household that already has two members.
    await db
      .insert(users)
      .values({
        clerkUserId: `roommate_${crypto.randomUUID()}`,
        displayName: "Roommate",
        householdId: other.household.id,
      })
      .returning();
    const inv = await createInvite({
      householdId: org.household.id,
      invitedByUserId: org.user.id,
      email: null,
      token: generateInviteToken(),
    });
    const result = await acceptInvite({
      token: inv.token,
      acceptingUserId: other.user.id,
    });
    expect(result.kind).toBe("acceptor_in_two_person_household");
    await db.delete(households).where(eq(households.id, org.household.id));
    await db.delete(households).where(eq(households.id, other.household.id));
  });
});
