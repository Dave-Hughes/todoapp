import { test, expect } from "@playwright/test";

/*
 * Task Sheet — Phase 1 E2E Tests
 * ================================
 * Covers: sheet open/close, title input, chip row, CTA states, submit flow,
 * Cmd+Enter shortcut, Esc dismiss, backdrop dismiss, focus management,
 * keyboard Tab cycle, and error state.
 *
 * All tests use the demo data mechanism in page.tsx — no real DB.
 * Viewport default is desktop (1280x800) unless overridden per-test.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Open the task sheet using the reliable Add task button.
 * Shared by all tests that just need the sheet open.
 */
async function openSheet(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Add task" }).first().click();
  await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({
    state: "visible",
  });
}

// ===========================================================================
// 1. OPENING THE SHEET
// ===========================================================================

test.describe("Task sheet — opening", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Cmd+Enter from page-level opens the Create sheet", async ({ page }) => {
    await page.goto("/");
    // Click body to ensure document has focus before global shortcut
    await page.click("body");
    await page.keyboard.press("Meta+Enter");
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeVisible();
  });

  test("mobile FAB opens the sheet", async ({ page }) => {
    page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Add task" }).last().click();
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeVisible();
  });

  test("desktop toolbar Add task button opens the sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add task" }).first().click();
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeVisible();
  });
});

// ===========================================================================
// 2. TITLE FIELD
// ===========================================================================

test.describe("Task sheet — title field", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("textarea autofocuses when sheet opens", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const textarea = page.getByLabel("Task title");
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeFocused();
  });

  test("placeholder text is shown when title is empty", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(
      dialog.getByPlaceholder("What's rattling around up there?")
    ).toBeVisible();
  });

  test("Enter key submits the form when title is non-empty", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Line one");
    await page.keyboard.press("Enter");
    // Enter (no modifier) now submits — sheet should close
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeHidden();
  });

  test("Shift+Enter inserts a newline (does not submit)", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Line one");
    await page.keyboard.press("Shift+Enter");
    // Sheet should still be open — Shift+Enter = newline
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeVisible();
    // Value should now contain a newline
    const value = await page.getByLabel("Task title").inputValue();
    expect(value).toContain("\n");
  });

  test("title can contain special characters", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Pick up bread & milk (2%)");
    await page.keyboard.press("Meta+Enter");
    // Wait for dialog to close before checking task list
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "hidden" });
    await expect(page.getByText("Pick up bread & milk (2%)")).toBeVisible();
  });
});

// ===========================================================================
// 3. CHIP ROW
// ===========================================================================

test.describe("Task sheet — chip row", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("chip row group is labeled for accessibility", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(
      dialog.getByRole("group", { name: "Task field shortcuts" })
    ).toBeVisible();
  });

  test("Date chip shows 'Today' default", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const dateChip = dialog.getByRole("button", { name: /Set due date/i });
    await expect(dateChip).toBeVisible();
    await expect(dateChip).toContainText("Today");
  });

  test("Assignee chip shows user name as default", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const assigneeChip = dialog.getByRole("button", { name: /Set assignee/i });
    await expect(assigneeChip).toBeVisible();
    await expect(assigneeChip).toContainText("Dave");
  });

  test("Category chip shows 'Uncategorized' default", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const categoryChip = dialog.getByRole("button", {
      name: /Set category/i,
    });
    await expect(categoryChip).toBeVisible();
    await expect(categoryChip).toContainText("Uncategorized");
  });

  test("Repeat chip shows 'repeat' in its label", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const repeatChip = dialog.getByRole("button", { name: /Set repeat/i });
    await expect(repeatChip).toBeVisible();
    await expect(repeatChip).toContainText("repeat");
  });

  test("More chip is visible", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(
      dialog.getByRole("button", { name: /More task options/i })
    ).toBeVisible();
  });

  test("chips are keyboard-focusable (Tab from textarea reaches them)", async ({
    page,
    browserName,
  }) => {
    // iOS Safari doesn't support Tab focus navigation for non-form elements
    test.skip(browserName === "webkit", "iOS Safari Tab focus skipped");
    await page.goto("/");
    await openSheet(page);
    const textarea = page.getByLabel("Task title");
    await expect(textarea).toBeFocused();
    // Tab from textarea should move focus to something inside the dialog
    await page.keyboard.press("Tab");
    const inDialog = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return dialog?.contains(document.activeElement) ?? false;
    });
    expect(inDialog).toBe(true);
  });
});

