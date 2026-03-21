import { test as setup } from "@playwright/test";

import { resetDb } from "./helpers/resetDb";
import { seedAdminUser } from "./helpers/seed";

const ADMIN_AUTH_FILE = "tests/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  // Reset DB and seed an admin user
  await resetDb();
  await seedAdminUser("admin@test.com");

  // Log in via the test credentials form
  await page.goto("/login");
  await page.locator("#test-credentials-email").fill("admin@test.com");
  await page.locator("#test-credentials-email").press("Enter");

  // Wait for redirect to admin page
  await page.waitForURL("**/admin");

  // Save the authenticated state
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
