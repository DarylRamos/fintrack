import { expect, test, type Page } from "@playwright/test";

import { accountNav, mainNav } from "@/components/app-shell/nav-items";

import { hasTestAccount, NO_TEST_ACCOUNT, SIGNED_IN_STATE } from "./auth-state";

// The app shell's main flow, signed in: sidebar navigation, the phone menu, the header, and no
// horizontal scroll at phone width. App pages need a session since unit 1.2a, so these run locally
// with the development test account and skip in CI (see auth-state.ts).

test.skip(!hasTestAccount, NO_TEST_ACCOUNT);
test.use({ storageState: SIGNED_IN_STATE });

const allNav = [...mainNav, ...accountNav];

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop sidebar only");

  test("each sidebar item opens its page", async ({ page }) => {
    await page.goto("/dashboard");
    const sidebar = page.locator("[data-sidebar='sidebar']").first();

    for (const item of allNav) {
      await sidebar.getByRole("link", { name: item.title, exact: true }).click();
      await expect(page).toHaveURL(item.href);
      await expect(heading(page)).toHaveText(item.title);
    }
  });
});

test.describe("phone", () => {
  test.skip(({ isMobile }) => !isMobile, "Phone layout only");

  test("the menu opens, navigates and closes", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open menu" }).click();

    const menu = page.getByRole("dialog", { name: "Sidebar" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Transactions", exact: true }).click();

    await expect(page).toHaveURL("/transactions");
    await expect(heading(page)).toHaveText("Transactions");
    await expect(menu).toBeHidden();
  });

  for (const item of allNav) {
    test(`${item.href} doesn't scroll horizontally`, async ({ page }) => {
      await page.goto(item.href);
      await expect(heading(page)).toHaveText(item.title);
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});

test("the account menu sits beside the header without covering the title", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(heading(page)).toHaveText("Dashboard");
  const menuButton = page.getByRole("button", { name: "Account menu" });
  await expect(menuButton).toBeVisible();
  // Signed-out browsers can't reach app pages, so the header has no "Sign in" link (unit 1.2a).
  await expect(page.locator("#main").getByRole("link", { name: "Sign in" })).toHaveCount(0);

  // The layout places the account area beside the header; the header leaves room, so the title
  // and breadcrumb never run under it.
  const header = page.locator("#main header");
  const [headerBox, buttonBox] = await Promise.all([header.boundingBox(), menuButton.boundingBox()]);
  const contentRight = await header.evaluate((el) => {
    const { right } = el.getBoundingClientRect();
    return right - parseFloat(getComputedStyle(el).paddingRight);
  });
  expect(headerBox && buttonBox).toBeTruthy();
  expect(contentRight).toBeLessThanOrEqual(buttonBox!.x);
  expect(buttonBox!.y).toBeLessThan(headerBox!.y + headerBox!.height);
});
