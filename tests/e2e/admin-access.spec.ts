import { expect, test } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedEditorUser, seedEvent, seedEventEditor } from "../helpers/seed";

test.describe("unauthenticated access", () => {
  // No auth — clear storageState.
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    await resetDb();
    await seedAdminUser();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/en/admin");
    await page.waitForURL("**/login**");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("editor role access", () => {
  // Editor logs in with their own credentials — no storageState.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("editor can only see events they have access to", async ({ page }) => {
    await resetDb();
    await seedAdminUser("admin@test.com");
    const editor = await seedEditorUser("editor@test.com");

    const ownEvent = await seedEvent({ title: "Editor's Event", slug: "editor-event" });
    await seedEventEditor(ownEvent.id, editor.id);

    await seedEvent({ title: "Admin Only Event", slug: "admin-only" });

    // Login as editor
    await page.goto("/en/login");
    await page.locator("#test-credentials-email").fill("editor@test.com");
    await page.locator("#test-credentials-email").press("Enter");
    await page.waitForURL("**/admin");

    // Editor should see their event
    await expect(page.getByText("Editor's Event")).toBeVisible();
    // Editor should not see admin-only event
    await expect(page.getByText("Admin Only Event")).not.toBeVisible();
  });
});
