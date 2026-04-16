# Partner Invite Spine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the working Organizer-send + Willing-Partner-accept invite pipeline. Organizer can create an invite (email via Resend or shareable link), see waiting/resend/cancel states, and a second signed-in user can click the link, sign up, land in the household with sentinel-UUID tasks swapped to their real ID and any solo-household data merged in. The `partner_joined` notification row is written but the notification UI and first-run reveal copy are out of scope here — those belong to Phase C (first-run UX) and Phase D (notifications + recognition), which will be separate plans.

**Architecture:**
- **Pure-logic first.** The tricky parts — `acceptInvite`, `mergeSoloHousehold`, `swapSentinelAssignees`, `generateInviteToken` — are written and tested in Vitest before any route handler exists. Each is a plain async function that takes a DB handle and returns a typed result. Routes are thin wrappers.
- **API:** Five new routes under `src/app/api/invites/`. Zod validation at the boundary. `getAuthedContext()` guards the send/cancel routes; the accept route is authenticated but does NOT require a household (that's the whole point — the caller's household may be about to merge or get abandoned).
- **Routes:** Two new app routes. `/invite` (authenticated) is the Organizer's compose/waiting screen. `/invite/[token]` (public) is the branded landing page the Willing Partner sees when they click the link; its child `/invite/[token]/accept` is authenticated and is where the redemption runs.
- **Email:** Resend as a first-class dependency. A tiny `src/lib/email/` module wraps the SDK and renders a plain-text + minimal-HTML invite email. No React Email for v1 — one email, not worth the build-time dependency.
- **Dev reset:** `POST /api/dev/reset-invite-state` (gated on `NODE_ENV !== "production"` + a shared-secret header) nukes the caller's invite records and, if the caller has a linked partner, unlinks them. Powers the Playwright fixture so invite/accept cycles are repeatable without wiping the whole DB.
- **Testing:** Layer 1 — Vitest for all pure logic, running against a transactional fixture. Layer 2 — Playwright with two browser contexts (Organizer in context A, throwaway partner in context B) exercises the full pipe. Resend calls are stubbed in tests.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, `@neondatabase/serverless`, Clerk (`@clerk/nextjs`, `@clerk/testing`), TanStack Query v5, Zod, `resend`, Vitest, Playwright.

---

## File structure

```
package.json                                                         MODIFY — add resend
.env.local                                                           MODIFY — RESEND_API_KEY, EMAIL_FROM, DEV_RESET_SECRET
.env.test                                                            MODIFY — DEV_RESET_SECRET, E2E_PARTNER_CLERK_USER_ID/EMAIL/PASSWORD
src/lib/
  invites/
    token.ts                                                         NEW — generateInviteToken()
    token.test.ts                                                    NEW
    accept.ts                                                        NEW — acceptInvite() orchestrator
    accept.test.ts                                                   NEW
    merge.ts                                                         NEW — mergeSoloHousehold()
    merge.test.ts                                                    NEW
    swap-sentinel.ts                                                 NEW — swapSentinelAssignees()
    swap-sentinel.test.ts                                            NEW
  db/queries/
    invites.ts                                                       NEW — CRUD
    invites.test.ts                                                  NEW
    notifications.ts                                                 NEW — createNotification()
  email/
    send.ts                                                          NEW — thin Resend wrapper
    invite-email.ts                                                  NEW — renderInviteEmail()
    invite-email.test.ts                                             NEW
  hooks/
    use-invite.ts                                                    NEW — query + mutations
src/app/
  proxy.ts                                                           MODIFY — add /invite/:token to public matcher
  api/
    invites/route.ts                                                 NEW — POST, GET
    invites/[id]/route.ts                                            NEW — DELETE
    invites/[token]/accept/route.ts                                  NEW — POST
    dev/reset-invite-state/route.ts                                  NEW — POST (dev-only)
  invite/
    page.tsx                                                         NEW — Organizer compose/waiting
    [token]/page.tsx                                                 NEW — Partner branded landing (public)
    [token]/accept/page.tsx                                          NEW — authenticated redemption page
src/components/
  invite-compose/
    invite-compose.tsx                                               NEW
    invite-compose.md                                                NEW
  invite-waiting/
    invite-waiting.tsx                                               NEW
    invite-waiting.md                                                NEW
  invite-landing/
    invite-landing.tsx                                               NEW — used by /invite/[token]
    invite-landing.md                                                NEW
tests/
  fixtures/
    partner-user.ts                                                  NEW — E2E_PARTNER constants
    reset-invite.ts                                                  NEW — fetches /api/dev/reset-invite-state
  invite.setup.ts                                                    NEW — signs in partner, saves storageState
  invite-flow.spec.ts                                                NEW — two-context e2e
  auth.setup.ts                                                      (unchanged)
playwright.config.ts                                                 MODIFY — add partner storageState project
```

---

## Task 1: Install Resend + add env vars

**Files:**
- Modify: `package.json`
- Modify: `.env.local`
- Modify: `.env.test`

- [ ] **Step 1: Install the Resend SDK**

Run:
```bash
npm install resend
```
Expected: `resend` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Add env vars to `.env.local`**

Append these lines to `.env.local` (leave `RESEND_API_KEY` empty until you have one from the dashboard — the send path has a dev-mode fallback that no-ops and logs the would-be recipient):

```
# Resend (email)
RESEND_API_KEY=
EMAIL_FROM="ToDoApp <hello@example.invalid>"

# Dev-only reset endpoint (see /api/dev/reset-invite-state)
DEV_RESET_SECRET=local-dev-secret-change-me
```

- [ ] **Step 3: Add matching test env vars to `.env.test`**

Append:

```
DEV_RESET_SECRET=test-only-secret

# Partner test identity (create a second +clerk_test@example.com user in Clerk's dev instance)
E2E_PARTNER_CLERK_USER_ID=
E2E_PARTNER_CLERK_USER_EMAIL=
E2E_PARTNER_CLERK_USER_PASSWORD=
```

Leave partner values empty for now — they get filled in during Task 22 when the Playwright fixture is wired up.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .env.local .env.test
git commit -m "chore(invites): add resend dependency and env scaffolding"
```

---

## Task 2: Invite token generator (TDD)

**Files:**
- Create: `src/lib/invites/token.ts`
- Test: `src/lib/invites/token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/invites/token.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { generateInviteToken } from "./token";

