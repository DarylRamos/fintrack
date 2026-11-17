import { GUEST_PATHS, isPassThroughPath, OPEN_PATHS } from "./paths";

// Where an email link may send the user after it's verified. Anything else falls back to the
// dashboard, so the link's `next` can't become an open redirect.
const ALLOWED_NEXT_PATHS = new Set(["/dashboard", "/reset-password"]);

export const DEFAULT_NEXT_PATH = "/dashboard";

export function safeNextPath(value: string | null | undefined): string {
  return value && ALLOWED_NEXT_PATHS.has(value) ? value : DEFAULT_NEXT_PATH;
}

export type EmailNextPath = "/dashboard" | "/reset-password";

// Where sign-in returns to: any same-origin app page, as path and query only. Separate from
// safeNextPath, whose email-link allowlist is unchanged. Anything else falls back to the dashboard.
// See context/feature-specs/1.2a-route-protection-session-helpers.md, Return to the Requested Page.
const RETURN_PATH_MAX_LENGTH = 2048;
// Only used to resolve the value; a result on any other origin is refused.
const PLACEHOLDER_ORIGIN = "http://fintrack.invalid";
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function isReturnablePath(pathname: string): boolean {
  return (
    pathname !== "/" &&
    !GUEST_PATHS.has(pathname) &&
    !OPEN_PATHS.has(pathname) &&
    !isPassThroughPath(pathname) &&
    pathname !== "/auth" &&
    pathname !== "/api"
  );
}

export function safeReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > RETURN_PATH_MAX_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTERS.test(value)
  ) {
    return DEFAULT_NEXT_PATH;
  }
  let url: URL;
  try {
    url = new URL(value, PLACEHOLDER_ORIGIN);
  } catch {
    return DEFAULT_NEXT_PATH;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN || !isReturnablePath(url.pathname)) {
    return DEFAULT_NEXT_PATH;
  }
  return `${url.pathname}${url.search}`;
}

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
