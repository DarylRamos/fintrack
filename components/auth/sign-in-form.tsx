"use client";

import Link from "next/link";

import { signIn } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { signInSchema } from "@/lib/validation/auth";

import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";
import { PasswordInput } from "./password-input";
import { authInputClass, textLinkClass } from "./styles";
import { SubmitButton } from "./submit-button";
import { useAuthForm } from "./use-auth-form";

export function SignInForm() {
  const { form, formError, pending, onSubmit } = useAuthForm(signInSchema, signIn, { email: "", password: "" });
  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <FormAlert message={formError} />
      <FormField id="email" label="Email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" className={authInputClass} {...form.register("email")} />
        )}
      </FormField>
      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        labelAside={
          <Link href="/forgot-password" className={`text-xs ${textLinkClass}`}>
            Forgot password?
          </Link>
        }
      >
        {(control) => <PasswordInput {...control} autoComplete="current-password" {...form.register("password")} />}
      </FormField>
      <SubmitButton pending={pending} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