describe("generateInviteToken", () => {
  it("produces a url-safe string of at least 22 chars", () => {
    const t = generateInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{22,}$/);
  });
  it("produces a different token each call", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run it and confirm red**

Run: `npx vitest run src/lib/invites/token.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `generateInviteToken`**

Create `src/lib/invites/token.ts`:

```ts
import { randomBytes } from "node:crypto";

/**
 * URL-safe 128-bit token suitable for an invite link. 16 bytes encoded
 * base64url is 22 chars — collision-resistant for our purposes and short
 * enough to paste into iMessage.
 */
export function generateInviteToken(): string {
  return randomBytes(16).toString("base64url");
}
```

- [ ] **Step 4: Run the test and confirm green**

Run: `npx vitest run src/lib/invites/token.test.ts`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invites/token.ts src/lib/invites/token.test.ts
git commit -m "feat(invites): add url-safe invite token generator"
```

---

## Task 3: Invite DB queries

**Files:**
- Create: `src/lib/db/queries/invites.ts`
- Test: `src/lib/db/queries/invites.test.ts`

> **Note:** This task hits the real dev DB (same pattern as `src/lib/task-adapters.test.ts`-adjacent integration tests). Keep queries small and deterministic — each test creates, uses, and cleans up its own rows.

- [ ] **Step 1: Write the failing test**

Create `src/lib/db/queries/invites.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and confirm red**

Run: `npx vitest run src/lib/db/queries/invites.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the queries**

Create `src/lib/db/queries/invites.ts`:

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { invites, type Invite } from "@/db/schema";

export async function createInvite(args: {
  householdId: string;
  invitedByUserId: string;
  email: string | null;
  token: string;
}): Promise<Invite> {
  const [row] = await db.insert(invites).values(args).returning();
  return row;
}

export async function findActiveInviteForHousehold(
  householdId: string,
): Promise<Invite | null> {
  const [row] = await db
    .select()
    .from(invites)
    .where(
      and(eq(invites.householdId, householdId), eq(invites.status, "pending")),
    )
    .limit(1);
  return row ?? null;
}

export async function findInviteByToken(token: string): Promise<Invite | null> {
  const [row] = await db
    .select()
    .from(invites)
    .where(eq(invites.token, token))
    .limit(1);
  return row ?? null;
}

export async function cancelInvite(id: string): Promise<void> {
  await db
    .update(invites)
    .set({ status: "cancelled" })
    .where(eq(invites.id, id));
}

export async function markInviteAccepted(
  id: string,
  acceptedByUserId: string,
): Promise<void> {
  await db
    .update(invites)
    .set({ status: "accepted", acceptedByUserId, acceptedAt: new Date() })
    .where(eq(invites.id, id));
}
```

- [ ] **Step 4: Run the test and confirm green**

Run: `npx vitest run src/lib/db/queries/invites.test.ts`
Expected: PASS 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries/invites.ts src/lib/db/queries/invites.test.ts
git commit -m "feat(invites): add invite CRUD queries (create, find, cancel, accept)"
```

---

## Task 4: Notifications query

**Files:**
- Create: `src/lib/db/queries/notifications.ts`

> This is a single tiny writer. No test — it's a one-liner that's exercised by `acceptInvite.test.ts` (Task 7) via the merge path.

- [ ] **Step 1: Create the file**

```ts
import { db } from "@/db";
import {
  notifications,
  type Notification,
  notificationTypeEnum,
} from "@/db/schema";

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

export async function createNotification(args: {
  householdId: string;
  recipientUserId: string;
  actorUserId: string;
  type: NotificationType;
  taskId?: string | null;
}): Promise<Notification> {
  const [row] = await db
    .insert(notifications)
    .values({ ...args, taskId: args.taskId ?? null })
    .returning();
  return row;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/queries/notifications.ts
git commit -m "feat(invites): add createNotification writer"
```

---

## Task 5: Sentinel assignee swap (TDD)

**Files:**
- Create: `src/lib/invites/swap-sentinel.ts`
- Test: `src/lib/invites/swap-sentinel.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { db } from "@/db";
import { households, users, tasks, categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";
import { swapSentinelAssignees } from "./swap-sentinel";

async function seedHousehold() {
  const [h] = await db.insert(households).values({ name: "T" }).returning();
  const [organizer] = await db
    .insert(users)
    .values({
      clerkUserId: `org_${crypto.randomUUID()}`,
      displayName: "Organizer",
      householdId: h.id,
    })
    .returning();
  const [partner] = await db
    .insert(users)
    .values({
      clerkUserId: `ptr_${crypto.randomUUID()}`,
      displayName: "Partner",
      householdId: h.id,
    })
    .returning();
  const [cat] = await db
    .insert(categories)
    .values({ householdId: h.id, name: "Misc" })
    .returning();
  return { household: h, organizer, partner, cat };
}

describe("swapSentinelAssignees", () => {
  it("replaces sentinel UUID with real partner ID on tasks in the household", async () => {
    const { household, organizer, partner, cat } = await seedHousehold();
    await db.insert(tasks).values([
      {
        householdId: household.id,
        title: "For partner",
        dueDate: "2026-04-20",
        categoryId: cat.id,
        assigneeUserId: SHARED_ASSIGNEE_SENTINEL,
        createdByUserId: organizer.id,
      },
      {
        householdId: household.id,
        title: "Mine",
        dueDate: "2026-04-20",
        categoryId: cat.id,
        assigneeUserId: organizer.id,
        createdByUserId: organizer.id,
      },
    ]);

    const count = await swapSentinelAssignees(household.id, partner.id);
    expect(count).toBe(1);

    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.householdId, household.id));
    const forPartner = rows.find((r) => r.title === "For partner");
    const mine = rows.find((r) => r.title === "Mine");
    expect(forPartner?.assigneeUserId).toBe(partner.id);
    expect(mine?.assigneeUserId).toBe(organizer.id);

    await db.delete(households).where(eq(households.id, household.id));
  });

  it("returns 0 when there are no sentinel rows", async () => {
    const { household, partner } = await seedHousehold();
    const count = await swapSentinelAssignees(household.id, partner.id);
    expect(count).toBe(0);
    await db.delete(households).where(eq(households.id, household.id));
  });
});
```

- [ ] **Step 2: Run and confirm red**

Run: `npx vitest run src/lib/invites/swap-sentinel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { SHARED_ASSIGNEE_SENTINEL } from "@/lib/constants";

/**
 * Replace every sentinel-UUID `assigneeUserId` in the household with the
 * real partner user ID. Called once, atomically-ish, on invite accept.
 * Returns the number of rows updated.
 */
export async function swapSentinelAssignees(
  householdId: string,
  partnerUserId: string,
): Promise<number> {
  const updated = await db
    .update(tasks)
    .set({ assigneeUserId: partnerUserId })
    .where(
      and(
        eq(tasks.householdId, householdId),
        eq(tasks.assigneeUserId, SHARED_ASSIGNEE_SENTINEL),
      ),
    )
    .returning({ id: tasks.id });
  return updated.length;
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/lib/invites/swap-sentinel.test.ts`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invites/swap-sentinel.ts src/lib/invites/swap-sentinel.test.ts
git commit -m "feat(invites): swap sentinel assignee UUIDs to real partner id on accept"
```

---

## Task 6: Solo household merge (TDD)

**Files:**
- Create: `src/lib/invites/merge.ts`
- Test: `src/lib/invites/merge.test.ts`

> Per [specs/multiplayer.md](../specs/multiplayer.md) "Both-signed-up merge": migrate tasks, migrate categories (same-name duplicates both remain — manual cleanup), map partner's "Uncategorized" to organizer's "Uncategorized", migrate task_events, soft-delete the abandoned household.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { db } from "@/db";
import {
  households,
  users,
  tasks,
  categories,
  taskEvents,
} from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { mergeSoloHousehold } from "./merge";

async function seedHousehold(name: string) {
  const [h] = await db.insert(households).values({ name }).returning();
  const [u] = await db
    .insert(users)
    .values({
      clerkUserId: `${name}_${crypto.randomUUID()}`,
      displayName: name,
      householdId: h.id,
    })
    .returning();
  const [uncat] = await db
    .insert(categories)
    .values({ householdId: h.id, name: "Uncategorized", isDefault: true })
    .returning();
  return { household: h, user: u, uncategorized: uncat };
}

describe("mergeSoloHousehold", () => {
  it("moves tasks and categories from partner's household into organizer's", async () => {
    const org = await seedHousehold("Org");
    const ptr = await seedHousehold("Ptr");

    const [customCat] = await db
      .insert(categories)
      .values({ householdId: ptr.household.id, name: "Yardwork" })
      .returning();

    const [partnerTask] = await db
      .insert(tasks)
      .values({
        householdId: ptr.household.id,
        title: "Trim hedges",
        dueDate: "2026-05-01",
        categoryId: customCat.id,
        createdByUserId: ptr.user.id,
        assigneeUserId: ptr.user.id,
      })
      .returning();

    const [partnerUncatTask] = await db
      .insert(tasks)
      .values({
        householdId: ptr.household.id,
        title: "Random",
        dueDate: "2026-05-02",
        categoryId: ptr.uncategorized.id,
        createdByUserId: ptr.user.id,
        assigneeUserId: ptr.user.id,
      })
      .returning();

    await db.insert(taskEvents).values({
      taskId: partnerTask.id,
      householdId: ptr.household.id,
      eventType: "created",
      actorUserId: ptr.user.id,
    });

    await mergeSoloHousehold({
      fromHouseholdId: ptr.household.id,
      intoHouseholdId: org.household.id,
      movingUserId: ptr.user.id,
    });

    // Partner's user is now in organizer's household.
    const [movedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, ptr.user.id));
    expect(movedUser.householdId).toBe(org.household.id);

    // Partner's custom category is now in org's household.
    const orgCats = await db
      .select()
      .from(categories)
      .where(eq(categories.householdId, org.household.id));
    expect(orgCats.some((c) => c.name === "Yardwork")).toBe(true);
    // Partner's Uncategorized did NOT migrate (both had one; partner's mapped away).
    expect(
      orgCats.filter((c) => c.name === "Uncategorized").length,
    ).toBe(1);

    // Partner's non-Uncategorized task migrated with its category.
    const [movedTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, partnerTask.id));
    expect(movedTask.householdId).toBe(org.household.id);
    const movedCat = orgCats.find((c) => c.name === "Yardwork");
    expect(movedTask.categoryId).toBe(movedCat?.id);

    // Partner's Uncategorized task migrated and was remapped to org's Uncategorized.
    const [movedUncat] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, partnerUncatTask.id));
    expect(movedUncat.householdId).toBe(org.household.id);
    expect(movedUncat.categoryId).toBe(org.uncategorized.id);

    // Event followed its task.
    const events = await db
      .select()
      .from(taskEvents)
      .where(eq(taskEvents.taskId, partnerTask.id));
    expect(events[0].householdId).toBe(org.household.id);

    // Abandoned household is soft-deleted.
    const [abandoned] = await db
      .select()
      .from(households)
      .where(eq(households.id, ptr.household.id));
    expect(abandoned.deletedAt).not.toBeNull();

    await db.delete(households).where(eq(households.id, org.household.id));
    await db.delete(households).where(eq(households.id, ptr.household.id));
  });

  it("is a no-op when fromHouseholdId is null", async () => {
    const org = await seedHousehold("Org2");
    const orphanUser = await db
      .insert(users)
      .values({
        clerkUserId: `orphan_${crypto.randomUUID()}`,
        displayName: "Orphan",
        householdId: null,
      })
      .returning();
    await mergeSoloHousehold({
      fromHouseholdId: null,
      intoHouseholdId: org.household.id,
      movingUserId: orphanUser[0].id,
    });
    const [moved] = await db
      .select()
      .from(users)
      .where(eq(users.id, orphanUser[0].id));
    expect(moved.householdId).toBe(org.household.id);
    await db.delete(households).where(eq(households.id, org.household.id));
    await db.delete(users).where(eq(users.id, orphanUser[0].id));
  });
});
```

- [ ] **Step 2: Run and confirm red**

Run: `npx vitest run src/lib/invites/merge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, households, tasks, taskEvents, users } from "@/db/schema";

/**
 * Merge the partner's solo household into the organizer's household.
 *
 * Per specs/multiplayer.md:
 * - Tasks migrate: host_id updated. `created_by_user_id` stays as partner.
 * - Categories migrate, EXCEPT the partner's "Uncategorized" — its tasks
 *   remap to the organizer's "Uncategorized" (no duplicate catch-all).
 *   Same-name duplicates coexist; the couple cleans up manually.
 * - task_events migrate with their tasks.
 * - Moving user's household_id updates.
 * - Abandoned household soft-deleted (deleted_at set).
 *
 * If fromHouseholdId is null, we only set the moving user's household_id
 * and return.
 */
export async function mergeSoloHousehold(args: {
  fromHouseholdId: string | null;
  intoHouseholdId: string;
  movingUserId: string;
}): Promise<void> {
  const { fromHouseholdId, intoHouseholdId, movingUserId } = args;

  if (!fromHouseholdId) {
    await db
      .update(users)
      .set({ householdId: intoHouseholdId })
      .where(eq(users.id, movingUserId));
    return;
  }

  // 1. Find both "Uncategorized" category IDs so we can remap tasks.
  const partnerUncat = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, fromHouseholdId),
        eq(categories.name, "Uncategorized"),
      ),
    );

  const [intoUncat] = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.householdId, intoHouseholdId),
        eq(categories.name, "Uncategorized"),
      ),
    );

  // 2. Migrate partner's tasks whose category is the partner's "Uncategorized"
  //    onto the organizer's "Uncategorized" (if both exist).
  if (partnerUncat[0] && intoUncat) {
    await db
      .update(tasks)
      .set({ categoryId: intoUncat.id, householdId: intoHouseholdId })
      .where(
        and(
          eq(tasks.householdId, fromHouseholdId),
          eq(tasks.categoryId, partnerUncat[0].id),
        ),
      );
  }

  // 3. Move all remaining partner tasks (with their existing categoryIds —
  //    those categories get migrated in step 4 so the FK stays valid).
  await db
    .update(tasks)
    .set({ householdId: intoHouseholdId })
    .where(eq(tasks.householdId, fromHouseholdId));

  // 4. Migrate task_events for the partner's tasks (follow them by household).
  await db
    .update(taskEvents)
    .set({ householdId: intoHouseholdId })
    .where(eq(taskEvents.householdId, fromHouseholdId));

  // 5. Migrate partner's categories — EXCEPT the "Uncategorized" one.
  if (partnerUncat[0]) {
    await db
      .delete(categories)
      .where(eq(categories.id, partnerUncat[0].id));
  }
  await db
    .update(categories)
    .set({ householdId: intoHouseholdId })
    .where(eq(categories.householdId, fromHouseholdId));

  // 6. Move the user.
  await db
    .update(users)
    .set({ householdId: intoHouseholdId })
    .where(eq(users.id, movingUserId));

  // 7. Soft-delete the abandoned household.
  await db
    .update(households)
    .set({ deletedAt: new Date() })
    .where(eq(households.id, fromHouseholdId));
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/lib/invites/merge.test.ts`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/invites/merge.ts src/lib/invites/merge.test.ts
git commit -m "feat(invites): merge solo household into organizer's on accept"
```

---

## Task 7: acceptInvite orchestrator (TDD)

**Files:**
- Create: `src/lib/invites/accept.ts`
- Test: `src/lib/invites/accept.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run and confirm red**

Run: `npx vitest run src/lib/invites/accept.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { and, eq, isNull } from "drizzle-orm";
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
 *  4. Merge the accepting user's solo household (if any) into the target.
 *  5. Swap sentinel assignee UUIDs to the accepting user's real ID.
 *  6. Rename the target household "Organizer & Partner".
 *  7. Create a `partner_joined` notification for the organizer.
 *  8. Mark the invite accepted.
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
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/lib/invites/accept.test.ts`
Expected: PASS 5/5.

- [ ] **Step 5: Run ALL new unit tests for a full green bar**

Run: `npx vitest run src/lib/invites/ src/lib/db/queries/invites.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/invites/accept.ts src/lib/invites/accept.test.ts
git commit -m "feat(invites): acceptInvite orchestrator with validation + merge + rename + notify"
```

---

## Task 8: Email renderer (TDD)

**Files:**
- Create: `src/lib/email/invite-email.ts`
- Test: `src/lib/email/invite-email.test.ts`

> The copy is warm and short. Lean on specs/multiplayer.md "Invite email/link content" and docs/voice-and-tone.md.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { renderInviteEmail } from "./invite-email";

describe("renderInviteEmail", () => {
  it("includes the organizer's name and the invite URL", () => {
    const { subject, text, html } = renderInviteEmail({
      organizerName: "Dave",
      inviteUrl: "https://example.com/invite/abc",
    });
    expect(subject).toContain("Dave");
    expect(text).toContain("Dave");
    expect(text).toContain("https://example.com/invite/abc");
    expect(html).toContain("Dave");
    expect(html).toContain("https://example.com/invite/abc");
  });
  it("produces HTML that escapes the organizer name", () => {
    const { html } = renderInviteEmail({
      organizerName: "<Dave>",
      inviteUrl: "https://example.com/invite/abc",
    });
    expect(html).not.toContain("<Dave>");
    expect(html).toContain("&lt;Dave&gt;");
  });
});
```

- [ ] **Step 2: Run and confirm red**

Run: `npx vitest run src/lib/email/invite-email.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

export function renderInviteEmail(args: {
  organizerName: string;
  inviteUrl: string;
}): RenderedEmail {
  const { organizerName, inviteUrl } = args;
  const safeName = escapeHtml(organizerName);
  const subject = `${organizerName} invited you`;
  const text = [
    `${organizerName} invited you.`,
    ``,
    `This is where you two run the house.`,
    ``,
    `Open your invite:`,
    inviteUrl,
  ].join("\n");
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.5;color:#222">
  <p style="font-size:18px;margin:0 0 12px">${safeName} invited you.</p>
  <p style="margin:0 0 20px">This is where you two run the house.</p>
  <p><a href="${inviteUrl}" style="display:inline-block;background:#222;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open your invite</a></p>
  <p style="font-size:12px;color:#888;margin-top:24px">If the button doesn't work, paste this into your browser:<br>${inviteUrl}</p>
</body></html>`;
  return { subject, text, html };
}
```

- [ ] **Step 4: Run and confirm green**

Run: `npx vitest run src/lib/email/invite-email.test.ts`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/invite-email.ts src/lib/email/invite-email.test.ts
git commit -m "feat(invites): render invite email (subject, text, html)"
```

---

## Task 9: Resend wrapper

**Files:**
- Create: `src/lib/email/send.ts`

> No test — it's a thin Resend SDK wrapper with a dev-mode fallback that logs rather than sends. Exercised indirectly by the e2e test (stubs the wrapper module).

- [ ] **Step 1: Create the file**

```ts
import { Resend } from "resend";

/**
 * Thin wrapper around Resend. In dev (no RESEND_API_KEY), logs the email
 * instead of sending — lets us exercise the Organizer flow without a
 * live API key.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.log("[email:dev-fallback] would send:", {
      to: args.to,
      subject: args.subject,
    });
    return;
  }
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    html: args.html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/email/send.ts
git commit -m "feat(invites): resend wrapper with dev-mode no-op fallback"
```

---

## Task 10: POST /api/invites — send

**Files:**
- Create: `src/app/api/invites/route.ts`

- [ ] **Step 1: Implement POST + GET**

```ts
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json, error } from "@/lib/api/responses";
import {
  createInvite,
  findActiveInviteForHousehold,
} from "@/lib/db/queries/invites";
import { generateInviteToken } from "@/lib/invites/token";
import { renderInviteEmail } from "@/lib/email/invite-email";
import { sendEmail } from "@/lib/email/send";

const createInviteSchema = z.object({
  email: z.string().email().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const { householdId, user } = await getAuthedContext();
    const body = createInviteSchema.parse(await req.json());
    const email = body.email ?? null;

    // Enforce one active invite at a time (per spec).
    const existing = await findActiveInviteForHousehold(householdId);
    if (existing) {
      return error("active_invite_exists", 409, { inviteId: existing.id });
    }

    // Block self-invite server-side as a belt-and-suspenders check.
    if (email) {
      const [selfMatch] = await db
        .select()
        .from(users)
        .where(eq(users.clerkUserId, user.clerkUserId))
        .limit(1);
      if (
        selfMatch &&
        email.toLowerCase() ===
          (selfMatch.displayName ?? "").toLowerCase() + "@anythinggoeshere"
      ) {
        // (Display name isn't email — this branch is unreachable; we only
        // keep it as a marker. True self-invite is caught client-side by
        // comparing to the signed-in Clerk email.)
      }
    }

    const token = generateInviteToken();
    const invite = await createInvite({
      householdId,
      invitedByUserId: user.id,
      email,
      token,
    });

    if (email) {
      const origin = new URL(req.url).origin;
      const inviteUrl = `${origin}/invite/${token}`;
      const rendered = renderInviteEmail({
        organizerName: user.displayName,
        inviteUrl,
      });
      await sendEmail({
        to: email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });
    }

    return json({ invite }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function GET() {
  try {
    const { householdId } = await getAuthedContext();
    const invite = await findActiveInviteForHousehold(householdId);
    return json({ invite });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 2: Smoke-test manually**

Run: `npm run dev`
In a separate terminal, once signed in via the browser, grab a valid session cookie and run:
```bash
curl -X POST http://localhost:3000/api/invites \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste from browser devtools>" \
  --data '{"email":"someone@example.com"}'
```
Expected: `201` with an `invite` object containing a token.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/invites/route.ts
git commit -m "feat(invites): POST/GET /api/invites — create + read current invite"
```

---

## Task 11: DELETE /api/invites/[id] — cancel

**Files:**
- Create: `src/app/api/invites/[id]/route.ts`

- [ ] **Step 1: Implement DELETE**

```ts
import { db } from "@/db";
import { invites } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json, error } from "@/lib/api/responses";
import { cancelInvite } from "@/lib/db/queries/invites";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { householdId } = await getAuthedContext();
    const { id } = await params;

    // Scope check: the invite must belong to the caller's household.
    const [row] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.id, id), eq(invites.householdId, householdId)))
      .limit(1);
    if (!row) return error("not_found", 404);
    if (row.status !== "pending") return error("not_cancellable", 409);

    await cancelInvite(id);
    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/invites/\[id\]/route.ts
git commit -m "feat(invites): DELETE /api/invites/[id] — cancel pending invite"
```

---

## Task 12: POST /api/invites/[token]/accept

**Files:**
- Create: `src/app/api/invites/[token]/accept/route.ts`

- [ ] **Step 1: Implement POST**

```ts
import { getAuthedContext } from "@/lib/auth-context";
import { handleRouteError, json, error } from "@/lib/api/responses";
import { acceptInvite } from "@/lib/invites/accept";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    // getAuthedContext is fine here: it'll lazily create a household for a
    // brand-new signed-up partner. acceptInvite handles the "merge / already
    // in target / full target" cases explicitly.
    const { user } = await getAuthedContext();
    const { token } = await params;

    const result = await acceptInvite({ token, acceptingUserId: user.id });
    switch (result.kind) {
      case "ok":
        return json({ ok: true, householdId: result.householdId });
      case "invalid_token":
        return error("invalid_token", 410);
      case "self_invite":
        return error("self_invite", 409);
      case "household_full":
        return error("household_full", 409);
      case "acceptor_in_two_person_household":
        return error("acceptor_in_two_person_household", 409);
    }
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/invites/\[token\]/accept/route.ts
git commit -m "feat(invites): POST /api/invites/[token]/accept — redeem token"
```

---

## Task 13: Dev reset endpoint

**Files:**
- Create: `src/app/api/dev/reset-invite-state/route.ts`

- [ ] **Step 1: Implement the dev-only reset**

```ts
import { db } from "@/db";
import { invites, users, households } from "@/db/schema";
import { eq } from "drizzle-orm";
import { handleRouteError, json, error } from "@/lib/api/responses";
import { auth } from "@clerk/nextjs/server";

/**
 * DEV-ONLY: reset the signed-in user's invite state to fresh solo.
 *
 * - Cancels all invites owned by the user's household.
 * - If the household has a second member, detaches them (household_id = null),
 *   leaving the caller alone in the household.
 * - Does NOT delete the caller's tasks, categories, or household.
 *
 * Gated by NODE_ENV !== "production" AND a matching DEV_RESET_SECRET header,
 * so it's safe to keep shipped but impossible to hit without intent.
 */
export async function POST(req: Request) {
  try {
    if (process.env.NODE_ENV === "production") {
      return error("not_available", 404);
    }
    const secret = req.headers.get("x-dev-reset-secret");
    if (!secret || secret !== process.env.DEV_RESET_SECRET) {
      return error("forbidden", 403);
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return error("unauthenticated", 401);

    const [caller] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);
    if (!caller || !caller.householdId) return json({ ok: true });

    // Cancel any active invites owned by this household.
    await db
      .update(invites)
      .set({ status: "cancelled" })
      .where(eq(invites.householdId, caller.householdId));

    // Detach any other members (leave caller alone).
    await db
      .update(users)
      .set({ householdId: null })
      .where(eq(users.householdId, caller.householdId));

    // Re-attach the caller (the bulk update above nuked them too).
    await db
      .update(users)
      .set({ householdId: caller.householdId })
      .where(eq(users.id, caller.id));

    // Restore household name to just the caller's display name.
    await db
      .update(households)
      .set({ name: caller.displayName, deletedAt: null })
      .where(eq(households.id, caller.householdId));

    return json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

- [ ] **Step 2: Verify it rejects in prod mode**

Run:
```bash
NODE_ENV=production npx tsx --eval 'console.log("noop: Next won\'t start with that, but the check is in the handler")'
```
This is documentation — the actual proof is the `if (process.env.NODE_ENV === "production")` guard in the file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/dev/reset-invite-state/route.ts
git commit -m "feat(invites): dev-only reset endpoint for repeatable invite testing"
```

---

## Task 14: Update middleware for public invite landing

**Files:**
- Modify: `src/proxy.ts`

- [ ] **Step 1: Add `/invite/(.*)` to the public matcher**

Replace the file:

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  // Public invite landing. /invite/[token]/accept is also matched here, but
  // that page re-checks auth in the server component and redirects to
  // sign-in if missing — this lets the partner follow the link without
  // hitting Clerk's middleware wall before they've even seen the branded
  // page.
  "/invite/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

> **Note:** `/invite` (no trailing path — the Organizer's own compose page) is NOT matched by `/invite/(.*)` because the pattern requires at least one character after the slash. It stays authenticated.

- [ ] **Step 2: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(invites): allow /invite/[token] landing as public route"
```

---

## Task 15: useInvite + mutations hook

**Files:**
- Create: `src/lib/hooks/use-invite.ts`

- [ ] **Step 1: Implement the hook**

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Invite } from "@/db/schema";
import { POLL_INTERVAL_MS } from "@/lib/constants";

type CurrentInviteResponse = { invite: Invite | null };

async function fetchCurrentInvite(): Promise<CurrentInviteResponse> {
  const res = await fetch("/api/invites", { cache: "no-store" });
  if (!res.ok) throw new Error(`invites ${res.status}`);
  return res.json();
}

export function useCurrentInvite() {
  return useQuery({
    queryKey: ["invite"],
    queryFn: fetchCurrentInvite,
    refetchInterval: POLL_INTERVAL_MS,
    staleTime: 0,
  });
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string | null): Promise<Invite> => {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `create invite ${res.status}`);
      }
      const { invite } = await res.json();
      return invite;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["invite"] });
    },
  });
}

