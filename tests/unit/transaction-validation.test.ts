import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import {
  isCalendarDate,
  latestTransactionDate,
  todayIsoDate,
  transactionIdSchema,
  transactionSchema,
} from "@/lib/validation/transaction";

// The transaction schema shared by the form and the actions (unit 2.2). "Today" is fixed at
// 27 Nov 2026 (local time) so the date limits are exact. See
// context/feature-specs/2.2-transaction-create-edit-delete.md, Validation.

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 27, 12, 0, 0));
});

afterAll(() => {
  vi.useRealTimers();
});

const valid = {
  type: "expense",
  amount: "1,234.5",
  currency: "SGD",
  occurredOn: "2026-11-27",
  description: "  Groceries  ",
};

function errorsFor(input: unknown) {
  const result = transactionSchema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}

describe("transactionSchema", () => {
  test("accepts a valid transaction: the amount becomes canonical and the description trimmed", () => {
    expect(transactionSchema.parse(valid)).toEqual({
      type: "expense",
      amount: "1234.50",
      currency: "SGD",
      occurredOn: "2026-11-27",
      description: "Groceries",
    });
  });

  test("accepts its own output: parsing twice gives the same result", () => {
    const once = transactionSchema.parse(valid);
    expect(transactionSchema.parse(once)).toEqual(once);
    const jpy = transactionSchema.parse({ ...valid, type: "income", amount: "1,500", currency: "JPY" });
    expect(jpy.amount).toBe("1500");
    expect(transactionSchema.parse(jpy)).toEqual(jpy);
  });

  test("drops an id or userId in the input", () => {
    const parsed = transactionSchema.parse({ ...valid, id: "x", userId: "someone-else" });
    expect(parsed).not.toHaveProperty("id");
    expect(parsed).not.toHaveProperty("userId");
  });

  test.each([["transfer"], [""], [undefined]])("refuses the type %j", (type) => {
    expect(errorsFor({ ...valid, type }).type).toEqual(["Choose income or expense."]);
  });

  test("uses 2.1's amount messages for the chosen currency", () => {
    expect(errorsFor({ ...valid, amount: "" }).amount).toEqual(["Enter an amount."]);
    expect(errorsFor({ ...valid, amount: "-20" }).amount).toEqual(["Enter the amount without a sign."]);
    expect(errorsFor({ ...valid, amount: "0" }).amount).toEqual(["Enter an amount above 0."]);
    expect(errorsFor({ ...valid, amount: "12.50", currency: "JPY" }).amount).toEqual([
      "JPY amounts have no decimal places.",
    ]);
  });

  test("shows every error at once, including the amount's", () => {
    expect(errorsFor({ type: "", amount: "1.234", currency: "SGD", occurredOn: "", description: "" })).toEqual({
      type: ["Choose income or expense."],
      amount: ["SGD amounts have at most 2 decimal places."],
      occurredOn: ["Enter a date."],
      description: ["Enter a description."],
    });
  });

  test("adds no amount error when the currency itself is invalid", () => {
    const errors = errorsFor({ ...valid, amount: "abc", currency: "XXX" });
    expect(errors.currency).toEqual(["Choose a currency from the list."]);
    expect(errors.amount).toBeUndefined();
  });

  describe("date", () => {
    test.each([["2000-01-01"], ["2026-11-27"], ["2027-11-27"]])("accepts %s", (occurredOn) => {
      expect(transactionSchema.parse({ ...valid, occurredOn }).occurredOn).toBe(occurredOn);
    });

    test("refuses a date before 1 Jan 2000", () => {
      expect(errorsFor({ ...valid, occurredOn: "1999-12-31" }).occurredOn).toEqual(["Enter a date from 1 Jan 2000."]);
    });

    test("refuses a date more than a year ahead", () => {
      expect(errorsFor({ ...valid, occurredOn: "2027-11-28" }).occurredOn).toEqual([
        "Enter a date no more than a year ahead.",
      ]);
      expect(errorsFor({ ...valid, occurredOn: "2062-01-01" }).occurredOn).toEqual([
        "Enter a date no more than a year ahead.",
      ]);
    });

    test.each([["2026-02-30"], ["2026-13-01"], ["27/11/2026"], ["2026-1-5"], [""], [undefined]])(
      "refuses %j as not a date",
      (occurredOn) => {
        expect(errorsFor({ ...valid, occurredOn }).occurredOn).toEqual(["Enter a date."]);
      },
    );
  });

  describe("description", () => {
    test("accepts 100 characters, counted as characters", () => {
      expect(transactionSchema.parse({ ...valid, description: "a".repeat(100) }).description).toHaveLength(100);
      expect(transactionSchema.parse({ ...valid, description: "😀".repeat(100) }).description).toBe("😀".repeat(100));
    });

    test("refuses 101 characters", () => {
      expect(errorsFor({ ...valid, description: "a".repeat(101) }).description).toEqual([
        "Use at most 100 characters.",
      ]);
    });

    test.each([[""], ["   "]])("refuses an empty description (%j)", (description) => {
      expect(errorsFor({ ...valid, description }).description).toEqual(["Enter a description."]);
    });

    test("refuses line breaks and tabs", () => {
      expect(errorsFor({ ...valid, description: "Rent\tNovember" }).description).toEqual([
        "Remove line breaks and tabs.",
      ]);
    });
  });

  test.each([null, undefined, "text", 42])("refuses a non-object input (%j)", (input) => {
    expect(transactionSchema.safeParse(input).success).toBe(false);
  });
});

describe("date helpers", () => {
  test("todayIsoDate gives the local calendar date", () => {
    expect(todayIsoDate()).toBe("2026-11-27");
    expect(todayIsoDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });

  test("latestTransactionDate is one year later, rolling 29 Feb over", () => {
    expect(latestTransactionDate("2026-11-27")).toBe("2027-11-27");
    expect(latestTransactionDate("2028-02-29")).toBe("2029-03-01");
  });

  test("isCalendarDate accepts real dates only", () => {
    expect(isCalendarDate("2028-02-29")).toBe(true);
    expect(isCalendarDate("2027-02-29")).toBe(false);
    expect(isCalendarDate("2026-04-31")).toBe(false);
  });
});

describe("transactionIdSchema", () => {
  test("accepts a UUID and refuses anything else", () => {
    expect(transactionIdSchema.safeParse("1b4e28ba-2fa1-41d2-883f-0016d3cca427").success).toBe(true);
    expect(transactionIdSchema.safeParse("1").success).toBe(false);
    expect(transactionIdSchema.safeParse("' or 1=1 --").success).toBe(false);
    expect(transactionIdSchema.safeParse(undefined).success).toBe(false);
  });
});
