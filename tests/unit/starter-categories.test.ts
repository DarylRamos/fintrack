import { describe, expect, test } from "vitest";

import { CATEGORY_NAME_MAX_LENGTH, OTHER_CATEGORY, sortCategories, STARTER_CATEGORIES } from "@/lib/categories/starter";
import { TRANSACTION_TYPES } from "@/lib/validation/transaction";

// The starter categories every user begins with (unit 2.3, Question B), and their order in the form. See
// context/feature-specs/2.3-categories-and-tags.md, Starter Categories.

describe("STARTER_CATEGORIES", () => {
  test("is the approved list", () => {
    expect(STARTER_CATEGORIES.expense).toHaveLength(14);
    expect(STARTER_CATEGORIES.income).toEqual(["Salary", "Business", "Interest and dividends", "Gifts", "Refunds", "Other"]);
    expect(STARTER_CATEGORIES.expense).toContain("Rent");
    expect(STARTER_CATEGORIES.expense).toContain("Groceries");
  });

  test.each(TRANSACTION_TYPES)("the %s list ends in Other, with unique names that fit the column", (type) => {
    const names = STARTER_CATEGORIES[type];
    expect(names.at(-1)).toBe(OTHER_CATEGORY);
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(names.length);
    for (const name of names) {
      expect(name.trim()).toBe(name);
      expect(name.length).toBeGreaterThan(0);
      expect([...name].length).toBeLessThanOrEqual(CATEGORY_NAME_MAX_LENGTH);
    }
  });
});

describe("sortCategories", () => {
  test("is alphabetical ignoring case, with Other last, and doesn't change its input", () => {
    const input = [{ name: "Other" }, { name: "travel" }, { name: "Bills and utilities" }, { name: "Rent" }];
    expect(sortCategories(input).map((item) => item.name)).toEqual(["Bills and utilities", "Rent", "travel", "Other"]);
    expect(input[0].name).toBe("Other");
  });
});
