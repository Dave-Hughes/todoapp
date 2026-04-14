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
      clerkUser?.username ||
      clerkUser?.emailAddresses[0]?.emailAddress.split("@")[0] ||
      "You";

    const household = await createHouseholdForUser({
      creatorDisplayName: displayName,
    });

    user = await insertUser({
      clerkUserId,
      displayName,
      householdId: household.id,
    });
  } else if (!user.householdId) {
    // Edge case: user row exists without a household (e.g. post-v1 unlink).
    const household = await createHouseholdForUser({
      creatorDisplayName: user.displayName,
    });
    await setUserHousehold(user.id, household.id);
    user = { ...user, householdId: household.id };
  }

  return {
    clerkUserId,
    user,
    householdId: user.householdId!,
  };
}

export class AuthError extends Error {
  constructor(public code: "unauthenticated" | "forbidden") {
    super(code);
    this.name = "AuthError";
  }
}