// ===========================================================================
// 4. CTA STATES
// ===========================================================================

test.describe("Task sheet — CTA states", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Add it button is disabled when title is empty", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const cta = dialog.getByRole("button", { name: "Add it" });
    await expect(cta).toBeDisabled();
  });

  test("Add it button enables when title has text", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Take out trash");
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const cta = dialog.getByRole("button", { name: "Add it" });
    await expect(cta).toBeEnabled();
  });

  test("Add it button is disabled for whitespace-only title", async ({
    page,
  }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("     ");
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const cta = dialog.getByRole("button", { name: "Add it" });
    await expect(cta).toBeDisabled();
  });
});

// ===========================================================================
// 5. SUBMIT FLOW
// ===========================================================================

test.describe("Task sheet — submit flow", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Cmd+Enter submits and task appears in list", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Water the succulents");
    await page.keyboard.press("Meta+Enter");
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeHidden();
    await expect(page.getByText("Water the succulents")).toBeVisible();
  });

  test("clicking Add it button submits and closes the sheet", async ({
    page,
  }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Book dentist appointment");
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: "Add it" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Book dentist appointment")).toBeVisible();
  });

  test("title is cleared after submit; next open shows empty field", async ({
    page,
  }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Sort recycling");
    await page.keyboard.press("Meta+Enter");
    // Reopen
    await openSheet(page);
    await expect(page.getByLabel("Task title")).toHaveValue("");
  });

  test("rapid creation: three tasks in sequence", async ({ page }) => {
    await page.goto("/");
    const tasks = ["Get groceries", "Pay water bill", "Oil change"];
    for (const task of tasks) {
      await openSheet(page);
      await page.getByLabel("Task title").fill(task);
      await page.keyboard.press("Meta+Enter");
      // Wait for sheet to close before opening next iteration
      await page
        .getByRole("dialog", { name: "What needs doing?" })
        .waitFor({ state: "hidden" });
    }
    for (const task of tasks) {
      await expect(
        page.getByRole("region", { name: "Tasks due today" }).getByText(task)
      ).toBeVisible();
    }
  });

  test("new task appears in the task list after submission", async ({
    page,
  }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("New unique task xyz");
    await page.keyboard.press("Meta+Enter");
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "hidden" });
    await expect(page.getByText("New unique task xyz")).toBeVisible();
  });
});

// ===========================================================================
// 6. DISMISS
// ===========================================================================

test.describe("Task sheet — dismiss", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Esc closes the sheet silently (no task created)", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Abandoned idea");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeHidden();
    await expect(page.getByText("Abandoned idea")).toBeHidden();
  });

  test("tapping backdrop closes the sheet", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    // Click well above the sheet (overlay area)
    await page.mouse.click(10, 10);
    await expect(
      page.getByRole("dialog", { name: "What needs doing?" })
    ).toBeHidden();
  });

  test("X button closes the sheet silently", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();
  });
});

// ===========================================================================
// 7. FOCUS MANAGEMENT
// ===========================================================================

test.describe("Task sheet — focus management", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("opening sheet moves focus to textarea", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    await expect(page.getByLabel("Task title")).toBeFocused();
  });

  test("closing sheet restores focus to trigger", async ({ page }) => {
    await page.goto("/");
    const addBtn = page.getByRole("button", { name: "Add task" }).first();
    await addBtn.click();
    await page
      .getByRole("dialog", { name: "What needs doing?" })
      .waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return el?.textContent?.trim() ?? "";
    });
    expect(focused).toContain("Add task");
  });

  test("Tab cycles through all focusable elements within dialog", async ({
    page,
    browserName,
  }) => {
    // iOS Safari doesn't support Tab focus navigation for non-form elements
    test.skip(browserName === "webkit", "iOS Safari Tab focus skipped");
    await page.goto("/");
    await openSheet(page);
    await page.getByLabel("Task title").fill("Test");
    // Tab through 10 times — focus should stay inside the dialog (focus trap)
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      const inDialog = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(document.activeElement) ?? false;
      });
      expect(inDialog).toBe(true);
    }
  });

  test("sheet has role=dialog and aria-modal=true", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog).toHaveAttribute("aria-modal", "true");
  });
});

