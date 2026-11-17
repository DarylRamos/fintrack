import { expect, test, type Page } from "@playwright/test";

import { accountNav, mainNav } from "@/components/app-shell/nav-items";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE, signInWithTestAccount } from "./auth-state";

// The proxy's route rules (unit 1.2a), end to end. The signed-out tests run everywhere, including
// CI; the signed-in ones need the development test account (see auth-state.ts).
// See context/feature-specs/1.2a-route-protection-session-helpers.md.

const appPages = [...mainNav, ...accountNav].map((item) => item.href);

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

test.describe("signed out", () => {
  test("/ lands on sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/sign-in");
    await expect(heading(page)).toHaveText("Sign in");
  });

  for (const path of appPages) {
    test(`${path} lands on sign-in with next`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(path)}`);
      await expect(heading(page)).toHaveText("Sign in");
    });
  }

  test("next keeps the page's query", async ({ page }) => {
    await page.goto("/budgets?month=2026-11");
    await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent("/budgets?month=2026-11")}`);
  });

  test("the open pages still show", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(heading(page)).toHaveText("Link expired");
    await page.goto("/check-email?reason=reset");
    await expect(page).toHaveURL("/check-email?reason=reset");
    await page.goto("/auth-error");
    await expect(page).toHaveURL("/auth-error");
  });
});

test.describe("signed in", () => {
  test.skip(!hasTestAccount, NO_TEST_ACCOUNT);

  test.describe("with the saved session", () => {
    test.use({ storageState: SIGNED_IN_STATE });

    test("/ lands on the dashboard", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveURL("/dashboard");
      await expect(heading(page)).toHaveText("Dashboard");
    });

    for (const path of ["/sign-in", "/sign-up", "/forgot-password"]) {
      test(`${path} lands on the dashboard`, async ({ page }) => {
        await page.goto(path);
        await expect(page).toHaveURL("/dashboard");
      });
    }

    test("/sign-in with a safe next goes there", async ({ page }) => {
      await page.goto(`/sign-in?next=${encodeURIComponent("/budgets")}`);
      await expect(page).toHaveURL("/budgets");
    });

    test("/reset-password stays open and offers a new password", async ({ page }) => {
      await page.goto("/reset-password");
      await expect(page).toHaveURL("/reset-password");
      await expect(heading(page)).toHaveText("Set a new password");
    });
  });

  test("signing in from a protected page returns to it", async ({ page, isMobile }) => {
    // One extra real sign-in per run is enough; the phone layout adds nothing here.
    test.skip(isMobile, "Desktop only, to keep sign-ins to Supabase low");
    await page.goto("/budgets");
    await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent("/budgets")}`);
    await signInWithTestAccount(page);
    await expect(page).toHaveURL("/budgets");
    await expect(heading(page)).toHaveText("Budgets");
  });
});
