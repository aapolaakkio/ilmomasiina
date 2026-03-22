import { expect, test } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedEditorUser, seedEvent, seedEventEditor } from "../helpers/seed";
import { signInAsTestUser } from "../helpers/testSession";

test.describe("unauthenticated access", () => {
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
  test("editor sees all events in the list; edit and delete only for events they can edit; read-only for others", async ({
    page,
  }) => {
    await resetDb();
    await seedAdminUser("admin@test.com");
    const editor = await seedEditorUser("editor@test.com");

    const ownEvent = await seedEvent({ title: "Editor's Event", slug: "editor-event" });
    await seedEventEditor(ownEvent.id, editor.id);

    const otherEvent = await seedEvent({ title: "Admin Only Event", slug: "admin-only" });

    await signInAsTestUser(page, "editor@test.com");
    await page.goto("/en/admin");

    await expect(page.getByText("Editor's Event")).toBeVisible();
    await expect(page.getByText("Admin Only Event")).toBeVisible();

    const assignedRow = page.getByRole("row").filter({ hasText: "Editor's Event" });

    await expect(assignedRow.getByRole("link", { name: "Edit", exact: true })).toBeVisible();
    await expect(assignedRow.getByRole("button", { name: "Delete" })).toBeVisible();

    const readOnlyListRow = page.getByRole("row").filter({ hasText: "Admin Only Event" });
    await expect(readOnlyListRow.getByRole("link", { name: "View" })).toBeVisible();
    await expect(readOnlyListRow.getByRole("button", { name: "Delete" })).toHaveCount(0);

    await page.goto(`/en/admin/edit/${otherEvent.id}`);
    await expect(page.getByText(/read-only mode/i)).toBeVisible();
  });
});
