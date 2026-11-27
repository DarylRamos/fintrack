import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE } from "./auth-state";

// A save with tags, and every update, is a few database round trips, each about 300ms from a laptop to the
// development pooler, then the list streams in before the status removes `?done=` (unit 2.3).
const SAVE_TIMEOUT = 15_000;

// Transactions: add, edit and delete (unit 2.2). See
// context/feature-specs/2.2-transaction-create-edit-delete.md, step 7. The signed-out tests run
// everywhere, including CI. The signed-in ones use the development test account; saving runs at
// desktop width only (the desktop and phone runs share the account), and every transaction a test adds
// is deleted afterwards, even if a step fails. Descriptions are unique per run, so other data on the
// account doesn't matter.

const NBSP = " ";

test.describe("signed out", () => {
  for (const path of ["/transactions", "/transactions/new", `/transactions/${randomUUID()}/edit`]) {
    test(`${path.replace(/[0-9a-f-]{36}/, "<id>")} goes to sign-in with next`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/sign-in?next=${encodeURIComponent(path)}`);
    });
  }
});

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

function rowLink(page: Page, description: string) {
  return page.getByRole("link", { name: new RegExp(`^${description},`) });
}

async function noHorizontalScroll(page: Page) {
  const scrolls = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(scrolls).toBe(false);
}

// Deletes every listed transaction whose description starts with `prefix`, through the pages.
async function deleteAll(page: Page, prefix: string) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await page.goto("/transactions");
    await expect(heading(page)).toHaveText("Transactions");
    const link = rowLink(page, `${prefix}[^,]*`).first();
    if ((await link.count()) === 0) {
      return;
    }
    await link.click();
    await expect(heading(page)).toHaveText("Edit transaction");
    await page.getByRole("button", { name: "Delete transaction" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL("/transactions", { timeout: SAVE_TIMEOUT });
  }
}

test.describe("signed in", () => {
  test.skip(!hasTestAccount, NO_TEST_ACCOUNT);
  test.use({ storageState: SIGNED_IN_STATE });

  test("the list page and the empty form fit, with the right defaults", async ({ page }) => {
    await page.goto("/transactions");
    await expect(heading(page)).toHaveText("Transactions");
    await expect(page.getByRole("link", { name: "Add transaction" })).toBeVisible();
    await noHorizontalScroll(page);

    await page.getByRole("link", { name: "Add transaction" }).click();
    await expect(page).toHaveURL("/transactions/new");
    await expect(heading(page)).toHaveText("Add transaction");
    await expect(page.getByRole("radio", { name: "Expense" })).toBeChecked();
    await expect(page.getByLabel("Currency")).toHaveValue(/^[A-Z]{3}$/);
    // Today, in the browser's own time zone.
    const today = await page.evaluate(() => {
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    });
    await expect(page.getByLabel("Date")).toHaveValue(today);
    await noHorizontalScroll(page);
  });

  test("an empty form shows every error at once; a JPY amount with decimals is refused", async ({ page }) => {
    await page.goto("/transactions/new");
    await expect(page.getByLabel("Date")).not.toHaveValue("");
    await page.getByLabel("Date").fill("");
    await page.getByRole("button", { name: "Add transaction" }).click();

    await expect(page.getByText("Enter an amount.")).toBeVisible();
    await expect(page.getByText("Enter a date.")).toBeVisible();
    await expect(page.getByText("Enter a description.")).toBeVisible();
    await expect(page.getByLabel("Amount")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Amount").fill("12.50");
    await page.getByLabel("Currency").selectOption("JPY");
    await expect(page.getByText("JPY amounts have no decimal places.")).toBeVisible();
    await expect(page).toHaveURL("/transactions/new");
  });

  test("adds, edits and deletes a transaction", async ({ page, isMobile }) => {
    test.skip(isMobile, "Saves at desktop width only; the runs share one account");
    test.setTimeout(90_000);
    // Rows an earlier, interrupted run left behind.
    await deleteAll(page, "E2E [0-9a-f]{8} ");
    const prefix = `E2E ${randomUUID().slice(0, 8)}`;
    const first = `${prefix} groceries`;
    const renamed = `${prefix} freelance fee`;

    try {
      // Add an expense.
      await page.goto("/transactions/new");
      await page.getByLabel("Amount").fill("1,234.5");
      await page.getByLabel("Currency").selectOption("SGD");
      await page.getByLabel("Description").fill(first);
      await page.getByRole("button", { name: "Add transaction" }).click();

      await expect(page).toHaveURL("/transactions", { timeout: SAVE_TIMEOUT });
      await expect(page.getByRole("status")).toHaveText("Transaction added.");
      const row = rowLink(page, first);
      await expect(row).toHaveAccessibleName(new RegExp(`^${first}, expense, -SGD${NBSP}1,234\\.50, `));
      await expect(row).toContainText(`-SGD${NBSP}1,234.50`);

      // Change it to an income in JPY, dated in the past.
      await row.click();
      await expect(heading(page)).toHaveText("Edit transaction");
      await expect(page.getByLabel("Amount")).toHaveValue("1234.50");
      // The radio itself is visually hidden behind its styled label, which is what people click.
      await page.getByRole("group", { name: "Type" }).getByText("Income", { exact: true }).click();
      await expect(page.getByRole("radio", { name: "Income" })).toBeChecked();
      await page.getByLabel("Currency").selectOption("JPY");
      await page.getByLabel("Amount").fill("150,000");
      await page.getByLabel("Date").fill("2026-11-02");
      await page.getByLabel("Description").fill(renamed);
      await page.getByRole("button", { name: "Save changes" }).click();

      await expect(page).toHaveURL("/transactions", { timeout: SAVE_TIMEOUT });
      await expect(page.getByRole("status")).toHaveText("Changes saved.");
      await expect(rowLink(page, first)).toHaveCount(0);
      const changed = rowLink(page, renamed);
      await expect(changed).toHaveAccessibleName(`${renamed}, income, +¥150,000, 2 Nov 2026`);

      // A reload keeps the values and doesn't show the status again.
      await page.reload();
      await expect(changed).toBeVisible();
      await expect(page.getByRole("status")).toHaveText("");

      // Delete: Cancel keeps it, Delete removes it.
      await changed.click();
      await page.getByRole("button", { name: "Delete transaction" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Delete this transaction?" })).toBeVisible();
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      await expect(heading(page)).toHaveText("Edit transaction");

      await page.getByRole("button", { name: "Delete transaction" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
      await expect(page).toHaveURL("/transactions", { timeout: SAVE_TIMEOUT });
      await expect(page.getByRole("status")).toHaveText("Transaction deleted.");
      await expect(rowLink(page, renamed)).toHaveCount(0);
    } finally {
      await deleteAll(page, prefix);
    }
  });

  // Unit 2.3. See context/feature-specs/2.3-categories-and-tags.md, step 7.
  test("saves a category and tags, suggests earlier tags, and follows the type", async ({ page, isMobile }) => {
    test.skip(isMobile, "Saves at desktop width only; the runs share one account");
    test.setTimeout(120_000);
    await deleteAll(page, "E2E [0-9a-f]{8} ");
    const short = randomUUID().slice(0, 8);
    const prefix = `E2E ${short}`;
    const first = `${prefix} market`;
    const second = `${prefix} bakery`;
    const weekly = `e2e-${short}-weekly`;
    const family = `e2e-${short}-family`;
    const tags = page.getByLabel("Tags", { exact: true });
    const category = page.getByLabel("Category");

    try {
      // A new expense with a category and two tags: one ended by a comma, one by Enter.
      await page.goto("/transactions/new");
      await expect(category).toHaveValue("");
      await expect(category.locator("option")).toContainText(["No category", "Bills and utilities"]);
      await expect(category.locator("option").last()).toHaveText("Other");
      await page.getByLabel("Amount").fill("23.40");
      await page.getByLabel("Currency").selectOption("SGD");
      await category.selectOption({ label: "Groceries" });
      await page.getByLabel("Description").fill(first);
      await tags.fill(`${weekly},`);
      await tags.fill(family);
      await tags.press("Enter");
      // Enter adds the tag and doesn't submit.
      await expect(page).toHaveURL("/transactions/new");
      await expect(page.getByRole("button", { name: `Remove tag ${weekly}` })).toBeVisible();
      await expect(page.getByRole("button", { name: `Remove tag ${family}` })).toBeVisible();
      await expect(tags).toHaveValue("");
      await page.getByRole("button", { name: "Add transaction" }).click();

      await expect(page).toHaveURL("/transactions", { timeout: SAVE_TIMEOUT });
      const row = rowLink(page, first);
      await expect(row).toHaveAccessibleName(new RegExp(`^${first}, expense, Groceries, -SGD${NBSP}23\\.40, `));
      await expect(row).toContainText("· Expense · Groceries");
      // Tags show on the edit page, not the list (Question F).
      await expect(row).not.toContainText(weekly);

      // A second transaction, opened through the link (a client-side navigation): the form starts empty,
      // not with the first one's draft (Cache Components keep visited routes mounted), the earlier tags
      // are suggested, and a different spelling reuses the tag.
      await page.getByRole("link", { name: "Add transaction" }).click();
      await expect(heading(page)).toHaveText("Add transaction");
      await expect(page.getByLabel("Description")).toHaveValue("");
      await expect(category).toHaveValue("");
      await expect(page.getByRole("button", { name: /^Remove tag / })).toHaveCount(0);
      await page.getByLabel("Amount").fill("5");
      await page.getByLabel("Description").fill(second);
      // Typing part of an earlier tag suggests it; Escape closes the list and keeps the text.
      await tags.fill(weekly.slice(0, -2).toUpperCase());
      const suggestion = page.getByRole("option", { name: weekly });
      await expect(suggestion).toBeVisible();
      await tags.press("Escape");
      await expect(suggestion).toBeHidden();
      await tags.fill(weekly.toUpperCase());
      await tags.press("Enter");
      await page.getByRole("button", { name: "Add transaction" }).click();
      await expect(page).toHaveURL("/transactions", { timeout: SAVE_TIMEOUT });
      await rowLink(page, second).click();
      await expect(heading(page)).toHaveText("Edit transaction");
      await expect(page.getByRole("button", { name: `Remove tag ${weekly}` })).toBeVisible();
      await expect(category).toHaveValue("");
      // Nothing changed yet, so there's nothing to save.
      await expect(page.getByRole("button", { name: "Save changes" })).toBeDisabled();

      // Edit the first: its category and tags are there; switching to Income resets the category.
      await page.goto("/transactions");
      await rowLink(page, first).click();
      await expect(heading(page)).toHaveText("Edit transaction");
      await expect(category.locator("option:checked")).toHaveText("Groceries");
      await expect(page.getByRole("button", { name: `Remove tag ${family}` })).toBeVisible();
      await page.getByRole("group", { name: "Type" }).getByText("Income", { exact: true }).click();
      await expect(category).toHaveValue("");
      await expect(category.locator("option")).not.toContainText(["Groceries"]);
      await category.selectOption({ label: "Salary" });
      await page.getByRole("button", { name: `Remove tag ${family}` }).click();
      await expect(page.getByRole("button", { name: `Remove tag ${family}` })).toHaveCount(0);
      await page.getByRole("button", { name: "Save changes" }).click();

      await expect(page).toHaveURL("/transactions", { timeout: SAVE_TIMEOUT });
      await expect(rowLink(page, first)).toHaveAccessibleName(new RegExp(`^${first}, income, Salary, `));
      await rowLink(page, first).click();
      await expect(category.locator("option:checked")).toHaveText("Salary");
      await expect(page.getByRole("button", { name: `Remove tag ${weekly}` })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Remove tag / })).toHaveCount(1);

      // The removed tag was used nowhere else, so it is no longer suggested.
      await page.goto("/transactions/new");
      await tags.fill(family);
      await expect(page.locator("#transaction-tags-suggestions [role=option]")).toHaveCount(0);
      await expect(tags).toHaveAttribute("aria-expanded", "false");
      // A picked suggestion is added at once.
      await tags.fill(weekly.slice(0, -3));
      await page.getByRole("option", { name: weekly }).click();
      await expect(page.getByRole("button", { name: `Remove tag ${weekly}` })).toBeVisible();
      await expect(tags).toHaveValue("");
    } finally {
      await deleteAll(page, prefix);
    }
  });

  test("ten tags fit at any width, and an eleventh is refused", async ({ page }) => {
    await page.goto("/transactions/new");
    const tags = page.getByLabel("Tags", { exact: true });
    for (let index = 0; index < 10; index += 1) {
      await tags.fill(`a-long-tag-name-number-${index}`);
      await tags.press("Enter");
    }
    await expect(page.getByRole("button", { name: /^Remove tag / })).toHaveCount(10);
    await noHorizontalScroll(page);
    await tags.fill("eleven");
    await tags.press("Enter");
    await expect(page.getByText("Use at most 10 tags.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Remove tag / })).toHaveCount(10);
    // Backspace in the empty field removes the last tag.
    await tags.fill("");
    await tags.press("Backspace");
    await expect(page.getByRole("button", { name: /^Remove tag / })).toHaveCount(9);
  });

  test("an unknown or malformed ID shows the 404 inside the app", async ({ page, isMobile }) => {
    for (const id of [randomUUID(), "not-a-uuid"]) {
      await page.goto(`/transactions/${id}/edit`);
      await expect(heading(page)).toHaveText("Page not found");
      await expect(page.getByText("Error 404")).toBeVisible();
      // The shell stays: the sidebar (desktop) or the phone menu button.
      if (isMobile) {
        await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
      } else {
        await expect(page.locator("[data-sidebar='sidebar']").first().getByRole("link", { name: "Transactions" })).toBeVisible();
      }
    }
  });
});
