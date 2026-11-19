import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { sessionCookieOptions } from "./cookie-options";
import { getSupabaseEnv } from "./env";

export interface SessionRefresh {
  // Continues the request, carrying any refreshed session cookies.
  response: NextResponse;
  // True only when getClaims() returned verified claims with no error.
  signedIn: boolean;
  // The no-cache headers Supabase asked for when it wrote cookies (empty when it wrote none).
  sessionHeaders: Record<string, string>;
}

// Keeps the Supabase session fresh on every page request (Server Components can't write cookies, so
// without this an expired access token is never refreshed), and reports whether the browser is
// signed in so the proxy can apply the route rules (unit 1.2a).
export async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });
  const sessionHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, publishableKey, {
    // Secure session cookies over HTTPS (cookie-options.ts).
    cookieOptions: sessionCookieOptions(request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Pass the refreshed tokens to Server Components (request) and to the browser (response).
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // No CDN may cache a response that sets a session cookie.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
          sessionHeaders[key] = value;
        }
      },
    },
  });

  // Nothing may run between creating the client and this call. Without a session cookie it makes
  // no network call; with one, ECC-signed tokens are verified locally. If verification fails (for
  // example, Supabase can't be reached for its keys), the browser counts as signed out.
  const { data, error } = await supabase.auth.getClaims();
  const signedIn = !error && typeof data?.claims?.sub === "string" && data.claims.sub.length > 0;

  return { response, signedIn, sessionHeaders };
}

// A 307 redirect to a same-origin path that keeps the refreshed session: without the cookies
// setAll wrote, a redirect could sign the user out (Supabase's SSR guide).
export function redirectWithSession(request: NextRequest, session: SessionRefresh, location: string): NextResponse {
  const redirect = NextResponse.redirect(new URL(location, request.nextUrl.origin), 307);
  for (const cookie of session.response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  for (const [key, value] of Object.entries(session.sessionHeaders)) {
    redirect.headers.set(key, value);
  }
  return redirect;
}
