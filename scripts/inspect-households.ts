import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/db";
import { users, households, invites } from "../src/db/schema";

async function run() {
  const allUsers = await db.select().from(users);
  const allHouseholds = await db.select().from(households);
  const allInvites = await db.select().from(invites);

  console.log("=== Users ===");
  for (const u of allUsers) {
    console.log(
      `  ${u.id.slice(0, 8)}  clerk=${u.clerkUserId.slice(0, 14)}…  name="${u.displayName}"  household=${u.householdId?.slice(0, 8) ?? "null"}`,
    );
  }
  console.log("\n=== Households ===");
  for (const h of allHouseholds) {
    console.log(
      `  ${h.id.slice(0, 8)}  name="${h.name}"  deletedAt=${h.deletedAt?.toISOString() ?? "—"}`,
    );
  }
  console.log("\n=== Invites ===");
  for (const i of allInvites) {
    console.log(
      `  ${i.id.slice(0, 8)}  household=${i.householdId.slice(0, 8)}  status=${i.status}  email=${i.inviteeEmail}`,
    );
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
