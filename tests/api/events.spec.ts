import { test, expect } from "@playwright/test";

test("GET / returns HTML with events content", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("</html>");
});
