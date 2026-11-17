"use server";

import { isAuthApiError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authError, logAuthError, mapAuthError, type AuthActionResult } from "@/lib/auth/errors";
import { emailRedirectUrl, type EmailNextPath } from "@/lib/auth/redirect";
import { clearResetPending, markResetPending } from "@/lib/auth/reset-pending";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCurrentClaims } from "@/lib/auth/session";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";

// Each action is a public endpoint: it validates its input with Zod before any other work, takes
// no user ID or URL from the client, and returns { error: { code, message } } on failure. On
// success it redirects. See context/feature-specs/1.1a-email-sign-up-sign-in-password-reset.md and
// context/feature-specs/1.1b-reset-link-reclick.md.

function invalidInput(error: z.ZodError): AuthActionResult {
  return authError("INVALID_INPUT", z.flattenError(error).fieldErrors);
}

// Where the email link returns, built from the request's Origin header. Next.js already refuses
// Server Action requests whose Origin doesn't match the host, and Supabase only follows URLs on the
// project's Redirect URLs list.
async function emailLinkTarget(next: EmailNextPath): Promise<string | null> {
  return emailRedirectUrl((await headers()).get("origin"), next);
}

export async function signUp(input: unknown): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const emailRedirectTo = await emailLinkTarget("/dashboard");
  if (!emailRedirectTo) {
    return authError("AUTH_FAILED");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo },
  });
  if (error) {
    logAuthError("signUp", error);
    return authError(mapAuthError(error));
  }

  // Also reached when the email already has an account: Supabase returns no error then, by design,
  // so the page never reveals it.
  redirect("/check-email?reason=sign-up");
}

export async function signIn(input: unknown): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    const code = mapAuthError(error);
    if (code !== "INVALID_CREDENTIALS") {
      logAuthError("signIn", error);
    }
    return authError(code);
  }

  redirect("/dashboard");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  // This device only; other devices stay signed in.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) {
    // The local session cookies are cleared even when the call to Supabase fails.
    logAuthError("signOut", error);
  }
  // An unfinished reset no longer applies to whoever signs in next (unit 1.1b).
  await clearResetPending();
  redirect("/sign-in");
}

export async function requestPasswordReset(input: unknown): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const redirectTo = await emailLinkTarget("/reset-password");
  if (!redirectTo) {
    return authError("AUTH_FAILED");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  if (error) {
    logAuthError("requestPasswordReset", error);
    const code = mapAuthError(error);
    if (code === "RATE_LIMITED") {
      return authError(code);
    }
    // Network failures and Supabase outages are reported. Any other refusal ends on the same page
    // as success, so the result never reveals whether the account exists.
    if (!isAuthApiError(error) || error.status >= 500) {
      return authError("AUTH_FAILED");
    }
  }

  // Set on every path to the check-email page, including a quiet refusal, so the response never
  // reveals whether the account exists (unit 1.1b).
  await markResetPending({ secure: redirectTo.startsWith("https:") });
  redirect("/check-email?reason=reset");
}

export async function updatePassword(input: unknown): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  // The session comes from the recovery link (or a normal sign-in).
  const user = await getCurrentClaims();
  if (!user) {
    return authError("NOT_SIGNED_IN");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logAuthError("updatePassword", error);
    return authError(mapAuthError(error));
  }

  // The reset is finished, so a used reset link shows the error page again (unit 1.1b).
  await clearResetPending();
  redirect("/dashboard");
}
