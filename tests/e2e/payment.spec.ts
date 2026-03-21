import { expect, test } from "@playwright/test";

import { PaymentMode } from "../../src/db/schema";
import { generateEditToken } from "../helpers/editToken";
import { resetDb } from "../helpers/resetDb";
import { seedAdminUser, seedFullEvent, seedSignup } from "../helpers/seed";

// Public pages — no auth needed.
test.use({ storageState: { cookies: [], origins: [] } });

test.beforeEach(async () => {
  await resetDb();
  await seedAdminUser();
});

test("pay button is visible for paid events", async ({ page }) => {
  const { quota } = await seedFullEvent(
    { title: "Paid Event", slug: "paid-event", payments: PaymentMode.ONLINE },
    { title: "General", size: 10, price: 1500 },
    { question: "Note?", required: false },
  );
  const signup = await seedSignup(quota.id, {
    firstName: "Paying",
    lastName: "User",
    email: "pay@test.com",
    price: 1500,
    confirmedAt: new Date(),
  });
  const editToken = generateEditToken(signup.id);

  // Pending online payment is edited on /signup/... (Stripe return uses /payment/...).
  await page.goto(`/en/signup/${signup.id}/${editToken}`);

  await expect(page.getByRole("button", { name: /^(Pay|Maksa)$/ })).toBeVisible({ timeout: 15_000 });
});

test("price is shown on signup form for paid events", async ({ page }) => {
  const { quota } = await seedFullEvent(
    { title: "Priced Event", slug: "priced-event", payments: PaymentMode.ONLINE },
    { title: "Premium", size: 10, price: 2500 },
    { question: "Note?", required: false },
  );
  const signup = await seedSignup(quota.id, {
    firstName: "Price",
    lastName: "Test",
    email: "price@test.com",
    price: 2500,
    confirmedAt: new Date(),
  });
  const editToken = generateEditToken(signup.id);

  await page.goto(`/en/signup/${signup.id}/${editToken}`);

  // Price is stored in cents (2500 → 25.00 EUR in the UI).
  await expect(page.getByText(/25\.00/)).toBeVisible();
});
