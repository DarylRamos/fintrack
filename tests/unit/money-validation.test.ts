import { describe, expect, test } from "vitest";
import { z } from "zod";

import { moneySchema, moneyShape, withCanonicalAmount } from "@/lib/validation/money";

// The shared amount and currency schema (unit 2.1). See
// context/feature-specs/2.1-money-module-amount-currency-fields.md, The shared schema.

function issues(input: unknown) {
  const result = moneySchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => ({ path: issue.path, message: issue.message })) ?? [];
}

describe("moneySchema", () => {
  test.each([
    ["", "SGD", "Enter an amount."],
    ["1.234,50", "SGD", "Enter a number, such as 1,234.50."],
    ["abc", "JPY", "Enter a number, such as 1,234."],
    ["-20", "SGD", "Enter the amount without a sign."],
    ["12.505", "SGD", "SGD amounts have at most 2 decimal places."],
    ["12.50", "JPY", "JPY amounts have no decimal places."],
    ["0", "SGD", "Enter an amount above 0."],
    ["1,000,000,000,000", "SGD", "Enter an amount up to 999,999,999,999."],
  ])("%j in %s: %j, on amount", (amount, currency, message) => {
    expect(issues({ amount, currency })).toEqual([{ path: ["amount"], message }]);
  });

  test("replaces the amount with its canonical string", () => {
    expect(moneySchema.parse({ amount: " 1,234.5 ", currency: "SGD" })).toEqual({
      amount: "1234.50",
      currency: "SGD",
    });
    expect(moneySchema.parse({ amount: "1,500", currency: "JPY" })).toEqual({ amount: "1500", currency: "JPY" });
  });

  test("accepts its own output", () => {
    const once = moneySchema.parse({ amount: ".5", currency: "USD" });
    expect(moneySchema.parse(once)).toEqual(once);
  });

  test("refuses a currency outside the list, with no amount error added", () => {
    expect(issues({ amount: "12.50", currency: "BGN" })).toEqual([
      { path: ["currency"], message: "Choose a currency from the list." },
    ]);
    expect(issues({ amount: "abc", currency: "usd" })).toEqual([
      { path: ["currency"], message: "Choose a currency from the list." },
    ]);
  });

  test("refuses a missing or non-string amount", () => {
    expect(issues({ currency: "SGD" })).toEqual([{ path: ["amount"], message: "Enter an amount." }]);
    expect(issues({ amount: 12.5, currency: "SGD" })).toEqual([{ path: ["amount"], message: "Enter an amount." }]);
  });

  test("drops unknown keys", () => {
    expect(moneySchema.parse({ amount: "1", currency: "USD", userId: "x" })).toEqual({
      amount: "1.00",
      currency: "USD",
    });
  });
});

describe("withCanonicalAmount in a larger schema", () => {
  const schema = z.object({ ...moneyShape, note: z.string() }).transform(withCanonicalAmount);

  test("keeps the other fields and canonicalizes the amount", () => {
    expect(schema.parse({ amount: "1,234.5", currency: "SGD", note: "Lunch" })).toEqual({
      amount: "1234.50",
      currency: "SGD",
      note: "Lunch",
    });
  });

  test("adds no amount error while another field fails", () => {
    const result = schema.safeParse({ amount: "abc", currency: "SGD", note: 1 });
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([["note"]]);
  });
});
