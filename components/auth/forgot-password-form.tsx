"use client";

import { requestPasswordReset } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { forgotPasswordSchema } from "@/lib/validation/auth";

import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";
import { authInputClass } from "./styles";
import { SubmitButton } from "./submit-button";
import { useAuthForm } from "./use-auth-form";

export function ForgotPasswordForm() {
  const { form, formError, pending, onSubmit } = useAuthForm(forgotPasswordSchema, requestPasswordReset, {
    email: "",
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField id="email" label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" className={authInputClass} {...form.register("email")} />
        )}
      </FormField>
      <SubmitButton pending={pending} label="Send reset link" pendingLabel="Sending…" />
    </form>
  );
}
