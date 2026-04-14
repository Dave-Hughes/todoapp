import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../index";
import { seededTasks } from "../schema";
import { SEEDED_TASKS } from "./seeded-tasks";

async function run() {
  console.log(`Seeding ${SEEDED_TASKS.length} seeded tasks...`);
  // Idempotent: delete existing rows, re-insert.
  await db.delete(seededTasks);
  await db.insert(seededTasks).values(SEEDED_TASKS);
  console.log("Done.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
