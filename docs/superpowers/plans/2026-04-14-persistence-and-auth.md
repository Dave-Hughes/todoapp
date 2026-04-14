# Persistence and Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the demo `page.tsx` with real Clerk-authenticated, Neon-backed task CRUD scoped to households, with TanStack Query polling and a seeded task database. No partner-invite UI (household creation is automatic on first sign-in; sentinel-UUID partner assignment works per spec).

**Architecture:**
- **Auth:** Clerk middleware guards everything outside `/sign-in` and `/sign-up`. Signed-out users are redirected straight to Clerk sign-in. A lazy `getAuthedContext()` helper runs on every API request: it upserts the Clerk user into our `users` table, auto-creates a household + seeded categories on first hit, and returns `{ userId, householdId }` for use by queries. No Clerk webhooks (adds dev-setup friction; lazy sync is idempotent).
- **Data:** Drizzle ORM over Neon Postgres. Seven tables per specs (`households`, `users`, `categories`, `seeded_tasks`, `tasks`, `task_events`, `invites`, `notifications`). Every household-scoped query filters by `household_id`; this is enforced by a thin `db/queries/` layer, not scattered across routes.
- **API:** Next.js route handlers under `src/app/api/`. Zod validation at the boundary, soft deletes, per-field last-write-wins (PATCH accepts partial data and only updates provided fields), TaskEvent logged on every state-changing op.
- **Frontend:** A React Query provider wraps the app. `page.tsx` loses its demo arrays and switches to `useTasks()` / `useCreateTask()` / `useUpdateTask()` / `useCompleteTask()` / `useDeleteTask()`. All mutations are optimistic via TanStack Query's `onMutate` / `onError` / `onSettled` pattern so the existing UI timing is preserved. Polling interval = 5 s per spec.
- **Testing:** Clerk's `@clerk/testing` package provides a long-lived sign-in token. A Playwright `setup` project signs in once as a fixture user, saves `storageState`, and every other project reuses it. A dedicated test database (separate Neon branch) is reset between runs via a truncate helper.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, `@neondatabase/serverless`, Clerk (`@clerk/nextjs`, `@clerk/testing`), TanStack Query v5, Zod, Playwright, Vitest.

---

## File structure

```
drizzle.config.ts                                      NEW
.env.test                                              NEW — test DB + test user creds
src/db/
  index.ts                                             NEW — Drizzle client (prod + test)
  schema.ts                                            NEW — all 8 tables
  migrations/                                          NEW — drizzle-kit output
  seed/
    seeded-tasks.ts                                    NEW — ~100 entries
    default-categories.ts                              NEW — per-household seed list
    run-seed.ts                                        NEW — CLI script
src/lib/
  auth-context.ts                                      NEW — getAuthedContext()
  constants.ts                                         NEW — SHARED_ASSIGNEE_SENTINEL
  api/
    validators.ts                                      NEW — zod schemas for requests
    responses.ts                                       NEW — json(), error() helpers
  db/queries/
    tasks.ts                                           NEW — all task reads/writes
    categories.ts                                      NEW
    households.ts                                      NEW — find-or-create household
    users.ts                                           NEW — upsert user from Clerk
    task-events.ts                                     NEW — write-only logger
  hooks/
    use-tasks.ts                                       NEW
    use-categories.ts                                  NEW
  query-client-provider.tsx                            NEW — React Query provider
src/middleware.ts                                      NEW — Clerk middleware
src/app/
  layout.tsx                                           MODIFY — ClerkProvider + QueryProvider
  page.tsx                                             MAJOR REFACTOR — remove demo, add hooks
  sign-in/[[...sign-in]]/page.tsx                      NEW
  sign-up/[[...sign-up]]/page.tsx                      NEW
  api/
    tasks/route.ts                                     NEW — GET, POST
    tasks/[id]/route.ts                                NEW — PATCH, DELETE
    tasks/[id]/complete/route.ts                       NEW — POST
    tasks/[id]/uncomplete/route.ts                     NEW — POST
    categories/route.ts                                NEW — GET
tests/
  auth.setup.ts                                        NEW — Clerk testing token setup
  fixtures/
    reset-db.ts                                        NEW — truncate helper for tests
    test-user.ts                                       NEW — constants
  task-sheet.spec.ts                                   MODIFY — adapt to real backend
  today-view.spec.ts                                   MODIFY — adapt to real backend
playwright.config.ts                                   MODIFY — setup project + storageState
vitest.config.ts                                       NEW
src/lib/db/queries/tasks.test.ts                       NEW — integration tests (vitest)
```

---

## Task 1: Install dependencies and scaffold configs

**Files:**
- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `vitest.config.ts`
- Modify: `.gitignore` (add `drizzle/`)

- [ ] **Step 1: Install runtime deps**

Run:
```bash
npm install drizzle-orm @neondatabase/serverless @clerk/nextjs @tanstack/react-query zod
```

- [ ] **Step 2: Install dev deps**

Run:
```bash
npm install -D drizzle-kit @clerk/testing @tanstack/react-query-devtools vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom dotenv tsx
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED is required for drizzle-kit");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED,
  },
  strict: true,
  verbose: true,
});
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";

config({ path: ".env.local" });

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: [],
    testTimeout: 20000,
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 5: Add scripts to `package.json`**

Add to the `"scripts"` block:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx src/db/seed/run-seed.ts",
"db:studio": "drizzle-kit studio",
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Update `.gitignore`**

Append to `.gitignore`:

```
# Drizzle journal
.drizzle/
```

(Migrations in `src/db/migrations/` ARE checked in; only the `.drizzle/` cache is ignored.)

- [ ] **Step 7: Verify TypeScript still compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json drizzle.config.ts vitest.config.ts .gitignore
git commit -m "chore: install drizzle, clerk, tanstack query, vitest deps"
```

---

## Task 2: Drizzle schema for all tables

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Create `src/lib/constants.ts`**

```ts
/**
 * Sentinel UUID used as `assignee_user_id` before the partner has joined
 * the household. On partner accept, all rows with this value are swapped
 * to the real partner user ID. See specs/multiplayer.md.
 */
export const SHARED_ASSIGNEE_SENTINEL = "00000000-0000-0000-0000-000000000000";

/** Polling interval for cross-partner sync. */
export const POLL_INTERVAL_MS = 5_000;
```

- [ ] **Step 2: Create `src/db/schema.ts`**

```ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  jsonb,
  date,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// -------- Enums ----------------------------------------------------------

export const swipeModeEnum = pgEnum("swipe_mode", ["direct", "reveal"]);
export const inviteStatusEnum = pgEnum("invite_status", [
  "pending",
  "accepted",
  "cancelled",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_completed_by_partner",
  "partner_joined",
]);
export const taskEventTypeEnum = pgEnum("task_event_type", [
  "created",
  "completed",
  "uncompleted",
  "reassigned",
  "postponed",
  "edited",
  "deleted",
  "restored",
  "points_earned",
  "points_lost",
]);

// -------- Households -----------------------------------------------------

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// -------- Users ----------------------------------------------------------
// `id` is NOT the Clerk user ID. Clerk IDs live in `clerk_user_id`.
// This keeps our FKs as native uuid while tolerating whatever format
// Clerk uses (currently `user_xxx...`).

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    householdId: uuid("household_id").references(() => households.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name").notNull(),
    timezone: text("timezone").notNull().default("America/New_York"),
    theme: text("theme").notNull().default("cozy"),
    swipeMode: swipeModeEnum("swipe_mode").notNull().default("direct"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    clerkUserIdIdx: uniqueIndex("users_clerk_user_id_idx").on(t.clerkUserId),
    householdIdIdx: index("users_household_id_idx").on(t.householdId),
  }),
);

// -------- Categories -----------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdIdx: index("categories_household_idx").on(t.householdId),
  }),
);

// -------- SeededTasks (global) ------------------------------------------

export const seededTasks = pgTable("seeded_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  defaultPoints: integer("default_points").notNull(),
  suggestedCategory: text("suggested_category"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------- Tasks ----------------------------------------------------------

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    dueDate: date("due_date").notNull(),
    dueTime: time("due_time"),
    flexible: boolean("flexible").notNull().default(false),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    assigneeUserId: uuid("assignee_user_id"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completedByUserId: uuid("completed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    points: integer("points").notNull().default(0),
    bountyReward: text("bounty_reward"),
    repeatRule: jsonb("repeat_rule"),
    parentTaskId: uuid("parent_task_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    householdDueIdx: index("tasks_household_due_idx").on(t.householdId, t.dueDate),
    householdDeletedIdx: index("tasks_household_deleted_idx").on(
      t.householdId,
      t.deletedAt,
    ),
    parentIdx: index("tasks_parent_idx").on(t.parentTaskId),
  }),
);

// -------- TaskEvents -----------------------------------------------------

export const taskEvents = pgTable(
  "task_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    eventType: taskEventTypeEnum("event_type").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    taskIdx: index("task_events_task_idx").on(t.taskId),
    householdIdx: index("task_events_household_idx").on(t.householdId, t.createdAt),
  }),
);

// -------- Invites (data model only in this phase) -----------------------

export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  householdId: uuid("household_id")
    .notNull()
    .references(() => households.id, { onDelete: "cascade" }),
  invitedByUserId: uuid("invited_by_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email"),
  token: text("token").notNull().unique(),
  status: inviteStatusEnum("status").notNull().default("pending"),
  acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// -------- Notifications (data model only in this phase) -----------------

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid("task_id").references(() => tasks.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    recipientIdx: index("notifications_recipient_idx").on(t.recipientUserId, t.readAt),
  }),
);

// -------- Relations ------------------------------------------------------

export const householdRelations = relations(households, ({ many }) => ({
  users: many(users),
  categories: many(categories),
  tasks: many(tasks),
}));

export const userRelations = relations(users, ({ one, many }) => ({
  household: one(households, {
    fields: [users.householdId],
    references: [households.id],
  }),
  createdTasks: many(tasks, { relationName: "createdBy" }),
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
  household: one(households, {
    fields: [categories.householdId],
    references: [households.id],
  }),
  tasks: many(tasks),
}));

export const taskRelations = relations(tasks, ({ one, many }) => ({
  household: one(households, {
    fields: [tasks.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [tasks.categoryId],
    references: [categories.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
    relationName: "createdBy",
  }),
  events: many(taskEvents),
}));

// -------- Inferred types -------------------------------------------------

export type Household = typeof households.$inferSelect;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type SeededTask = typeof seededTasks.$inferSelect;
```

- [ ] **Step 3: Create `src/db/index.ts`**

```ts
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

neonConfig.fetchConnectionCache = true;

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DATABASE_URL_UNPOOLED must be set");
}

const sql = neon(connectionString);
export const db = drizzle(sql, { schema });
export type DB = typeof db;
export * from "./schema";
```

- [ ] **Step 4: Verify schema compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/index.ts src/lib/constants.ts
git commit -m "feat(db): drizzle schema for households, users, tasks, categories, events"
```

---

## Task 3: Generate and run migration against Neon

**Files:**
- Create: `src/db/migrations/0000_*.sql` (auto-generated)

- [ ] **Step 1: Generate the migration**

Run: `npm run db:generate`
Expected: a new file appears under `src/db/migrations/` (e.g. `0000_*.sql`) plus a `_meta/` folder.

- [ ] **Step 2: Inspect the generated SQL**

Run: `cat src/db/migrations/0000_*.sql | head -60`
Expected: `CREATE TABLE "households"`, enum creation, indexes. Sanity-check that names match `schema.ts`.

- [ ] **Step 3: Apply the migration**

Run: `npm run db:migrate`
Expected: `[✓] migrations applied successfully!`

- [ ] **Step 4: Verify tables in Neon**

Run:
```bash
set -a; while IFS= read -r line; do [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]] && continue; export "$line"; done < .env.local
psql "$DATABASE_URL" -c "\dt"
```
Expected: `households`, `users`, `categories`, `seeded_tasks`, `tasks`, `task_events`, `invites`, `notifications` all present. Plus a `__drizzle_migrations` table.

- [ ] **Step 5: Commit**

```bash
git add src/db/migrations
git commit -m "feat(db): initial migration — create all tables"
```

---

## Task 4: Auth context helper + household auto-creation

**Files:**
- Create: `src/lib/db/queries/users.ts`
- Create: `src/lib/db/queries/households.ts`
- Create: `src/lib/db/queries/categories.ts`
- Create: `src/lib/auth-context.ts`
- Create: `src/db/seed/default-categories.ts`

- [ ] **Step 1: Create default categories seed list**

`src/db/seed/default-categories.ts`:

```ts
export const DEFAULT_CATEGORIES = [
  { name: "Uncategorized", position: 0, isDefault: true },
  { name: "Home", position: 1, isDefault: false },
  { name: "Errands", position: 2, isDefault: false },
  { name: "Bills", position: 3, isDefault: false },
  { name: "Health", position: 4, isDefault: false },
] as const;
```

- [ ] **Step 2: Create category queries**

`src/lib/db/queries/categories.ts`:

```ts
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, type Category } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/db/seed/default-categories";

export async function listCategoriesForHousehold(
  householdId: string,
): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(eq(categories.householdId, householdId))
    .orderBy(asc(categories.position));
}

export async function getDefaultCategoryForHousehold(
  householdId: string,
): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(
      and(eq(categories.householdId, householdId), eq(categories.isDefault, true)),
    )
    .limit(1);
  return row ?? null;
}

export async function seedCategoriesForHousehold(
  householdId: string,
): Promise<void> {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c) => ({
      householdId,
      name: c.name,
      position: c.position,
      isDefault: c.isDefault,
    })),
  );
}
```

- [ ] **Step 3: Create household queries**

`src/lib/db/queries/households.ts`:

```ts
import { db } from "@/db";
import { households, type Household } from "@/db/schema";
import { seedCategoriesForHousehold } from "./categories";

/**
 * Creates a new household with auto-generated name and seeds default categories.
 * Name is just the creator's display name until the partner joins (per spec).
 */
export async function createHouseholdForUser(args: {
  creatorDisplayName: string;
}): Promise<Household> {
  const [household] = await db
    .insert(households)
    .values({ name: args.creatorDisplayName })
    .returning();
  await seedCategoriesForHousehold(household.id);
  return household;
}
```

- [ ] **Step 4: Create user queries**

`src/lib/db/queries/users.ts`:

```ts
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

export async function findUserByClerkId(
  clerkUserId: string,
): Promise<User | null> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

export async function insertUser(args: {
  clerkUserId: string;
  displayName: string;
  householdId: string;
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: args.clerkUserId,
      displayName: args.displayName,
      householdId: args.householdId,
    })
    .returning();
  return row;
}

