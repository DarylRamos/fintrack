import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import { signedAmount } from "@/components/transactions/amount-text";
import { TransactionListView } from "@/components/transactions/transaction-list-view";
import type { TransactionView } from "@/lib/db/transactions";
import { formatCalendarDate } from "@/lib/dates";

// The Transactions list (unit 2.2), rendered without data access. See
// context/feature-specs/2.2-transaction-create-edit-delete.md, Pages and UI.

const NBSP = " ";

const expense: TransactionView = {
  id: "7d444840-9dc0-41c8-8f38-8a7b1e2f4a10",
  type: "expense",
  amount: "45.00",
  currency: "SGD",
  occurredOn: "2026-11-27",
  description: "Groceries",
};

const income: TransactionView = {
  id: "0c1e9c55-7a0d-4f7f-b5a5-8f51d6f1e0a2",
  type: "income",
  amount: "150000",
  currency: "JPY",
  occurredOn: "2026-11-02",
  description: "Freelance fee",
};

function render(items: TransactionView[], hasMore = false): string {
  return renderToStaticMarkup(<TransactionListView items={items} hasMore={hasMore} />);
}

describe("signedAmount", () => {
  test("an expense has a minus sign, an income a plus sign", () => {
    expect(signedAmount(expense)).toBe(`-SGD${NBSP}45.00`);
    expect(signedAmount(income)).toBe("+¥150,000");
    expect(signedAmount({ type: "income", amount: "2500.00", currency: "USD" })).toBe("+$2,500.00");
  });

  test("a code no longer in the list shows the code and the stored digits", () => {
    expect(signedAmount({ type: "expense", amount: "12.00", currency: "BGN" })).toBe("-BGN 12.00");
  });
});

describe("formatCalendarDate", () => {
  test("prints the day itself, in the Settings format", () => {
    expect(formatCalendarDate("2026-11-27")).toBe("27 Nov 2026");
    expect(formatCalendarDate("2026-01-01")).toBe("1 Jan 2026");
  });
});

describe("TransactionListView", () => {
  test("each row links to its edit page with the description, date, type and signed amount", () => {
    const html = render([expense, income]);
    expect(html).toContain(`href="/transactions/${expense.id}/edit"`);
    expect(html).toContain(`href="/transactions/${income.id}/edit"`);
    expect(html).toContain("Groceries");
    expect(html).toContain("27 Nov 2026 · Expense");
    expect(html).toContain("2 Nov 2026 · Income");
    expect(html).toContain(`-SGD${NBSP}45.00`);
    expect(html).toContain("+¥150,000");
    expect(html).toContain("tabular-nums");
  });

  test("each row's accessible name says what it is", () => {
    const html = render([expense]);
    expect(html).toContain(`aria-label="Groceries, expense, -SGD${NBSP}45.00, 27 Nov 2026"`);
  });

  test("keeps the order it is given (newest first, from the data layer)", () => {
    const html = render([expense, income]);
    expect(html.indexOf("Groceries")).toBeLessThan(html.indexOf("Freelance fee"));
  });

  test("offers Add transaction once", () => {
    const html = render([expense]);
    expect(html.match(/href="\/transactions\/new"/g)).toHaveLength(1);
    expect(html).toContain("Add transaction");
  });

  test("the empty state is one sentence and one action", () => {
    const html = render([]);
    expect(html).toContain("No transactions yet.");
    expect(html.match(/href="\/transactions\/new"/g)).toHaveLength(1);
    expect(html).not.toContain("<ul");
  });

  test("notes the limit only when more transactions exist", () => {
    expect(render([expense], true)).toContain("Showing your 50 most recent transactions.");
    expect(render([expense], false)).not.toContain("most recent transactions");
  });

  test("always renders the polite status line, empty until a change is reported", () => {
    for (const html of [render([]), render([expense])]) {
      expect(html).toMatch(/<p role="status" aria-live="polite"[^>]*><\/p>/);
    }
  });
});
