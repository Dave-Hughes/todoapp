import { test, expect, type Page } from "@playwright/test";

/**
 * Skip viewport-agnostic tests on mobile projects.
 */
function skipUnlessDesktop(testInfo: import("@playwright/test").TestInfo) {
  test.skip(
    testInfo.project.name !== "desktop-chrome",
    "Viewport-agnostic — desktop-chrome only",
  );
}

/*
 * Month View — E2E Tests
 * ======================
 * Calendar-grid planning surface. Tests cover: page load & structure,
 * grid layout, month navigation, day selection & drill-down, task
 * creation, filter toggle, mobile layout, and accessibility.
 *
 * The test user starts with a fresh household (reset in auth.setup.ts),
 * so most tests create their own tasks via the UI when needed.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the long month+year label for the current month (e.g. "April 2026"). */
function currentMonthYear(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Create a task via the task sheet from the month view. */
async function createTaskFromMonth(page: Page, title: string) {
  // Open the sheet via the Add button (desktop) or FAB (mobile)
  const addBtn = page.getByRole("button", { name: /Add for|Add task/ }).first();
  await addBtn.click();
  const dialog = page.getByRole("dialog", { name: "What needs doing?" });
  await dialog.waitFor({ state: "visible" });

  // Fill in the title — the sheet uses a textarea for the title input.
  // Wait for focus, then fill.
  const titleInput = dialog.locator("textarea").first();
  await titleInput.waitFor({ state: "visible" });
  await titleInput.click();
  await titleInput.fill(title);

  // Wait for the submit button to be enabled (title must be non-empty)
  const submitBtn = dialog.getByRole("button", { name: "Add it" });
  await expect(submitBtn).toBeEnabled({ timeout: 3000 });
  await submitBtn.click();
  // Wait for sheet to close
  await dialog.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
  // Brief settle for mutation
  await page.waitForTimeout(500);
}

// ===========================================================================
// 1. PAGE LOAD & STRUCTURE
// ===========================================================================

test.describe("Page load and structure", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("renders the Month view at /month", async ({ page }) => {
    await page.goto("/month");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      currentMonthYear(),
    );
  });

  test("displays the calendar grid with role=grid", async ({ page }) => {
    await page.goto("/month");
    const grid = page.getByRole("grid", { name: /calendar/i });
    await expect(grid).toBeVisible();
  });

  test("renders 7 day-name column headers", async ({ page }) => {
    await page.goto("/month");
    const headers = page.getByRole("columnheader");
    await expect(headers).toHaveCount(7);
    // Sunday-anchored
    await expect(headers.first()).toContainText("Sun");
    await expect(headers.last()).toContainText("Sat");
  });

  test("renders gridcells for the month days", async ({ page }) => {
    await page.goto("/month");
    const cells = page.getByRole("gridcell");
    // A month has 28–31 days + leading empty cells + trailing empty cells.
    // Total gridcells should be at least 28 and at most 42.
    const count = await cells.count();
    expect(count).toBeGreaterThanOrEqual(28);
    expect(count).toBeLessThanOrEqual(42);
  });

  test("subtitle shows task count or quiet message", async ({ page }) => {
    await page.goto("/month");
    // Either "N things this month" or "A quiet month."
    const subtitle = page.locator("p").filter({
      hasText: /things? this month|A quiet month/,
    });
    await expect(subtitle).toBeVisible();
  });
});

// ===========================================================================
// 2. TODAY HIGHLIGHTING
// ===========================================================================

test.describe("Today highlighting", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("today's cell has aria-current=date", async ({ page }) => {
    await page.goto("/month");
    // Day cells are <button role="gridcell" aria-current="date">
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    await expect(todayCell).toBeVisible();
    await expect(todayCell).toHaveCount(1);
  });

  test("today's date number is visible", async ({ page }) => {
    await page.goto("/month");
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    const dayNum = new Date().getDate();
    await expect(todayCell.getByText(String(dayNum), { exact: true })).toBeVisible();
  });
});

