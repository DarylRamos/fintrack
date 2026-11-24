import { expect, test, type Browser, type Page } from "@playwright/test";

import { hasTestAccount, NO_TEST_ACCOUNT, signInWithTestAccount } from "./auth-state";
import { codeSource } from "./totp";

// The full authenticator-app 2FA flow (unit 1.4) on the development test account: turn on, sign out,
// sign in with a code, turn off. Local only (the account isn't in CI).
//
// It runs in its own Playwright project ("two-factor-flow"), after every other project has finished:
// turning 2FA on signs out the account's other sessions, including the session the signed-in tests
// share. It leaves 2FA off, as the account must stay for those tests; if a step fails while 2FA is on,
// the cleanup turns it off. See context/feature-specs/1.4-authenticator-app-2fa.md, step 6.

// Nothing is recorded: the setup key, codes and password never reach test-results/.
test.use({ trace: "off", screenshot: "off", video: "off", storageState: { cookies: [], origins: [] } });
test.describe.configure({ mode: "serial" });
test.skip(!hasTestAccount, NO_TEST_ACCOUNT);

const WRONG_CODE_MESSAGE = "That code didn't work. Check your authenticator app and try again.";

// Set once 2FA may be on, so the cleanup can turn it off again if a step fails.
let secret: string | null = null;

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/sign-in");
}

async function turnOff(page: Page, codes: ReturnType<typeof codeSource>) {
  await page.goto("/settings");
  const security = page.getByRole("region", { name: "Security" });
  await security.getByRole("button", { name: "Turn off" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Code", { exact: true }).fill(await codes.next());
  await dialog.getByRole("button", { name: "Turn off" }).click();
  await expect(dialog).toBeHidden();
  await expect(security.getByText("Off", { exact: true })).toBeVisible();
}

test.afterAll(async ({ browser }: { browser: Browser }) => {
  if (!secret) {
    return;
  }
  // A step failed while 2FA may be on: turn it off, so the account is ready for the next run.
  const codes = codeSource(secret);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("/sign-in");
    await signInWithTestAccount(page);
    await page.waitForURL(/\/(two-factor|dashboard)/);
    if (page.url().includes("/two-factor")) {
      await page.getByLabel("Authentication code").fill(await codes.next());
      await page.getByRole("button", { name: "Verify" }).click();
      await page.waitForURL("**/dashboard");
    }
    await page.goto("/settings");
    const turnOffButton = page.getByRole("region", { name: "Security" }).getByRole("button", { name: "Turn off" });
    const isOn = await turnOffButton.waitFor({ timeout: 10_000 }).then(
      () => true,
      () => false,
    );
    if (isOn) {
      await turnOff(page, codes);
    }
  } finally {
    await context.close();
  }
});

test("turn on, sign in with a code, then turn off", async ({ page }) => {
  // Up to four codes, each in a fresh 30-second step.
  test.setTimeout(240_000);

  // 1. Sign in without 2FA.
  await page.goto("/sign-in");
  await signInWithTestAccount(page);
  await expect(
    page,
    "The test account has 2FA on. Turn it off in Settings, or remove its factor in the Supabase dashboard (development).",
  ).toHaveURL("/dashboard");

  // 2. Set up: read the setup key from the page, enter a code.
  await page.goto("/settings");
  const security = page.getByRole("region", { name: "Security" });
  await expect(security.getByText("Off", { exact: true })).toBeVisible();
  await security.getByRole("button", { name: "Set up" }).click();
  await expect(security.getByRole("img", { name: "QR code for setting up your authenticator app" })).toBeVisible();
  const key = ((await security.getByTestId("setup-key").textContent()) ?? "").replace(/\s+/g, "");
  const codes = codeSource(key);
  await security.getByLabel("Code", { exact: true }).fill(await codes.next());
  // Known to the cleanup from here on, in case turning on succeeds but a later step fails.
  secret = key;
  await security.getByRole("button", { name: "Turn on" }).click();
  await expect(security.getByText("On", { exact: true })).toBeVisible();
  await expect(security.getByText(/^Added /)).toBeVisible();

  // 3. Sign out and in: the 2FA step comes first. A wrong code is refused, the right one works.
  await signOut(page);
  await signInWithTestAccount(page);
  await expect(page).toHaveURL("/two-factor");
  await expect(heading(page)).toHaveText("Enter your code");
  await page.goto("/budgets");
  await expect(page).toHaveURL(`/two-factor?next=${encodeURIComponent("/budgets")}`);
  await page.getByLabel("Authentication code").fill(codes.wrong());
  await page.getByRole("button", { name: "Verify" }).click();
  // Filtered: Next's route announcer is also role="alert".
  await expect(page.getByRole("alert").filter({ hasText: WRONG_CODE_MESSAGE })).toBeVisible();
  await expect(page).toHaveURL(`/two-factor?next=${encodeURIComponent("/budgets")}`);
  await page.getByLabel("Authentication code").fill(await codes.next());
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL("/budgets");
  await expect(heading(page)).toHaveText("Budgets");

  // 4. Turn off: a wrong code leaves it on; a right one turns it off.
  await page.goto("/settings");
  await security.getByRole("button", { name: "Turn off" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Code", { exact: true }).fill(codes.wrong());
  await dialog.getByRole("button", { name: "Turn off" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(WRONG_CODE_MESSAGE);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(security.getByText("On", { exact: true })).toBeVisible();
  await turnOff(page, codes);
  secret = null;

  // 5. Sign out and in: no code asked.
  await signOut(page);
  await signInWithTestAccount(page);
  await expect(page).toHaveURL("/dashboard");
});
