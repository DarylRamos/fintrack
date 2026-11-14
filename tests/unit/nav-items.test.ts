import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { accountNav, getNavItem, mainNav } from "@/components/app-shell/nav-items";

// Guards the app shell decision that no navigation link leads to a 404.

const allNav = [...mainNav, ...accountNav];

describe("navigation items", () => {
  test("have unique hrefs and titles", () => {
    const hrefs = allNav.map((item) => item.href);
    const titles = allNav.map((item) => item.title);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  test.each(allNav.map((item) => [item.href, item] as const))(
    "getNavItem finds %s",
    (href, item) => {
      expect(getNavItem(href)).toBe(item);
    },
  );

  test("getNavItem throws for an unknown href", () => {
    expect(() => getNavItem("/missing")).toThrow("No navigation item for /missing");
  });

  test.each(allNav.map((item) => [item.href] as const))("%s has a page", (href) => {
    const page = path.join(process.cwd(), "app", "(app)", href.slice(1), "page.tsx");
    expect(existsSync(page), `Missing page file for ${href}`).toBe(true);
  });
});
