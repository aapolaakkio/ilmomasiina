import { expect, test } from "@playwright/test";

import { PaymentMode } from "../../src/db/schema";
import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent } from "../helpers/seed";

// Public pages — no auth needed.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser();
});

test("pay button is visible for paid events", async ({ page }) => {
  const { event } = await seedFullEvent(
    { title: "Paid Event", slug: "paid-event", payments: PaymentMode.ONLINE },
    { title: "General", size: 10, price: 1500 },
    { question: "Note?", required: false },
  );

  // Sign up for the paid event
  await page.goto(`/en/event/${event.slug}`);
  await page.getByRole("button", { name: /sign up/i }).click();
  await page.waitForURL("**/signup/**");

  await page.locator("#signup-firstName").fill("Paying");
  await page.locator("#signup-lastName").fill("User");
  await page.locator("#signup-email").fill("pay@test.com");
  await page.getByRole("button", { name: /save/i }).click();

  // After saving, the signup form should show payment details and a pay button
  await expect(page.getByRole("button", { name: /pay/i })).toBeVisible();
});

test("price is shown on signup form for paid events", async ({ page }) => {
  const { event } = await seedFullEvent(
    { title: "Priced Event", slug: "priced-event", payments: PaymentMode.ONLINE },
    { title: "Premium", size: 10, price: 2500 },
    { question: "Note?", required: false },
  );

  await page.goto(`/en/event/${event.slug}`);
  await page.getByRole("button", { name: /sign up/i }).click();
  await page.waitForURL("**/signup/**");

  // Price should be displayed somewhere on the form
  await expect(page.getByText(/25/)).toBeVisible();
});
