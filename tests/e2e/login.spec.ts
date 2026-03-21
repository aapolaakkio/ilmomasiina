import { test, expect } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser } from "../helpers/seed";

// These tests use their own auth state (not the admin storageState).
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await resetDb();
});

test("login page shows sign-in button", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("login page shows test credentials form in test mode", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#test-credentials-email")).toBeVisible();
});

test("login with test credentials redirects to admin", async ({ page }) => {
  await seedAdminUser("admin@test.com");
  await page.goto("/login");
  await page.locator("#test-credentials-email").fill("admin@test.com");
  await page.locator("#test-credentials-email").press("Enter");
  await page.waitForURL("**/admin");
  await expect(page).toHaveURL(/\/admin/);
});

test("login with unknown email shows error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#test-credentials-email").fill("unknown@test.com");
  await page.locator("#test-credentials-email").press("Enter");
  await page.waitForURL("**/login**");
  await expect(page.getByRole("alert")).toBeVisible();
});