export async function setUserHousehold(
  userId: string,
  householdId: string,
): Promise<void> {
  await db
    .update(users)
    .set({ householdId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
```

- [ ] **Step 5: Create the auth context helper**

`src/lib/auth-context.ts`:

```ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { createHouseholdForUser } from "./db/queries/households";
import { findUserByClerkId, insertUser, setUserHousehold } from "./db/queries/users";
import type { User } from "@/db/schema";

export type AuthedContext = {
  clerkUserId: string;
  user: User; // household_id is guaranteed non-null here
  householdId: string;
};

/**
 * Fetches the current Clerk user, upserts them into our users table, and
 * ensures they have a household (creating one with seeded categories on
 * first request). Idempotent. Throws a 401-friendly error if unauthenticated.
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
    // Edge case: user row exists (e.g. from a post-v1 unlink) without a household.
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
```

- [ ] **Step 6: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/auth-context.ts src/lib/db src/db/seed/default-categories.ts
git commit -m "feat(auth): lazy user/household upsert with seeded categories"
```

---

## Task 5: Clerk middleware, sign-in/sign-up pages, layout wiring

**Files:**
- Create: `src/middleware.ts`
- Create: `src/app/sign-in/[[...sign-in]]/page.tsx`
- Create: `src/app/sign-up/[[...sign-up]]/page.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `.env.local` (document new vars)

- [ ] **Step 1: Add required env vars**

Append to `.env.local` (values exact — these are Clerk conventions that default-redirect to the app):

```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

- [ ] **Step 2: Create middleware**

`src/middleware.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

- [ ] **Step 3: Create sign-in page**

`src/app/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-[color:var(--color-bg)]">
      <SignIn />
    </div>
  );
}
```

- [ ] **Step 4: Create sign-up page**

`src/app/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-[color:var(--color-bg)]">
      <SignUp />
    </div>
  );
}
```

- [ ] **Step 5: Wrap the app with `ClerkProvider`**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Gabarito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { QueryClientProvider } from "@/lib/query-client-provider";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const gabarito = Gabarito({
  subsets: ["latin"],
  variable: "--font-gabarito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ToDoApp",
  description: "Purpose-built for couples. Make invisible labor visible.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        data-theme="cozy"
        className={`${bricolage.variable} ${gabarito.variable}`}
      >
        <body>
          <QueryClientProvider>{children}</QueryClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

(The `QueryClientProvider` import compiles after Task 10. Order matters — go through this file twice if needed, but the provider file is created before `page.tsx` is refactored.)

- [ ] **Step 6: Create stub `query-client-provider.tsx`**

`src/lib/query-client-provider.tsx`:

```tsx
"use client";

import {
  QueryClient,
  QueryClientProvider as Provider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { POLL_INTERVAL_MS } from "./constants";

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: POLL_INTERVAL_MS,
            refetchInterval: POLL_INTERVAL_MS,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );
  return (
    <Provider client={client}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </Provider>
  );
}
```

- [ ] **Step 7: Start the dev server and verify redirect**

Run: `npm run dev`
Open an incognito browser to `http://localhost:3000`.
Expected: redirect to `/sign-in`. Clerk's UI renders.
Stop the dev server when verified.

- [ ] **Step 8: Commit**

```bash
git add src/middleware.ts src/app src/lib/query-client-provider.tsx .env.local
git commit -m "feat(auth): clerk middleware, sign-in/sign-up pages, providers"
```

---

## Task 6: Seeded task database

**Files:**
- Create: `src/db/seed/seeded-tasks.ts`
- Create: `src/db/seed/run-seed.ts`

- [ ] **Step 1: Create seeded task data**

`src/db/seed/seeded-tasks.ts` — ~100 entries, points on a 5 / 15 / 30 scale per spec:

```ts
export type SeededTaskData = {
  name: string;
  defaultPoints: number;
  suggestedCategory: string | null;
};

export const SEEDED_TASKS: SeededTaskData[] = [
  // Home — quick (5 pts)
  { name: "Take out trash", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Take out recycling", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Unload dishwasher", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Load dishwasher", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Wipe down counters", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Make the bed", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Water the plants", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Feed the pet", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Let the dog out", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Scoop the litter box", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Sweep the kitchen", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Empty the coffee grounds", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Start a load of laundry", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Switch laundry to dryer", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Fold laundry", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Put away laundry", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Wipe bathroom mirror", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Replace toilet paper roll", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Replace hand towels", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Check the mail", defaultPoints: 5, suggestedCategory: "Errands" },

  // Home — medium (15 pts)
  { name: "Vacuum the living room", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Vacuum the whole house", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Mop the floors", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Clean the bathroom", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Deep clean the bathroom", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Clean the kitchen", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Scrub the stove", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Clean the fridge", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Clean the microwave", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Clean the oven", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Dust the shelves", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Change the sheets", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Wash the sheets", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Wash the towels", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Clean the windows", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Organize the closet", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Organize the pantry", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Organize the junk drawer", defaultPoints: 15, suggestedCategory: "Home" },

  // Outdoor (15–30 pts)
  { name: "Mow the lawn", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Edge the lawn", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Rake and bag leaves", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Shovel the driveway", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Salt the walkway", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Water the garden", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Weed the garden", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Trim the hedges", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Clean the gutters", defaultPoints: 30, suggestedCategory: "Home" },
  { name: "Wash the car", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Take out yard waste", defaultPoints: 5, suggestedCategory: "Home" },

  // Errands (5–15 pts)
  { name: "Get groceries", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Pick up a prescription", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Drop off dry cleaning", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Pick up dry cleaning", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Return Amazon package", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Drop off donations", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Go to the hardware store", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Fill up the gas tank", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Pick up takeout", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Return library books", defaultPoints: 5, suggestedCategory: "Errands" },
  { name: "Take out the recycling bins", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Bring in the trash bins", defaultPoints: 5, suggestedCategory: "Home" },

  // Bills / admin (5–15 pts)
  { name: "Pay electric bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay water bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay gas bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay rent", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay mortgage", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay credit card bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Pay internet bill", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "File the bills", defaultPoints: 5, suggestedCategory: "Bills" },
  { name: "Review the budget", defaultPoints: 15, suggestedCategory: "Bills" },
  { name: "Do the taxes", defaultPoints: 30, suggestedCategory: "Bills" },

  // Health (5–15 pts)
  { name: "Take vitamins", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Go for a walk", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Go to the gym", defaultPoints: 15, suggestedCategory: "Health" },
  { name: "Stretch", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Meal prep", defaultPoints: 30, suggestedCategory: "Health" },
  { name: "Schedule a dentist appointment", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Schedule a doctor appointment", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Pick up prescription refill", defaultPoints: 5, suggestedCategory: "Health" },
  { name: "Refill pet meds", defaultPoints: 5, suggestedCategory: "Health" },

  // Pets
  { name: "Walk the dog", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Bathe the dog", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Brush the dog", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Trim the cat's nails", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Refill pet food", defaultPoints: 5, suggestedCategory: "Errands" },

  // Meals & cooking (5–30 pts)
  { name: "Cook dinner", defaultPoints: 15, suggestedCategory: "Home" },
  { name: "Cook lunch", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Make breakfast", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Pack lunches", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Do the grocery list", defaultPoints: 5, suggestedCategory: "Home" },
  { name: "Wash the dishes by hand", defaultPoints: 15, suggestedCategory: "Home" },

  // Social / home admin (5–30 pts)
  { name: "Call mom", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Call dad", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Send a birthday card", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Buy a gift", defaultPoints: 15, suggestedCategory: "Errands" },
  { name: "Schedule date night", defaultPoints: 5, suggestedCategory: "Uncategorized" },
  { name: "Plan a trip", defaultPoints: 30, suggestedCategory: "Uncategorized" },
  { name: "Book a reservation", defaultPoints: 5, suggestedCategory: "Uncategorized" },
];
```

- [ ] **Step 2: Create the seed runner**

`src/db/seed/run-seed.ts`:

```ts
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
```

- [ ] **Step 3: Run the seed**

Run: `npm run db:seed`
Expected: `Seeding 90+ seeded tasks...` then `Done.`

- [ ] **Step 4: Verify in DB**

Run:
```bash
set -a; while IFS= read -r line; do [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]] && continue; export "$line"; done < .env.local
psql "$DATABASE_URL" -c "SELECT count(*) FROM seeded_tasks;"
```
Expected: row count matches `SEEDED_TASKS.length`.

- [ ] **Step 5: Commit**

```bash
git add src/db/seed
git commit -m "feat(db): seeded task database (~90 entries) and seed script"
```

---

## Task 7: Task query layer + API helpers

**Files:**
- Create: `src/lib/db/queries/task-events.ts`
- Create: `src/lib/db/queries/tasks.ts`
- Create: `src/lib/api/responses.ts`
- Create: `src/lib/api/validators.ts`

- [ ] **Step 1: Create task-event logger**

`src/lib/db/queries/task-events.ts`:

```ts
import { db } from "@/db";
import { taskEvents } from "@/db/schema";

type EventType =
  | "created"
  | "completed"
  | "uncompleted"
  | "reassigned"
  | "postponed"
  | "edited"
  | "deleted"
  | "restored"
  | "points_earned"
  | "points_lost";

export async function logTaskEvent(args: {
  taskId: string;
  householdId: string;
  actorUserId: string;
  eventType: EventType;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(taskEvents).values({
    taskId: args.taskId,
    householdId: args.householdId,
    actorUserId: args.actorUserId,
    eventType: args.eventType,
    metadata: args.metadata ?? null,
  });
}
```

- [ ] **Step 2: Create the task query layer**

`src/lib/db/queries/tasks.ts`:

```ts
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { tasks, type NewTask, type Task } from "@/db/schema";

/**
 * Every function in this file MUST filter by `householdId`. Routes never
 * pass Clerk user IDs to drizzle directly — they pass the household ID
 * resolved via getAuthedContext(). This is the ONE place that scoping is
 * enforced; do not scatter it across route handlers.
 */

export async function listTasksForHousehold(
  householdId: string,
): Promise<Task[]> {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.householdId, householdId), isNull(tasks.deletedAt)));
}

export async function getTaskForHousehold(
  householdId: string,
  taskId: string,
): Promise<Task | null> {
  const [row] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.householdId, householdId),
        isNull(tasks.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createTask(data: NewTask): Promise<Task> {
  const [row] = await db.insert(tasks).values(data).returning();
  return row;
}

export async function updateTaskForHousehold(
  householdId: string,
  taskId: string,
  patch: Partial<NewTask>,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.householdId, householdId),
        isNull(tasks.deletedAt),
      ),
    )
    .returning();
  return row ?? null;
}

