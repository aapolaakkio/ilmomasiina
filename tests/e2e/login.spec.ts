import { test, expect } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser } from "../helpers/seed";
import { signInAsTestUser } from "../helpers/testSession";

// These tests use their own auth state (not the admin storageState).
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await resetDb();
});

test("login page shows sign-in button", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("minted session allows admin access", async ({ page }) => {
  await seedAdminUser("admin@test.com");
  await signInAsTestUser(page, "admin@test.com");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
});

test("test session rejects unknown email", async ({ page }) => {
  const response = await page.request.post("/api/test/session", {
    data: { email: "unknown@test.com" },
  });
  expect(response.status()).toBe(404);
});
