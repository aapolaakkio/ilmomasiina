import { expect, test } from "@playwright/test";

import { generateEditToken } from "../helpers/editToken";
import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent, seedSignup } from "../helpers/seed";

// Public pages — no auth needed.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser();
});

test("user can edit their signup via edit token", async ({ page }) => {
  const { quota } = await seedFullEvent(
    { title: "Editable Event", slug: "editable-event" },
    { title: "Default", size: 10 },
    { question: "Dietary preference?", required: true },
  );
  const signup = await seedSignup(quota.id, {
    firstName: "Original",
    lastName: "Name",
    email: "original@example.com",
  });
  const editToken = generateEditToken(signup.id);

  await page.goto(`/en/signup/${signup.id}/${editToken}`);

  // Form should be pre-filled with existing data
  await expect(page.locator("#signup-firstName")).toHaveValue("Original");
  await expect(page.locator("#signup-lastName")).toHaveValue("Name");

  // Change name
  await page.locator("#signup-firstName").clear();
  await page.locator("#signup-firstName").fill("Updated");
  await page.getByRole("button", { name: /update/i }).click();

  // Form should reflect updated value
  await expect(page.locator("#signup-firstName")).toHaveValue("Updated");
});

test("invalid edit token shows not found", async ({ page }) => {
  const { quota } = await seedFullEvent(
    { title: "Token Test Event", slug: "token-test" },
    { title: "Default", size: 10 },
  );
  const signup = await seedSignup(quota.id);

  await page.goto(`/en/signup/${signup.id}/invalidtoken12`);

  // Should show 404 or error
  await expect(page).toHaveURL(/\/signup\//);
  // The page should show a not-found state (404 page renders by default in Next.js)
  await expect(page.getByText(/not found/i)).toBeVisible();
});
