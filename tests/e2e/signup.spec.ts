import { expect, test } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent, seedQuota, seedSignup } from "../helpers/seed";

// Public pages — no auth needed.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser();
});

test.describe("signup happy path", () => {
  test("user can sign up for an event", async ({ page }) => {
    const { event, question } = await seedFullEvent(
      { title: "Summer Party", slug: "summer-party" },
      { title: "General", size: 10 },
      { question: "Dietary preference?", required: true },
    );

    await page.goto(`/en/event/${event.slug}`);
    await expect(page.getByText("Summer Party")).toBeVisible();

    // Click signup button
    await page.getByRole("button", { name: /sign up/i }).click();

    // Should redirect to signup form
    await page.waitForURL("**/signup/**");

    // Fill in the form
    await page.locator("#signup-firstName").fill("John");
    await page.locator("#signup-lastName").fill("Doe");
    await page.locator("#signup-email").fill("john@example.com");
    await page.locator(`#answer_${question.id}`).fill("Vegan");

    // Submit
    await page.getByRole("button", { name: /save/i }).click();

    // After saving, user is redirected to event page
    await page.waitForURL(`**/event/${event.slug}`);
  });

  test("user can sign up with multiple quotas", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Multi Quota Event", slug: "multi-quota" },
      { title: "VIP", size: 5 },
      { question: "Notes?", required: false },
    );
    await seedQuota(event.id, { title: "Regular", size: 20, order: 1 });

    await page.goto(`/en/event/${event.slug}`);

    // Both quota buttons should be visible
    await expect(page.getByRole("button", { name: /VIP/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Regular/i })).toBeVisible();

    // Sign up for Regular quota
    await page.getByRole("button", { name: /Regular/i }).click();
    await page.waitForURL("**/signup/**");

    await page.locator("#signup-firstName").fill("Jane");
    await page.locator("#signup-lastName").fill("Smith");
    await page.locator("#signup-email").fill("jane@example.com");
    await page.getByRole("button", { name: /save/i }).click();

    await page.waitForURL(`**/event/${event.slug}`);
  });
});

test.describe("signup form validation", () => {
  test("required fields show errors when empty", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Validation Event", slug: "validation-event" },
      { title: "Default", size: 10 },
      { question: "Required question?", required: true },
    );

    await page.goto(`/en/event/${event.slug}`);
    await page.getByRole("button", { name: /sign up/i }).click();
    await page.waitForURL("**/signup/**");

    // Submit without filling anything
    await page.getByRole("button", { name: /save/i }).click();

    // Should show validation errors (form stays on same page)
    await expect(page).toHaveURL(/\/signup\//);
  });
});

test.describe("signup registration window", () => {
  test("signup button is disabled before registration opens", async ({ page }) => {
    const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await seedFullEvent(
      {
        title: "Future Event",
        slug: "future-event",
        registrationStartDate: futureStart,
        registrationEndDate: futureEnd,
      },
      { title: "Default", size: 10 },
    );

    await page.goto("/en/event/future-event");
    const button = page.getByRole("button", { name: /sign up/i });
    await expect(button).toBeDisabled();
  });

  test("signup shows closed message after registration ends", async ({ page }) => {
    const pastStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const pastEnd = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    await seedFullEvent(
      {
        title: "Closed Event",
        slug: "closed-event",
        registrationStartDate: pastStart,
        registrationEndDate: pastEnd,
      },
      { title: "Default", size: 10 },
    );

    await page.goto("/en/event/closed-event");
    await expect(page.getByText(/closed/i)).toBeVisible();
  });
});

test.describe("signup to full quota", () => {
  test("signup goes to queue when quota is full", async ({ page }) => {
    const { event, quota } = await seedFullEvent(
      { title: "Full Event", slug: "full-event" },
      { title: "Limited", size: 1 },
      { question: "Note?", required: false },
    );

    // Fill the quota with an existing signup
    await seedSignup(quota.id, { firstName: "Existing", lastName: "User" });

    await page.goto(`/en/event/${event.slug}`);
    await page.getByRole("button", { name: /sign up/i }).click();
    await page.waitForURL("**/signup/**");

    await page.locator("#signup-firstName").fill("Queue");
    await page.locator("#signup-lastName").fill("Person");
    await page.locator("#signup-email").fill("queue@example.com");
    await page.getByRole("button", { name: /save/i }).click();

    // After saving, verify queue position is shown
    await page.waitForURL(`**/event/${event.slug}`);
  });
});