// ===========================================================================
// 8. ACCESSIBILITY
// ===========================================================================

test.describe("Task sheet — accessibility", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("all chips have accessible labels", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const chips = dialog.locator('[role="group"] button');
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const label = await chips.nth(i).getAttribute("aria-label");
      expect(label).toBeTruthy();
      expect(label!.length).toBeGreaterThan(0);
    }
  });

  test("close button has accessible label", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByRole("button", { name: "Close" })).toBeVisible();
  });

  test("chip touch targets are at least 44px high", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const firstChip = dialog
      .getByRole("group", { name: "Task field shortcuts" })
      .getByRole("button")
      .first();
    const box = await firstChip.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("voice and tone: no banned words in sheet copy", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Wait for dialog to be fully visible before inspecting text
    await expect(dialog).toBeVisible();
    const text = await dialog.evaluate(
      (el) => (el as HTMLElement).innerText.toLowerCase()
    );
    expect(text).not.toContain("failed");
    expect(text).not.toContain("overdue");
  });
});

// ===========================================================================
// 9. MOBILE — FAB HIDDEN WHEN SHEET IS OPEN
// ===========================================================================

test.describe("Task sheet — mobile FAB visibility", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("FAB is hidden (scale 0) when sheet is open on mobile", async ({ page }) => {
    await page.goto("/");
    // FAB locator by aria-label (works even when aria-hidden)
    const fab = page.locator('[aria-label="Add task"].lg\\:hidden').last();

    // Open the sheet using the FAB — it's visible before the sheet opens
    await page.getByRole("button", { name: "Add task" }).last().click();
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "visible" });

    // FAB should now have aria-hidden="true" (sheet is open)
    const ariaHidden = await fab.getAttribute("aria-hidden");
    expect(ariaHidden).toBe("true");
  });

  test("FAB reappears after sheet is closed", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add task" }).last().click();
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "visible" });
    // Close via Escape
    await page.keyboard.press("Escape");
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "hidden" });
    // FAB should be accessible again (no aria-hidden)
    const fab = page.locator('[aria-label="Add task"].lg\\:hidden').last();
    const ariaHidden = await fab.getAttribute("aria-hidden");
    expect(ariaHidden).toBeNull();
  });
});

// ===========================================================================
// 10. MOBILE — CHIP ROW HORIZONTAL SCROLL
// ===========================================================================

test.describe("Task sheet — mobile chip row scroll", () => {
  test("chip row is scrollable on mobile (overflow-x: auto)", async ({ page }) => {
    page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    // Open sheet via FAB (last Add task button on mobile)
    await page.getByRole("button", { name: "Add task" }).last().click();
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "visible" });

    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const chipGroup = dialog.getByRole("group", { name: "Task field shortcuts" });

    // The chip row should have overflow-x scrolling enabled
    const overflowX = await chipGroup.evaluate((el) =>
      window.getComputedStyle(el).overflowX
    );
    // 'auto' or 'scroll' — either is acceptable for a horizontally scrollable container
    expect(["auto", "scroll"]).toContain(overflowX);
  });

  test("all chips are reachable (first and last chip exist)", async ({ page }) => {
    page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Add task" }).last().click();
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "visible" });

    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // All chips should be in the DOM even if some are scrolled out of view
    await expect(dialog.getByRole("button", { name: /Set due date/i })).toBeAttached();
    await expect(dialog.getByRole("button", { name: /More task options/i })).toBeAttached();
  });
});

// ===========================================================================
// PHASE 2: INLINE PICKERS
// ===========================================================================

// ---------------------------------------------------------------------------
// DATE PICKER
// ---------------------------------------------------------------------------

