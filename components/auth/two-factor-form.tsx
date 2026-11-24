"use client";

import { useEffect } from "react";

import { verifyTwoFactor } from "@/app/(auth)/actions";
import { twoFactorSchema, type TwoFactorInput } from "@/lib/validation/auth";

import { CodeInput } from "./code-input";
import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";
import { SubmitButton } from "./submit-button";
import { useAuthForm } from "./use-auth-form";

// The 2FA step's form (unit 1.4). `next` is read from the address bar at submit time, as on the
// sign-in form, so the page stays static; the action decides whether it is safe.
function verifyWithReturn(input: unknown) {
  const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
  return verifyTwoFactor({ ...(input as TwoFactorInput), next });
}

export function TwoFactorForm() {
  const { form, formError, pending, onSubmit } = useAuthForm(twoFactorSchema, verifyWithReturn, { code: "" });
  const { errors } = form.formState;

  // After a refused code, empty the field for the next one. The alert announces why.
  useEffect(() => {
    if (formError) {
      form.setValue("code", "");
    }
  }, [formError, form]);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField id="code" label="Authentication code" error={errors.code?.message}>
        {(control) => <CodeInput {...control} autoFocus {...form.register("code")} />}
      </FormField>
      <SubmitButton pending={pending} label="Verify" pendingLabel="Verifying…" />
    </form>
  );
}
