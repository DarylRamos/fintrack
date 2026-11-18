import { expect, test, type Page } from "@playwright/test";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE } from "./auth-state";

// The 404 page (unit 1.2b). The signed-out tests run everywhere, including CI; the signed-in ones need
// the development test account (see auth-state.ts). The error page has no browser test: the owner
// chose no on-demand error route, so tests/unit/status-pages.test.tsx covers its content.
// See context/feature-specs/1.2b-http-error-pages.md.

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

async function expectNotFoundPage(page: Page) {
  await expect(heading(page)).toHaveText("Page not found");
  await expect(page.getByText("Error 404")).toBeVisible();
  await expect(page).toHaveTitle("Page not found | FinTrack");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
}

test.describe("signed out", () => {
  for (const path of ["/auth/nope", "/api/nope"]) {
    test(`${path} answers 404 with the FinTrack page`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expectNotFoundPage(page);
    });
  }

  test("Go to home lands on sign-in", async ({ page }) => {
    await page.goto("/auth/nope");
    await page.getByRole("link", { name: "Go to home" }).click();
    await expect(page).toHaveURL("/sign-in");
    await expect(heading(page)).toHaveText("Sign in");
  });

  test("an unknown app path still goes to sign-in first", async ({ page }) => {
    await page.goto("/nope");
    await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent("/nope")}`);
  });

  test("fits the screen, with a full-size button", async ({ page }) => {
    await page.goto("/auth/nope");
    await expect(heading(page)).toHaveText("Page not found");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const box = await page.getByRole("link", { name: "Go to home" }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});

test.describe("signed in", () => {
  test.skip(!hasTestAccount, NO_TEST_ACCOUNT);
  test.use({ storageState: SIGNED_IN_STATE });

  test("an unknown path answers 404, and Go to home lands on the dashboard", async ({ page }) => {
    const response = await page.goto("/nope");
    expect(response?.status()).toBe(404);
    await expectNotFoundPage(page);
    await page.getByRole("link", { name: "Go to home" }).click();
    await expect(page).toHaveURL("/dashboard");
    await expect(heading(page)).toHaveText("Dashboard");
  });
});