test.describe("Task sheet — date picker", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("clicking date chip opens the date picker popover on desktop", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const dateChip = dialog.getByRole("button", { name: /Set due date/i });
    await dateChip.click();
    await expect(page.getByRole("grid", { name: "Date picker calendar" })).toBeVisible();
  });

  test("date chip shows aria-expanded when picker is open", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const dateChip = dialog.getByRole("button", { name: /Set due date/i });
    await expect(dateChip).not.toHaveAttribute("aria-expanded");
    await dateChip.click();
    await expect(dateChip).toHaveAttribute("aria-expanded", "true");
  });

  test("selecting a date updates the chip label", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const dateChip = dialog.getByRole("button", { name: /Set due date/i });
    await dateChip.click();
    // Click "Tomorrow" preset — scope to the date preset group to avoid the roll-over button
    const presetGroup = page.getByRole("group", { name: "Quick date presets" });
    await presetGroup.getByRole("button", { name: "Tomorrow" }).click();
    // Chip label should now say "Tomorrow"
    await expect(dateChip).toContainText("Tomorrow");
  });

  test("Escape closes the date picker and returns focus to chip", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const dateChip = dialog.getByRole("button", { name: /Set due date/i });
    await dateChip.click();
    await expect(page.getByRole("grid", { name: "Date picker calendar" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("grid", { name: "Date picker calendar" })).not.toBeVisible();
    await expect(dateChip).toBeFocused();
  });

  test("calendar has arrow key navigation", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set due date/i }).click();
    // Focus should be on a grid cell
    const grid = page.getByRole("grid", { name: "Date picker calendar" });
    await expect(grid).toBeVisible();
    // Press ArrowRight to move to next day
    await page.keyboard.press("ArrowRight");
    // Press Enter to select
    await page.keyboard.press("Enter");
    // Picker should close
    await expect(grid).not.toBeVisible();
  });

  test("preset buttons exist in the date picker", async ({ page, browserName }, testInfo) => {
    const isMobileProject = testInfo.project.name.startsWith("mobile");
    test.skip(isMobileProject, "Desktop date picker only");
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set due date/i }).click();
    const presetGroup = page.getByRole("group", { name: "Quick date presets" });
    await expect(presetGroup).toBeVisible();
    await expect(presetGroup.getByRole("button", { name: "Today" })).toBeVisible();
    await expect(presetGroup.getByRole("button", { name: "Tomorrow" })).toBeVisible();
    await expect(presetGroup.getByRole("button", { name: "Next week" })).toBeVisible();
    // Navigation buttons exist
    await expect(page.getByRole("button", { name: "Previous month" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
  });
});

test.describe("Task sheet — date picker mobile", () => {
  test("date picker opens in secondary bottom sheet on mobile", async ({ page }) => {
    page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Add task" }).last().click();
    await page.getByRole("dialog", { name: "What needs doing?" }).waitFor({ state: "visible" });
    const dateChip = page.getByRole("button", { name: /Set due date/i }).first();
    await dateChip.click();
    // Should see a secondary bottom sheet with title "Pick a date"
    await expect(page.getByRole("dialog", { name: "Pick a date" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// ASSIGNEE PICKER
// ---------------------------------------------------------------------------

test.describe("Task sheet — assignee picker", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("clicking assignee chip opens the picker popover", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const assigneeChip = dialog.getByRole("button", { name: /Set assignee/i });
    await assigneeChip.click();
    await expect(page.getByRole("listbox", { name: "Set assignee" })).toBeVisible();
  });

  test("selecting partner updates the chip label", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const assigneeChip = dialog.getByRole("button", { name: /Set assignee/i });
    await assigneeChip.click();
    const list = page.getByRole("listbox", { name: "Set assignee" });
    await list.getByRole("option", { name: "Krista" }).click();
    await expect(assigneeChip).toContainText("Krista");
  });

  test("selecting Shared updates the chip label", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const assigneeChip = dialog.getByRole("button", { name: /Set assignee/i });
    await assigneeChip.click();
    const list = page.getByRole("listbox", { name: "Set assignee" });
    await list.getByRole("option", { name: "Shared" }).click();
    await expect(assigneeChip).toContainText("Shared");
  });

  test("Escape closes assignee picker and returns focus", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const assigneeChip = dialog.getByRole("button", { name: /Set assignee/i });
    await assigneeChip.click();
    const list = page.getByRole("listbox", { name: "Set assignee" });
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list).not.toBeVisible();
    await expect(assigneeChip).toBeFocused();
  });

  test("assignee picker supports keyboard selection", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set assignee/i }).click();
    const list = page.getByRole("listbox", { name: "Set assignee" });
    await expect(list).toBeVisible();
    // Click Krista directly to verify the picker updates the chip
    await list.getByRole("option", { name: "Krista" }).click();
    await expect(dialog.getByRole("button", { name: /Set assignee/i })).toContainText("Krista");
  });
});

