import { expect, test } from "@playwright/test";

import { PaymentMode } from "../../src/db/schema";
import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent, seedSignup } from "../helpers/seed";

// Uses admin storageState from auth.setup.ts.

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser("admin@test.com");
});

test.describe("view signups", () => {
  test("admin can view signups in the signups tab", async ({ page }) => {
    const { event, quota } = await seedFullEvent(
      { title: "Signups Test Event", slug: "signups-test" },
      { title: "General", size: 10 },
    );
    await seedSignup(quota.id, { firstName: "Alice", lastName: "Johnson", email: "alice@test.com" });
    await seedSignup(quota.id, { firstName: "Bob", lastName: "Smith", email: "bob@test.com" });

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /signups/i }).click();

    await expect(page.getByText("Alice")).toBeVisible();
    await expect(page.getByText("Bob")).toBeVisible();
  });
});

test.describe("create signup as admin", () => {
  test("admin can create a signup via modal", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Admin Signup Event", slug: "admin-signup" },
      { title: "General", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /signups/i }).click();

    // Open create signup modal
    await page.getByRole("button", { name: /create signup/i }).click();

    // Fill modal form
    const modal = page.locator("dialog");
    await modal.locator('input[name="firstName"]').fill("New");
    await modal.locator('input[name="lastName"]').fill("Signup");
    await modal.locator('input[name="email"]').fill("new@test.com");

    // Save
    await modal.getByRole("button", { name: /save/i }).click();

    // Verify signup appears in the list
    await expect(page.getByText("New")).toBeVisible();
  });
});

test.describe("edit signup as admin", () => {
  test("admin can edit a signup's details", async ({ page }) => {
    const { event, quota } = await seedFullEvent(
      { title: "Edit Signup Event", slug: "edit-signup" },
      { title: "General", size: 10 },
    );
    await seedSignup(quota.id, { firstName: "Original", lastName: "Name" });

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /signups/i }).click();

    // Click edit on the signup
    await page.getByRole("button", { name: /edit/i }).first().click();

    // Change name in the modal
    const modal = page.locator("dialog");
    await modal.locator('input[name="firstName"]').clear();
    await modal.locator('input[name="firstName"]').fill("Modified");

    // Save
    await modal.getByRole("button", { name: /save/i }).click();

    // Verify updated name
    await expect(page.getByText("Modified")).toBeVisible();
  });
});

test.describe("manual payment status", () => {
  test("admin can mark signup as paid", async ({ page }) => {
    const { event, quota } = await seedFullEvent(
      { title: "Payment Event", slug: "payment-event", payments: PaymentMode.MANUAL },
      { title: "General", size: 10, price: 1000 },
    );
    await seedSignup(quota.id, {
      firstName: "Payer",
      lastName: "Test",
      price: 1000,
      currency: "EUR",
    });

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /signups/i }).click();

    // Edit signup to change payment status
    await page.getByRole("button", { name: /edit/i }).first().click();

    const modal = page.locator("dialog");
    await modal.locator('select[name="manualPaymentStatus"]').selectOption("paid");
    await modal.getByRole("button", { name: /save/i }).click();

    // Payment status should be updated in the table
    await expect(page.getByText(/paid/i)).toBeVisible();
  });
});

test.describe("delete signup as admin", () => {
  test("admin can delete a signup", async ({ page }) => {
    const { event, quota } = await seedFullEvent(
      { title: "Delete Signup Event", slug: "delete-signup" },
      { title: "General", size: 10 },
    );
    await seedSignup(quota.id, { firstName: "ToDelete", lastName: "User" });

    await page.goto(`/en/admin/edit/${event.id}`);
    await page.getByRole("tab", { name: /signups/i }).click();

    await expect(page.getByText("ToDelete")).toBeVisible();

    // Click delete and confirm
    page.on("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", { name: /delete/i })
      .first()
      .click();

    // Signup should be removed
    await expect(page.getByText("ToDelete")).not.toBeVisible();
  });
});