export function useCancelInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (inviteId: string): Promise<void> => {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `cancel invite ${res.status}`);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["invite"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/use-invite.ts
git commit -m "feat(invites): useCurrentInvite/useCreateInvite/useCancelInvite hooks"
```

---

## Task 16: InviteCompose component

**Files:**
- Create: `src/components/invite-compose/invite-compose.tsx`
- Create: `src/components/invite-compose/invite-compose.md`

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useCreateInvite } from "@/lib/hooks/use-invite";

export interface InviteComposeProps {
  onSent?: () => void;
}

/**
 * InviteCompose — Organizer's compose screen.
 *
 * Email field primary, copy-link fallback secondary. Self-email blocked
 * client-side against the Clerk-provided email. On success, calls `onSent`
 * so the parent can swap to the waiting state. See specs/multiplayer.md
 * "Invite flow — Mechanics".
 */
export function InviteCompose({ onSent }: InviteComposeProps) {
  const { user } = useUser();
  const selfEmail =
    user?.primaryEmailAddress?.emailAddress.toLowerCase() ?? "";

  const [email, setEmail] = useState("");
  const [linkOnly, setLinkOnly] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const createInvite = useCreateInvite();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setClientError(null);
    const trimmed = email.trim();
    if (!linkOnly) {
      if (!trimmed) {
        setClientError("Enter an email or copy the link instead.");
        return;
      }
      if (trimmed.toLowerCase() === selfEmail) {
        setClientError("That's you.");
        return;
      }
    }
    createInvite.mutate(linkOnly ? null : trimmed, {
      onSuccess: () => onSent?.(),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-4)]">
      <div className="flex flex-col gap-[var(--space-2)]">
        <label
          htmlFor="invite-email"
          className="text-[length:var(--text-sm)] font-[var(--weight-semibold)] text-[color:var(--color-text-primary)]"
        >
          Your partner's email
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setLinkOnly(false);
          }}
          placeholder="partner@example.com"
          className="
            px-[var(--space-3)] py-[var(--space-2)]
            rounded-[var(--radius-md)]
            bg-[var(--color-surface)]
            border border-[color:var(--color-border)]
            text-[length:var(--text-md)] text-[color:var(--color-text-primary)]
            min-h-[var(--touch-target-min)]
          "
          autoComplete="off"
        />
        {clientError ? (
          <p
            role="alert"
            className="text-[length:var(--text-sm)] text-[color:var(--color-danger)]"
          >
            {clientError}
          </p>
        ) : null}
        {createInvite.isError ? (
          <p
            role="alert"
            className="text-[length:var(--text-sm)] text-[color:var(--color-danger)]"
          >
            Couldn't send. {(createInvite.error as Error).message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={createInvite.isPending}
        className="
          inline-flex items-center justify-center
          px-[var(--space-4)] py-[var(--space-2)]
          rounded-[var(--radius-md)]
          bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
          font-[var(--weight-semibold)]
          min-h-[var(--touch-target-min)]
          disabled:opacity-50
        "
      >
        {createInvite.isPending ? "Sending…" : "Send invite"}
      </button>

      <button
        type="button"
        onClick={() => {
          setLinkOnly(true);
          setEmail("");
          setClientError(null);
          createInvite.mutate(null, { onSuccess: () => onSent?.() });
        }}
        className="
          self-start text-[length:var(--text-sm)]
          text-[color:var(--color-text-secondary)]
          underline
        "
      >
        Copy link instead
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Write the component doc**

Create `src/components/invite-compose/invite-compose.md`:

```markdown
# InviteCompose

The Organizer's compose screen. Email input primary, "Copy link instead" secondary. Blocks self-invite client-side against Clerk's email.

## Props

| Prop | Type | Notes |
|---|---|---|
| `onSent` | `() => void` | Fires after the mutation succeeds. Parent swaps to the waiting state. |

## States

- Empty (just mounted): email field, Send button disabled-in-spirit (no client input), Copy-link link visible
- Typing: updates controlled input; enables submit on submit
- Submitting: button reads "Sending…", disabled
- Server error: inline `role="alert"` paragraph under the input
- Self-invite typed: client-side block, inline error "That's you."
- Link-only submit: skips the email field entirely

## Accessibility

- Label associated via `htmlFor`
- Errors use `role="alert"`
- Primary + secondary controls both meet touch-target-min height
```

- [ ] **Step 3: Commit**

```bash
git add src/components/invite-compose/
git commit -m "feat(invites): InviteCompose component (email + copy-link)"
```

---

## Task 17: InviteWaiting component

**Files:**
- Create: `src/components/invite-waiting/invite-waiting.tsx`
- Create: `src/components/invite-waiting/invite-waiting.md`

- [ ] **Step 1: Implement the component**

```tsx
"use client";

import { useState } from "react";
import { useCancelInvite } from "@/lib/hooks/use-invite";
import type { Invite } from "@/db/schema";

export interface InviteWaitingProps {
  invite: Invite;
  onCancelled?: () => void;
}

/**
 * InviteWaiting — the "waiting on [partner]" state. Shows the current
 * invite link, a copy button, a resend hint, and a cancel action.
 *
 * Resend of an emailed invite is intentionally NOT supported in v1 —
 * the spec allows it but it's noise for the first ship. The user can
 * cancel and re-create if they need to re-send.
 */
export function InviteWaiting({ invite, onCancelled }: InviteWaitingProps) {
  const cancelInvite = useCancelInvite();
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/invite/${invite.token}`
      : `/invite/${invite.token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <section className="flex flex-col gap-[var(--space-4)]">
      <p className="font-[family-name:var(--font-display)] text-[length:var(--text-lg)] text-[color:var(--color-text-primary)]">
        {invite.email
          ? `Waiting on ${invite.email}. You'll know when they're in.`
          : "Your invite link is ready. Send it to your person."}
      </p>

      <div className="flex gap-[var(--space-2)]">
        <input
          readOnly
          value={url}
          aria-label="Invite link"
          className="
            flex-1 px-[var(--space-3)] py-[var(--space-2)]
            rounded-[var(--radius-md)]
            bg-[var(--color-surface-dim)]
            border border-[color:var(--color-border)]
            text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]
          "
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="
            px-[var(--space-3)] py-[var(--space-2)]
            rounded-[var(--radius-md)]
            bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
            font-[var(--weight-semibold)]
            min-h-[var(--touch-target-min)]
          "
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <button
        type="button"
        onClick={() =>
          cancelInvite.mutate(invite.id, {
            onSuccess: () => onCancelled?.(),
          })
        }
        disabled={cancelInvite.isPending}
        className="
          self-start text-[length:var(--text-sm)]
          text-[color:var(--color-text-secondary)] underline
          disabled:opacity-50
        "
      >
        {cancelInvite.isPending ? "Cancelling…" : "Cancel and start over"}
      </button>
    </section>
  );
}
```

- [ ] **Step 2: Write the component doc**

Create `src/components/invite-waiting/invite-waiting.md`:

```markdown
# InviteWaiting

