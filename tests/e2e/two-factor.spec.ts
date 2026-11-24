import { expect, test, type Page } from "@playwright/test";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE } from "./auth-state";

// Authenticator-app 2FA (unit 1.4): the pages, signed out and signed in with 2FA off. See
// context/feature-specs/1.4-authenticator-app-2fa.md, step 6. The signed-out tests run everywhere,
// including CI. The full on-and-off flow is in two-factor-flow.spec.ts, which runs after these.

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

test.describe("signed out", () => {
  test("/two-factor goes to sign-in", async ({ page }) => {
    await page.goto("/two-factor?next=%2Fbudgets");
    await expect(page).toHaveURL("/sign-in");
  });

  test("/settings goes to sign-in with next", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent("/settings")}`);
  });
});

test.describe("signed in, 2FA off", () => {
  test.skip(!hasTestAccount, NO_TEST_ACCOUNT);
  test.use({ storageState: SIGNED_IN_STATE });

  test("Settings shows 2FA off with a Set up button", async ({ page }) => {
    await page.goto("/settings");
    await expect(heading(page)).toHaveText("Settings");
    const security = page.getByRole("region", { name: "Security" });
    await expect(security.getByRole("heading", { name: "Two-factor authentication" })).toBeVisible();
    await expect(security.getByText("Off", { exact: true })).toBeVisible();
    // Never pressed here: the flow test turns 2FA on, after the signed-in tests have finished.
    await expect(security.getByRole("button", { name: "Set up" })).toBeVisible();
    const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(scrolls).toBe(false);
  });

  test("/two-factor has nothing to ask, so it continues to the dashboard", async ({ page }) => {
    await page.goto("/two-factor");
    await expect(page).toHaveURL("/dashboard");
  });
});