// ===========================================================================
// 3. MONTH NAVIGATION
// ===========================================================================

test.describe("Month navigation", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("next month button advances the calendar", async ({ page }) => {
    await page.goto("/month");
    const heading = page.getByRole("heading", { level: 1 });
    const initialText = await heading.textContent();

    await page.getByRole("button", { name: "Next month" }).click();
    await expect(heading).not.toHaveText(initialText!);
  });

  test("previous month button goes back", async ({ page }) => {
    await page.goto("/month");
    const heading = page.getByRole("heading", { level: 1 });
    const initialText = await heading.textContent();

    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(heading).not.toHaveText(initialText!);

    // Go forward again to get back
    await page.getByRole("button", { name: "Next month" }).click();
    await expect(heading).toHaveText(initialText!);
  });

  test("This month button resets to current month", async ({ page }) => {
    await page.goto("/month");
    const currentLabel = currentMonthYear();

    // Navigate away
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();

    // Reset
    await page.getByRole("button", { name: "This month" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      currentLabel,
    );
  });

  test("This month button is disabled when already on current month", async ({
    page,
  }) => {
    await page.goto("/month");
    const btn = page.getByRole("button", { name: "This month" });
    await expect(btn).toBeDisabled();
  });

  test("This month button is enabled after navigating away", async ({
    page,
  }) => {
    await page.goto("/month");
    await page.getByRole("button", { name: "Next month" }).click();
    const btn = page.getByRole("button", { name: "This month" });
    await expect(btn).toBeEnabled();
  });

  test("This month button shows accent dot when on different month", async ({
    page,
  }) => {
    await page.goto("/month");
    const btn = page.getByRole("button", { name: "This month" });

    // No dot on current month — the span[aria-hidden] dot is only rendered when !isCurrentMonth
    let dot = btn.locator("span[aria-hidden='true']");
    await expect(dot).toHaveCount(0);

    // Navigate away — dot should appear
    await page.getByRole("button", { name: "Next month" }).click();
    dot = page.getByRole("button", { name: "This month" }).locator("span[aria-hidden='true']");
    await expect(dot).toHaveCount(1);
  });
});

// ===========================================================================
// 4. DAY SELECTION & DRILL-DOWN
// ===========================================================================

test.describe("Day selection and drill-down", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("clicking a day cell opens the drill-down panel", async ({ page }) => {
    await page.goto("/month");
    // Click today's cell
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    await todayCell.click();

    // Drill-down should appear — look for the empty-day copy or task list
    const drillDown = page.locator("[data-drilldown]");
    await expect(drillDown).toBeVisible();
  });

  test("clicking selected day again closes drill-down", async ({ page }) => {
    await page.goto("/month");
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');

    // Open
    await todayCell.click();
    const drillDown = page.locator("[data-drilldown]");
    await expect(drillDown).toBeVisible();

    // Close by clicking same cell again
    await todayCell.click();
    await expect(drillDown).toBeHidden();
  });

  test("Escape key closes drill-down", async ({ page }) => {
    await page.goto("/month");
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    await todayCell.click();
    const drillDown = page.locator("[data-drilldown]");
    await expect(drillDown).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drillDown).toBeHidden();
  });

  test("empty day drill-down shows warm copy", async ({ page }) => {
    await page.goto("/month");
    // Navigate to a far future month to find a definitely empty day
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();

    // Click the first day-button gridcell (not an empty padding div)
    const dayButtons = page.locator('button[role="gridcell"]');
    await dayButtons.first().click();

    // Should show one of the empty-day copy variants
    const emptyMessages = [
      "Wide open. Enjoy it.",
      "Nothing here yet.",
      "A blank canvas.",
      "Free day. For now.",
    ];
    const copySel = page.locator("p").filter({
      hasText: new RegExp(emptyMessages.map((m) => m.replace(/\./g, "\\.")).join("|")),
    });
    await expect(copySel).toBeVisible();
  });

  test("selected day gets aria-selected=true", async ({ page }) => {
    await page.goto("/month");
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    await todayCell.click();
    await expect(todayCell).toHaveAttribute("aria-selected", "true");
  });
});