export async function softDeleteTaskForHousehold(
  householdId: string,
  taskId: string,
): Promise<Task | null> {
  const [row] = await db
    .update(tasks)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.householdId, householdId),
        isNull(tasks.deletedAt),
      ),
    )
    .returning();
  return row ?? null;
}
```

- [ ] **Step 3: Create API response helpers**

`src/lib/api/responses.ts`:

```ts
import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth-context";
import { ZodError } from "zod";

export function json<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function error(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleRouteError(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return error(err.code, err.code === "unauthenticated" ? 401 : 403);
  }
  if (err instanceof ZodError) {
    return error("invalid_body", 400, { issues: err.issues });
  }
  console.error("API error:", err);
  return error("internal_error", 500);
}
```

- [ ] **Step 4: Create zod validators**

`src/lib/api/validators.ts`:

```ts
import { z } from "zod";

// ISO date (YYYY-MM-DD)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
// HH:MM (24h)
const isoTime = z.string().regex(/^\d{2}:\d{2}$/, "expected HH:MM");

const repeatRule = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("daily"),
      interval: z.number().int().positive(),
    }),
    z.object({
      type: z.literal("weekly"),
      interval: z.number().int().positive(),
      days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])),
    }),
    z.object({
      type: z.literal("monthly"),
      interval: z.number().int().positive(),
      day_of_month: z.number().int().min(1).max(31),
    }),
  ])
  .nullable();

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  notes: z.string().max(10_000).nullable().optional(),
  dueDate: isoDate,
  dueTime: isoTime.nullable().optional(),
  flexible: z.boolean().default(false),
  categoryId: z.string().uuid().nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  points: z.number().int().min(0).max(1000).default(0),
  repeatRule: repeatRule.optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
```

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/queries/tasks.ts src/lib/db/queries/task-events.ts src/lib/api
git commit -m "feat(api): task query layer, response helpers, zod validators"
```

---

## Task 8: Task API routes — list, create, update, delete

**Files:**
- Create: `src/app/api/categories/route.ts`
- Create: `src/app/api/tasks/route.ts`
- Create: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Categories GET route**

`src/app/api/categories/route.ts`:

```ts
import { getAuthedContext } from "@/lib/auth-context";
import { listCategoriesForHousehold } from "@/lib/db/queries/categories";
import { handleRouteError, json } from "@/lib/api/responses";

export async function GET() {
  try {
    const { householdId } = await getAuthedContext();
    const rows = await listCategoriesForHousehold(householdId);
    return json({ categories: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 2: Tasks list + create route**

`src/app/api/tasks/route.ts`:

```ts
import { getAuthedContext } from "@/lib/auth-context";
import {
  listTasksForHousehold,
  createTask,
} from "@/lib/db/queries/tasks";
import { getDefaultCategoryForHousehold } from "@/lib/db/queries/categories";
import { logTaskEvent } from "@/lib/db/queries/task-events";
import { createTaskSchema } from "@/lib/api/validators";
import { handleRouteError, json } from "@/lib/api/responses";

