import { NextResponse, type NextRequest } from "next/server";

import { logAuthError, logProviderError } from "@/lib/auth/errors";
import { safeReturnPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/auth/server";

// Where Google sign-in returns, through Supabase, with a PKCE `code`. The exchange needs the code
// verifier cookie the sign-in action set, so it only works in the browser that started the sign-in.
// Every failure goes back to the sign-in page with one message, which never names a reason. See
// context/feature-specs/1.3-google-sign-in.md.

const MAX_CODE_LENGTH = 512;
const FAILED_PATH = "/sign-in?error=google";

function redirectTo(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // Cancelled at Google, or refused by Google or Supabase. `error_description` is never read: it
  // can contain personal details.
  if (params.has("error")) {
    logProviderError("oauthCallback", params.get("error"));
    return redirectTo(request, FAILED_PATH);
  }

  const code = params.get("code");
  if (!code || code.length > MAX_CODE_LENGTH) {
    return redirectTo(request, FAILED_PATH);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    logAuthError("oauthCallback", error);
    return redirectTo(request, FAILED_PATH);
  }

  // The session cookies set by Supabase go out with this redirect. `next` is checked again here,
  // since anyone can edit this URL's query.
  return redirectTo(request, safeReturnPath(params.get("next")));
}
