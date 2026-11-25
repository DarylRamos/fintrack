import { expect, test, type Page } from "@playwright/test";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE } from "./auth-state";

// The Profile page (unit 1.5). See context/feature-specs/1.5-profile-and-preferred-currency.md, step 6.
// The signed-out test runs everywhere, including CI. The signed-in ones use the development test
// account; saving runs at desktop width only (the desktop and phone runs share the account), and the
// account's previous values are put back afterwards, even if a step fails.

test.describe("signed out", () => {
  test("/profile goes to sign-in with next", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent("/profile")}`);
  });
});

function details(page: Page) {
  return page.getByRole("region", { name: "Personal details" });
}

function nameField(page: Page) {
  return details(page).getByLabel("Display name");
}

function currencyField(page: Page) {
  return details(page).getByLabel("Preferred currency");
}

async function save(page: Page) {
  await details(page).getByRole("button", { name: "Save" }).click();
  await expect(details(page).getByRole("status")).toHaveText("Saved");
}

test.describe("signed in", () => {
  test.skip(!hasTestAccount, NO_TEST_ACCOUNT);
  test.use({ storageState: SIGNED_IN_STATE });

  test("shows the email, the name field and the currency picker", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Profile");
    await expect(details(page).getByText("You sign in with this email.")).toBeVisible();
    await expect(nameField(page)).toBeVisible();
    await expect(currencyField(page)).toHaveValue(/^[A-Z]{3}$/);
    await expect(currencyField(page).locator("option")).toHaveCount(30);
    await expect(currencyField(page).locator('option[value="SGD"]')).toHaveText("SGD – Singapore Dollar");
    const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(scrolls).toBe(false);
  });

  test("saves a name and currency, shows the name in the account menu, and keeps them", async ({ page, isMobile }) => {
    test.skip(isMobile, "Saves at desktop width only; the runs share one account");

    await page.goto("/profile");
    const originalName = await nameField(page).inputValue();
    const originalCurrency = await currencyField(page).inputValue();
    const newCurrency = originalCurrency === "SGD" ? "EUR" : "SGD";

    try {
      await nameField(page).fill("  Playwright Tester  ");
      await currencyField(page).selectOption(newCurrency);
      await save(page);
      // The stored, trimmed name.
      await expect(nameField(page)).toHaveValue("Playwright Tester");

      // The account menu updates without a reload.
      const menuButton = page.getByRole("button", { name: "Account menu" });
      await expect(menuButton).toHaveText("P");
      await menuButton.click();
      await expect(page.getByRole("menu").getByText("Playwright Tester", { exact: true })).toBeVisible();
      await page.keyboard.press("Escape");

      await page.reload();
      await expect(nameField(page)).toHaveValue("Playwright Tester");
      await expect(currencyField(page)).toHaveValue(newCurrency);

      // A name that is too long shows the field error and isn't saved. maxLength stops typing past 50,
      // so it is removed to reach the rule itself.
      await nameField(page).evaluate((input) => input.removeAttribute("maxlength"));
      await nameField(page).fill("a".repeat(51));
      await details(page).getByRole("button", { name: "Save" }).click();
      await expect(details(page).getByText("Use at most 50 characters.")).toBeVisible();
      await page.reload();
      await expect(nameField(page)).toHaveValue("Playwright Tester");

      // Clearing the name saves "no name": the menu goes back to the email's letter.
      await nameField(page).fill("");
      await save(page);
      await expect(nameField(page)).toHaveValue("");
      await expect(page.getByRole("button", { name: "Account menu" })).not.toHaveText("P");
    } finally {
      await page.goto("/profile");
      await nameField(page).fill(originalName);
      await currencyField(page).selectOption(originalCurrency);
      await save(page);
    }
  });
});