export async function GET() {
  try {
    const { householdId } = await getAuthedContext();
    const rows = await listTasksForHousehold(householdId);
    return json({ tasks: rows });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { householdId, user } = await getAuthedContext();
    const body = await req.json();
    const data = createTaskSchema.parse(body);

    // If no category provided, fall back to the household's default.
    let categoryId = data.categoryId ?? null;
    if (!categoryId) {
      const defaultCat = await getDefaultCategoryForHousehold(householdId);
      categoryId = defaultCat?.id ?? null;
    }

    const task = await createTask({
      householdId,
      title: data.title,
      notes: data.notes ?? null,
      dueDate: data.dueDate,
      dueTime: data.dueTime ?? null,
      flexible: data.flexible,
      categoryId,
      assigneeUserId: data.assigneeUserId ?? null,
      createdByUserId: user.id,
      points: data.points,
      repeatRule: data.repeatRule ?? null,
    });

    await logTaskEvent({
      taskId: task.id,
      householdId,
      actorUserId: user.id,
      eventType: "created",
    });

    return json({ task }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 3: Tasks patch + delete route**

`src/app/api/tasks/[id]/route.ts`:

```ts
import { getAuthedContext } from "@/lib/auth-context";
import {
  updateTaskForHousehold,
  softDeleteTaskForHousehold,
  getTaskForHousehold,
} from "@/lib/db/queries/tasks";
import { logTaskEvent } from "@/lib/db/queries/task-events";
import { updateTaskSchema } from "@/lib/api/validators";
import { handleRouteError, json, error } from "@/lib/api/responses";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { householdId, user } = await getAuthedContext();
    const body = await req.json();
    const patch = updateTaskSchema.parse(body);

    const existing = await getTaskForHousehold(householdId, id);
    if (!existing) return error("not_found", 404);

    const wasReassigned =
      "assigneeUserId" in patch && patch.assigneeUserId !== existing.assigneeUserId;
    const dueDateChanged =
      "dueDate" in patch && patch.dueDate !== existing.dueDate;

    const updated = await updateTaskForHousehold(householdId, id, {
      title: patch.title,
      notes: patch.notes,
      dueDate: patch.dueDate,
      dueTime: patch.dueTime,
      flexible: patch.flexible,
      categoryId: patch.categoryId,
      assigneeUserId: patch.assigneeUserId,
      points: patch.points,
      repeatRule: patch.repeatRule,
    });
    if (!updated) return error("not_found", 404);

    await logTaskEvent({
      taskId: updated.id,
      householdId,
      actorUserId: user.id,
      eventType: wasReassigned
        ? "reassigned"
        : dueDateChanged
          ? "postponed"
          : "edited",
      metadata: wasReassigned
        ? { from_user_id: existing.assigneeUserId, to_user_id: updated.assigneeUserId }
        : dueDateChanged
          ? { old_date: existing.dueDate, new_date: updated.dueDate }
          : undefined,
    });

    return json({ task: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { householdId, user } = await getAuthedContext();

    const existing = await getTaskForHousehold(householdId, id);
    if (!existing) return error("not_found", 404);

    const wasCompleted = !!existing.completedAt;
    const deleted = await softDeleteTaskForHousehold(householdId, id);
    if (!deleted) return error("not_found", 404);

    await logTaskEvent({
      taskId: deleted.id,
      householdId,
      actorUserId: user.id,
      eventType: "deleted",
    });

    // If the task was completed, losing it means losing its points.
    if (wasCompleted && existing.points > 0) {
      await logTaskEvent({
        taskId: deleted.id,
        householdId,
        actorUserId: user.id,
        eventType: "points_lost",
        metadata: { points: existing.points },
      });
    }

    return json({ task: deleted });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 4: Smoke-test the routes**

Run `npm run dev` in one terminal. In another:
```bash
set -a; while IFS= read -r line; do [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]] && continue; export "$line"; done < .env.local
curl -i http://localhost:3000/api/tasks
```
Expected: 404 or 401 redirect (Clerk middleware blocks unauthenticated requests — this proves middleware is active). Do not test authenticated calls yet; that's covered by e2e in later tasks.

- [ ] **Step 5: Commit**

```bash
git add src/app/api
git commit -m "feat(api): tasks list/create/patch/delete + categories list routes"
```

---

## Task 9: Complete and uncomplete endpoints

**Files:**
- Create: `src/app/api/tasks/[id]/complete/route.ts`
- Create: `src/app/api/tasks/[id]/uncomplete/route.ts`

- [ ] **Step 1: Complete endpoint**

`src/app/api/tasks/[id]/complete/route.ts`:

```ts
import { getAuthedContext } from "@/lib/auth-context";
import {
  getTaskForHousehold,
  updateTaskForHousehold,
} from "@/lib/db/queries/tasks";
import { logTaskEvent } from "@/lib/db/queries/task-events";
import { handleRouteError, json, error } from "@/lib/api/responses";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { householdId, user } = await getAuthedContext();

    const existing = await getTaskForHousehold(householdId, id);
    if (!existing) return error("not_found", 404);
    if (existing.completedAt) return json({ task: existing });

    const updated = await updateTaskForHousehold(householdId, id, {
      completedAt: new Date(),
      completedByUserId: user.id,
    });
    if (!updated) return error("not_found", 404);

    await logTaskEvent({
      taskId: updated.id,
      householdId,
      actorUserId: user.id,
      eventType: "completed",
    });
    if (updated.points > 0) {
      await logTaskEvent({
        taskId: updated.id,
        householdId,
        actorUserId: user.id,
        eventType: "points_earned",
        metadata: { points: updated.points },
      });
    }

    return json({ task: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 2: Uncomplete endpoint**

`src/app/api/tasks/[id]/uncomplete/route.ts`:

```ts
import { getAuthedContext } from "@/lib/auth-context";
import {
  getTaskForHousehold,
  updateTaskForHousehold,
} from "@/lib/db/queries/tasks";
import { logTaskEvent } from "@/lib/db/queries/task-events";
import { handleRouteError, json, error } from "@/lib/api/responses";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { householdId, user } = await getAuthedContext();

    const existing = await getTaskForHousehold(householdId, id);
    if (!existing) return error("not_found", 404);
    if (!existing.completedAt) return json({ task: existing });

    const updated = await updateTaskForHousehold(householdId, id, {
      completedAt: null,
      completedByUserId: null,
    });
    if (!updated) return error("not_found", 404);

    await logTaskEvent({
      taskId: updated.id,
      householdId,
      actorUserId: user.id,
      eventType: "uncompleted",
    });
    if (existing.points > 0) {
      await logTaskEvent({
        taskId: updated.id,
        householdId,
        actorUserId: user.id,
        eventType: "points_lost",
        metadata: { points: existing.points },
      });
    }

    return json({ task: updated });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks
git commit -m "feat(api): complete and uncomplete endpoints with points events"
```

---

## Task 10: Frontend data hooks (TanStack Query)

**Files:**
- Create: `src/lib/hooks/use-categories.ts`
- Create: `src/lib/hooks/use-tasks.ts`

- [ ] **Step 1: Categories hook**

`src/lib/hooks/use-categories.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { Category } from "@/db/schema";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories", { cache: "no-store" });
  if (!res.ok) throw new Error(`categories ${res.status}`);
  const { categories } = (await res.json()) as { categories: Category[] };
  return categories;
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
}
```

- [ ] **Step 2: Tasks hooks (list + create + update + delete + complete + uncomplete)**

`src/lib/hooks/use-tasks.ts`:

```ts
"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { Task } from "@/db/schema";
import type {
  CreateTaskInput,
  UpdateTaskInput,
} from "@/lib/api/validators";

const TASKS_KEY: QueryKey = ["tasks"];

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks", { cache: "no-store" });
  if (!res.ok) throw new Error(`tasks ${res.status}`);
  const { tasks } = (await res.json()) as { tasks: Task[] };
  return tasks;
}

export function useTasks() {
  return useQuery({ queryKey: TASKS_KEY, queryFn: fetchTasks });
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

async function deleteJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json() as Promise<T>;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      postJson<{ task: Task }>("/api/tasks", input).then((r) => r.task),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<Task[]>(TASKS_KEY);
      const optimistic: Task = {
        id: `optimistic-${Date.now()}`,
        householdId: "",
        title: input.title,
        notes: input.notes ?? null,
        dueDate: input.dueDate,
        dueTime: input.dueTime ?? null,
        flexible: input.flexible ?? false,
        categoryId: input.categoryId ?? null,
        assigneeUserId: input.assigneeUserId ?? null,
        createdByUserId: "",
        completedAt: null,
        completedByUserId: null,
        points: input.points ?? 0,
        bountyReward: null,
        repeatRule: input.repeatRule ?? null,
        parentTaskId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      qc.setQueryData<Task[]>(TASKS_KEY, (old = []) => [optimistic, ...old]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
    onSuccess: (created, _input, ctx) => {
      qc.setQueryData<Task[]>(TASKS_KEY, (old = []) =>
        old.map((t) => (t.id === ctx?.optimisticId ? created : t)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTaskInput }) =>
      patchJson<{ task: Task }>(`/api/tasks/${id}`, patch).then((r) => r.task),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<Task[]>(TASKS_KEY);
      qc.setQueryData<Task[]>(TASKS_KEY, (old = []) =>
        old.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      deleteJson<{ task: Task }>(`/api/tasks/${id}`).then((r) => r.task),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<Task[]>(TASKS_KEY);
      qc.setQueryData<Task[]>(TASKS_KEY, (old = []) => old.filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      postJson<{ task: Task }>(`/api/tasks/${id}/complete`).then((r) => r.task),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<Task[]>(TASKS_KEY);
      const now = new Date();
      qc.setQueryData<Task[]>(TASKS_KEY, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, completedAt: now } : t)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

export function useUncompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      postJson<{ task: Task }>(`/api/tasks/${id}/uncomplete`).then((r) => r.task),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const previous = qc.getQueryData<Task[]>(TASKS_KEY);
      qc.setQueryData<Task[]>(TASKS_KEY, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, completedAt: null, completedByUserId: null } : t)),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(TASKS_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks
git commit -m "feat(hooks): useTasks/useCreate/Update/Delete/Complete with optimistic updates"
```

---

## Task 11: Refactor `page.tsx` to use real data

This is the largest single task. It replaces demo arrays with real queries while preserving every existing UI behavior (optimistic timing, toast copy, undo, error handling, filters, overdue display, completion copy variants).

**Files:**
- Modify: `src/app/page.tsx` (replace entire file)

**Background context (do not skip):**
- The existing `page.tsx` uses local `DEMO_USER = "Dave"` / `DEMO_PARTNER = "Krista"` strings throughout. We now derive the user's display name from Clerk and the partner's display name from the `users` table for the household.
- `TaskListItem`'s `Task` prop shape uses *names* (`assigneeName`, `completedByName`, `createdByName`) — we convert DB rows into that shape inside the component. Preserves the existing UI interface.
- The sheet's `onSubmit` still takes `TaskFormData`; we translate into the API shape inside the handler.
- Filters ("mine" / "theirs" / "all"): compare `assigneeUserId` to `user.id` rather than comparing names.
- Overdue days: computed from `dueDate`. For today, treat as due today; for past dates, `(today - dueDate)` days.

- [ ] **Step 1: Add a helper for fetching `me` plus partner**

Create `src/lib/hooks/use-me.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";
import type { User } from "@/db/schema";

type MeResponse = { me: User; partner: User | null };

async function fetchMe(): Promise<MeResponse> {
  const res = await fetch("/api/me", { cache: "no-store" });
  if (!res.ok) throw new Error(`me ${res.status}`);
  return res.json();
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: fetchMe, staleTime: 60_000 });
}
```

- [ ] **Step 2: Add `/api/me` route**

Create `src/app/api/me/route.ts`:

```ts
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json } from "@/lib/api/responses";

export async function GET() {
  try {
    const { householdId, user } = await getAuthedContext();
    const partners = await db
      .select()
      .from(users)
      .where(and(eq(users.householdId, householdId), ne(users.id, user.id)))
      .limit(1);
    return json({ me: user, partner: partners[0] ?? null });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 3: Replace `src/app/page.tsx`**

This is a complete rewrite. Replace the file with:

```tsx
"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Plus } from "lucide-react";
import { EASE_OUT_QUART } from "../lib/motion";
import { AppShell } from "../components/app-shell/app-shell";
import { FilterToggle, type FilterValue } from "../components/filter-toggle/filter-toggle";
import { TaskListItem, type Task as UITask } from "../components/task-list-item/task-list-item";
import { DoneAccordion } from "../components/done-accordion/done-accordion";
import { EmptyState } from "../components/empty-state/empty-state";
import { Fab } from "../components/fab/fab";
import { TaskSheet, type TaskFormData } from "../components/task-sheet/task-sheet";
import { Toast } from "../components/toast/toast";
import { ConfirmDialog } from "../components/confirm-dialog/confirm-dialog";
import type { Task as DBTask } from "@/db/schema";
import { useMe } from "@/lib/hooks/use-me";
import { useCategories } from "@/lib/hooks/use-categories";
import {
  useTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useCompleteTask,
  useUncompleteTask,
} from "@/lib/hooks/use-tasks";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";

function formatTodayDate(): { dayName: string; fullDate: string; iso: string } {
  const now = new Date();
  return {
    dayName: now.toLocaleDateString("en-US", { weekday: "long" }),
    fullDate: now.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    iso: now.toISOString().split("T")[0],
  };
}

function daysBetween(isoA: string, isoB: string): number {
  const a = Date.parse(`${isoA}T00:00:00Z`);
  const b = Date.parse(`${isoB}T00:00:00Z`);
  return Math.round((a - b) / 86_400_000);
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

const COMPLETION_COPY_GENERAL = [
  "Nice. One less thing.",
  "Done and done.",
  "Off the list.",
  "Handled.",
  "One down.",
];
const COMPLETION_COPY_PARTNER_CREATED = [
  "{partner} asked, you delivered.",
  "That's off {partner}'s mind now.",
  "{partner}'s gonna notice that.",
];
const COMPLETION_COPY_SELF_CREATED = [
  "Handled your own business.",
  "Self-assigned and self-handled.",
];

function getCompletionCopy(task: DBTask, myUserId: string, partnerName: string | null): string {
  const seed = hashString(task.id);
  const isPartnerCreated = task.createdByUserId !== myUserId && partnerName;
  const isSelfCreated = task.createdByUserId === myUserId;
  if (isPartnerCreated) {
    const msg = COMPLETION_COPY_PARTNER_CREATED[seed % COMPLETION_COPY_PARTNER_CREATED.length];
    return msg.replace("{partner}", partnerName);
  }
  if (isSelfCreated) return COMPLETION_COPY_SELF_CREATED[seed % COMPLETION_COPY_SELF_CREATED.length];
  return COMPLETION_COPY_GENERAL[seed % COMPLETION_COPY_GENERAL.length];
}

function toUITask(
  t: DBTask,
  me: { id: string; displayName: string },
  partner: { id: string; displayName: string } | null,
  categoryNameById: Map<string, string>,
  todayIso: string,
): UITask {
  const assigneeName =
    t.assigneeUserId === me.id
      ? me.displayName
      : t.assigneeUserId === partner?.id
        ? partner.displayName
        : t.assigneeUserId === SHARED_ASSIGNEE_SENTINEL
          ? partner?.displayName ?? "Partner"
          : undefined;
  const completedByName =
    t.completedByUserId === me.id
      ? me.displayName
      : t.completedByUserId === partner?.id
        ? partner?.displayName
        : undefined;
  const createdByName =
    t.createdByUserId === me.id
      ? me.displayName
      : t.createdByUserId === partner?.id
        ? partner.displayName
        : undefined;

  const overdueDays = (() => {
    if (t.completedAt) return undefined;
    const diff = daysBetween(todayIso, t.dueDate);
    return diff > 0 ? diff : undefined;
  })();

  return {
    id: t.id,
    title: t.title,
    dueTime: t.dueTime ?? undefined,
    flexible: t.flexible,
    assigneeName,
    categoryName: t.categoryId ? categoryNameById.get(t.categoryId) : undefined,
    createdByName,
    completedAt: t.completedAt ? t.completedAt.toString() : undefined,
    completedByName,
    overdueDays,
  };
}

function formDataToCreateInput(
  data: TaskFormData,
  me: { id: string },
  partner: { id: string } | null,
  categoryIdByName: Map<string, string>,
  todayIso: string,
) {
  const assigneeUserId =
    data.assignee === "me"
      ? me.id
      : data.assignee === "partner"
        ? partner?.id ?? SHARED_ASSIGNEE_SENTINEL
        : null;
  return {
    title: data.title.trim(),
    notes: data.notes || null,
    dueDate: data.date || todayIso,
    dueTime: data.time || null,
    flexible: data.flexible,
    categoryId: data.category ? categoryIdByName.get(data.category) ?? null : null,
    assigneeUserId,
    points: data.points ?? 0,
    repeatRule: data.repeatRule ?? null,
  };
}

export default function TodayPage() {
  const shouldReduceMotion = useReducedMotion();
  const { dayName, fullDate, iso: todayIso } = formatTodayDate();

  const { data: meData } = useMe();
  const { data: cats = [] } = useCategories();
  const { data: dbTasks = [], isLoading } = useTasks();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();

  const me = meData?.me ?? null;
  const partner = meData?.partner ?? null;

  const categoryNameById = useMemo(
    () => new Map(cats.map((c) => [c.id, c.name])),
    [cats],
  );
  const categoryIdByName = useMemo(
    () => new Map(cats.map((c) => [c.name, c.id])),
    [cats],
  );

  // Only show tasks for today (or past-due carry-forward for flexible ones).
  const visibleDbTasks = useMemo(() => {
    return dbTasks.filter((t) => {
      if (t.flexible) return daysBetween(todayIso, t.dueDate) >= 0; // today or past
      return t.dueDate === todayIso || daysBetween(todayIso, t.dueDate) > 0;
    });
  }, [dbTasks, todayIso]);

  const uiTasks = useMemo(() => {
    if (!me) return [] as UITask[];
    return visibleDbTasks.map((t) => toUITask(t, me, partner, categoryNameById, todayIso));
  }, [visibleDbTasks, me, partner, categoryNameById, todayIso]);

  const active = uiTasks.filter((t) => !t.completedAt);
  const done = uiTasks.filter((t) => !!t.completedAt);

  const [filter, setFilter] = useState<FilterValue>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<UITask | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    action?: { label: string; onClick: () => void };
    duration?: number;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ taskId: string; isRepeating: boolean } | null>(
    null,
  );
  const swipeHintShown = useRef(false);
  const sheetOpenRef = useRef(sheetOpen);

  const filteredActive = useMemo(() => {
    if (!me) return active;
    return active.filter((t) => {
      if (filter === "all") return true;
      if (filter === "mine") return t.assigneeName === me.displayName || !t.assigneeName;
      return t.assigneeName === partner?.displayName || !t.assigneeName;
    });
  }, [active, filter, me, partner]);

  const filteredDone = useMemo(() => {
    if (!me) return done;
    return done.filter((t) => {
      if (filter === "all") return true;
      if (filter === "mine") return t.completedByName === me.displayName;
      return t.completedByName === partner?.displayName;
    });
  }, [done, filter, me, partner]);

  const primary = filteredActive.filter((t) => !t.flexible);
  const secondary = filteredActive.filter((t) => t.flexible);
  const isEmpty = !isLoading && active.length === 0 && done.length === 0;
  const isCaughtUp = !isEmpty && filteredActive.length === 0 && filteredDone.length > 0;

  const handleComplete = useCallback(
    (id: string) => {
      if (!me) return;
      const dbTask = dbTasks.find((t) => t.id === id);
      if (!dbTask) return;
      completeTask.mutate(id);
      setToast({
        message: getCompletionCopy(dbTask, me.id, partner?.displayName ?? null),
        action: {
          label: "Undo",
          onClick: () => {
            uncompleteTask.mutate(id);
            setToast(null);
          },
        },
      });
    },
    [me, partner, dbTasks, completeTask, uncompleteTask],
  );

  const handleUncomplete = useCallback((id: string) => {
    uncompleteTask.mutate(id);
  }, [uncompleteTask]);

  const handlePostpone = useCallback(
    (id: string) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString().split("T")[0];
      updateTask.mutate({ id, patch: { dueDate: tomorrowIso } });
      setToast({
        message: "Moved to tomorrow.",
        action: {
          label: "Undo",
          onClick: () => {
            updateTask.mutate({ id, patch: { dueDate: todayIso } });
            setToast(null);
          },
        },
      });
    },
    [updateTask, todayIso],
  );

  const handleTap = useCallback(
    (id: string) => {
      const t = uiTasks.find((x) => x.id === id);
      if (t) {
        setEditingTask(t);
        setSheetOpen(true);
      }
    },
    [uiTasks],
  );

  const handleAddTask = useCallback(() => setSheetOpen(true), []);

  const handleCreateTask = useCallback(
    async (data: TaskFormData) => {
      if (!me || !data.title.trim()) return;
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, todayIso);
      try {
        await createTask.mutateAsync(input);
      } catch {
        if (!sheetOpenRef.current) setToast({ message: "That didn't save. Try again?" });
        throw new Error("Failed to create task");
      }
    },
    [me, partner, categoryIdByName, todayIso, createTask],
  );

  const handleEditSubmit = useCallback(
    async (data: TaskFormData) => {
      if (!editingTask || !me) return;
      const input = formDataToCreateInput(data, me, partner, categoryIdByName, todayIso);
      await updateTask.mutateAsync({ id: editingTask.id, patch: input });
    },
    [editingTask, me, partner, categoryIdByName, todayIso, updateTask],
  );

  const executeDelete = useCallback(
    (id: string) => {
      const deleted = dbTasks.find((t) => t.id === id);
      deleteTask.mutate(id);
      setToast({
        message: "Deleted.",
        action: {
          label: "Undo",
          onClick: () => {
            // Re-create the task from its previous state. Points events
            // will settle on the next poll.
            if (!deleted || !me) return;
            createTask.mutate({
              title: deleted.title,
              notes: deleted.notes,
              dueDate: deleted.dueDate,
              dueTime: deleted.dueTime,
              flexible: deleted.flexible,
              categoryId: deleted.categoryId,
              assigneeUserId: deleted.assigneeUserId,
              points: deleted.points,
              repeatRule: deleted.repeatRule as never,
            });
            setToast(null);
          },
        },
      });
    },
    [dbTasks, deleteTask, createTask, me],
  );

  const handleDelete = useCallback((id: string) => executeDelete(id), [executeDelete]);

  const handleDeleteFromSheet = useCallback(() => {
    if (!editingTask) return;
    const id = editingTask.id;
    setSheetOpen(false);
    setEditingTask(null);
    executeDelete(id);
  }, [editingTask, executeDelete]);

  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);

  useEffect(() => {
    swipeHintShown.current = true;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !sheetOpen) {
        e.preventDefault();
        handleAddTask();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, handleAddTask]);

  const listVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.04 } },
  };
  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 6 },
    visible: shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT_QUART } },
  };

  return (
    <AppShell
      activePath="/today"
      userName={me?.displayName ?? ""}
      partnerName={partner?.displayName ?? ""}
      userPoints={0}
      partnerPoints={0}
      userPointsToday={0}
      partnerPointsToday={0}
      hasNotification={false}
      todayCount={filteredActive.length}
      weekCount={0}
      monthLabel={new Date().toLocaleDateString("en-US", { month: "long" })}
    >
      <div className="mb-[var(--space-6)]">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-[var(--weight-bold)] text-[color:var(--color-text-primary)] leading-[var(--leading-tight)]">
          {dayName}
        </h1>
        <p className="text-[length:var(--text-sm)] text-[color:var(--color-text-tertiary)] mt-[var(--space-1)]">
          {fullDate}
          {filteredActive.length > 0 && !isCaughtUp && (
            <span className="ml-[var(--space-2)] text-[color:var(--color-text-secondary)]">
              &middot; {filteredActive.length} {filteredActive.length === 1 ? "task" : "tasks"} to do
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between gap-[var(--space-3)] mb-[var(--space-4)]">
        <FilterToggle value={filter} onChange={setFilter} partnerName={partner?.displayName ?? ""} />
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            onClick={handleAddTask}
            aria-keyshortcuts="Meta+Enter"
            className="hidden lg:inline-flex items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-[var(--weight-semibold)] bg-[var(--color-accent)] text-[color:var(--color-accent-text)] hover:bg-[var(--color-accent-hover)] shadow-[var(--shadow-accent-glow)] active:scale-[0.98] transition-all duration-[var(--duration-instant)] min-h-[var(--touch-target-min)]"
          >
            <Plus size={16} strokeWidth={2.5} aria-hidden="true" />
            Add task
            <kbd className="ml-[var(--space-1)] px-[var(--space-1)] py-[var(--space-0-5)] rounded-[var(--radius-sm)] bg-[var(--color-accent-hover)] text-[length:var(--text-xs)] font-[var(--weight-medium)] text-[color:var(--color-accent-text)] opacity-80">
              ⌘↵
            </kbd>
          </button>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState variant="no-tasks" onAddTask={handleAddTask} />
      ) : isCaughtUp ? (
        <>
          <EmptyState variant="caught-up" completedCount={done.length} />
          <DoneAccordion tasks={filteredDone} onUncomplete={handleUncomplete} onTap={handleTap} onDelete={handleDelete} />
        </>
      ) : (
        <>
          {primary.length > 0 && (
            <motion.section variants={listVariants} initial="hidden" animate="visible" aria-label="Tasks due today">
              <h2 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-accent)] px-[var(--space-1)] mb-[var(--space-2)]">
                Due today
              </h2>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden shadow-[var(--shadow-sm)] bg-[var(--color-surface)]">
                <AnimatePresence mode="popLayout">
                  {primary.map((task, index) => (
                    <motion.div
                      key={task.id}
                      variants={itemVariants}
                      layout="position"
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -40, transition: { duration: 0.2 } }}
                    >
                      <TaskListItem
                        task={task}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        onPostpone={handlePostpone}
                        onTap={handleTap}
                        onDelete={handleDelete}
                        showSwipeHint={index === 0 && !swipeHintShown.current}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {secondary.length > 0 && (
            <motion.section variants={listVariants} initial="hidden" animate="visible" aria-label="When you can" className="mt-[var(--space-8)]">
              <h2 className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-tertiary)] px-[var(--space-1)] mb-[var(--space-2)]">
                When you can
              </h2>
              <div className="flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)]">
                <AnimatePresence mode="popLayout">
                  {secondary.map((task) => (
                    <motion.div
                      key={task.id}
                      variants={itemVariants}
                      layout="position"
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -40, transition: { duration: 0.2 } }}
                    >
                      <TaskListItem
                        task={task}
                        onComplete={handleComplete}
                        onUncomplete={handleUncomplete}
                        onPostpone={handlePostpone}
                        onTap={handleTap}
                        onDelete={handleDelete}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {filteredDone.length > 0 && (
            <DoneAccordion tasks={filteredDone} onUncomplete={handleUncomplete} onTap={handleTap} onDelete={handleDelete} />
          )}
        </>
      )}

      <Fab onClick={handleAddTask} isSheetOpen={sheetOpen} />

      <TaskSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleEditSubmit : handleCreateTask}
        onDelete={editingTask ? handleDeleteFromSheet : undefined}
        mode={editingTask ? "edit" : "create"}
        initialData={undefined /* TaskSheet handles initialData for edit via editingTask mapping if needed */}
        userName={me?.displayName ?? ""}
        partnerName={partner?.displayName ?? ""}
      />

      <Toast
        message={toast?.message ?? ""}
        action={toast?.action}
        isVisible={!!toast}
        onDismiss={() => setToast(null)}
        duration={toast?.duration}
      />

      <ConfirmDialog
        isOpen={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        title="Delete it for good?"
        actions={[
          {
            label: "Delete",
            variant: "destructive" as const,
            onClick: () => {
              if (deleteDialog) executeDelete(deleteDialog.taskId);
              setDeleteDialog(null);
            },
          },
        ]}
      />
    </AppShell>
  );
}
```

- [ ] **Step 4: Verify compilation**

Run: `npx tsc --noEmit`
Expected: no errors.

(If there's a diagnostic about `initialData={undefined}` for edit mode, re-check `TaskSheet`'s props and, if needed, rebuild the edit-mode `initialData` via a small helper similar to the old `taskToFormData`. The UI must still prefill the sheet in edit mode.)

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`
In a fresh browser, go to `http://localhost:3000`.
- Expected: redirect to `/sign-in`.
- Sign up a new user.
- Expected: lands on `/`, empty state shown.
- Create a task ("Take out trash"). Expected: it appears immediately.
- Refresh the page. Expected: task still there.
- Complete the task, refresh. Expected: in Done section.
- Delete the task, verify Undo re-creates it.

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx src/lib/hooks/use-me.ts src/app/api/me
git commit -m "feat(today): replace demo data with real API-backed task CRUD"
```

---

## Task 12: Playwright auth setup + fixture strategy

**Files:**
- Create: `.env.test`
- Create: `tests/auth.setup.ts`
- Create: `tests/fixtures/reset-db.ts`
- Create: `tests/fixtures/test-user.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Create a fixture test user in Clerk**

Go to [dashboard.clerk.com](https://dashboard.clerk.com) → your dev app → **Users** → **Create user**:
- Email: `e2e-test@todoapp.dev` (or any placeholder — this is dev only)
- Password: a strong value you'll store locally

Copy the user's ID and the password into `.env.test` (below).

- [ ] **Step 2: Create `.env.test`** (git-ignored)

`.env.test`:

```
# E2E test user (Clerk dev instance)
E2E_CLERK_USER_ID=user_xxxxxxxxxxxxxxxxxxxxxxxx
E2E_CLERK_USER_EMAIL=e2e-test@todoapp.dev
E2E_CLERK_USER_PASSWORD=<paste here>
```

Add `.env.test` to `.gitignore` if not already.

- [ ] **Step 3: Test-user constants**

`tests/fixtures/test-user.ts`:

```ts
export const E2E_USER = {
  id: process.env.E2E_CLERK_USER_ID!,
  email: process.env.E2E_CLERK_USER_EMAIL!,
  password: process.env.E2E_CLERK_USER_PASSWORD!,
};
```

- [ ] **Step 4: DB reset helper**

`tests/fixtures/reset-db.ts`:

```ts
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env.test", override: true });

/**
 * Wipes household-scoped data for the e2e user only. Does NOT delete
 * the user row itself — that stays so getAuthedContext() fast-paths.
 * Destroys the user's household, cascading tasks/categories/events.
 */
export async function resetE2EData(): Promise<void> {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  const clerkId = process.env.E2E_CLERK_USER_ID!;
  await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${clerkId}
  )`;
  // Null out the FK so getAuthedContext recreates a household on next request.
  await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${clerkId}`;
}
```

- [ ] **Step 5: Auth setup via Clerk testing token**

`tests/auth.setup.ts`:

```ts
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { E2E_USER } from "./fixtures/test-user";
import { resetE2EData } from "./fixtures/reset-db";

const AUTH_FILE = "tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await clerkSetup();
  await resetE2EData();

  await page.goto("/sign-in");
  await clerk.signIn({
    page,
    signInParams: {
      strategy: "password",
      identifier: E2E_USER.email,
      password: E2E_USER.password,
    },
  });

  await page.goto("/");
  await page.waitForURL("/");
  await page.context().storageState({ path: AUTH_FILE });
});
```

- [ ] **Step 6: Modify `playwright.config.ts`**

Replace with:

```ts
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env.test", override: true });

const STORAGE = "tests/.auth/user.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE },
      dependencies: ["setup"],
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"], storageState: STORAGE },
      dependencies: ["setup"],
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"], storageState: STORAGE },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev -- --port 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

- [ ] **Step 7: Add `.auth` to `.gitignore`**

Append to `.gitignore`:
```
tests/.auth/
.env.test
```

- [ ] **Step 8: Smoke-run the setup project only**

Run: `npx playwright test --project=setup`
Expected: passes. `tests/.auth/user.json` now exists.

- [ ] **Step 9: Commit**

```bash
git add tests playwright.config.ts .gitignore
git commit -m "test(e2e): clerk testing-token auth setup + db reset fixture"
```

---

## Task 13: Adapt existing e2e tests to real backend

This task modifies the two existing spec files. The existing tests largely manipulate the UI and assert on its state — most should "just work" against the real backend once authenticated. The items below handle the inevitable breakages.

**Files:**
- Modify: `tests/task-sheet.spec.ts`
- Modify: `tests/today-view.spec.ts`

- [ ] **Step 1: Run the full suite and collect failures**

Run: `npx playwright test`
Expected: some tests fail. Collect the names.

- [ ] **Step 2: For each failure, classify the cause**

Common causes and fixes:
- **Hardcoded "Dave"/"Krista" in assertions.** Change to the fixture user's display name (from the Clerk dashboard), or query the rendered header text. Prefer looking up via UI (`getByRole("heading")`) rather than hardcoding.
- **Demo-data assumptions** (e.g. "expect 8 tasks initially"). Change the test to start from a clean DB state (already handled by `resetE2EData()` in setup) and create tasks via the UI inside the test.
- **Timing assumptions around setTimeout(50).** If a test depends on the exact optimistic timing, relax it (`await expect(locator).toBeVisible()` instead of a fixed wait).

Document each failure in a scratch note, then for each:
1. Open the failing spec file.
2. Apply the narrowest fix that preserves the test's intent.
3. Re-run just that test: `npx playwright test tests/X.spec.ts -g "test name"`
4. Confirm pass.

- [ ] **Step 3: Run the full suite again**

Run: `npx playwright test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests
git commit -m "test(e2e): adapt task-sheet + today-view specs to real backend"
```

---

## Task 14: Finalize docs and build-flow tick

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/open-questions.md`
- Create: `docs/session-handoff-persistence-auth.md`

- [ ] **Step 1: Update `CLAUDE.md` build progress**

Edit the "Build progress" section in `CLAUDE.md`. Before:

```
10. ✅ Playwright e2e (274 runs, 0 failures — optimized from 733)
11. Keep updating docs after every major change
```

After:

```
10. ✅ Playwright e2e (274 runs, 0 failures — optimized from 733)
11. ✅ Real persistence + auth (Drizzle + Neon + Clerk + TanStack Query, 2026-04-14)
12. Keep updating docs after every major change
```

- [ ] **Step 2: Add new commands to `CLAUDE.md`**

In the "Commands" section, append:

```bash
npm run db:generate            # Generate a new Drizzle migration
npm run db:migrate             # Run pending migrations
npm run db:seed                # Seed the ~90-entry seeded task table
npm run db:studio              # Open Drizzle Studio
npm test                       # Vitest (unit/integration)
```

- [ ] **Step 3: Update external systems table in `CLAUDE.md`**

Change the Neon and Clerk rows' "Status" column to reflect the new state (tables created, users/orgs still dev-only).

- [ ] **Step 4: Update `docs/open-questions.md`**

Add a note under any relevant item that's now answered in code (e.g., household model, categories, points) to point at the new implementation files.

- [ ] **Step 5: Write a session handoff**

`docs/session-handoff-persistence-auth.md`: a one-page summary of what was built, what's deferred (partner invite UX, notifications UI, points UI), and what the next session should look at.

Contents:

```markdown
# Session handoff — Persistence and Auth (2026-04-14)

## What shipped

- Drizzle schema for households, users, categories, seeded_tasks, tasks,
  task_events, invites, notifications (migration `0000_*.sql`).
- Clerk middleware protecting all routes except `/sign-in` and `/sign-up`.
- Lazy user/household upsert via `getAuthedContext()` — no webhook needed.
- Task API routes: GET/POST `/api/tasks`, PATCH/DELETE `/api/tasks/[id]`,
  POST `/api/tasks/[id]/complete`, POST `/api/tasks/[id]/uncomplete`,
  GET `/api/categories`, GET `/api/me`.
- TanStack Query hooks with optimistic updates and 5 s polling.
- `page.tsx` refactored: demo arrays gone; real Clerk-scoped data flows.
- Seeded task database (~90 entries).
- Playwright `setup` project using `@clerk/testing` tokens, storage state
  reused across three viewports; DB reset between setup runs.

## What's deferred

- Partner invite UI (API + Invite table exist; UX needs `/shape`).
- Notifications UI (table exists; no surface yet).
- Points display surface (events are logged; no balance query/surface).
- Repeat-rule spawn-next engine (field is in schema; generator not built).
- Week / Month views (Today only for now).
- Clerk webhook — not needed for this phase; revisit if we want
  server-side guarantees around user deletion.

## Where to start next session

1. Read this file.
2. Pick ONE of: partner invite UX shaping, points balance surface,
   repeat-rule engine, or Week/Month views.
3. For partner invite — `/shape` session first.
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/open-questions.md docs/session-handoff-persistence-auth.md
git commit -m "docs: update build progress and write persistence/auth handoff"
```

---

## Self-review checklist (run before handing off)

- [ ] **Spec coverage — tasks.md:** data model ✅ (Task 2), household scoping ✅ (Task 4, Task 7), complete/uncomplete with points events ✅ (Task 9), soft delete ✅ (Task 8), per-field last-write-wins ✅ (Task 8 PATCH), seeded task database ✅ (Task 6). **Gaps:** repeat-rule spawn-next engine is deferred — flagged in handoff.
- [ ] **Spec coverage — multiplayer.md:** household auto-creation ✅ (Task 4), sentinel UUID in constants ✅ (Task 2), Invite + Notification tables exist ✅ (Task 2), `User.household_id` nullable ✅ (Task 2). **Gaps:** partner invite flow deferred — explicitly scoped out in the task brief and the handoff.
- [ ] **Auth:** Clerk middleware on every non-public path ✅, signed-out redirect to `/sign-in` ✅, lazy upsert ✅.
- [ ] **Testing:** e2e auth strategy ✅ (Task 12), existing tests adapted ✅ (Task 13), Vitest wired ✅ (Task 1).
- [ ] **Docs:** build progress updated, handoff written, open questions annotated.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-persistence-and-auth.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**
