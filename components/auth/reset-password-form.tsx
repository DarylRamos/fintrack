"use client";

import { updatePassword } from "@/app/(auth)/actions";
import { PASSWORD_HINT, resetPasswordSchema } from "@/lib/validation/auth";

import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";
import { useAuthForm } from "./use-auth-form";

export function ResetPasswordForm() {
  const { form, formError, pending, onSubmit } = useAuthForm(resetPasswordSchema, updatePassword, {
    password: "",
    confirmPassword: "",
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField id="password" label="New password" description={PASSWORD_HINT} error={errors.password?.message}>
        {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("password")} />}
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
        {(control) => <PasswordInput {...control} autoComplete="new-password" {...form.register("confirmPassword")} />}
      </FormField>
      <SubmitButton pending={pending} label="Update password" pendingLabel="Updating…" />
    </form>
  );
}
