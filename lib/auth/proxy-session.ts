import "server-only";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "./env";

// Keeps the Supabase session fresh on every page request. Server Components can't write cookies,
// so without this an expired access token is never refreshed. It redirects nobody: route
// protection is unit 1.2.
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  const { url, publishableKey } = getSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
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
        }
      },
    },
  });

  // Nothing may run between creating the client and this call. Without a session cookie it makes
  // no network call; with one, ECC-signed tokens are verified locally.
  await supabase.auth.getClaims();

  return response;
}
