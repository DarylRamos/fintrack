"use client";

import { get, useWatch, type FieldError, type FieldValues, type Path, type UseFormReturn } from "react-hook-form";

import { FormField } from "@/components/auth/form-field";
import { authInputClass, selectClass } from "@/components/auth/styles";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import {
  currencyName,
  DEFAULT_CURRENCY,
  isSupportedCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from "@/lib/money/currencies";
import { amountPlaceholder } from "@/lib/money/format";

// The Amount and Currency fields (unit 2.1), for a react-hook-form form whose schema includes
// lib/validation/money.ts's `moneyShape` (fields named `amount` and `currency`). The form chooses the
// starting currency; unit 2.2 starts with the preferred one. What was typed is never reformatted; the
// schema accepts grouped and ungrouped numbers. See
// context/feature-specs/2.1-money-module-amount-currency-fields.md, The fields.

interface MoneyFormValues extends FieldValues {
  amount: string;
  currency: CurrencyCode;
}

export function MoneyFields<T extends MoneyFormValues, TOutput extends FieldValues>({
  form,
  idPrefix,
}: {
  form: UseFormReturn<T, unknown, TOutput>;
  idPrefix: string;
}) {
  const amountField = "amount" as Path<T>;
  const currencyField = "currency" as Path<T>;
  const watched: unknown = useWatch({ control: form.control, name: currencyField });
  const currency = typeof watched === "string" && isSupportedCurrency(watched) ? watched : DEFAULT_CURRENCY;
  const errors = form.formState.errors;
  const amountError: string | undefined = (get(errors, "amount") as FieldError | undefined)?.message;
  const currencyError: string | undefined = (get(errors, "currency") as FieldError | undefined)?.message;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_14rem] sm:gap-4">
      <FormField id={`${idPrefix}-amount`} label="Amount" error={amountError}>
        {(control) => (
          <Input
            {...control}
            {...form.register(amountField)}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={amountPlaceholder(currency)}
            className={cn(authInputClass, "tabular-nums")}
          />
        )}
      </FormField>
      <FormField id={`${idPrefix}-currency`} label="Currency" error={currencyError}>
        {(control) => (
          <NativeSelect
            {...control}
            {...form.register(currencyField, {
              // The amount's error depends on the currency ("12.50" in JPY), so check it again once
              // the form has been submitted, as every field is then checked while typing.
              onChange: () => {
                if (form.formState.isSubmitted) {
                  void form.trigger(amountField);
                }
              },
            })}
            className={selectClass}
          >
            {SUPPORTED_CURRENCIES.map((code) => (
              <NativeSelectOption key={code} value={code}>
                {`${code} – ${currencyName(code)}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
    </div>
  );
}
