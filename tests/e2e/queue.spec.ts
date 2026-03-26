import { expect, test } from "@playwright/test";

import { generateEditToken } from "../helpers/editToken";
import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent, seedSignup } from "../helpers/seed";

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser();
});

test("new signup goes to queue when quota is full", async ({ page }) => {
  const { event, quota } = await seedFullEvent(
    { title: "Queue Event", slug: "queue-event" },
    { title: "Limited Quota", size: 1 },
    { question: "Note?", required: false },
  );

  // Fill the single spot
  await seedSignup(quota.id, { firstName: "First", lastName: "Person" });

  // New user signs up — should go to queue
  await page.goto(`/en/event/${event.slug}`);
  await page.getByRole("button", { name: /sign up/i }).click();
  await page.waitForURL("**/signup/**");

  await page.locator("#signup-firstName").fill("Queue");
  await page.locator("#signup-lastName").fill("Person");
  await page.locator("#signup-email").fill("queue@test.com");
  await page.getByRole("button", { name: /save/i }).click();

  // After saving, the event page should show queue info
  await page.waitForURL(`**/event/${event.slug}`);

  // Verify the signup ended up in the queue (heading shows count)
  await expect(page.getByRole("heading", { name: /In queue: 1/i })).toBeVisible();
});

test("queue signup is promoted when in-quota signup is deleted", async ({ page }) => {
  const { event, quota } = await seedFullEvent(
    { title: "Promote Event", slug: "promote-event" },
    { title: "Limited Quota", size: 1 },
    { question: "Note?", required: false },
  );

  // First signup (in quota)
  const firstSignup = await seedSignup(quota.id, {
    firstName: "First",
    lastName: "Person",
    email: "first@test.com",
  });
  // Second signup (should go to queue — created later via createdAt)
  const secondSignup = await seedSignup(quota.id, {
    firstName: "Second",
    lastName: "Person",
    email: "second@test.com",
    createdAt: new Date(Date.now() + 1000),
  });

  // Verify second signup is initially in the queue
  const secondEditToken = generateEditToken(secondSignup.id);
  await page.goto(`/en/signup/${secondSignup.id}/${secondEditToken}`);
  await expect(page.getByText(/in the queue/i)).toBeVisible();

  // Delete the first signup
  const editToken = generateEditToken(firstSignup.id);
  await page.goto(`/en/signup/${firstSignup.id}/${editToken}`);

  await page.getByRole("button", { name: /delete signup/i }).click();
  await page.getByRole("button", { name: /click again to confirm/i }).click();

  // After deletion, the second signup should be promoted to the quota.
  await page.waitForURL(`**/event/${event.slug}`);

  // The event page should no longer show any queue section
  await expect(page.getByRole("heading", { name: /In queue/i })).not.toBeVisible();

  // Second signup should now be visible in the quota section
  await expect(page.getByText("Second")).toBeVisible();
});
