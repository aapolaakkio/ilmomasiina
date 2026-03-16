import { test, expect } from "@playwright/test";

test("login page has email and password fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
});

test("login with wrong credentials shows error", async ({ page }) => {
  await page.goto("/login");
  await page.locator("#login-email").fill("wrong@example.com");
  await page.locator("#login-password").fill("wrongpassword");
  await page.locator("button[type=submit]").click();
  await expect(page.locator("[role=alert]")).toBeVisible();
});
