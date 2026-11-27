import { currencyDecimals, type CurrencyCode } from "@/lib/money/currencies";

// Reading a typed amount (unit 2.1). String work only: no arithmetic and no `number`, so nothing
// passes through a float (invariant 1). Holds no secrets and no database code, so forms and the
// server share it. Messages live in lib/validation/money.ts. See
// context/feature-specs/2.1-money-module-amount-currency-fields.md, Design.

// At most 999,999,999,999 in any currency (Question C). numeric(19, 4) allows 15 digits before the
// point; the spare 3 leave room for sums in Postgres and Phase 3's conversions.
export const MAX_AMOUNT_INTEGER_DIGITS = 12;

// Longer input is refused as a format error before any other check.
export const MAX_AMOUNT_INPUT_LENGTH = 32;

export type AmountProblem = "empty" | "format" | "sign" | "decimals" | "zero" | "too-large";

export type ParsedAmount = { ok: true; amount: string } | { ok: false; reason: AmountProblem };

// Digits with commas only as correct thousands groups (1,234,567), or plain digits; then an optional
// point and decimals. ASCII digits only (`\d` without the `u` flag).
const AMOUNT_PATTERN = /^(?:(\d{1,3}(?:,\d{3})+)|(\d*))(?:\.(\d*))?$/;

// Reads what a user typed into an amount field for `currency`. Accepts "1,234.50", "1234.5", ".5" and
// "20."; refuses signs, other formats ("1.234,50", "1e5", "$20"), more decimal places than the
// currency has (never rounds), zero, and more than 12 digits before the point. On success, `amount`
// is the canonical string: no grouping, no sign, no leading zeros, exactly the currency's decimal
// places ("1234.50", "1500" for JPY).
export function parseAmountInput(text: string, currency: CurrencyCode): ParsedAmount {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { ok: false, reason: "empty" };
  }
  if (trimmed.length > MAX_AMOUNT_INPUT_LENGTH) {
    return { ok: false, reason: "format" };
  }
  if (trimmed.startsWith("-") || trimmed.startsWith("+")) {
    return { ok: false, reason: "sign" };
  }

  const match = AMOUNT_PATTERN.exec(trimmed);
  if (!match) {
    return { ok: false, reason: "format" };
  }
  const integerText = (match[1] ?? match[2] ?? "").replaceAll(",", "");
  const fraction = match[3] ?? "";
  if (integerText === "" && fraction === "") {
    return { ok: false, reason: "format" };
  }

  // Zero first, so "0.00" reads as zero in every currency, even one with no decimal places.
  const integer = integerText.replace(/^0+/, "") || "0";
  if (integer === "0" && /^0*$/.test(fraction)) {
    return { ok: false, reason: "zero" };
  }

  const decimals = currencyDecimals(currency);
  if (fraction.length > decimals) {
    return { ok: false, reason: "decimals" };
  }
  if (integer.length > MAX_AMOUNT_INTEGER_DIGITS) {
    return { ok: false, reason: "too-large" };
  }

  return { ok: true, amount: decimals === 0 ? integer : `${integer}.${fraction.padEnd(decimals, "0")}` };
}

// A canonical amount for `currency`, optionally negative (a later net figure, or an expense shown with
// a minus sign). Not capped, as sums can pass the input limit.
export function isCanonicalAmount(amount: string, currency: CurrencyCode, { signed = false } = {}): boolean {
  const decimals = currencyDecimals(currency);
  const fraction = decimals === 0 ? "" : `\\.\\d{${decimals}}`;
  return new RegExp(`^${signed ? "-?" : ""}(?:0|[1-9]\\d*)${fraction}$`).test(amount);
}
