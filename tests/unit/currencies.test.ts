import { describe, expect, test } from "vitest";

import {
  CURRENCY_DECIMALS,
  currencyDecimals,
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

// Decimal places (unit 2.1, Question D). See
// context/feature-specs/2.1-money-module-amount-currency-fields.md, Design.
describe("currencyDecimals", () => {
  test("gives every code 0 or 2 decimal places", () => {
    expect(Object.keys(CURRENCY_DECIMALS).sort()).toEqual([...SUPPORTED_CURRENCIES]);
    for (const code of SUPPORTED_CURRENCIES) {
      expect([0, 2]).toContain(currencyDecimals(code));
    }
  });

  test("gives exactly HUF, IDR, ISK, JPY and KRW no decimal places", () => {
    const none = SUPPORTED_CURRENCIES.filter((code) => currencyDecimals(code) === 0);
    expect(none).toEqual(["HUF", "IDR", "ISK", "JPY", "KRW"]);
  });

  test("matches what Intl shows on this Node version", () => {
    for (const code of SUPPORTED_CURRENCIES) {
      const intl = new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions();
      expect(intl.maximumFractionDigits, code).toBe(currencyDecimals(code));
    }
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