// ===========================================================================
// 5. TOOLBAR — FILTER & ADD BUTTON
// ===========================================================================

test.describe("Toolbar", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("filter toggle is visible with Mine/Theirs/All", async ({ page }) => {
    await page.goto("/month");
    await expect(page.getByText("Mine")).toBeVisible();
    await expect(page.getByText("All")).toBeVisible();
  });

  test("desktop Add button is visible", async ({ page }) => {
    await page.goto("/month");
    const addBtn = page.getByRole("button", { name: /Add for/ });
    await expect(addBtn).toBeVisible();
  });

  test("desktop Add button shows keyboard shortcut hints", async ({
    page,
  }) => {
    await page.goto("/month");
    // Should show ⌘ and ↵ kbd elements
    const kbds = page.locator("kbd");
    const count = await kbds.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("Cmd+Enter opens the task creation sheet", async ({ page }) => {
    await page.goto("/month");
    await page.click("body");
    await page.keyboard.press("Meta+Enter");
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" }),
    ).toBeVisible();
  });
});

// ===========================================================================
// 6. DESKTOP LAYOUT
// ===========================================================================

test.describe("Desktop layout", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("sidebar is visible on desktop", async ({ page }) => {
    await page.goto("/month");
    // aside is hidden lg:flex — needs ≥1024px viewport (set above)
    await expect(page.locator("aside[aria-label='Primary']")).toBeVisible();
  });

  test("sidebar marks Month as active nav item", async ({ page }) => {
    await page.goto("/month");
    const activeLink = page.locator('aside a[aria-current="page"]');
    await expect(activeLink).toHaveAttribute("aria-label", "Month");
  });

  test("bottom tabs are hidden on desktop", async ({ page }) => {
    await page.goto("/month");
    // BottomTabs is the second nav — it has lg:hidden
    const bottomTabs = page.locator("nav.lg\\:hidden").or(
      page.locator('nav:has(> ul a[href="/today"])').last(),
    );
    // At 1280px it should not be visible
    await expect(bottomTabs).toBeHidden();
  });

  test("day cells show task title previews on desktop", async ({ page }) => {
    await page.goto("/month");

    // Create a task via the shared helper
    await createTaskFromMonth(page, "Monthly dentist appointment");

    // Today's cell should show the title preview on desktop
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    await expect(todayCell.getByText("Monthly dentist appointment")).toBeVisible();
  });
});

// ===========================================================================
// 7. MOBILE LAYOUT
// ===========================================================================

test.describe("Mobile layout", () => {
  test("bottom tabs are visible on mobile", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop-chrome",
      "Mobile only",
    );
    await page.goto("/month");
    // The bottom tabs nav is the last nav on the page (second "Main navigation").
    // Use last() to disambiguate from the sidebar nav.
    const bottomNav = page.locator('nav[aria-label="Main navigation"]').last();
    await expect(bottomNav).toBeVisible();
    const monthTab = bottomNav.locator('a[aria-current="page"]');
    await expect(monthTab).toContainText("Month");
  });

  test("sidebar is hidden on mobile", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop-chrome",
      "Mobile only",
    );
    await page.goto("/month");
    await expect(page.locator("aside[aria-label='Primary']")).toBeHidden();
  });

  test("FAB is visible on mobile", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop-chrome",
      "Mobile only",
    );
    await page.goto("/month");
    const fab = page.getByRole("button", { name: "Add task" });
    await expect(fab).toBeVisible();
  });

  test("calendar grid is visible on mobile", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop-chrome",
      "Mobile only",
    );
    await page.goto("/month");
    const grid = page.getByRole("grid");
    await expect(grid).toBeVisible();
  });
});

