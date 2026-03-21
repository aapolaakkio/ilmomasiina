import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { test as setup } from "@playwright/test";

import { resetDb } from "./helpers/resetDb";
import { seedAdminUser } from "./helpers/seed";
import { signInAsTestUser } from "./helpers/testSession";

const ADMIN_AUTH_FILE = "tests/.auth/admin.json";

setup("authenticate as admin", async ({ page }) => {
  await resetDb();
  await seedAdminUser("admin@test.com");

  await signInAsTestUser(page, "admin@test.com");
  await page.goto("/admin");
  await page.waitForURL("**/admin");

  mkdirSync(dirname(ADMIN_AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: ADMIN_AUTH_FILE });
});
