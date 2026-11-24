"use client";

import { LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";

import { CodeInput } from "@/components/auth/code-input";
import { FormAlert } from "@/components/auth/form-alert";
import { FormField } from "@/components/auth/form-field";
import { useAuthForm } from "@/components/auth/use-auth-form";
import type { AuthActionResult } from "@/lib/auth/errors";
import { twoFactorSchema } from "@/lib/validation/auth";

// A 6-digit code form for Settings (confirming a setup, turning 2FA off). `onCode` calls the Server
// Action; it returns an error result to show, or nothing on success. The field is checked on submit,
// then as the user types (as the auth forms are).
export function TwoFactorCodeForm({
  id,
  label = "Code",
  submitLabel,
  pendingLabel,
  submitClassName,
  onCode,
  secondary,
  alignEnd = false,
}: {
  id: string;
  label?: string;
  submitLabel: string;
  pendingLabel: string;
  submitClassName: string;
  onCode: (code: string) => Promise<AuthActionResult | undefined>;
  secondary?: (pending: boolean) => ReactNode;
  // Buttons at the right from `sm` up (dialogs); at the left otherwise (inline panels).
  alignEnd?: boolean;
}) {
  const { form, formError, pending, onSubmit } = useAuthForm(
    twoFactorSchema,
    async (input) => onCode((input as { code: string }).code),
    { code: "" },
  );
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormAlert message={formError} />
      <FormField id={id} label={label} error={errors.code?.message}>
        {(control) => <CodeInput {...control} {...form.register("code")} />}
      </FormField>
      <div className={`flex flex-col-reverse gap-3 sm:flex-row ${alignEnd ? "sm:justify-end" : ""}`}>
        {secondary?.(pending)}
        <button type="submit" disabled={pending} aria-disabled={pending} className={submitClassName}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {pendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}
