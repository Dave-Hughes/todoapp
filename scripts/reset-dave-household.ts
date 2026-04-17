import { config } from "dotenv";
config({ path: ".env.local" });

import { eq, and, ne } from "drizzle-orm";
import { db } from "../src/db";
import { users, households, invites } from "../src/db/schema";

const DAVE_CLERK_ID_PREFIX = "user_3CMcRFDfS";

async function run() {
  const [dave] = await db
    .select()
    .from(users)
    .where(eq(users.displayName, "davehughesonline"))
    .limit(1);

  if (!dave || !dave.clerkUserId.startsWith(DAVE_CLERK_ID_PREFIX)) {
    throw new Error("Could not find Dave's user row — aborting");
  }
  if (!dave.householdId) {
    console.log("Dave has no household — nothing to reset");
    return;
  }

  console.log(`Resetting household ${dave.householdId} (Dave: ${dave.id})`);

  const cancelled = await db
    .update(invites)
    .set({ status: "cancelled" })
    .where(and(eq(invites.householdId, dave.householdId), eq(invites.status, "pending")))
    .returning({ id: invites.id });
  console.log(`  invites cancelled: ${cancelled.length}`);

  const detached = await db
    .update(users)
    .set({ householdId: null })
    .where(and(eq(users.householdId, dave.householdId), ne(users.id, dave.id)))
    .returning({ id: users.id, displayName: users.displayName });
  console.log(`  users detached: ${detached.length}`);
  for (const d of detached) {
    console.log(`    • ${d.id.slice(0, 8)} ("${d.displayName}")`);
  }

  await db
    .update(households)
    .set({ name: dave.displayName, deletedAt: null })
    .where(eq(households.id, dave.householdId));
  console.log(`  household name → "${dave.displayName}"`);

  console.log("\nDone.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
