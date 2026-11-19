"use client";

import Link from "next/link";
import { useEffect } from "react";

import { signIn } from "@/app/(auth)/actions";
import { Input } from "@/components/ui/input";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";

import { FormAlert } from "./form-alert";
import { FormField } from "./form-field";
import { PasswordInput } from "./password-input";
import { authInputClass, textLinkClass } from "./styles";
import { SubmitButton } from "./submit-button";
import { useAuthForm } from "./use-auth-form";

// Sends the URL's `next` (set by the proxy when it sent a signed-out visitor here) with the email and
// password, read at submit time so the form stays in the page's static shell. The action decides
// whether it is safe to return to (unit 1.2a). It is never shown on the page.
function signInWithReturn(input: unknown) {
  const next = new URLSearchParams(window.location.search).get("next") ?? undefined;
  return signIn({ ...(input as SignInInput), next });
}

// /auth/callback sends every failed Google sign-in here with `?error=google` (unit 1.3). The message
// is shown once, and the parameter is removed so a reload doesn't show it again. Any other `error`
// value is ignored.
const GOOGLE_ERROR_PARAM = "google";

function takeGoogleError(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.get("error") !== GOOGLE_ERROR_PARAM) {
    return false;
  }
  url.searchParams.delete("error");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return true;
}

// `googleErrorMessage` comes from the page (lib/auth/errors.ts stays out of the browser bundle).
export function SignInForm({ googleErrorMessage }: { googleErrorMessage: string }) {
  const { form, formError, setFormError, pending, busy, onSubmit } = useAuthForm(signInSchema, signInWithReturn, {
    email: "",
    password: "",
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (takeGoogleError()) {
      setFormError(googleErrorMessage);
    }
  }, [setFormError, googleErrorMessage]);

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
      <FormField
        id="password"
        label="Password"
        error={errors.password?.message}
        footer={
          <Link href="/forgot-password" className={`inline-flex min-h-6 items-center text-xs ${textLinkClass}`}>
            Forgot password?
          </Link>
        }
      >
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="current-password"
            placeholder="Type your password"
            {...form.register("password")}
          />
        )}
      </FormField>
      <SubmitButton pending={pending} disabled={busy} label="Sign in" pendingLabel="Signing in…" />
    </form>
  );
}