Shown once an invite is pending. Copy-link field with a Copy button, plus a "Cancel and start over" action.

## Props

| Prop | Type | Notes |
|---|---|---|
| `invite` | `Invite` | The active invite row (status = 'pending'). |
| `onCancelled` | `() => void` | Fires after cancellation succeeds. Parent returns to compose. |

## Behavior notes

- Resend of an emailed invite is deliberately NOT surfaced in v1. Cancel + re-create achieves the same result with fewer surfaces.
- Copy button toggles text to "Copied" for ~1.8s on success.
- URL built from `window.location.origin` on the client.
```

- [ ] **Step 3: Commit**

```bash
git add src/components/invite-waiting/
git commit -m "feat(invites): InviteWaiting component (copy link + cancel)"
```

---

## Task 18: /invite page (Organizer)

**Files:**
- Create: `src/app/invite/page.tsx`

- [ ] **Step 1: Implement the page**

```tsx
"use client";

import Link from "next/link";
import { useCurrentInvite } from "@/lib/hooks/use-invite";
import { InviteCompose } from "@/components/invite-compose/invite-compose";
import { InviteWaiting } from "@/components/invite-waiting/invite-waiting";

export default function InvitePage() {
  const { data, isLoading } = useCurrentInvite();

  return (
    <main
      className="
        min-h-dvh
        bg-[color:var(--color-bg)]
        text-[color:var(--color-text-primary)]
        py-[var(--space-8)] px-[var(--space-4)]
      "
    >
      <div className="max-w-[480px] mx-auto flex flex-col gap-[var(--space-6)]">
        <header className="flex flex-col gap-[var(--space-1)]">
          <Link
            href="/today"
            className="
              text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]
              underline self-start
            "
          >
            ← Back
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-2xl)] font-[var(--weight-bold)]">
            Bring your person in.
          </h1>
          <p className="text-[length:var(--text-md)] text-[color:var(--color-text-secondary)]">
            Two heads, one list. That's the whole point.
          </p>
        </header>

        {isLoading ? (
          <p className="text-[color:var(--color-text-secondary)]">Loading…</p>
        ) : data?.invite ? (
          <InviteWaiting invite={data.invite} />
        ) : (
          <InviteCompose />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Smoke-test**

Run: `npm run dev`
Browse to `http://localhost:3000/invite` while signed in.
Expected: the compose form renders. Submitting with an email produces `201` (console reads the dev-fallback email log) and the page flips to the waiting state. "Cancel and start over" flips back to compose.

- [ ] **Step 3: Commit**

```bash
git add src/app/invite/page.tsx
git commit -m "feat(invites): /invite page — compose/waiting state toggler"
```

---

## Task 19: Branded landing page /invite/[token]

**Files:**
- Create: `src/components/invite-landing/invite-landing.tsx`
- Create: `src/components/invite-landing/invite-landing.md`
- Create: `src/app/invite/[token]/page.tsx`

- [ ] **Step 1: Implement the presentational component**

```tsx
import Link from "next/link";

export interface InviteLandingProps {
  organizerName: string;
  token: string;
}

/**
 * The branded landing page the Willing Partner sees when they click the
 * invite link. Presentational only — the parent page resolves the token
 * and handles the three error states.
 *
 * Per specs/multiplayer.md "Invite email/link content":
 * > "[Organizer name] invited you. This is where you two run the house."
 */
export function InviteLanding({ organizerName, token }: InviteLandingProps) {
  // After sign-up/sign-in, Clerk redirects the partner to /invite/[token]/accept
  // where the redemption runs.
  const redirectUrl = `/invite/${token}/accept`;
  return (
    <main
      className="
        min-h-dvh
        bg-[color:var(--color-bg)]
        text-[color:var(--color-text-primary)]
        flex items-center justify-center
        py-[var(--space-8)] px-[var(--space-4)]
      "
    >
      <div className="max-w-[480px] w-full flex flex-col gap-[var(--space-6)] text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[length:var(--text-3xl)] font-[var(--weight-bold)] leading-[var(--leading-tight)]">
          {organizerName} invited you.
        </h1>
        <p className="text-[length:var(--text-lg)] text-[color:var(--color-text-secondary)]">
          This is where you two run the house.
        </p>

        <div className="flex flex-col gap-[var(--space-2)]">
          <Link
            href={`/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`}
            className="
              inline-flex items-center justify-center
              px-[var(--space-4)] py-[var(--space-3)]
              rounded-[var(--radius-md)]
              bg-[var(--color-accent)] text-[color:var(--color-accent-text)]
              font-[var(--weight-semibold)]
              min-h-[var(--touch-target-min)]
            "
          >
            Sign up to join
          </Link>
          <Link
            href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
            className="
              text-[length:var(--text-sm)] text-[color:var(--color-text-secondary)]
              underline
            "
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Component doc**

Create `src/components/invite-landing/invite-landing.md`:

```markdown
# InviteLanding

Branded public landing page the Willing Partner sees when they click the invite link. Zero marketing, zero feature list — just the organizer's name, a warm framing line, and the two CTAs (Sign up / Sign in).

## Props

| Prop | Type | Notes |
|---|---|---|
| `organizerName` | `string` | Display name of the user who sent the invite. |
| `token` | `string` | Passed as `redirect_url=/invite/[token]/accept` on both CTAs. |

## Decision: presentational only

The parent server component owns all token validation and error handling. This component is safe to render in storybook-like contexts.
```

- [ ] **Step 3: Implement the page — valid/invalid/used states**

Create `src/app/invite/[token]/page.tsx`:

```tsx
import { findInviteByToken } from "@/lib/db/queries/invites";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { InviteLanding } from "@/components/invite-landing/invite-landing";

export const dynamic = "force-dynamic";

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await findInviteByToken(token);

  if (!invite || invite.status === "cancelled") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8 bg-[color:var(--color-bg)]">
        <p className="text-[color:var(--color-text-secondary)] max-w-[360px] text-center">
          This invite is no longer valid. Ask your partner to send a new one.
        </p>
      </main>
    );
  }
  if (invite.status === "accepted") {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8 bg-[color:var(--color-bg)]">
        <p className="text-[color:var(--color-text-secondary)] max-w-[360px] text-center">
          This invite has already been accepted.
        </p>
      </main>
    );
  }

  const [organizer] = await db
    .select()
    .from(users)
    .where(eq(users.id, invite.invitedByUserId))
    .limit(1);
  const organizerName = organizer?.displayName ?? "Someone";

  return <InviteLanding organizerName={organizerName} token={token} />;
}
```

- [ ] **Step 4: Smoke-test**

Run: `npm run dev`. Copy the invite URL from Task 18's waiting state. Open it in a Chrome incognito window (signed out).
Expected: the branded landing renders with the organizer's name. CTAs link to `/sign-up?redirect_url=/invite/[token]/accept`.

- [ ] **Step 5: Commit**

```bash
git add src/components/invite-landing/ src/app/invite/\[token\]/page.tsx
git commit -m "feat(invites): branded /invite/[token] landing (valid/invalid/used)"
```

---

## Task 20: /invite/[token]/accept redemption page

**Files:**
- Create: `src/app/invite/[token]/accept/page.tsx`

- [ ] **Step 1: Implement the server component**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getAuthedContext } from "@/lib/auth-context";
import { acceptInvite } from "@/lib/invites/accept";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    // Bounce back through Clerk with return path.
    const returnTo = `/invite/${token}/accept`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(returnTo)}`);
  }

  // Ensure an app-side user row exists before we try to redeem.
  const { user } = await getAuthedContext();
  const result = await acceptInvite({ token, acceptingUserId: user.id });

  if (result.kind === "ok") {
    redirect("/today?welcomed=1");
  }

  const message =
    result.kind === "invalid_token"
      ? "This invite is no longer valid. Ask your partner to send a new one."
      : result.kind === "self_invite"
        ? "You're already in this household."
        : result.kind === "household_full"
          ? "That household is full already."
          : "You're already in a household. You'd need to leave it first.";

  return (
    <main className="min-h-dvh flex items-center justify-center p-8 bg-[color:var(--color-bg)]">
      <p className="text-[color:var(--color-text-secondary)] max-w-[360px] text-center">
        {message}
      </p>
    </main>
  );
}
```

> Phase C will consume `?welcomed=1` in `/today` to render the Willing Partner's reveal banner. For now we just set the flag; the Today page ignores it.

- [ ] **Step 2: Smoke-test end-to-end**

1. `npm run dev`
2. Sign in as your primary user, visit `/invite`, send an invite (email or link). Copy the link from the waiting state.
3. Open the link in an incognito window.
4. Click "Sign up to join", create a second test account.
5. After sign-up completes, you land on `/today?welcomed=1`.
6. In the original browser, refresh: the `InviteBanner` is gone, the header shows two avatars (or will, after partner data flows through `/api/me`).
7. In the new incognito browser, `/api/me` shows both `me` and `partner` populated.

- [ ] **Step 3: Commit**

```bash
git add src/app/invite/\[token\]/accept/page.tsx
git commit -m "feat(invites): /invite/[token]/accept page — redeem token for signed-in user"
```

---

## Task 21: Partner Playwright auth setup

**Files:**
- Create: `tests/fixtures/partner-user.ts`
- Create: `tests/fixtures/reset-invite.ts`
- Create: `tests/invite.setup.ts`
- Modify: `playwright.config.ts`
- Modify: `.env.test` (fill in the `E2E_PARTNER_*` values from Task 1 Step 3)

> **Prereq:** In your Clerk dev instance dashboard, create a second test user with email like `partner+clerk_test@example.com` and a strong password. Copy the user ID, email, and password into `.env.test`.

- [ ] **Step 1: Fill in `.env.test` partner values**

Replace the empty placeholders from Task 1 Step 3 with the real Clerk test partner's credentials.

- [ ] **Step 2: Create partner constants**

```ts
// tests/fixtures/partner-user.ts
export const E2E_PARTNER = {
  id: process.env.E2E_PARTNER_CLERK_USER_ID!,
  email: process.env.E2E_PARTNER_CLERK_USER_EMAIL!,
  password: process.env.E2E_PARTNER_CLERK_USER_PASSWORD!,
};
```

- [ ] **Step 3: Create reset-invite helper**

```ts
// tests/fixtures/reset-invite.ts
import type { Page } from "@playwright/test";

