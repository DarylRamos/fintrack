import { z } from "zod";

import { type AmountProblem, MAX_AMOUNT_INTEGER_DIGITS, parseAmountInput } from "@/lib/money/amount";
import { currencyDecimals, type CurrencyCode, SUPPORTED_CURRENCIES } from "@/lib/money/currencies";

// An amount and its currency, shared by forms (browser) and Server Actions (server). Holds no secrets.
// See context/feature-specs/2.1-money-module-amount-currency-fields.md, The shared schema.

export const currencySchema = z.enum(SUPPORTED_CURRENCIES, {
  error: "Choose a currency from the list.",
});

const MAX_AMOUNT_TEXT = "9".repeat(MAX_AMOUNT_INTEGER_DIGITS).replace(/\B(?=(\d{3})+$)/g, ",");

// One message per reason the amount was refused, worded for the chosen currency.
export function amountMessage(reason: AmountProblem, currency: CurrencyCode): string {
  const decimals = currencyDecimals(currency);
  switch (reason) {
    case "empty":
      return "Enter an amount.";
    case "format":
      return `Enter a number, such as ${decimals === 0 ? "1,234" : "1,234.50"}.`;
    case "sign":
      return "Enter the amount without a sign.";
    case "decimals":
      return decimals === 0
        ? `${currency} amounts have no decimal places.`
        : `${currency} amounts have at most ${decimals} decimal places.`;
    case "zero":
      return "Enter an amount above 0.";
    case "too-large":
      return `Enter an amount up to ${MAX_AMOUNT_TEXT}.`;
  }
}

export const moneyShape = { amount: z.string({ error: "Enter an amount." }), currency: currencySchema };

// Checks the amount for its currency and replaces it with the canonical string ("1,234.5" becomes
// "1234.50"); errors are reported on `amount`. Runs only once every field passed, so an invalid
// currency adds no amount error. A larger schema (such as unit 2.2's transaction) adds its own fields
// to `moneyShape` and ends with `.transform(withCanonicalAmount)`.
export function withCanonicalAmount<T extends { amount: string; currency: CurrencyCode }>(
  value: T,
  ctx: z.RefinementCtx,
): T {
  const parsed = parseAmountInput(value.amount, value.currency);
  if (!parsed.ok) {
    ctx.addIssue({ code: "custom", path: ["amount"], message: amountMessage(parsed.reason, value.currency) });
    return z.NEVER;
  }
  return { ...value, amount: parsed.amount };
}

// Accepts its own output: parsing "1234.50" again gives "1234.50".
export const moneySchema = z.object(moneyShape).transform(withCanonicalAmount);

export type MoneyInput = z.input<typeof moneySchema>;
export type MoneyValues = z.output<typeof moneySchema>;
