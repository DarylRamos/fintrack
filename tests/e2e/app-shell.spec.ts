import { expect, test, type Page } from "@playwright/test";

import { accountNav, mainNav } from "@/components/app-shell/nav-items";

// The app shell's main flow: redirect, sidebar navigation, the phone menu, and no horizontal
// scroll at phone width.

const allNav = [...mainNav, ...accountNav];

function heading(page: Page) {
  return page.getByRole("heading", { level: 1 });
}

test("/ redirects to the dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/dashboard");
  await expect(heading(page)).toHaveText("Dashboard");
});

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
