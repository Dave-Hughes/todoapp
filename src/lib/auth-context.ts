import { auth, currentUser } from "@clerk/nextjs/server";
import { createHouseholdForUser } from "./db/queries/households";
import { findUserByClerkId, insertUser, setUserHousehold } from "./db/queries/users";
import type { User } from "@/db/schema";

export type AuthedContext = {
  clerkUserId: string;
  user: User; // householdId is guaranteed non-null here
  householdId: string;
};

/**
 * Fetches the current Clerk user, upserts them into our users table, and
 * ensures they have a household (creating one with seeded categories on
 * first request). Idempotent. Throws AuthError if unauthenticated.
 */
export async function getAuthedContext(): Promise<AuthedContext> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new AuthError("unauthenticated");
  }

  let user = await findUserByClerkId(clerkUserId);

  if (!user) {
    const clerkUser = await currentUser();
    const displayName =
      clerkUser?.firstName ||
      clerkUser?.lastName ||
      clerkUser?.username ||
      clerkUser?.emailAddresses[0]?.emailAddress.split("@")[0] ||
      "You";

    const household = await createHouseholdForUser({
      creatorDisplayName: displayName,
    });

    let inserted = await insertUser({
      clerkUserId,
      displayName,
      householdId: household.id,
    });

    if (!inserted) {
      // Lost a race with a parallel request — re-fetch the winner's row.
      // The household we just created is now an orphan (acceptable for v1; a
      // cleanup job can reap these post-v1 when we have usage data).
      inserted = await findUserByClerkId(clerkUserId);
      if (!inserted) {
        throw new Error(
          "Invariant violation: user not found after conflict on insert",
        );
      }
    }
    user = inserted;
  } else if (!user.householdId) {
    // Edge case: user row exists without a household (e.g. post-v1 unlink).
    const household = await createHouseholdForUser({
      creatorDisplayName: user.displayName,
    });
    await setUserHousehold(user.id, household.id);
    user = { ...user, householdId: household.id };
  }

  const householdId = user.householdId;
  if (!householdId) {
    throw new Error("Invariant violation: user has no householdId after upsert");
  }
  return { clerkUserId, user, householdId };
}

export class AuthError extends Error {
  constructor(public code: "unauthenticated" | "forbidden") {
    super(code);
    this.name = "AuthError";
  }
}
