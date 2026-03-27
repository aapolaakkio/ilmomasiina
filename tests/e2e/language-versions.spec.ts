import { expect, test } from "@playwright/test";

import { resetDb } from "../helpers/resetDb";
import {
  seedAdminUser,
  seedEventLanguage,
  seedFullEvent,
  seedQuestionLanguage,
  seedQuotaLanguage,
} from "../helpers/seed";
import { signInAsTestUser } from "../helpers/testSession";

test.beforeEach(async ({ page }) => {
  await resetDb();
  await seedAdminUser("admin@test.com");
  await signInAsTestUser(page, "admin@test.com");
});

// ---------------------------------------------------------------------------
// Adding and editing language versions in the editor
// ---------------------------------------------------------------------------

test.describe("editor language management", () => {
  test("can add a language version and fill translations", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Suomenkielinen tapahtuma", slug: "lang-test", defaultLanguage: "fi" },
      { title: "Kiintiö", size: 10 },
      { question: "Erikoisruokavalio?", required: false },
    );

    await page.goto(`/en/admin/edit/${event.id}`);

    // FI should be the default language button
    await expect(page.getByRole("button", { name: /FI/i }).first()).toBeVisible();
    await expect(page.getByText("default")).toBeVisible();

    // Add English version
    await page.getByRole("button", { name: /\+ EN/i }).click();

    // Should switch to EN and show empty fields for translation
    await expect(page.locator("#editor-title")).toHaveValue("");

    // Fill in English translations
    await page.locator("#editor-title").fill("English Event");
    await page.locator("#editor-description").fill("English description");

    // Switch to quotas tab and fill English quota title
    await page.getByRole("tab", { name: /quotas/i }).click();
    await expect(page.locator("#quota-title-0")).toHaveValue("");
    await page.locator("#quota-title-0").fill("English Quota");

    // Switch to questions tab and fill English question text
    await page.getByRole("tab", { name: /questions/i }).click();
    await expect(page.locator("#question-text-0")).toHaveValue("");
    await page.locator("#question-text-0").fill("Dietary requirements?");

    // Save
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });

    // Switch back to FI and verify original Finnish content is intact
    await page.getByRole("button", { name: /FI/i }).first().click();
    await page.getByRole("tab", { name: /basic/i }).click();
    await expect(page.locator("#editor-title")).toHaveValue("Suomenkielinen tapahtuma");

    await page.getByRole("tab", { name: /quotas/i }).click();
    await expect(page.locator("#quota-title-0")).toHaveValue("Kiintiö");

    await page.getByRole("tab", { name: /questions/i }).click();
    await expect(page.locator("#question-text-0")).toHaveValue("Erikoisruokavalio?");
  });

  test("can remove a language version", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Remove Lang Test", slug: "remove-lang-test", defaultLanguage: "fi" },
      { title: "Kiintiö", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);

    // Add English version
    await page.getByRole("button", { name: /\+ EN/i }).click();
    await page.locator("#editor-title").fill("English Title");

    // Save so it's persisted
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });

    // Remove English version (× button next to EN)
    await page.getByRole("button", { name: "×" }).click();

    // EN add button should reappear
    await expect(page.getByRole("button", { name: /\+ EN/i })).toBeVisible();

    // Save removal
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });

    // Reload and verify EN is gone
    await page.reload();
    await expect(page.getByRole("button", { name: /\+ EN/i })).toBeVisible();
  });

  test("can change the default language", async ({ page }) => {
    const { event, quota, question } = await seedFullEvent(
      { title: "Finnish Title", slug: "default-lang-test", defaultLanguage: "fi" },
      { title: "Finnish Quota", size: 10 },
      { question: "Finnish Question?", required: false },
    );

    // Seed English language version
    await seedEventLanguage(event.id, "en", { title: "English Title", description: "English desc" });
    await seedQuotaLanguage(quota.id, "en", "English Quota");
    await seedQuestionLanguage(question.id, "en", "English Question?");

    await page.goto(`/en/admin/edit/${event.id}`);

    // FI is default
    await expect(page.locator("#editor-title")).toHaveValue("Finnish Title");

    // Set EN as default (★ button)
    await page.getByRole("button", { name: "★" }).click();

    // Now EN should be default, fields should show English content
    await expect(page.locator("#editor-title")).toHaveValue("English Title");

    // Switch to FI (now a non-default version) and verify Finnish content moved there
    await page.getByRole("button", { name: /FI/i }).first().click();
    await expect(page.locator("#editor-title")).toHaveValue("Finnish Title");

    // Save
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });

    // Reload and verify the swap persisted
    await page.reload();
    // EN should still be default with English content at top level
    await expect(page.locator("#editor-title")).toHaveValue("English Title");
  });
});

// ---------------------------------------------------------------------------
// Public page shows correct language content
// ---------------------------------------------------------------------------