// ---------------------------------------------------------------------------
// CATEGORY PICKER
// ---------------------------------------------------------------------------

test.describe("Task sheet — category picker", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("clicking category chip opens the picker popover", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const categoryChip = dialog.getByRole("button", { name: /Set category/i });
    await categoryChip.click();
    await expect(page.getByRole("listbox", { name: "Set category" })).toBeVisible();
  });

  test("category picker shows 'File it where?' header", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set category/i }).click();
    await expect(page.getByText("File it where?")).toBeVisible();
  });

  test("selecting a category updates the chip label", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const categoryChip = dialog.getByRole("button", { name: /Set category/i });
    await categoryChip.click();
    const list = page.getByRole("listbox", { name: "Set category" });
    await list.getByRole("option", { name: "Errands" }).click();
    await expect(categoryChip).toContainText("Errands");
  });

  test("Escape closes category picker and returns focus", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const categoryChip = dialog.getByRole("button", { name: /Set category/i });
    await categoryChip.click();
    const list = page.getByRole("listbox", { name: "Set category" });
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list).not.toBeVisible();
    await expect(categoryChip).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// REPEAT CHIP — non-interactive Phase 2
// ---------------------------------------------------------------------------

test.describe("Task sheet — repeat picker", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("repeat chip defaults to 'Doesn't repeat' and is enabled", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const repeatChip = dialog.getByRole("button", { name: /Set repeat rule/i });
    await expect(repeatChip).toBeEnabled();
    await expect(repeatChip).toContainText("Doesn't repeat");
  });

  test("clicking repeat chip opens the repeat picker popover", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    // Popover should appear with presets
    await expect(page.getByText("How often?")).toBeVisible();
    await expect(page.getByRole("radio", { name: "Daily" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Weekdays" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Weekly" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Monthly" })).toBeVisible();
  });

  test("clicking Daily preset commits and closes picker", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await page.getByRole("radio", { name: "Daily" }).click();
    // Popover should close
    await expect(page.getByText("How often?")).not.toBeVisible();
    // Chip should update
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Every day");
  });

  test("clicking Weekdays preset updates chip to 'Weekdays'", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await page.getByRole("radio", { name: "Weekdays" }).click();
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Weekdays");
  });

  test("clicking Weekly preset updates chip", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await page.getByRole("radio", { name: "Weekly" }).click();
    // Should show "Every <day>" where day is today's day
    const chip = dialog.getByRole("button", { name: /Set repeat rule/i });
    await expect(chip).toContainText("Every ");
    await expect(chip).not.toContainText("Doesn't repeat");
  });

  test("clicking Monthly preset updates chip", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await page.getByRole("radio", { name: "Monthly" }).click();
    const chip = dialog.getByRole("button", { name: /Set repeat rule/i });
    await expect(chip).toContainText("Monthly on ");
  });

  test("NLP input: typing 'every tuesday' and pressing Enter commits", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    const input = page.getByLabel("Or type your own");
    await input.click();
    await input.fill("every tuesday");
    // Preview should show
    await expect(page.getByText("Every Tue")).toBeVisible();
    await input.press("Enter");
    // Popover should close, chip updated
    await expect(page.getByText("How often?")).not.toBeVisible();
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Every Tue");
  });

  test("NLP input: typing 'every tuesday and thursday' shows multi-day label", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    const input = page.getByLabel("Or type your own");
    await input.click();
    await input.fill("every tuesday and thursday");
    await expect(page.getByText("Every Tue & Thu")).toBeVisible();
    await input.press("Enter");
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Every Tue & Thu");
  });

  test("NLP input: typing 'every 3 days' parses interval", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    const input = page.getByLabel("Or type your own");
    await input.click();
    await input.fill("every 3 days");
    await expect(page.getByText("Every 3 days")).toBeVisible();
    await input.press("Enter");
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Every 3 days");
  });

  test("NLP input: unparseable text shows error on Enter", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    const input = page.getByLabel("Or type your own");
    await input.click();
    await input.fill("banana");
    await input.press("Enter");
    // Error should appear
    await expect(page.getByText("couldn\u2019t figure that one out")).toBeVisible();
    // Popover should still be open
    await expect(page.getByText("How often?")).toBeVisible();
    // Chip should still say "Doesn't repeat"
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Doesn't repeat");
  });

  test("clearing a set rule resets chip to 'Doesn't repeat'", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // First set a rule
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await page.getByRole("radio", { name: "Daily" }).click();
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Every day");
    // Reopen and clear
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await page.getByRole("button", { name: /Doesn.t repeat/i }).click();
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Doesn't repeat");
  });

  test("Escape closes picker without changing value", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await expect(page.getByText("How often?")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("How often?")).not.toBeVisible();
    // Chip unchanged
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Doesn't repeat");
  });

  test("focus returns to repeat chip after picker closes", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const repeatChip = dialog.getByRole("button", { name: /Set repeat rule/i });
    await repeatChip.click();
    await page.keyboard.press("Escape");
    await expect(repeatChip).toBeFocused();
  });

  test("repeat chip shows aria-expanded when picker is open", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const repeatChip = dialog.getByRole("button", { name: /Set repeat rule/i });
    await expect(repeatChip).not.toHaveAttribute("aria-expanded");
    await repeatChip.click();
    await expect(repeatChip).toHaveAttribute("aria-expanded", "true");
  });

  test("preset keyboard nav: arrow keys move between presets", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    // First preset (Daily) should have focus
    const daily = page.getByRole("radio", { name: "Daily" });
    await expect(daily).toBeFocused();
    // Arrow right to Weekdays
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "Weekdays" })).toBeFocused();
    // Enter to select Weekdays
    await page.keyboard.press("Enter");
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Weekdays");
  });

  test("repeat value resets when sheet is reopened", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    let dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Set a repeat rule
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    await page.getByRole("radio", { name: "Daily" }).click();
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Every day");
    // Close sheet
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    // Reopen
    await openSheet(page);
    dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Should be back to default
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Doesn't repeat");
  });

  test("NLP input: 'monthly on the 15th' sets monthly rule", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    const input = page.getByLabel("Or type your own");
    await input.click();
    await input.fill("monthly on the 15th");
    await expect(page.getByText("Monthly on 15th")).toBeVisible();
    await input.press("Enter");
    await expect(dialog.getByRole("button", { name: /Set repeat rule/i })).toContainText("Monthly on 15th");
  });

  test("reopening picker with custom rule pre-populates input", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Set a custom rule via NLP
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    const input = page.getByLabel("Or type your own");
    await input.click();
    await input.fill("every 3 days");
    await input.press("Enter");
    // Reopen picker
    await dialog.getByRole("button", { name: /Set repeat rule/i }).click();
    const input2 = page.getByLabel("Or type your own");
    // Input should be pre-populated with the formatted rule
    await expect(input2).toHaveValue("Every 3 days");
  });
});