// ===========================================================================
// 8. TASK CREATION FROM DRILL-DOWN
// ===========================================================================

test.describe("Task creation from drill-down", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("creating a task shows it in the drill-down", async ({ page }) => {
    await page.goto("/month");

    // Create a task for today
    await createTaskFromMonth(page, "Pay electric bill");

    // Open drill-down on today to verify the task is there
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    await todayCell.click();
    const drillDown = page.locator("[data-drilldown]");
    await expect(drillDown).toBeVisible();

    // The task should have a checkbox in the drill-down (distinguishes it
    // from the title preview in the grid cell).
    await expect(
      page.getByRole("checkbox", { name: /Complete "Pay electric bill"/ }),
    ).toBeVisible();
  });

  test("empty day drill-down has Add something button", async ({ page }) => {
    await page.goto("/month");
    // Go to a far future month to find empty days
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();
    await page.getByRole("button", { name: "Next month" }).click();

    // Click the first day-button gridcell
    const dayButtons = page.locator('button[role="gridcell"]');
    await dayButtons.first().click();

    const addBtn = page.getByRole("button", { name: "Add something" });
    await expect(addBtn).toBeVisible();
  });

  test("creating a task updates grid cell density", async ({ page }) => {
    await page.goto("/month");

    // Create a task for today
    await createTaskFromMonth(page, "Water the garden");

    // Today's cell should now indicate at least 1 task in its aria-label
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    const label = await todayCell.getAttribute("aria-label");
    expect(label).toMatch(/\d+ tasks?/);
  });
});

// ===========================================================================
// 9. ACCESSIBILITY
// ===========================================================================

test.describe("Accessibility", () => {
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("grid has accessible label", async ({ page }) => {
    await page.goto("/month");
    const grid = page.getByRole("grid");
    const label = await grid.getAttribute("aria-label");
    expect(label).toContain("calendar");
  });

  test("day cells have descriptive aria-labels", async ({ page }) => {
    await page.goto("/month");
    const todayCell = page.locator('button[role="gridcell"][aria-current="date"]');
    const label = await todayCell.getAttribute("aria-label");
    // Should contain "today" and task info
    expect(label).toMatch(/today/i);
    expect(label).toMatch(/tasks?/i);
  });

  test("navigation buttons have accessible names", async ({ page }) => {
    await page.goto("/month");
    await expect(
      page.getByRole("button", { name: "Previous month" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Next month" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "This month" }),
    ).toBeVisible();
  });

  test("skip-to-content link is present", async ({ page }) => {
    await page.goto("/month");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeAttached();
  });
});

// ===========================================================================
// 10. VIEW TRANSITIONS
// ===========================================================================

test.describe("View transitions", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.beforeEach(({}, testInfo) => {
    skipUnlessDesktop(testInfo);
  });

  test("navigating from Today to Month preserves sidebar", async ({
    page,
  }) => {
    await page.goto("/today");
    const sidebar = page.locator("aside[aria-label='Primary']");
    await expect(sidebar).toBeVisible();

    // Navigate to month via sidebar link
    await sidebar.getByRole("link", { name: "Month" }).click();
    await page.waitForURL("/month");

    // Sidebar should still be visible (shared layout)
    await expect(sidebar).toBeVisible();
    // Month should be the active nav item
    const activeLink = sidebar.locator('a[aria-current="page"]');
    await expect(activeLink).toHaveAttribute("aria-label", "Month");
  });

  test("navigating from Week to Month works", async ({ page }) => {
    await page.goto("/week");
    const sidebar = page.locator("aside[aria-label='Primary']");

    await sidebar.getByRole("link", { name: "Month" }).click();
    await page.waitForURL("/month");

    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toContainText(currentMonthYear());
  });
});
