// tests/invite-flow.spec.ts
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
});
