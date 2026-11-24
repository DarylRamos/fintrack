import type { Page } from "@playwright/test";

// The development test account for the signed-in tests (unit 1.2a). playwright.config.ts loads the
// two values from .env.local; CI doesn't have them, so the signed-in tests skip there. Never print
// them. The saved session lives in a git-ignored folder.
export const SIGNED_IN_STATE = "tests/e2e/.auth/user.json";

export const hasTestAccount = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);

export const NO_TEST_ACCOUNT = "E2E_USER_EMAIL and E2E_USER_PASSWORD aren't set (signed-in tests run locally only)";

// Signs in through the real form, against the development project. The account's 2FA stays off; only
// the 2FA flow test (unit 1.4) turns it on, and off again.
export async function signInWithTestAccount(page: Page): Promise<void> {
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_USER_EMAIL ?? "");
  await page.getByLabel("Password", { exact: true }).fill(process.env.E2E_USER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in" }).click();
}
