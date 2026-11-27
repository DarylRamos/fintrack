import { describe, expect, test } from "vitest";

import { SUPPORTED_CURRENCIES } from "@/lib/money/currencies";
import { amountPlaceholder, formatMoney } from "@/lib/money/format";

// Showing amounts (unit 2.1): fixed en-US locale, Intl's symbols (Question E), the app's decimal
// places. See context/feature-specs/2.1-money-module-amount-currency-fields.md, Showing amounts.

// Intl puts a no-break space (U+00A0) between a code and the number, so they never wrap apart.
describe("formatMoney", () => {
  test.each([
    ["1234.50", "USD", "$1,234.50"],
    ["1234.50", "EUR", "€1,234.50"],
    ["1234.50", "AUD", "A$1,234.50"],
    ["1234.50", "PHP", "₱1,234.50"],
    ["1234.50", "SGD", "SGD 1,234.50"],
    ["1234", "JPY", "¥1,234"],
    ["1235", "HUF", "HUF 1,235"],
    ["1500000", "KRW", "₩1,500,000"],
    ["0.05", "USD", "$0.05"],
  ] as const)("%j in %s prints %j", (amount, currency, expected) => {
    expect(formatMoney(amount, currency)).toBe(expected);
  });

  test("prints negative amounts with a leading minus", () => {
    expect(formatMoney("-45.00", "SGD")).toBe("-SGD 45.00");
    expect(formatMoney("-45.00", "USD")).toBe("-$45.00");
    expect(formatMoney("-1500", "JPY")).toBe("-¥1,500");
  });

  test("prints long amounts exactly, with no float rounding", () => {
    expect(formatMoney("999999999999.99", "USD")).toBe("$999,999,999,999.99");
    // Past what a float holds exactly (a sum, beyond the input cap).
    expect(formatMoney("98765432109876543.21", "USD")).toBe("$98,765,432,109,876,543.21");
  });

  test("prints every currency with its decimal places", () => {
    for (const currency of SUPPORTED_CURRENCIES) {
      const amount = amountPlaceholder(currency) === "0" ? "7" : "7.00";
      expect(formatMoney(amount, currency)).toMatch(amount === "7" ? /7$/ : /7\.00$/);
    }
  });

  test.each([
    ["1234.5", "USD"],
    ["1,234.50", "USD"],
    ["1234.50", "JPY"],
    ["+1.00", "USD"],
    ["1e3", "USD"],
    ["", "USD"],
    ["NaN", "USD"],
  ] as const)("throws on %j in %s", (amount, currency) => {
    expect(() => formatMoney(amount, currency)).toThrow(TypeError);
  });
});

describe("amountPlaceholder", () => {
  test("shows the currency's decimal places", () => {
    expect(amountPlaceholder("SGD")).toBe("0.00");
    expect(amountPlaceholder("JPY")).toBe("0");
    expect(amountPlaceholder("IDR")).toBe("0");
  });
});
