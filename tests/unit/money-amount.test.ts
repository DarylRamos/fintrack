import { describe, expect, test } from "vitest";

import {
  isCanonicalAmount,
  MAX_AMOUNT_INPUT_LENGTH,
  MAX_AMOUNT_INTEGER_DIGITS,
  parseAmountInput,
  type AmountProblem,
} from "@/lib/money/amount";
import { SUPPORTED_CURRENCIES } from "@/lib/money/currencies";

// Reading typed amounts (unit 2.1). Each row of the spec's table, for SGD (2 decimal places) and JPY
// (none). See context/feature-specs/2.1-money-module-amount-currency-fields.md, What a user may type.

type Expected = string | AmountProblem;

const table: [typed: string, sgd: Expected, jpy: Expected][] = [
  ["1234.5", "1234.50", "decimals"],
  [" 1234.50 ", "1234.50", "decimals"],
  ["1,234.50", "1234.50", "decimals"],
  ["1,234", "1234.00", "1234"],
  [".5", "0.50", "decimals"],
  ["0.5", "0.50", "decimals"],
  ["00.50", "0.50", "decimals"],
  ["20.", "20.00", "20"],
  ["1.234,50", "format", "format"],
  ["1234,50", "format", "format"],
  ["12,34", "format", "format"],
  ["-20", "sign", "sign"],
  ["+20", "sign", "sign"],
  ["1e5", "format", "format"],
  ["$20", "format", "format"],
  ["20 SGD", "format", "format"],
  ["1 234", "format", "format"],
  ["٣٤", "format", "format"],
  ["0", "zero", "zero"],
  ["0.00", "zero", "zero"],
  ["1,000,000,000,000", "too-large", "too-large"],
  ["", "empty", "empty"],
  ["   ", "empty", "empty"],
];

function expectParsed(typed: string, currency: "SGD" | "JPY", expected: Expected) {
  const result = parseAmountInput(typed, currency);
  if (/^\d/.test(expected)) {
    expect(result).toEqual({ ok: true, amount: expected });
  } else {
    expect(result).toEqual({ ok: false, reason: expected });
  }
}

describe("parseAmountInput: the spec's table", () => {
  test.each(table)("%j in SGD is %j", (typed, sgd) => expectParsed(typed, "SGD", sgd));
  test.each(table)("%j in JPY is %j (SGD %j)", (typed, _sgd, jpy) => expectParsed(typed, "JPY", jpy));
});

describe("parseAmountInput: limits", () => {
  test("accepts 999,999,999,999 and refuses one above", () => {
    expect(MAX_AMOUNT_INTEGER_DIGITS).toBe(12);
    expect(parseAmountInput("999,999,999,999", "JPY")).toEqual({ ok: true, amount: "999999999999" });
    expect(parseAmountInput("999999999999.99", "SGD")).toEqual({ ok: true, amount: "999999999999.99" });
    expect(parseAmountInput("1000000000000", "JPY")).toEqual({ ok: false, reason: "too-large" });
  });

  test("counts digits after removing leading zeros", () => {
    expect(parseAmountInput("0000999999999999", "JPY")).toEqual({ ok: true, amount: "999999999999" });
  });

  test("accepts 32 characters and refuses 33", () => {
    expect(MAX_AMOUNT_INPUT_LENGTH).toBe(32);
    const ok = `${"0".repeat(29)}1.5`; // 32 characters
    expect(ok).toHaveLength(32);
    expect(parseAmountInput(ok, "SGD")).toEqual({ ok: true, amount: "1.50" });
    expect(parseAmountInput(`0${ok}`, "SGD")).toEqual({ ok: false, reason: "format" });
  });

  test("the smallest amounts are accepted", () => {
    expect(parseAmountInput("0.01", "SGD")).toEqual({ ok: true, amount: "0.01" });
    expect(parseAmountInput("1", "JPY")).toEqual({ ok: true, amount: "1" });
  });
});

describe("parseAmountInput: grouping", () => {
  test.each([
    ["1,234,567", "1234567.00"],
    ["12,345", "12345.00"],
    ["999,999.99", "999999.99"],
    ["1,234.", "1234.00"],
  ])("accepts %j as %j", (typed, amount) => {
    expect(parseAmountInput(typed, "SGD")).toEqual({ ok: true, amount });
  });

  test.each(["1,23", "12,3456", ",123", "1,,234", "1234,567", "1,234.5,0", "1,234,"])(
    "refuses %j",
    (typed) => {
      expect(parseAmountInput(typed, "SGD")).toEqual({ ok: false, reason: "format" });
    },
  );

  test.each([".", "..5", "1.2.3", "abc", "１２", "​12", "1_000", "0x10", "Infinity", "NaN"])(
    "refuses %j as a format error",
    (typed) => {
      expect(parseAmountInput(typed, "SGD")).toEqual({ ok: false, reason: "format" });
    },
  );
});

describe("parseAmountInput: output", () => {
  test("is always canonical for its currency, in every currency", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      for (const typed of ["1", "1,234", "0012", "20.", "999,999,999,999"]) {
        const result = parseAmountInput(typed, currency);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(isCanonicalAmount(result.amount, currency)).toBe(true);
          // Parsing the output again gives the same string.
          expect(parseAmountInput(result.amount, currency)).toEqual(result);
        }
      }
    }
  });
});

describe("isCanonicalAmount", () => {
  test.each([
    ["1234.50", "SGD", true],
    ["0.05", "SGD", true],
    ["1500", "JPY", true],
    ["1234.5", "SGD", false],
    ["1234.5000", "SGD", false],
    ["01234.50", "SGD", false],
    ["1,234.50", "SGD", false],
    ["1500.00", "JPY", false],
    ["-45.00", "SGD", false],
    ["", "SGD", false],
  ] as const)("%j in %s is %s", (amount, currency, expected) => {
    expect(isCanonicalAmount(amount, currency)).toBe(expected);
  });

  test("accepts a leading minus only when signed", () => {
    expect(isCanonicalAmount("-45.00", "SGD", { signed: true })).toBe(true);
    expect(isCanonicalAmount("+45.00", "SGD", { signed: true })).toBe(false);
    expect(isCanonicalAmount("--45.00", "SGD", { signed: true })).toBe(false);
  });
});