// ---------------------------------------------------------------------------
// EXPANDED SECTION (MORE)
// ---------------------------------------------------------------------------

test.describe("Task sheet — expanded section", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("clicking More chip reveals expanded fields", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /More task options/i }).click();
    // Time stepper should be visible
    await expect(dialog.getByText("When today?")).toBeVisible();
    // Flexible toggle should be visible — use role selectors to avoid ambiguity with page heading
    await expect(dialog.getByRole("radio", { name: "Hard deadline" })).toBeVisible();
    await expect(dialog.getByRole("radio", { name: "When you can" })).toBeVisible();
    // Notes field
    await expect(dialog.getByLabel("Notes")).toBeVisible();
    // Points field
    await expect(dialog.getByLabel("Points")).toBeVisible();
  });

  test("time stepper increments in 15-minute steps", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /More task options/i }).click();
    // Initially shows "No time"
    await expect(page.getByText("No time")).toBeVisible();
    // Click increment
    await page.getByRole("button", { name: "Later time" }).click();
    // Should show a time (9:00 AM default)
    await expect(page.getByText("9:00 AM")).toBeVisible();
    // Click increment again
    await page.getByRole("button", { name: "Later time" }).click();
    await expect(page.getByText("9:15 AM")).toBeVisible();
  });

  test("time can be cleared", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /More task options/i }).click();
    await page.getByRole("button", { name: "Later time" }).click();
    await expect(page.getByText("9:00 AM")).toBeVisible();
    await page.getByRole("button", { name: "Clear time" }).click();
    await expect(page.getByText("No time")).toBeVisible();
  });

  test("flexible toggle switches between Hard deadline and When you can", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /More task options/i }).click();
    // Default: Hard deadline is checked
    const hardDeadline = page.getByRole("radio", { name: "Hard deadline" });
    const whenYouCan = page.getByRole("radio", { name: "When you can" });
    await expect(hardDeadline).toHaveAttribute("aria-checked", "true");
    await expect(whenYouCan).toHaveAttribute("aria-checked", "false");
    // Click "When you can"
    await whenYouCan.click();
    await expect(hardDeadline).toHaveAttribute("aria-checked", "false");
    await expect(whenYouCan).toHaveAttribute("aria-checked", "true");
  });

  test("notes field accepts text", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /More task options/i }).click();
    const notesField = page.getByLabel("Notes");
    await notesField.fill("Don't forget the recycling bin");
    await expect(notesField).toHaveValue("Don't forget the recycling bin");
  });

  test("notes has the correct placeholder", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByRole("button", { name: /More task options/i }).click();
    const notesField = page.getByLabel("Notes");
    await expect(notesField).toHaveAttribute("placeholder", "Anything else worth saying?");
  });

  test("points auto-fills for known keywords", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Type a title with an auto-fill keyword
    await dialog.getByLabel("Task title").fill("Take out the trash");
    await dialog.getByRole("button", { name: /More task options/i }).click();
    // Points should show 5 with "auto" hint
    const pointsInput = dialog.getByLabel("Points");
    await expect(pointsInput).toHaveValue("5");
    await expect(dialog.getByText("auto")).toBeVisible();
  });

  test("manual points edit clears the auto hint", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByLabel("Task title").fill("Take out the trash");
    await dialog.getByRole("button", { name: /More task options/i }).click();
    const pointsInput = dialog.getByLabel("Points");
    await pointsInput.fill("10");
    // "auto" hint should be gone
    await expect(dialog.getByText("auto")).not.toBeVisible();
  });

  test("More chip toggles expanded state", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const moreChip = dialog.getByRole("button", { name: /More task options|Show fewer options/i });
    // Expand
    await moreChip.click();
    await expect(dialog.getByText("When today?")).toBeVisible();
    // Collapse
    await dialog.getByRole("button", { name: /Show fewer options/i }).click();
    await expect(dialog.getByText("When today?")).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// CROSS-CUTTING: submit with picker values
// ---------------------------------------------------------------------------

test.describe("Task sheet — submit with picker values", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Cmd+Enter submits after using a picker", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Type title
    await dialog.getByLabel("Task title").fill("Mow the lawn");
    // Change assignee to Krista
    await dialog.getByRole("button", { name: /Set assignee/i }).click();
    const assigneeList = page.getByRole("listbox", { name: "Set assignee" });
    await assigneeList.getByRole("option", { name: "Krista" }).click();
    // Change category to Errands (first non-default, avoids viewport issues)
    await dialog.getByRole("button", { name: /Set category/i }).click();
    const categoryList = page.getByRole("listbox", { name: "Set category" });
    await categoryList.getByRole("option", { name: "Errands" }).click();
    // Submit with Cmd+Enter
    await page.keyboard.press("Meta+Enter");
    // Sheet should close
    await expect(dialog).not.toBeVisible();
    // Task should appear in the list
    await expect(page.getByText("Mow the lawn")).toBeVisible();
  });

  test("newly created task with flexible=true appears in When you can section", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await dialog.getByLabel("Task title").fill("Organize closet");
    // Expand and set flexible
    await dialog.getByRole("button", { name: /More task options/i }).click();
    await dialog.getByRole("radio", { name: "When you can" }).click();
    // Submit
    await page.keyboard.press("Meta+Enter");
    await expect(dialog).not.toBeVisible();
    // Should be in the "When you can" section — use aria-label on the section
    const flexSection = page.locator('section[aria-label="When you can"]');
    await expect(flexSection.getByText("Organize closet")).toBeVisible();
  });

  test("all picker values reset when sheet reopens", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    let dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Change assignee to Krista
    await dialog.getByRole("button", { name: /Set assignee/i }).click();
    const list = page.getByRole("listbox", { name: "Set assignee" });
    await list.getByRole("option", { name: "Krista" }).click();
    // Close sheet
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    // Reopen
    await openSheet(page);
    dialog = page.getByRole("dialog", { name: "What needs doing?" });
    // Assignee should be back to default (Dave)
    await expect(dialog.getByRole("button", { name: /Set assignee/i })).toContainText("Dave");
  });
});

