import { expect, test } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedEvent, seedFullEvent } from "../helpers/seed";

// Authenticated as admin via `storageState` in playwright.config.ts (auth.setup.ts).

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser("admin@test.com");
});

test.describe("admin event list", () => {
  test("shows all seeded events", async ({ page }) => {
    await seedEvent({ title: "Active Event", slug: "active" });
    await seedEvent({ title: "Draft Event", slug: "draft", draft: true });

    await page.goto("/en/admin");
    await expect(page.getByText("Active Event")).toBeVisible();
    await expect(page.getByText("Draft Event")).toBeVisible();
  });

  test("has new event button", async ({ page }) => {
    await page.goto("/en/admin");
    await expect(page.getByText(/new event/i)).toBeVisible();
  });
});

test.describe("create event", () => {
  test("admin can create a new event", async ({ page }) => {
    await page.goto("/en/admin/edit/new");

    // Fill basic details
    await page.locator("#editor-title").fill("New Test Event");
    await page.locator("#editor-slug").clear();
    await page.locator("#editor-slug").fill("new-test-event");

    // Set dates
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const pastDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    await page.locator("#editor-date").fill(formatDatetimeLocal(future));
    await page.locator("#editor-regStart").fill(formatDatetimeLocal(pastDate));
    await page.locator("#editor-regEnd").fill(formatDatetimeLocal(future));

    // Switch to Quotas tab and add quota details
    await page.getByRole("tab", { name: /quotas/i }).click();
    await page.locator('[id^="quota-title-"]').first().fill("General Admission");
    await page.locator('[id^="quota-size-"]').first().fill("50");

    // Save as draft — create flow redirects to the new event editor (no in-place success toast).
    await page.getByRole("button", { name: /save as draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/edit\/[^/]+$/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/new$/);
  });
});

test.describe("edit event", () => {
  test("admin can edit an existing event", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Editable Event", slug: "editable" },
      { title: "Default Quota", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);

    // Change the title
    await page.locator("#editor-title").clear();
    await page.locator("#editor-title").fill("Updated Event Title");

    // Save changes
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully|tallennettiin/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("delete event", () => {
  test("admin can delete an event from the list", async ({ page }) => {
    await seedEvent({ title: "Delete Me Event", slug: "delete-me" });

    await page.goto("/en/admin");
    await expect(page.getByText("Delete Me Event")).toBeVisible();

    // Click delete and confirm in the browser dialog
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: /delete/i }).click();

    // Event should be removed from the list
    await expect(page.getByText("Delete Me Event")).not.toBeVisible();
  });
});

/** Format a Date to datetime-local input value (YYYY-MM-DDTHH:MM). */
function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
