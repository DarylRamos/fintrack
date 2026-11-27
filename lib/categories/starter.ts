import type { TransactionType } from "@/lib/validation/transaction";

// The starter categories every user begins with (unit 2.3, Questions A and B), and how the form orders
// them. The data layer seeds them the first time a user's categories are read; until Phase 14 they can't
// be changed. Holds no secrets and imports nothing server-only, so the form and tests share it. See
// context/feature-specs/2.3-categories-and-tags.md, Starter Categories.

export const CATEGORY_NAME_MAX_LENGTH = 40;

export const OTHER_CATEGORY = "Other";

export const STARTER_CATEGORIES: Readonly<Record<TransactionType, readonly string[]>> = {
  expense: [
    "Rent",
    "Bills and utilities",
    "Groceries",
    "Dining out",
    "Transport",
    "Health",
    "Insurance",
    "Shopping",
    "Entertainment",
    "Travel",
    "Education",
    "Personal care",
    "Gifts and donations",
    OTHER_CATEGORY,
  ],
  income: ["Salary", "Business", "Interest and dividends", "Gifts", "Refunds", OTHER_CATEGORY],
};

// One of a user's categories, as the data layer returns it and the form lists it.
export interface CategoryView {
  id: string;
  type: TransactionType;
  name: string;
}

// Alphabetical (ignoring case), with Other last.
export function sortCategories<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const aOther = a.name === OTHER_CATEGORY;
    const bOther = b.name === OTHER_CATEGORY;
    if (aOther !== bOther) {
      return aOther ? 1 : -1;
    }
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
}