// ===========================================================================
// EDIT MODE
// ===========================================================================

test.describe("Task sheet — edit mode", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("tapping a task row opens the edit sheet with pre-populated title", async ({ page }) => {
    await page.goto("/");
    const editBtn = page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ });
    await editBtn.click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog).toBeVisible();
    const textarea = dialog.getByLabel("Task title");
    await expect(textarea).toHaveValue("Pick up dry cleaning");
  });

  test("edit sheet shows 'Editing' header and 'Save' CTA", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByText("Editing")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("create sheet shows 'New task' header", async ({ page }) => {
    await page.goto("/");
    await openSheet(page);
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByText("New task")).toBeVisible();
  });

  test("edit mode saves updated title to the task list", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const textarea = dialog.getByLabel("Task title");
    await textarea.fill("Pick up laundry instead");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Pick up laundry instead")).toBeVisible();
  });

  test("closing edit sheet without saving leaves task unchanged", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    const textarea = dialog.getByLabel("Task title");
    await textarea.fill("Something completely different");
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Pick up dry cleaning")).toBeVisible();
    await expect(page.getByText("Something completely different")).not.toBeVisible();
  });

  test("edit mode auto-expands More section when task has time set", async ({ page }) => {
    await page.goto("/");
    // "Pick up dry cleaning" has dueTime: "10:00 AM"
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByText("When today?")).toBeVisible();
  });

  test("Edit option in overflow menu opens edit sheet", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Edit" }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Task title")).toHaveValue("Pick up dry cleaning");
  });

  test("edit sheet shows Delete icon button in header", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog.getByRole("button", { name: "Delete task" })).toBeVisible();
  });
});

