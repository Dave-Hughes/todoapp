// tests/solo-state.spec.ts
import { test, expect } from "@playwright/test";

/**
 * Solo-state E2E tests.
 *
 * These tests verify UI behaviour that is specific to a signed-in user who
 * does NOT yet have a partner — i.e. solo mode.
 *
 * Run: `npx playwright test --project=desktop-chrome --grep "solo state"`
 *
 * Both cases are serial to avoid concurrent mutations on the shared
 * organizer household.
 */
test.describe("solo state", () => {
  test.describe.configure({ mode: "serial" });

  /**
   * Case A: "Theirs" filter in solo mode shows the warm empty state with an
   * invite link.
   *
   * Selectors:
   *   - Filter radio buttons: role="radio" inside role="radiogroup" with
   *     aria-label="Filter tasks by assignee".
   *   - "Theirs" option label when solo (no partner): "Theirs".
   *   - EmptyState variant="theirs-solo" heading: one of the rotating copy
   *     strings from theirsSoloCopy[] — all contain "your person" or reference
   *     their side.  We match with /your person/i as the common prefix regex.
   *   - CTA link text: "Bring your person in →" (href="/invite").
   */
  test("Theirs filter in solo mode shows warm empty state with invite link", async ({ page }) => {
    // Reset invite state to ensure the organizer is solo.
    const resetRes = await page.request.post("/api/dev/reset-invite-state", {
      headers: { "x-dev-reset-secret": process.env.DEV_RESET_SECRET! },
    });
    expect(resetRes.ok()).toBe(true);

    await page.goto("/today");
    await page.waitForURL("/today");

    // Click the "Theirs" radio in the filter toggle.
    // SegmentedControl renders each option as role="radio" inside a role="radiogroup".
    const filterGroup = page.getByRole("radiogroup", {
      name: /filter tasks by assignee/i,
    });
    await expect(filterGroup).toBeVisible();
    await filterGroup.getByRole("radio", { name: "Theirs" }).click();

    // The warm empty state should appear.
    // EmptyState variant="theirs-solo" renders an h2 with one of theirsSoloCopy[]:
    //   "This is where your person's tasks will live."
    //   "Your person's side is waiting."
    //   "Nothing here yet — that's their column."
    //   "Once they're in, this page fills up."
    // And a fixed <p> below: "Once they're in, their stuff shows up right here."
    // We target the h2 role to avoid matching the CTA link "Bring your person in".
    await expect(
      page.getByRole("heading", {
        name: /your person|their column|fills up|they're in/i,
      }),
    ).toBeVisible();

    // The "Bring your person in →" link (with arrow) in the empty state body.
    // The empty state component renders:
    //   <Link href="/invite">Bring your person in →</Link>
    // (Exact text includes the → arrow, distinguishing it from the mobile nav icon.)
    const inviteLink = page.getByRole("link", {
      name: "Bring your person in →",
      exact: true,
    });
    await expect(inviteLink).toBeVisible();
    await expect(inviteLink).toHaveAttribute("href", "/invite");
  });

  /**
   * Case B: Re-engage banner appears for a >7-day-old pending invite and
   * dismisses persistently.
   *
   * Strategy:
   *   The banner's visibility gate in /today page.tsx:
   *     daysSince(invite.createdAt) >= 7
   *   where daysSince = (Date.now() - new Date(createdAt).getTime()) / 86_400_000
   *
   *   We shift the browser's Date.now() forward by 8 days using page.addInitScript.
   *   The invite is created via the UI with the real server clock (createdAt ≈ now).
   *   With the client clock shifted +8 days, daysSince(createdAt) ≈ 8 ≥ 7, so the
   *   banner renders.
   *
   *   Note: addInitScript runs on EVERY navigation in this page instance, so the
   *   shift persists when we navigate from /invite to /today.
   *
   * Selectors:
   *   - ReengageBanner heading: "Your person hasn't joined yet."
   *   - Dismiss button: aria-label="Not now" (text "Not now", no additional aria).
   *   - /invite email input: aria-label matching /your partner's email/i (from
   *     InviteCompose component).
   *   - Submit button: role="button" name /send invite/i.
   */
  test("re-engage banner appears for stale invite and dismisses once", async ({ page }) => {
    // Shift browser Date.now() 8 days forward so the banner's 7-day gate triggers.
    // This addInitScript persists across same-page navigations. Must be registered
    // BEFORE any page.goto() call so it applies to the very first page load.
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      const SHIFT_MS = 8 * 24 * 60 * 60 * 1000; // 8 days in ms
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Date as any).now = () => realNow() + SHIFT_MS;
    });

    // Clear ReengageBanner dismiss flags for all invite IDs so the banner can show.
    await page.addInitScript(() => {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith("reengage-dismissed-")) {
          localStorage.removeItem(key);
        }
      }
    });

    // Navigate to /today first so the page context and cookies are fully active.
    await page.goto("/today");
    await page.waitForURL("/today");

    // Start clean: cancel any existing invite so the organizer is solo.
    const resetRes = await page.request.post("/api/dev/reset-invite-state", {
      headers: { "x-dev-reset-secret": process.env.DEV_RESET_SECRET! },
    });
    expect(resetRes.ok()).toBe(true);

    // Create a fresh invite via the API (link-only, no email needed).
    // The invite's createdAt is the real server time. With Date.now() shifted
    // 8 days forward on the client, daysSince(createdAt) ≈ 8 days ≥ 7 days,
    // so the ReengageBanner gate opens.
    const createRes = await page.request.post("/api/invites", {
      data: { email: null },
    });
    const createStatus = createRes.status();
    const createBody = await createRes.text();
    // 201 = created, 409 = active invite exists (prior reset didn't fully clear it).
    if (![201, 409].includes(createStatus)) {
      throw new Error(`POST /api/invites returned ${createStatus}: ${createBody}`);
    }

    // Navigate to /today — the re-engage banner should now be visible because
    // the shifted Date.now() makes the freshly-created invite appear 8 days old.
    await page.goto("/today");
    await page.waitForURL("/today");

    // ReengageBanner heading text (from reengage-banner.tsx):
    //   "Your person hasn't joined yet."
    await expect(
      page.getByText(/Your person hasn't joined yet/i),
    ).toBeVisible({ timeout: 10000 });

    // Click "Not now" to dismiss. There are two dismiss affordances:
    //   1. The X icon button: aria-label="Not now" (top-right corner of banner)
    //   2. The "Not now" text button in the action row
    // Both call the same dismiss handler. Use .first() to pick the X icon.
    await page.getByRole("button", { name: "Not now" }).first().click();

    // Reload and verify the banner is gone (localStorage key persists dismiss).
    await page.goto("/today");
    await page.waitForURL("/today");
    await expect(
      page.getByText(/Your person hasn't joined yet/i),
    ).not.toBeVisible();
  });
});
