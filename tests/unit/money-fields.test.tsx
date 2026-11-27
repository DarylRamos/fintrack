import { renderToStaticMarkup } from "react-dom/server";
import { useForm, type FieldErrors } from "react-hook-form";
import { describe, expect, test } from "vitest";

import { MoneyFields } from "@/components/money/money-fields";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/money/currencies";

// The Amount and Currency fields (unit 2.1). Render tests only; their first page and browser test come
// with unit 2.2's transaction form. See
// context/feature-specs/2.1-money-module-amount-currency-fields.md, The fields.

interface Values {
  amount: string;
  currency: CurrencyCode;
}

function Harness({ currency, errors }: { currency: CurrencyCode; errors?: FieldErrors<Values> }) {
  const form = useForm<Values>({ defaultValues: { amount: "", currency }, errors });
  return <MoneyFields form={form} idPrefix="test" />;
}

function render(currency: CurrencyCode, errors?: FieldErrors<Values>) {
  return renderToStaticMarkup(<Harness currency={currency} errors={errors} />);
}

describe("MoneyFields", () => {
  test("renders both labelled fields", () => {
    const html = render("SGD");
    expect(html).toMatch(/<label[^>]*for="test-amount"[^>]*>Amount<\/label>/);
    expect(html).toMatch(/<label[^>]*for="test-currency"[^>]*>Currency<\/label>/);
    expect(html).toMatch(/<input[^>]*id="test-amount"/);
    expect(html).toMatch(/<select[^>]*id="test-currency"/);
  });

  test("the amount input brings up a number pad and keeps typed text", () => {
    const html = render("SGD");
    const input = /<input[^>]*id="test-amount"[^>]*>/.exec(html)?.[0] ?? "";
    expect(input).toContain('type="text"');
    expect(input).toContain('inputMode="decimal"');
    expect(input).toContain('autoComplete="off"');
    expect(input).toContain("tabular-nums");
    expect(input).toContain('name="amount"');
  });

  test("the placeholder follows the currency's decimal places", () => {
    expect(render("SGD")).toContain('placeholder="0.00"');
    expect(render("JPY")).toContain('placeholder="0"');
  });

  // The selected option is set by react-hook-form in the browser, so a server render can't show it;
  // unit 2.2's browser test covers it.
  test("lists every currency in order, with its name", () => {
    const html = render("JPY");
    const values = [...html.matchAll(/<option[^>]*value="([A-Z]{3})"/g)].map((match) => match[1]);
    expect(values).toEqual([...SUPPORTED_CURRENCIES]);
    expect(html).toContain(">SGD – Singapore Dollar</option>");
    expect(html).toMatch(/<select[^>]*name="currency"/);
  });

  test("shows each error under its field, linked to the control", () => {
    const html = render("SGD", {
      amount: { type: "custom", message: "Enter an amount above 0." },
      currency: { type: "custom", message: "Choose a currency from the list." },
    });
    expect(html).toMatch(/<input[^>]*aria-invalid="true"[^>]*aria-describedby="test-amount-error"/);
    expect(html).toMatch(/<select[^>]*aria-invalid="true"[^>]*aria-describedby="test-currency-error"/);
    expect(html).toMatch(/id="test-amount-error"[^>]*>.*Enter an amount above 0\./);
    expect(html).toMatch(/id="test-currency-error"[^>]*>.*Choose a currency from the list\./);
  });

  test("without errors, nothing is marked invalid", () => {
    const html = render("SGD");
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).not.toContain('id="test-amount-error"');
    expect(html).not.toContain('id="test-currency-error"');
    expect(html).not.toContain("aria-describedby");
  });

  test("stacks on phones and sits side by side from sm up", () => {
    expect(render("SGD")).toContain("grid-cols-1");
    expect(render("SGD")).toContain("sm:grid-cols-[1fr_14rem]");
  });
});
