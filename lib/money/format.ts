import { isCanonicalAmount } from "@/lib/money/amount";
import { currencyDecimals, type CurrencyCode } from "@/lib/money/currencies";

// Showing amounts (unit 2.1). The locale is fixed at en-US until Phase 14's regional formats, and the
// decimal places come from the app's table, so every page, on the server or in a browser, prints the
// same text. Symbols are Intl's own (Question E): "$" for USD, "A$", "€", "₱"…, or the code, such as
// "SGD 1,234.50". See context/feature-specs/2.1-money-module-amount-currency-fields.md, Design.

export const MONEY_LOCALE = "en-US";

const formatters = new Map<CurrencyCode, Intl.NumberFormat>();

function formatterFor(currency: CurrencyCode): Intl.NumberFormat {
  let formatter = formatters.get(currency);
  if (!formatter) {
    const decimals = currencyDecimals(currency);
    formatter = new Intl.NumberFormat(MONEY_LOCALE, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatters.set(currency, formatter);
  }
  return formatter;
}

// Formats a canonical amount ("1234.50", or "-45.00") as "SGD 1,234.50" or "-SGD 45.00". The string
// itself goes to Intl, which formats a decimal string exactly; it never becomes a `number`. Anything
// else throws: amounts reach here from the schema or the data layer, so a bad one is a bug.
export function formatMoney(amount: string, currency: CurrencyCode): string {
  if (!isCanonicalAmount(amount, currency, { signed: true })) {
    throw new TypeError("formatMoney needs a canonical amount for its currency.");
  }
  // A canonical amount is a numeric literal; the check above proves it.
  return formatterFor(currency).format(amount as Intl.StringNumericLiteral);
}

// The amount field's placeholder: "0.00", or "0" for currencies with no decimal places.
export function amountPlaceholder(currency: CurrencyCode): string {
  const decimals = currencyDecimals(currency);
  return decimals === 0 ? "0" : `0.${"0".repeat(decimals)}`;
}
