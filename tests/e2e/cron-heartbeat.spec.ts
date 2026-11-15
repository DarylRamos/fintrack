import { expect, test } from "@playwright/test";

// The heartbeat route's refusals, against the production build. The authorized path would reach a
// database, so it's covered by the unit test and the production check instead. playwright.config.ts
// gives the test server a throwaway CRON_SECRET.

const path = "/api/cron/heartbeat";

test.describe("heartbeat route", () => {
  // An API test: it needs no page, so it runs once, in the desktop project.
  test.skip(({ isMobile }) => isMobile, "Runs in the desktop project only");

  test("POST without a secret returns 401", async ({ request }) => {
    const response = await request.post(path);
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Unauthorized." },
    });
  });

  test("POST with a wrong secret returns 401", async ({ request }) => {
    const response = await request.post(path, {
      headers: { Authorization: "Bearer wrong-secret" },
    });
    expect(response.status()).toBe(401);
  });

  test("GET returns 405", async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(405);
  });
});
