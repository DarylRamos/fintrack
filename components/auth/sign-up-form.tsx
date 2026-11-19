"use client";

import { signUp } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { PASSWORD_HINT, signUpSchema } from "@/lib/validation/auth";

import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";
import { PasswordInput } from "./password-input";
import { authInputClass } from "./styles";
import { SubmitButton } from "./submit-button";
import { useAuthForm } from "./use-auth-form";

export function SignUpForm() {
  const { form, formError, pending, busy, onSubmit } = useAuthForm(signUpSchema, signUp, {
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField id="email" label="Email" error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            placeholder="Type your email"
            className={authInputClass}
            {...form.register("email")}
          />
        )}
      </FormField>
      <FormField id="password" label="Password" description={PASSWORD_HINT} error={errors.password?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            placeholder="Create a password"
            {...form.register("password")}
          />
        )}
      </FormField>
      <FormField id="confirmPassword" label="Confirm password" error={errors.confirmPassword?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            placeholder="Type your password again"
            {...form.register("confirmPassword")}
          />
        )}
      </FormField>
      <SubmitButton pending={pending} disabled={busy} label="Create account" pendingLabel="Creating account…" />
    </form>
  );
}
