import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

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
      ? [
          // In CI, only run Chromium for faster test execution
          {
            name: "chromium",
            dependencies: ["setup"],
            testIgnore: "**/auth.setup.ts",
            use: {
              ...devices["Desktop Chrome"],
              storageState: "tests/.auth/admin.json",
              contextOptions: {
                permissions: ["clipboard-read", "clipboard-write"],
              },
            },
          },
        ]
      : [
          // Local development: run all browsers
          {
            name: "chromium",
            dependencies: ["setup"],
            testIgnore: "**/auth.setup.ts",
            use: {
              ...devices["Desktop Chrome"],
              storageState: "tests/.auth/admin.json",
              contextOptions: {
                permissions: ["clipboard-read", "clipboard-write"],
              },
            },
          },

          {
            name: "firefox",
            dependencies: ["setup"],
            testIgnore: "**/auth.setup.ts",
            use: {
              ...devices["Desktop Firefox"],
              storageState: "tests/.auth/admin.json",
              contextOptions: {
                permissions: ["clipboard-read", "clipboard-write"],
              },
            },
          },

          {
            name: "webkit",
            dependencies: ["setup"],
            testIgnore: "**/auth.setup.ts",
            use: {
              ...devices["Desktop Safari"],
              storageState: "tests/.auth/admin.json",
              contextOptions: {
                permissions: ["clipboard-read", "clipboard-write"],
              },
            },
          },

          /* Test against mobile viewports. */
          // {
          //   name: 'Mobile Chrome',
          //   use: { ...devices['Pixel 5'] },
          // },
          // {
          //   name: 'Mobile Safari',
          //   use: { ...devices['iPhone 12'] },
          // },

          /* Test against branded browsers. */
          // {
          //   name: 'Microsoft Edge',
          //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
          // },
          // {
          //   name: 'Google Chrome',
          //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
          // },
        ]),
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/",
    reuseExistingServer: true,
  },
});
