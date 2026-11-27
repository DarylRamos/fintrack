"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { updateProfile } from "@/app/(app)/profile/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { authInputClass, selectClass } from "@/components/auth/styles";
import { useAuthForm } from "@/components/auth/use-auth-form";
import { settingsPrimaryButtonClass } from "@/components/settings/styles";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ProfileView } from "@/lib/db/profiles";
import { currencyName, SUPPORTED_CURRENCIES } from "@/lib/money/currencies";
import { DISPLAY_NAME_MAX_LENGTH, profileSchema } from "@/lib/validation/profile";

const SAVED_FOR_MS = 4000;

// The Profile page's form (unit 1.5): display name and preferred currency, one Save button. Checked on
// submit, then as the user types (as every FinTrack form). See
// context/feature-specs/1.5-profile-and-preferred-currency.md, UI.
export function ProfileForm({ initial }: { initial: ProfileView }) {
  // What the last save stored; set only on success, and cleared after a few seconds.
  const [saved, setSaved] = useState<ProfileView | null>(null);

  const { form, formError, pending, onSubmit } = useAuthForm(
    profileSchema,
    async (input) => {
      setSaved(null);
      const result = await updateProfile(input);
      if ("error" in result) {
        return result;
      }
      setSaved(result.data);
      return undefined;
    },
    { displayName: initial.displayName ?? "", preferredCurrency: initial.preferredCurrency },
  );
  const { errors } = form.formState;
  const { reset } = form;

  // The form shows what was stored (a trimmed name, for example).
  useEffect(() => {
    if (!saved) {
      return;
    }
    reset({ displayName: saved.displayName ?? "", preferredCurrency: saved.preferredCurrency });
    const timer = setTimeout(() => setSaved(null), SAVED_FOR_MS);
    return () => clearTimeout(timer);
  }, [saved, reset]);

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-5">
      <FormAlert message={formError} />
      <FormField
        id="profile-display-name"
        label="Display name"
        description="Shown in your account menu."
        error={errors.displayName?.message}
      >
        {(control) => (
          <Input
            {...control}
            {...form.register("displayName")}
            type="text"
            autoComplete="name"
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            placeholder="Type your name"
            className={authInputClass}
          />
        )}
      </FormField>
      <FormField
        id="profile-currency"
        label="Preferred currency"
        description="FinTrack shows totals in this currency. Your transactions keep their own currency."
        error={errors.preferredCurrency?.message}
      >
        {(control) => (
          <NativeSelect {...control} {...form.register("preferredCurrency")} className={selectClass}>
            {SUPPORTED_CURRENCIES.map((code) => (
              <NativeSelectOption key={code} value={code}>
                {`${code} – ${currencyName(code)}`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </FormField>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={pending} aria-disabled={pending} className={settingsPrimaryButtonClass}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Saving…
            </>
          ) : (
            "Save"
          )}
        </button>
        <p role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-sm text-ink-muted">
          {saved && !pending ? (
            <>
              <Check className="size-4 text-success" aria-hidden="true" />
              Saved
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
