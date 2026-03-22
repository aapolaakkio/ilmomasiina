import { test } from "@playwright/test";

import { generateEditToken } from "../helpers/editToken";
import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent, seedSignup } from "../helpers/seed";

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser();
});

test("user can delete their signup", async ({ page }) => {
  const { event, quota } = await seedFullEvent(
    { title: "Delete Test Event", slug: "delete-test" },
    { title: "Default", size: 10 },
  );
  const signup = await seedSignup(quota.id, {
    firstName: "Delete",
    lastName: "Me",
  });
  const editToken = generateEditToken(signup.id);

  await page.goto(`/en/signup/${signup.id}/${editToken}`);

  // First click shows confirmation
  await page.getByRole("button", { name: /delete signup/i }).click();
  // Second click confirms deletion
  await page.getByRole("button", { name: /click again to confirm/i }).click();

  // Should redirect to event page after deletion
  await page.waitForURL(`**/event/${event.slug}`);
});
