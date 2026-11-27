"use client";

import type { UseFormRegisterReturn } from "react-hook-form";

import { FormField } from "@/components/auth/form-field";
import { selectClass } from "@/components/auth/styles";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { CategoryView } from "@/lib/categories/starter";
import { cn } from "@/lib/utils";
import type { TransactionType } from "@/lib/validation/transaction";

// The transaction form's Category field (unit 2.3): a native select, styled as the Currency select, so
// phones use their own picker. "No category" first (optional, Question C), then the chosen type's
// categories, already sorted by the data layer (alphabetical, Other last). The form clears the choice when
// the type changes. See context/feature-specs/2.3-categories-and-tags.md, Pages and UI.
export function CategoryField({
  categories,
  type,
  registration,
  error,
}: {
  categories: readonly CategoryView[];
  type: TransactionType;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <FormField id="transaction-category" label="Category" error={error}>
      {(control) => (
        <NativeSelect {...control} {...registration} className={cn(selectClass, "sm:w-72")}>
          <NativeSelectOption value="">No category</NativeSelectOption>
          {categories
            .filter((category) => category.type === type)
            .map((category) => (
              <NativeSelectOption key={category.id} value={category.id}>
                {category.name}
              </NativeSelectOption>
            ))}
        </NativeSelect>
      )}
    </FormField>
  );
}
