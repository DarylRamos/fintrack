import { expect, test as setup } from "@playwright/test";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE, signInWithTestAccount } from "./auth-state";

// Signs in once per run and saves the session for the signed-in tests (unit 1.2a). Skipped when the
// test account isn't set, as in CI.
setup("sign in with the development test account", async ({ page }) => {
  setup.skip(!hasTestAccount, NO_TEST_ACCOUNT);
  await page.goto("/sign-in");
  await signInWithTestAccount(page);
  await expect(page).toHaveURL("/dashboard");
  await page.context().storageState({ path: SIGNED_IN_STATE });
});
