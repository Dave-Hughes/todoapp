// tests/invite-flow.spec.ts
import { test, expect, chromium } from "@playwright/test";
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
 *
 * Tests run serially (mode: 'serial') to prevent the two tests from racing
 * each other on the shared organizer household when fullyParallel: true is set
 * globally in playwright.config.ts.
 */
test.describe("invite flow", () => {
  test.describe.configure({ mode: "serial" });

  test("organizer invites, partner accepts, both see the household", async () => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    // Ensure partner starts solo. (Storage-state signed-in already.)
    await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
  )`;
    await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

    const browser = await chromium.launch();
    try {
      // --- Organizer context ---
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
      const invitesRes = await organizer.request.get("/api/invites");
      const invitesBody = (await invitesRes.json()) as { invite: unknown };
      expect(invitesBody.invite).toBeNull();

      // Organizer's /api/me also shows the partner.
      const orgMeRes = await organizer.request.get("/api/me");
      const orgMeBody = (await orgMeRes.json()) as { partner: unknown };
      expect(orgMeBody.partner).not.toBeNull();

      await organizerContext.close();
      await partnerContext.close();
    } finally {
      await browser.close();
    }
  });

  test("repeats cleanly after reset", async () => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    await sql`DELETE FROM households WHERE id IN (
    SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
  )`;
    await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

    const browser = await chromium.launch();
    try {
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
    } finally {
      await browser.close();
    }
  });

  /**
   * Recognition-path tests (Task 24).
   *
   * These tests run after the core accept-path tests and exercise:
   *   1. RevealBanner on /today?welcomed=1 — shows and dismisses once.
   *   2. Organizer assigns a task to partner → partner sees notification bell badge.
   *   3. Partner completes that task → organizer sees notification.
   *   4. Done accordion shows partner attribution ("— [Name]").
   *
   * Each test re-establishes a paired household by running a fresh invite/accept
   * cycle.  The browser is kept open across recognition sub-tests via module-level
   * state so we don't pay the full Chromium launch overhead 4×.
   *
   * Selectors used (all grounded in the component source):
   *   - RevealBanner h2 contains "You're in" (literal text in the component).
   *     aria-label="Dismiss" on the X button.
   *   - NotificationBell aria-label: "Notifications" (0 unread) OR
   *     "Notifications — N unread" (with unread).  We match with a regex.
   *   - NotificationList row copy for task_assigned:
   *       "{actorName} put **title** on your plate."
   *     For task_completed_by_partner:
   *       "{actorName} got it. **title**."
   *   - DoneAccordion toggle button text contains "Done (".
   *   - TaskListItem completedByLabel rendered as "— {name}" in a tertiary span.
   */
  test("recognition: reveal banner shows after accept and dismisses", async () => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    // Detach partner from any prior household so the merge path runs cleanly.
    await sql`DELETE FROM households WHERE id IN (
      SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
    )`;
    await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

    const browser = await chromium.launch();
    try {
      const organizerContext = await browser.newContext({
        storageState: "tests/.auth/user.json",
      });
      const organizer = await organizerContext.newPage();
      await organizer.goto("/today");
      await resetInviteState(organizer);

      // Create invite.
      await organizer.goto("/invite");
      await organizer.getByLabel(/your partner's email/i).fill(E2E_PARTNER.email);
      await organizer.getByRole("button", { name: /send invite/i }).click();
      await expect(organizer.getByRole("textbox", { name: /invite link/i })).toBeVisible();
      const inviteUrl = await organizer
        .getByRole("textbox", { name: /invite link/i })
        .inputValue();

      // Partner accepts.
      const partnerContext = await browser.newContext({
        storageState: "tests/.auth/partner.json",
      });
      const partner = await partnerContext.newPage();

      // Clear the dismiss flag so the RevealBanner can appear.
      await partner.addInitScript(() => {
        window.localStorage.removeItem("reveal-dismissed");
      });

      await partner.goto(new URL(inviteUrl).pathname + "/accept");

      // Accept redirects to /today?welcomed=1.
      await partner.waitForURL(/\/today\?welcomed=1/);

      // RevealBanner should be visible — "You're in" is in the h2 text.
      // The router.replace("/today") fires after mount; we have a brief window.
      await expect(partner.getByText(/You're in/i)).toBeVisible({ timeout: 5000 });

      // Click Dismiss (aria-label="Dismiss").
      await partner.getByRole("button", { name: "Dismiss" }).click();

      // Reload and banner should be gone (localStorage key persists).
      await partner.goto("/today");
      await partner.waitForURL("/today");
      await expect(partner.getByText(/You're in/i)).not.toBeVisible();

      await organizerContext.close();
      await partnerContext.close();
    } finally {
      await browser.close();
    }
  });

  test("recognition: assign task to partner → partner sees notification", async () => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    await sql`DELETE FROM households WHERE id IN (
      SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
    )`;
    await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

    const browser = await chromium.launch();
    try {
      const organizerContext = await browser.newContext({
        storageState: "tests/.auth/user.json",
      });
      const organizer = await organizerContext.newPage();
      await organizer.goto("/today");
      await resetInviteState(organizer);

      // Create invite and get partner accepted.
      await organizer.goto("/invite");
      await organizer.getByLabel(/your partner's email/i).fill(E2E_PARTNER.email);
      await organizer.getByRole("button", { name: /send invite/i }).click();
      await expect(organizer.getByRole("textbox", { name: /invite link/i })).toBeVisible();
      const inviteUrl = await organizer
        .getByRole("textbox", { name: /invite link/i })
        .inputValue();

      const partnerContext = await browser.newContext({
        storageState: "tests/.auth/partner.json",
      });
      const partner = await partnerContext.newPage();
      await partner.goto(new URL(inviteUrl).pathname + "/accept");
      await partner.waitForURL(/\/today/);

      // Verify both sides see a partner before continuing.
      const orgMeRes = await organizer.request.get("/api/me");
      const orgMeBody = (await orgMeRes.json()) as { partner: { displayName: string } | null };
      expect(orgMeBody.partner).not.toBeNull();
      const partnerDisplayName = orgMeBody.partner!.displayName;

      // Organizer opens task sheet on /today and assigns task to partner.
      await organizer.goto("/today");

      // Open the task sheet via the desktop "Add task" button (always in DOM on desktop).
      await organizer.getByRole("button", { name: /add task/i }).click();

      // Fill in the title.
      await organizer.getByLabel("Task title").fill("Pick up dry cleaning");

      // Click the assignee chip — aria-label starts with "Set assignee".
      await organizer.getByRole("button", { name: /set assignee/i }).click();

      // Pick the partner option from the listbox — the option label is the partner's display name.
      await organizer
        .getByRole("option", { name: new RegExp(partnerDisplayName, "i") })
        .click();

      // Submit the task.
      await organizer.getByRole("button", { name: /add it/i }).click();

      // Partner navigates to /today. The bell should gain an unread badge within ~10s
      // (5s polling interval + render time).
      await partner.goto("/today");

      // Wait for the notification bell to show an unread count.
      // NotificationBell aria-label format: "Notifications — N unread" when N > 0.
      await expect(
        partner.getByRole("button", { name: /notifications.*unread/i }),
      ).toBeVisible({ timeout: 15000 });

      // Click the bell.
      await partner
        .getByRole("button", { name: /notifications.*unread/i })
        .click();

      // The notification copy for task_assigned: "{organizer} put **Pick up dry cleaning** on your plate."
      await expect(partner.getByText(/Pick up dry cleaning/i)).toBeVisible();

      await organizerContext.close();
      await partnerContext.close();
    } finally {
      await browser.close();
    }
  });

  test("recognition: partner completes task → organizer notified", async () => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    await sql`DELETE FROM households WHERE id IN (
      SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
    )`;
    await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

    const browser = await chromium.launch();
    try {
      const organizerContext = await browser.newContext({
        storageState: "tests/.auth/user.json",
      });
      const organizer = await organizerContext.newPage();
      await organizer.goto("/today");
      await resetInviteState(organizer);

      // Create invite and get partner accepted.
      await organizer.goto("/invite");
      await organizer.getByLabel(/your partner's email/i).fill(E2E_PARTNER.email);
      await organizer.getByRole("button", { name: /send invite/i }).click();
      await expect(organizer.getByRole("textbox", { name: /invite link/i })).toBeVisible();
      const inviteUrl = await organizer
        .getByRole("textbox", { name: /invite link/i })
        .inputValue();

      const partnerContext = await browser.newContext({
        storageState: "tests/.auth/partner.json",
      });
      const partner = await partnerContext.newPage();
      await partner.goto(new URL(inviteUrl).pathname + "/accept");
      await partner.waitForURL(/\/today/);

      // Organizer creates a task assigned to themselves (so partner completing it
      // fires task_completed_by_partner notification to organizer).
      await organizer.goto("/today");
      await organizer.getByRole("button", { name: /add task/i }).click();
      await organizer.getByLabel("Task title").fill("Take out the trash");
      // Leave assignee as "me" (organizer), then submit.
      await organizer.getByRole("button", { name: /add it/i }).click();

      // Partner navigates to /today and completes the task by clicking its checkbox.
      await partner.goto("/today");
      // Wait for the task to appear (TanStack Query polling).
      const taskCheckbox = partner.getByLabel(/complete "Take out the trash"/i);
      await expect(taskCheckbox).toBeVisible({ timeout: 10000 });
      await taskCheckbox.click();

      // Organizer's bell should gain an unread badge for task_completed_by_partner.
      await organizer.goto("/today");
      await expect(
        organizer.getByRole("button", { name: /notifications.*unread/i }),
      ).toBeVisible({ timeout: 15000 });

      // Click the bell and verify notification copy.
      // task_completed_by_partner copy: "{actor} got it. **Take out the trash**."
      await organizer
        .getByRole("button", { name: /notifications.*unread/i })
        .click();
      await expect(organizer.getByText(/got it/i)).toBeVisible();
      await expect(organizer.getByText(/Take out the trash/i)).toBeVisible();

      await organizerContext.close();
      await partnerContext.close();
    } finally {
      await browser.close();
    }
  });

  test("recognition: done accordion shows partner attribution", async () => {
    const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
    await sql`DELETE FROM households WHERE id IN (
      SELECT household_id FROM users WHERE clerk_user_id = ${E2E_PARTNER.id}
    )`;
    await sql`UPDATE users SET household_id = NULL WHERE clerk_user_id = ${E2E_PARTNER.id}`;

    const browser = await chromium.launch();
    try {
      const organizerContext = await browser.newContext({
        storageState: "tests/.auth/user.json",
      });
      const organizer = await organizerContext.newPage();
      await organizer.goto("/today");
      await resetInviteState(organizer);

      // Create invite and get partner accepted.
      await organizer.goto("/invite");
      await organizer.getByLabel(/your partner's email/i).fill(E2E_PARTNER.email);
      await organizer.getByRole("button", { name: /send invite/i }).click();
      await expect(organizer.getByRole("textbox", { name: /invite link/i })).toBeVisible();
      const inviteUrl = await organizer
        .getByRole("textbox", { name: /invite link/i })
        .inputValue();

      const partnerContext = await browser.newContext({
        storageState: "tests/.auth/partner.json",
      });
      const partner = await partnerContext.newPage();
      await partner.goto(new URL(inviteUrl).pathname + "/accept");
      await partner.waitForURL(/\/today/);

      // Get partner display name from organizer's /api/me.
      const orgMeRes = await organizer.request.get("/api/me");
      const orgMeBody = (await orgMeRes.json()) as { partner: { displayName: string } | null };
      expect(orgMeBody.partner).not.toBeNull();
      const partnerDisplayName = orgMeBody.partner!.displayName;

      // Organizer creates a task (assigned to organizer).
      await organizer.goto("/today");
      await organizer.getByRole("button", { name: /add task/i }).click();
      await organizer.getByLabel("Task title").fill("Water the plants");
      await organizer.getByRole("button", { name: /add it/i }).click();

      // Partner completes the task.
      await partner.goto("/today");
      const taskCheckbox = partner.getByLabel(/complete "Water the plants"/i);
      await expect(taskCheckbox).toBeVisible({ timeout: 10000 });
      await taskCheckbox.click();

      // Organizer opens /today, opens Done accordion, sees attribution.
      await organizer.goto("/today");

      // DoneAccordion toggle button text contains "Done ("
      // (visible once at least one task is completed).
      await expect(
        organizer.getByRole("button", { name: /done \(/i }),
      ).toBeVisible({ timeout: 10000 });
      await organizer.getByRole("button", { name: /done \(/i }).click();

      // The accordion is now open. TaskListItem completedByLabel renders as "— {name}".
      // We match the em-dash prefix (U+2014) followed by the partner's display name.
      await expect(
        organizer.getByText(new RegExp(`\u2014\\s*${partnerDisplayName}`, "i")),
      ).toBeVisible();

      await organizerContext.close();
      await partnerContext.close();
    } finally {
      await browser.close();
    }
  });
});
