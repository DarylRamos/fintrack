// Cookie options both Supabase clients pass to @supabase/ssr, whose defaults (path, SameSite=Lax,
// maxAge) have no `secure`. Secure when the request came over HTTPS, as on Vercel; plain
// http://localhost keeps working in development and for the local test server. Found by unit 1.1a's
// production check 8 (2026-11-19).
//
// `protocol` is the `x-forwarded-proto` header (Vercel and `next start` set it) or a URL's protocol
// (`https:`). Only the first value of a forwarded list counts: it is the client's own connection.
export function sessionCookieOptions(protocol: string | null | undefined): { secure: boolean } {
  const first = protocol?.split(",")[0]?.trim().toLowerCase().replace(/:$/, "");
  return { secure: first === "https" };
}
