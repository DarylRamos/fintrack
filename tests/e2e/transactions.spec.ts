import { randomUUID } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE } from "./auth-state";

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
    await expect(page).toHaveURL("/transactions");
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

      await expect(page).toHaveURL("/transactions");
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

      await expect(page).toHaveURL("/transactions");
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
      await expect(page).toHaveURL("/transactions");
      await expect(page.getByRole("status")).toHaveText("Transaction deleted.");
      await expect(rowLink(page, renamed)).toHaveCount(0);
    } finally {
      await deleteAll(page, prefix);
    }
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
