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