test.describe("public page language rendering", () => {
  test("event page shows localized content based on URL locale", async ({ page }) => {
    const { event, quota, question } = await seedFullEvent(
      { title: "Kesäjuhla", slug: "localized-event", defaultLanguage: "fi", description: "Suomenkielinen kuvaus" },
      { title: "Yleinen", size: 10 },
      { question: "Ruokavaliot?", required: true },
    );

    // Add English translations
    await seedEventLanguage(event.id, "en", {
      title: "Summer Party",
      description: "English description",
    });
    await seedQuotaLanguage(quota.id, "en", "General");
    await seedQuestionLanguage(question.id, "en", "Dietary requirements?");

    // Visit Finnish version
    await page.goto("/fi/event/localized-event");
    await expect(page.getByRole("heading", { name: "Kesäjuhla" })).toBeVisible();
    await expect(page.getByText("Suomenkielinen kuvaus")).toBeVisible();
    // Quota title appears in the signup progress sidebar
    await expect(page.getByRole("progressbar", { name: /Yleinen/i })).toBeVisible();

    // Visit English version
    await page.goto("/en/event/localized-event");
    await expect(page.getByRole("heading", { name: "Summer Party" })).toBeVisible();
    await expect(page.getByText("English description")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /General/i })).toBeVisible();
  });

  test("event page falls back to default language when translation is missing", async ({ page }) => {
    await seedFullEvent(
      { title: "Vain suomeksi", slug: "no-english", defaultLanguage: "fi", description: "Ei käännöstä" },
      { title: "Kiintiö", size: 10 },
    );

    // No English version seeded — should fall back to Finnish
    await page.goto("/en/event/no-english");
    await expect(page.getByRole("heading", { name: "Vain suomeksi" })).toBeVisible();
    await expect(page.getByText("Ei käännöstä")).toBeVisible();
  });

  test("signup form shows localized question text", async ({ page }) => {
    const { event, quota, question } = await seedFullEvent(
      { title: "Question Lang Test", slug: "question-lang", defaultLanguage: "fi" },
      { title: "Kiintiö", size: 10 },
      { question: "Suomenkielinen kysymys?", required: true },
    );

    await seedEventLanguage(event.id, "en", { title: "Question Lang Test" });
    await seedQuotaLanguage(quota.id, "en", "Quota");
    await seedQuestionLanguage(question.id, "en", "English question?");

    // Sign up in English
    await page.goto("/en/event/question-lang");
    await page.getByRole("button", { name: /sign up|quota/i }).click();
    await page.waitForURL("**/signup/**");

    // Question label should be in English
    await expect(page.getByText("English question?")).toBeVisible();

    // Sign up in Finnish
    await page.goto("/fi/event/question-lang");
    await page.getByRole("button", { name: /ilmoittaudu|kiintiö/i }).click();
    await page.waitForURL("**/signup/**");

    // Question label should be in Finnish
    await expect(page.getByText("Suomenkielinen kysymys?")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Language switcher on public pages
// ---------------------------------------------------------------------------

test.describe("language switching", () => {
  test("switching language on event page updates content", async ({ page }) => {
    const { event, quota } = await seedFullEvent(
      { title: "Tapahtuma", slug: "switch-lang", defaultLanguage: "fi" },
      { title: "Kiintiö", size: 10 },
    );

    await seedEventLanguage(event.id, "en", { title: "Event" });
    await seedQuotaLanguage(quota.id, "en", "Quota");

    // Start in Finnish
    await page.goto("/fi/event/switch-lang");
    await expect(page.getByRole("heading", { name: "Tapahtuma" })).toBeVisible();

    // Switch to English via language selector
    await page.locator("select").selectOption("en");

    // URL should change to /en/ and content should update
    await expect(page).toHaveURL(/\/en\/event\/switch-lang/);
    await expect(page.getByRole("heading", { name: "Event" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Editor quota/question sync across languages
// ---------------------------------------------------------------------------

test.describe("language version synchronization", () => {
  test("adding a quota in default language creates placeholder in other language", async ({ page }) => {
    const { event } = await seedFullEvent(
      { title: "Sync Test", slug: "sync-test", defaultLanguage: "fi" },
      { title: "Kiintiö 1", size: 10 },
    );

    await page.goto(`/en/admin/edit/${event.id}`);

    // Add English version
    await page.getByRole("button", { name: /\+ EN/i }).click();
    await page.locator("#editor-title").fill("Sync Test EN");

    // Fill English quota title
    await page.getByRole("tab", { name: /quotas/i }).click();
    await page.locator("#quota-title-0").fill("Quota 1");

    // Switch back to FI and add a second quota
    await page.getByRole("button", { name: /FI/i }).first().click();
    await page.getByRole("button", { name: /add quota/i }).click();
    await page.locator("#quota-title-1").fill("Kiintiö 2");

    // Switch to EN — the new quota should appear (empty placeholder)
    await page.getByRole("button", { name: /EN/i }).first().click();
    await expect(page.locator("#quota-title-1")).toBeVisible();
    await expect(page.locator("#quota-title-1")).toHaveValue("");

    // Fill the English title for the new quota
    await page.locator("#quota-title-1").fill("Quota 2");

    // Save
    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByRole("alert").filter({ hasText: /saved successfully/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
