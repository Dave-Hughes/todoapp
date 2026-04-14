import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env.test", override: true });

/**
 * Destroy the test user's household (cascades to tasks/categories/events),
 * then null their household_id so getAuthedContext() creates a fresh one.
 */
export async function resetE2EData(): Promise<void> {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const clerkId = process.env.E2E_CLERK_USER_ID!;
  await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${clerkId}
  )`;
  await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${clerkId}`;
}
