import type { Page } from "@playwright/test";

/** Sets a real Auth.js session cookie for `email` via `POST /api/test/session` (disabled when NODE_ENV=production). */
export async function signInAsTestUser(page: Page, email: string): Promise<void> {
  const response = await page.request.post("/api/test/session", {
    data: { email },
  });
  if (!response.ok()) {
    throw new Error(`signInAsTestUser failed: ${response.status()} ${await response.text()}`);
  }
}
