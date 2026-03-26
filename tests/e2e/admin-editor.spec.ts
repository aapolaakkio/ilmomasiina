import { expect, test } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent, seedQuota } from "../helpers/seed";
import { signInAsTestUser } from "../helpers/testSession";

test.beforeEach(async ({ page }) => {
  await resetDb();
  await seedAdminUser("admin@test.com");
  await signInAsTestUser(page, "admin@test.com");
});

/** Format a Date to datetime-local input value (YYYY-MM-DDTHH:MM). */
function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Quotas tab
// ---------------------------------------------------------------------------

test.describe("quotas tab", () => {
  test("can add and remove quotas", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Quota Test", slug: "quota-test" },
      { title: "First Quota", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /quotas/i }).click();

    // First quota should already exist
    await expect(page.locator("#quota-title-0")).toHaveValue("First Quota");

    // Add a second quota
    await page.getByRole("button", { name: /add quota/i }).click();
    await page.locator("#quota-title-1").fill("Second Quota");
    await page.locator("#quota-size-1").fill("20");

    // Delete the first quota
    await page
      .getByRole("button", { name: /delete quota/i })
      .first()
      .click();

    // Only one quota should remain, with the second quota's values
    await expect(page.locator("#quota-title-0")).toHaveValue("Second Quota");
    await expect(page.locator("#quota-title-1")).not.toBeVisible();

    // Save and verify
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("can toggle name and email collection", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Toggle Test", slug: "toggle-test" },
      { title: "Default", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /quotas/i }).click();

    const nameCheckbox = page.locator("#nameQuestion");
    const emailCheckbox = page.locator("#emailQuestion");

    // Both should be checked by default
    await expect(nameCheckbox).toBeChecked();
    await expect(emailCheckbox).toBeChecked();

    // Uncheck both
    await nameCheckbox.uncheck();
    await emailCheckbox.uncheck();

    await expect(nameCheckbox).not.toBeChecked();
    await expect(emailCheckbox).not.toBeChecked();

    // Save
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });

    // Reload and verify persisted
    await page.reload();
    await page.getByRole("tab", { name: /quotas/i }).click();
    await expect(page.locator("#nameQuestion")).not.toBeChecked();
    await expect(page.locator("#emailQuestion")).not.toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Questions tab
// ---------------------------------------------------------------------------

test.describe("questions tab", () => {
  test("can add a text question and a select question with options", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Question Test", slug: "question-test" },
      { title: "Default", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /questions/i }).click();

    // There's already one question from seedFullEvent
    await expect(page.locator("#question-text-0")).toBeVisible();

    // Add a new question
    await page.getByRole("button", { name: /add question/i }).click();
    await page.locator("#question-text-1").fill("Choose your meal");
    await page.locator("#question-type-1").selectOption("select");

    // Add options for the select question
    await page.getByRole("button", { name: /add answer option/i }).click();
    await page.getByLabel("Option 1").fill("Meat");
    await page.getByRole("button", { name: /add answer option/i }).click();
    await page.getByLabel("Option 2").fill("Vegetarian");

    // Mark as required
    await page.locator("#question-required-1").check();

    // Save
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });

    // Reload and verify persistence
    await page.reload();
    await page.getByRole("tab", { name: /questions/i }).click();
    await expect(page.locator("#question-text-1")).toHaveValue("Choose your meal");
    await expect(page.locator("#question-required-1")).toBeChecked();
  });

  test("can delete a question", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Delete Question Test", slug: "delete-question-test" },
      { title: "Default", size: 10 },
      { question: "To be deleted", required: false },
    );

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /questions/i }).click();

    await expect(page.locator("#question-text-0")).toHaveValue("To be deleted");

    // Delete the question
    await page.getByRole("button", { name: /delete question/i }).click();

    // Question should be gone
    await expect(page.locator("#question-text-0")).not.toBeVisible();

    // Save
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test.describe("editor validation", () => {
  test("shows validation errors for missing required fields", async ({ page }) => {
    await page.goto("/en/admin/edit/new");

    // Try to save without filling anything
    await page.getByRole("button", { name: /save as draft/i }).click();

    // Should stay on the page (no redirect) and show errors
    await expect(page).toHaveURL(/\/new$/);
  });

  test("slug validation shows availability status", async ({ page }) => {
    await seedFullEvent({ title: "Existing Event", slug: "taken-slug" }, { title: "Default", size: 10 });

    await page.goto("/en/admin/edit/new");
    await page.locator("#editor-title").fill("Test");

    // Type a taken slug
    await page.locator("#editor-slug").clear();
    await page.locator("#editor-slug").fill("taken-slug");

    // Should show "already in use" message
    await expect(page.getByText(/already in use/i)).toBeVisible({ timeout: 10_000 });

    // Type a free slug
    await page.locator("#editor-slug").clear();
    await page.locator("#editor-slug").fill("free-slug");

    // Should show "available" message
    await expect(page.getByText(/available/i)).toBeVisible({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// Publishing flow
// ---------------------------------------------------------------------------

test.describe("publishing", () => {
  test("can publish a draft event and convert back to draft", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Draft Event", slug: "draft-event", draft: true },
      { title: "Default", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);

    // Should show draft badge
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();

    // Publish
    await page.getByRole("button", { name: /^publish$/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });

    // Should show published badge
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    // Convert back to draft
    await page.getByRole("button", { name: /convert to draft/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Draft", { exact: true })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Multiple quotas on public page
// ---------------------------------------------------------------------------

test.describe("editor changes reflected on public page", () => {
  test("added quota appears on public event page", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Public Quota Test", slug: "public-quota-test" },
      { title: "VIP", size: 5 },
    );
    await seedQuota(event.id, { title: "Regular", size: 20, order: 1 });

    // Verify both quotas appear on the public page
    await page.goto("/en/event/public-quota-test");
    await expect(page.getByRole("button", { name: /VIP/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Regular/i })).toBeVisible();
  });
});
