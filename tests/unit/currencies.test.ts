import { describe, expect, test } from "vitest";

import {
  currencyName,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
} from "@/lib/money/currencies";

// The currency list (unit 1.5). See context/feature-specs/1.5-profile-and-preferred-currency.md,
// Currencies.

describe("SUPPORTED_CURRENCIES", () => {
  test("has Frankfurter's 30 codes, each three upper-case letters", () => {
    expect(SUPPORTED_CURRENCIES).toHaveLength(30);
    for (const code of SUPPORTED_CURRENCIES) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });

  test("is unique and sorted, so the picker reads in order", () => {
    expect(new Set(SUPPORTED_CURRENCIES).size).toBe(SUPPORTED_CURRENCIES.length);
    expect([...SUPPORTED_CURRENCIES]).toEqual([...SUPPORTED_CURRENCIES].sort());
  });

  test("leaves out BGN, which Frankfurter no longer publishes", () => {
    expect(isSupportedCurrency("BGN")).toBe(false);
  });

  test("includes the default", () => {
    expect(DEFAULT_CURRENCY).toBe("USD");
    expect(isSupportedCurrency(DEFAULT_CURRENCY)).toBe(true);
  });
});

describe("isSupportedCurrency", () => {
  test.each(["usd", "XXX", "", "US", "USDD", " USD"])("refuses %j", (code) => {
    expect(isSupportedCurrency(code)).toBe(false);
  });

  test("accepts a listed code", () => {
    expect(isSupportedCurrency("SGD")).toBe(true);
  });
});

describe("currencyName", () => {
  test("gives an English name for every code, not the code itself", () => {
    for (const code of SUPPORTED_CURRENCIES) {
      const name = currencyName(code);
      expect(name.length).toBeGreaterThan(3);
      expect(name).not.toBe(code);
    }
  });

  test("names a few known codes", () => {
    expect(currencyName("SGD")).toBe("Singapore Dollar");
    expect(currencyName("EUR")).toBe("Euro");
  });
});
