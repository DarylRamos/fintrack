// Where an email link may send the user after it's verified. Anything else falls back to the
// dashboard, so the link's `next` can't become an open redirect.
const ALLOWED_NEXT_PATHS = new Set(["/dashboard", "/reset-password"]);

export const DEFAULT_NEXT_PATH = "/dashboard";

export function safeNextPath(value: string | null | undefined): string {
  return value && ALLOWED_NEXT_PATHS.has(value) ? value : DEFAULT_NEXT_PATH;
}

export type EmailNextPath = "/dashboard" | "/reset-password";

// The `redirect_to` Supabase's default email links return to: `/auth/confirm` on the app's own
// origin, with a fixed `next`. Supabase only follows it when it matches the project's Redirect URLs.
// Returns null when the origin is missing or isn't an http(s) URL. Only the parsed origin is kept,
// so a path or query in the header is dropped.
export function emailRedirectUrl(origin: string | null | undefined, next: EmailNextPath): string | null {
  if (!origin) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }
  const target = new URL("/auth/confirm", url.origin);
  target.searchParams.set("next", next);
  return target.toString();
}
