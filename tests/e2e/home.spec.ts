import { test, expect } from "@playwright/test";

test("home page loads with event list heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});
