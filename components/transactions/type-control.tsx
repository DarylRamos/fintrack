"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

import { TRANSACTION_TYPES } from "@/lib/validation/transaction";

import { TYPE_LABELS } from "./amount-text";

// Expense or Income, as a two-option segmented control (unit 2.2): native radio inputs in a fieldset,
// so arrow keys move between them and it works before JavaScript loads. The chosen option takes the action
// colours (near-black, or near-white in dark mode, where slate is too close to the track); the word
// carries the meaning. See ui-context.md, Transactions.
export function TypeControl({ registration, error }: { registration: UseFormRegisterReturn; error?: string }) {
  const errorId = error ? "transaction-type-error" : undefined;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={errorId}>
      <legend className="mb-2 text-sm font-medium text-ink">Type</legend>
      <div className="grid h-11 w-full grid-cols-2 gap-1 rounded-md bg-fill p-1 sm:w-64">
        {TRANSACTION_TYPES.map((type) => (
          <label key={type} className="group relative flex cursor-pointer">
            <input {...registration} type="radio" value={type} className="peer sr-only" />
            <span className="flex w-full items-center justify-center rounded-sm text-sm font-medium text-ink transition-colors duration-200 group-hover:bg-surface peer-checked:bg-action peer-checked:text-on-action peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-fill motion-reduce:transition-none">
              {TYPE_LABELS[type]}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} className="text-sm text-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
