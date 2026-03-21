import { test, expect } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedEvent } from "../helpers/seed";

// Use unauthenticated state for public pages.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await resetDb();
  // Seed an admin user so the app doesn't show initial setup page.
  await seedAdminUser();
});

test("home page loads with event list heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("home page shows seeded events", async ({ page }) => {
  await seedEvent({ title: "Visible Event", slug: "visible-event" });
  await seedEvent({ title: "Draft Event", slug: "draft-event", draft: true });

  await page.goto("/");
  // Title can appear twice (e.g. card link + secondary link).
  await expect(page.getByRole("link", { name: "Visible Event" }).first()).toBeVisible();
  // Draft events should not be shown to public users.
  await expect(page.getByText("Draft Event")).not.toBeVisible();
});
