// The currencies FinTrack offers: the ones Frankfurter publishes daily rates for (the provider Phase 3
// uses), so every code can be converted. Checked against https://api.frankfurter.dev/v1/currencies on
// 2026-11-25 (30 codes; BGN was dropped when Bulgaria joined the euro). The app never calls
// Frankfurter before Phase 3. See context/feature-specs/1.5-profile-and-preferred-currency.md.
// Holds no secrets and no database code, so forms and the server share it.

export const SUPPORTED_CURRENCIES = [
  "AUD",
  "BRL",
  "CAD",
  "CHF",
  "CNY",
  "CZK",
  "DKK",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "ISK",
  "JPY",
  "KRW",
  "MXN",
  "MYR",
  "NOK",
  "NZD",
  "PHP",
  "PLN",
  "RON",
  "SEK",
  "SGD",
  "THB",
  "TRY",
  "USD",
  "ZAR",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

// For a profile that was never saved (owner's choice, Question C).
export const DEFAULT_CURRENCY: CurrencyCode = "USD";

const supported: ReadonlySet<string> = new Set(SUPPORTED_CURRENCIES);

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return supported.has(code);
}

const names = new Intl.DisplayNames(["en"], { type: "currency" });

// The English name, such as "Singapore Dollar", from Intl rather than a hand-typed list.
export function currencyName(code: CurrencyCode): string {
  return names.of(code) ?? code;
}
