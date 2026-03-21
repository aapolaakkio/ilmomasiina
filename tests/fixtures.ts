import { test as base, expect } from "@playwright/test";

import { resetDb } from "./helpers/resetDb";

type TestFixtures = {
  /** Resets the database before the test. Admin user is NOT re-seeded — use seedAdminUser() if needed. */
  resetDatabase: void;
};

export const test = base.extend<TestFixtures>({
  resetDatabase: [
    async (_deps, use) => {
      await resetDb();
      await use();
    },
    { auto: false },
  ],
});

export { expect };