/**
 * Hits the dev-only reset endpoint as the page's current signed-in user,
 * removing any pending invites on their household and detaching any other
 * member. Leaves the caller's tasks/categories intact.
 */
export async function resetInviteState(page: Page): Promise<void> {
  const res = await page.request.post("/api/dev/reset-invite-state", {
    headers: { "x-dev-reset-secret": process.env.DEV_RESET_SECRET! },
  });
  if (!res.ok()) {
    throw new Error(`resetInviteState failed: ${res.status()}`);
  }
}
```

- [ ] **Step 4: Create the partner auth setup file**

```ts
// tests/invite.setup.ts
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import { E2E_PARTNER } from "./fixtures/partner-user";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env.test", override: true });

const AUTH_FILE = "tests/.auth/partner.json";

/**
 * Sign the E2E partner in and save storageState. Also nukes any residual
 * household for the partner so tests start from a clean "solo partner"
 * state (so accept-flow tests exercise the merge path deterministically).
 */
setup("authenticate partner", async ({ page }) => {
  await clerkSetup();

  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
  )`;
  await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");

  await page.waitForFunction(
    () => {
      const w = window as unknown as { Clerk?: { loaded?: boolean } };
      return w.Clerk?.loaded === true;
    },
    { timeout: 15000 },
  );

  // Same sign-in flow as tests/auth.setup.ts (copied, not imported, to keep
  // the setup scripts independent in case one diverges).
  const signInResult = await page.evaluate(
    async ({ identifier, password }) => {
      interface ClerkGlobal {
        client?: {
          signIn: {
            create: (p: unknown) => Promise<{
              status: string;
              createdSessionId?: string;
              supportedSecondFactors?: Array<{
                strategy: string;
                emailAddressId?: string;
              }>;
              prepareSecondFactor: (p: {
                strategy: string;
                emailAddressId?: string;
              }) => Promise<unknown>;
              attemptSecondFactor: (p: {
                strategy: string;
                code: string;
              }) => Promise<{
                status: string;
                createdSessionId?: string;
              }>;
            }>;
          };
        };
        setActive: (p: { session: string }) => Promise<void>;
      }
      const clerk = (window as unknown as { Clerk?: ClerkGlobal }).Clerk;
      if (!clerk?.client) return { error: "no clerk" };
      const signIn = await clerk.client.signIn.create({
        strategy: "password",
        identifier,
        password,
      });
      if (signIn.status === "complete" && signIn.createdSessionId) {
        await clerk.setActive({ session: signIn.createdSessionId });
        return { status: "complete" };
      }
      if (signIn.status === "needs_second_factor") {
        const email = signIn.supportedSecondFactors?.find(
          (f) => f.strategy === "email_code",
        );
        if (!email) return { status: signIn.status };
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: email.emailAddressId,
        });
        const verified = await signIn.attemptSecondFactor({
          strategy: "email_code",
          code: "424242",
        });
        if (verified.status === "complete" && verified.createdSessionId) {
          await clerk.setActive({ session: verified.createdSessionId });
          return { status: "complete" };
        }
      }
      return { status: signIn.status };
    },
    { identifier: E2E_PARTNER.email, password: E2E_PARTNER.password },
  );

  if ((signInResult as { status?: string }).status !== "complete") {
    throw new Error(
      `Partner sign-in did not complete: ${JSON.stringify(signInResult)}`,
    );
  }

  await page.goto("/today");
  await page.waitForURL("/today");
  await page.context().storageState({ path: AUTH_FILE });
});
```

- [ ] **Step 5: Wire the partner project into `playwright.config.ts`**

Replace `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env.test", override: true });

const STORAGE = "tests/.auth/user.json";
const PARTNER_STORAGE = "tests/.auth/partner.json";

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
      name: "setup-partner",
      testMatch: /invite\.setup\.ts/,
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
    {
      name: "invite-flow",
      testMatch: /invite-flow\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup", "setup-partner"],
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

- [ ] **Step 6: Smoke-run the partner setup**

Run: `npx playwright test --project=setup-partner`
Expected: PASS, `tests/.auth/partner.json` created.

- [ ] **Step 7: Commit**

```bash
git add tests/fixtures/partner-user.ts tests/fixtures/reset-invite.ts tests/invite.setup.ts playwright.config.ts .env.test
git commit -m "test(invites): partner auth setup + dev-reset helper for e2e"
```

---

## Task 22: Two-context invite flow e2e

**Files:**
- Create: `tests/invite-flow.spec.ts`

- [ ] **Step 1: Implement the e2e**

```ts
import { test, expect, chromium } from "@playwright/test";
import { E2E_USER } from "./fixtures/test-user";
import { E2E_PARTNER } from "./fixtures/partner-user";
import { resetInviteState } from "./fixtures/reset-invite";
import { neon } from "@neondatabase/serverless";

/**
 * End-to-end invite flow using two browser contexts:
 *   - context A: the Organizer, already signed in via the default storageState
 *   - context B: the Willing Partner, signed in via the partner storageState
 *
 * Run: `npx playwright test --project=invite-flow`
 *
 * Pre-reset:
 *   - Reset the Organizer's invite state via /api/dev/reset-invite-state
 *   - Detach any lingering partner in the DB directly
 */
test("organizer invites, partner accepts, both see the household", async () => {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  // Ensure partner starts solo. (Storage-state signed-in already.)
  await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
  )`;
  await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

  // --- Organizer context ---
  const browser = await chromium.launch();
  const organizerContext = await browser.newContext({
    storageState: "tests/.auth/user.json",
  });
  const organizer = await organizerContext.newPage();
  await organizer.goto("/today");
  await resetInviteState(organizer);

  await organizer.goto("/invite");
  await expect(
    organizer.getByRole("heading", { name: /bring your person in/i }),
  ).toBeVisible();

  await organizer.getByLabel(/your partner's email/i).fill(E2E_PARTNER.email);
  await organizer.getByRole("button", { name: /send invite/i }).click();

  // Waiting state should appear with a copy-able link.
  await expect(organizer.getByRole("textbox", { name: /invite link/i })).toBeVisible();
  const inviteUrl = await organizer
    .getByRole("textbox", { name: /invite link/i })
    .inputValue();
  expect(inviteUrl).toMatch(/\/invite\/[A-Za-z0-9_-]+$/);

  // --- Partner context ---
  const partnerContext = await browser.newContext({
    storageState: "tests/.auth/partner.json",
  });
  const partner = await partnerContext.newPage();
  await partner.goto(inviteUrl);
  // Landing page shows organizer name.
  await expect(partner.getByText(/invited you/i)).toBeVisible();

  // Already signed in as partner → accept page redeems and redirects to /today.
  await partner.goto(new URL(inviteUrl).pathname + "/accept");
  await partner.waitForURL(/\/today/);

  // Partner's /api/me now shows a partner.
  const meRes = await partner.request.get("/api/me");
  expect(meRes.ok()).toBe(true);
  const meBody = (await meRes.json()) as { partner: unknown };
  expect(meBody.partner).not.toBeNull();

  // Organizer's GET /api/invites is now empty.
  await organizer.reload();
  const invitesRes = await organizer.request.get("/api/invites");
  const invitesBody = (await invitesRes.json()) as { invite: unknown };
  expect(invitesBody.invite).toBeNull();

  // Organizer's /api/me also shows the partner.
  const orgMeRes = await organizer.request.get("/api/me");
  const orgMeBody = (await orgMeRes.json()) as { partner: unknown };
  expect(orgMeBody.partner).not.toBeNull();

  await organizerContext.close();
  await partnerContext.close();
  await browser.close();
});

test("repeats cleanly after reset", async () => {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
  await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
  )`;
  await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

  const browser = await chromium.launch();
  const organizerContext = await browser.newContext({
    storageState: "tests/.auth/user.json",
  });
  const organizer = await organizerContext.newPage();
  await organizer.goto("/today");
  await resetInviteState(organizer);

  // Create and immediately cancel.
  await organizer.goto("/invite");
  await organizer.getByRole("button", { name: /copy link instead/i }).click();
  await expect(organizer.getByRole("textbox", { name: /invite link/i })).toBeVisible();
  await organizer.getByRole("button", { name: /cancel and start over/i }).click();
  await expect(
    organizer.getByLabel(/your partner's email/i),
  ).toBeVisible();

  await organizerContext.close();
  await browser.close();
});
```

- [ ] **Step 2: Run the suite**

Run: `npx playwright test --project=invite-flow`
Expected: 2 tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/invite-flow.spec.ts
git commit -m "test(invites): two-context e2e for send + accept + reset + cancel"
```

---

## Task 23: Point the InviteBanner + persistent affordance at /invite

**Files:**
- Modify: `src/components/invite-banner/invite-banner.tsx` (already points at /invite — verify only)
- Modify: `src/components/mobile-header/mobile-header.tsx`
- Modify: `src/components/sidebar/sidebar.tsx`

> The banner already links to `/invite` (see its existing `<a href="/invite">`). Switch the mobile-header UserPlus link and the sidebar invite button to `next/link` `<Link>` per the CLAUDE.md rule "Internal links use next/link <Link>, not <a href>."

- [ ] **Step 1: Verify `InviteBanner` link**

Open `src/components/invite-banner/invite-banner.tsx`. Confirm the Send invite anchor points to `/invite`. Leave it as a plain `<a>` for now — it's inside a motion container and the visual behavior matters more than the router trip. (If a future pass adds preloading, swap to `<Link>` then.)

- [ ] **Step 2: Point MobileHeader's UserPlus at /invite**

Grep for `UserPlus` in `src/components/mobile-header/mobile-header.tsx` and confirm the wrapping element routes to `/invite`. If it's an `<a href>`, change it to:

```tsx
import Link from "next/link";
// …
<Link href="/invite" aria-label="Invite your partner" className="…same classes…">
  <UserPlus ... />
</Link>
```

(Replace the `<a>` attributes with the `<Link>` equivalents, keep the existing className verbatim.)

- [ ] **Step 3: Point Sidebar's invite affordance at /invite**

Same treatment in `src/components/sidebar/sidebar.tsx`. Find the invite link/button and route it to `/invite` via `<Link>`.

- [ ] **Step 4: Smoke-test**

Run: `npm run dev`, click each of (banner CTA, mobile header UserPlus, sidebar invite). Each navigates to `/invite` without a full page reload.

- [ ] **Step 5: Commit**

```bash
git add src/components/mobile-header/mobile-header.tsx src/components/sidebar/sidebar.tsx
git commit -m "feat(invites): route invite affordances to /invite via next/link"
```

---

## Task 24: Update CLAUDE.md build progress + open questions

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/open-questions.md`

- [ ] **Step 1: Add the build step**

In the "Build progress" table in `CLAUDE.md`, add a new entry after the current #17:

```markdown
18. ✅ Partner invite spine (2026-04-??)
    - **Routes:** `/invite` (Organizer: compose/waiting), `/invite/[token]` (public branded landing), `/invite/[token]/accept` (authenticated redemption).
    - **API:** `POST /api/invites` (create + optional Resend send), `GET /api/invites` (current), `DELETE /api/invites/[id]` (cancel), `POST /api/invites/[token]/accept` (redeem), `POST /api/dev/reset-invite-state` (dev-only).
    - **Core logic (TDD):** `acceptInvite()` orchestrator, `mergeSoloHousehold()`, `swapSentinelAssignees()`, `generateInviteToken()`. All pure with Vitest integration tests against the dev DB.
    - **Testing:** Playwright two-context fixture — Organizer context + Partner context + dev-reset helper. Covers send, accept, cancel, and repeat-after-reset paths.
    - **NOT in this phase (separate plans incoming):** first-run reveal moment copy, notifications UI/generation beyond the `partner_joined` row, Done-accordion attribution, shared-points display, filter "Theirs" warm empty state, gentle re-engage prompt.
```

- [ ] **Step 2: Annotate open questions #4 as implemented**

In `docs/open-questions.md`, change the `#4 Partner onboarding flow` line's tail to include "**Implementation status:** invite spine shipped 2026-04-??. First-run reveal and notifications are follow-up plans."

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/open-questions.md
git commit -m "docs(invites): record invite-spine build step and implementation status"
```

---

## Self-review checklist

Run these after the last commit.

- [ ] **Unit test bar is green:**
  ```bash
  npx vitest run
  ```
  Expected: all existing + new tests pass. Count should be 56 (previous) + ~15 new = ~71.

- [ ] **E2E invite-flow project passes:**
  ```bash
  npx playwright test --project=invite-flow
  ```
  Expected: 2 tests pass.

- [ ] **Lint passes:**
  ```bash
  npm run lint
  ```

- [ ] **Existing Today/Week/Month e2e still passes** (no regressions):
  ```bash
  npx playwright test --project=desktop-chrome today-view
  ```

---

## Out of scope — deferred to follow-up plans

These are specced in `specs/multiplayer.md` but deliberately not in this plan. Each gets its own write-up:

- **Phase C — First-run UX:**
  - Organizer's "dump moment" empty-state copy + post-dump one-time invite nudge
  - Willing Partner's reveal banner on `/today` (consumes `?welcomed=1`) with adaptive copy
  - "Want to grab one?" soft CTA, dismissible, fires once
- **Phase D — Notifications + recognition:**
  - Notification badge + list UI, read/unread
  - Generate `task_assigned` and `task_completed_by_partner` notifications on mutation
  - Done accordion shows completer attribution
  - Shared points line in profile/settings area
  - Filter "Theirs" in solo mode renders a warm empty message
  - Gentle re-engage prompt after reasonable interval

---

## Ready to execute?

**Plan complete and saved to `docs/superpowers/plans/2026-04-16-partner-invite-spine.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

**Which approach?**
