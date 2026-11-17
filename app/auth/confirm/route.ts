import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { logAuthError } from "@/lib/auth/errors";
import { safeNextPath } from "@/lib/auth/redirect";
import { hasResetPending } from "@/lib/auth/reset-pending";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCurrentClaims } from "@/lib/auth/session";

// The link in the "Confirm signup" and "Reset password" emails. Supabase's default templates
// return here with a PKCE `code`, which only works in the browser that asked for the email (it
// holds the code verifier cookie). Token-hash links (`token_hash` and `type`) work on any device
// and are used if custom templates are set up later. See
// context/feature-specs/1.1a-email-sign-up-sign-in-password-reset.md (Amendment).
//
// A reset link that no longer works (Supabase uses it up on the first click) still opens
// /reset-password in the browser that asked for the reset, while it is signed in and the reset
// isn't finished. See context/feature-specs/1.1b-reset-link-reclick.md.

const ALLOWED_TYPES = new Set<EmailOtpType>(["email", "recovery"]);
const MAX_CODE_LENGTH = 512;

function redirectTo(request: NextRequest, pathname: string): NextResponse {
  const response = NextResponse.redirect(new URL(pathname, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function isAllowedType(value: string | null): value is EmailOtpType {
  return value !== null && ALLOWED_TYPES.has(value as EmailOtpType);
}

// Where a PKCE link that didn't work goes. The cookie alone grants nothing: the browser must
// already be signed in, and a signed-in user can open /reset-password directly.
async function linkFailed(request: NextRequest): Promise<NextResponse> {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (next === "/reset-password" && hasResetPending(request) && (await getCurrentClaims())) {
    return redirectTo(request, "/reset-password");
  }
  return redirectTo(request, "/auth-error");
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");

  if (tokenHash) {
    const type = params.get("type");
    if (!isAllowedType(type)) {
      return redirectTo(request, "/auth-error");
    }
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      logAuthError("verifyOtp", error);
      return redirectTo(request, "/auth-error");
    }
  } else if (code && code.length <= MAX_CODE_LENGTH) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logAuthError("exchangeCodeForSession", error);
      return linkFailed(request);
    }
  } else {
    // No token, an unusable code, or Supabase's own error redirect for an expired or used link.
    return linkFailed(request);
  }

  // The session cookies set by Supabase go out with this redirect.
  return redirectTo(request, safeNextPath(params.get("next")));
}
