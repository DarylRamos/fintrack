"use server";

import { isAuthApiError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { verifiedTotpFactor } from "@/lib/auth/assurance";
import { authError, logAuthError, mapAuthError, type AuthActionResult } from "@/lib/auth/errors";
import {
  emailRedirectUrl,
  oauthRedirectUrl,
  safeReturnPath,
  safeTwoFactorNext,
  twoFactorPath,
  type EmailNextPath,
} from "@/lib/auth/redirect";
import { clearResetPending, markResetPending } from "@/lib/auth/reset-pending";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCurrentClaims, getSessionStatus } from "@/lib/auth/session";
import {
  forgotPasswordSchema,
  googleSignInSchema,
  resetPasswordSchema,
  signInActionSchema,
  signUpSchema,
  twoFactorActionSchema,
} from "@/lib/validation/auth";

// Each action is a public endpoint: it validates its input with Zod before any other work, takes
// no user ID or URL from the client, and returns { error: { code, message } } on failure. On
// success it redirects. See context/feature-specs/1.1a-email-sign-up-sign-in-password-reset.md,
// context/feature-specs/1.1b-reset-link-reclick.md,
// context/feature-specs/1.2a-route-protection-session-helpers.md and
// context/feature-specs/1.3-google-sign-in.md and context/feature-specs/1.4-authenticator-app-2fa.md.

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
  const parsed = signInActionSchema.safeParse(input);
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
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

  // Back to the page the proxy sent the user away from, if it is a safe same-origin app page. With
  // 2FA on, the code comes first (unit 1.4); the user here came straight from Supabase.
  const next = safeReturnPath(parsed.data.next);
  redirect(verifiedTotpFactor(data?.user) ? twoFactorPath(next) : next);
}

// The "Continue with Google" form's action, in React's form-action shape so it also works without
// JavaScript (useActionState). The form's only field is `next`, set from the page's URL; anything
// else is ignored. The browser goes to Supabase's authorize URL, then Google, and returns to
// /auth/callback, which finishes the sign-in.
export async function signInWithGoogle(_previous: AuthActionResult | null, formData: unknown): Promise<AuthActionResult> {
  const next = formData instanceof FormData ? (formData.get("next") ?? undefined) : undefined;
  const parsed = googleSignInSchema.safeParse({ next });
  if (!parsed.success) {
    return invalidInput(parsed.error);
  }

  const redirectTo = oauthRedirectUrl((await headers()).get("origin"), parsed.data.next);
  if (!redirectTo) {
    return authError("AUTH_FAILED");
  }

  // Makes no network call: it builds the authorize URL and stores the PKCE code verifier in a
  // cookie through the server client, which the callback's code exchange needs.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) {
    logAuthError("signInWithGoogle", error);
    return authError("AUTH_FAILED");
  }
  if (!data?.url) {
    return authError("AUTH_FAILED");
  }

  redirect(data.url);
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

  // The session comes from the recovery link (or a normal sign-in). With 2FA on, the code must be
  // entered first, so a reset link alone can't change the password (unit 1.4).
  const { state } = await getSessionStatus();
  if (state === "signed-out") {
    return authError("NOT_SIGNED_IN");
  }
  if (state === "needs-2fa") {
    return authError("TWO_FACTOR_REQUIRED");
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

// The 2FA step (/two-factor): checks the code from the user's authenticator app, which raises the
// session to aal2, then continues to `next` (a safe app page, or /reset-password). Works for a
// session at aal1, so it reads the claims directly rather than through getSignedInUser(). See
// context/feature-specs/1.4-authenticator-app-2fa.md, Signing in with 2FA on.
export async function verifyTwoFactor(input: unknown): Promise<AuthActionResult> {
  const parsed = twoFactorActionSchema.safeParse(input);
  if (!parsed.success) {
    return authError("INVALID_CODE", z.flattenError(parsed.error).fieldErrors);
  }
  const next = safeTwoFactorNext(parsed.data.next);

  const claims = await getCurrentClaims();
  if (!claims) {
    return authError("NOT_SIGNED_IN");
  }
  if (claims.aal === "aal2") {
    redirect(next);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError) {
    logAuthError("verifyTwoFactor", userError);
    return authError("AUTH_FAILED");
  }
  const factor = verifiedTotpFactor(data.user);
  if (!factor) {
    // No 2FA to finish (it was turned off elsewhere): the session is already fully signed in.
    redirect(next);
  }

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: parsed.data.code });
  if (error) {
    const code = mapAuthError(error);
    // A wrong code is the user's typo, not a fault, and is never logged (nor is the code).
    if (code !== "INVALID_CODE") {
      logAuthError("verifyTwoFactor", error);
    }
    return authError(code === "INVALID_CODE" || code === "RATE_LIMITED" ? code : "AUTH_FAILED");
  }

  // The aal2 session cookies set by Supabase go out with this redirect.
  redirect(next);
}
