"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { useWatch } from "react-hook-form";

import { createTransaction, updateTransaction } from "@/app/(app)/transactions/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { authInputClass } from "@/components/auth/styles";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { MoneyFields } from "@/components/money/money-fields";
import { settingsOutlineButtonClass, settingsPrimaryButtonClass } from "@/components/settings/styles";
import { Input } from "@/components/ui/input";
import type { CategoryView } from "@/lib/categories/starter";
import { cn } from "@/lib/utils";
import {
  DESCRIPTION_MAX_LENGTH,
  EARLIEST_TRANSACTION_DATE,
  latestTransactionDate,
  todayIsoDate,
  transactionSchema,
  type TransactionInput,
} from "@/lib/validation/transaction";

import { CategoryField } from "./category-field";
import { TagField } from "./tag-field";
import { TypeControl } from "./type-control";

// The transaction form (unit 2.2), on the new and edit pages: Type, Amount and Currency (unit 2.1's
// fields), Date, Category, Description and Tags (unit 2.3), checked on submit and then as the user types.
// On success the action redirects to the list. See
// context/feature-specs/2.2-transaction-create-edit-delete.md and 2.3-categories-and-tags.md, Pages and UI.

interface FormLists {
  // The user's categories (both types; the field shows the chosen type's) and earlier tag names.
  categories: readonly CategoryView[];
  tagSuggestions: readonly string[];
}

export type TransactionFormProps =
  | ({ mode: "new"; initial: TransactionInput } & FormLists)
  | ({ mode: "edit"; id: string; initial: TransactionInput } & FormLists);

const buttonWidth = "w-full sm:w-auto";

// The date is read again on every render; nothing needs to announce a change.
function subscribeNever(): () => void {
  return () => {};
}

function serverToday(): string | null {
  return null;
}

export function TransactionForm(props: TransactionFormProps) {
  const isNew = props.mode === "new";
  const id = props.mode === "edit" ? props.id : null;
  const { form, formError, pending, onSubmit } = useAuthForm(
    transactionSchema,
    (input) => (id === null ? createTransaction(input) : updateTransaction(id, input)),
    props.initial,
  );
  const { errors, isSubmitted, isDirty } = form.formState;
  // An edit with nothing changed has nothing to save (owner's hand check, 2026-11-27): Save changes stays
  // off until a field differs from the saved values, and turns off again if they're changed back.
  const unchanged = !isNew && !isDirty;
  const { getValues, setValue } = form;
  const type = useWatch({ control: form.control, name: "type" }) ?? "expense";
  // The schema accepts any list (and checks it); the field only ever holds strings.
  const tags = (useWatch({ control: form.control, name: "tags" }) ?? []).filter(
    (tag): tag is string => typeof tag === "string",
  );

  // "Today" is the browser's own day (Question B): null while rendering on the server, so the server's
  // UTC clock never decides it, and the browser's date once hydrated. A new transaction's date starts
  // at it; the latest allowed date follows it. The field keeps its size meanwhile.
  const today = useSyncExternalStore(subscribeNever, todayIsoDate, serverToday);
  const latestDate = today ? latestTransactionDate(today) : undefined;
  useEffect(() => {
    if (isNew && today && !getValues("occurredOn")) {
      setValue("occurredOn", today);
    }
  }, [isNew, today, getValues, setValue]);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <TypeControl
        registration={form.register("type", {
          // The category list follows the type, so a change clears the choice (an expense can't keep an
          // income category).
          onChange: () => setValue("categoryId", "", { shouldValidate: isSubmitted }),
        })}
        error={errors.type?.message}
      />
      <MoneyFields form={form} idPrefix="transaction" />
      <FormField id="transaction-date" label="Date" error={errors.occurredOn?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register("occurredOn")}
            type="date"
            min={EARLIEST_TRANSACTION_DATE}
            max={latestDate}
            className={cn(authInputClass, "w-full tabular-nums sm:w-56")}
          />
        )}
      </FormField>
      <CategoryField
        categories={props.categories}
        type={type}
        registration={form.register("categoryId")}
        error={errors.categoryId?.message}
      />
      <FormField id="transaction-description" label="Description" error={errors.description?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register("description")}
            type="text"
            autoComplete="off"
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="What was it for?"
            className={authInputClass}
          />
        )}
      </FormField>
      <TagField
        value={tags}
        onChange={(next) => setValue("tags", next, { shouldDirty: true, shouldValidate: isSubmitted })}
        suggestions={props.tagSuggestions}
        error={errors.tags?.message ?? errors.tags?.root?.message}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || unchanged}
          aria-disabled={pending || unchanged}
          className={cn(settingsPrimaryButtonClass, buttonWidth)}
        >
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Saving…
            </>
          ) : isNew ? (
            "Add transaction"
          ) : (
            "Save changes"
          )}
        </button>
        <Link href="/transactions" className={cn(settingsOutlineButtonClass, buttonWidth)}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