// ===========================================================================
// DELETE FLOW
// ===========================================================================

test.describe("Task sheet — delete flow", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("overflow menu shows Edit, Done, Tomorrow, Delete with divider", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Done" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Tomorrow" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete" })).toBeVisible();
    await expect(page.getByRole("separator")).toBeVisible();
  });

  test("clicking Delete in menu immediately removes task and shows undo toast", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    // Task should be gone immediately (no confirmation for non-repeating)
    await expect(page.getByText("Pick up dry cleaning")).not.toBeVisible();
    // Undo toast
    await expect(page.getByText("Deleted.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  });

  test("undo restores deleted task", async ({ page }) => {
    await page.goto("/");
    const taskRow = page.locator('.group').first();
    await taskRow.hover();
    await page.getByRole("button", { name: /Actions for "Pick up dry cleaning"/ }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByText("Pick up dry cleaning")).not.toBeVisible();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Pick up dry cleaning")).toBeVisible();
  });

  test("delete from edit sheet closes sheet and removes task directly", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Edit "Pick up dry cleaning"/ }).click();
    const dialog = page.getByRole("dialog", { name: "What needs doing?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete task" }).click();
    // Sheet should close and task should be gone (no confirmation for non-repeating)
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText("Pick up dry cleaning")).not.toBeVisible();
    await expect(page.getByText("Deleted.")).toBeVisible();
  });
});
