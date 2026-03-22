import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

const browserProjects = (name: string, device: (typeof devices)[keyof typeof devices]) => ({
  name,
  dependencies: ["setup" as const],
  testIgnore: "**/auth.setup.ts",
  use: {
    ...device,
    storageState: "tests/.auth/admin.json",
    contextOptions: {
      permissions: ["clipboard-read", "clipboard-write"],
    },
  },
});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./tests",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Browser projects set `storageState` after the `setup` project (see `auth.setup.ts`). Specs that must be logged out override with `test.use({ storageState: { cookies: [], origins: [] } })`. */
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000/en/",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    { name: "setup", testMatch: "**/auth.setup.ts" },
    ...(process.env.CI
      ? [browserProjects("chromium", devices["Desktop Chrome"])]
      : [
          browserProjects("chromium", devices["Desktop Chrome"]),
          browserProjects("firefox", devices["Desktop Firefox"]),
          browserProjects("webkit", devices["Desktop Safari"]),
        ]),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/en/",
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : 60_000,
  },
});
