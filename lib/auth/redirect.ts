import { GUEST_PATHS, isPassThroughPath, OPEN_PATHS, TWO_FACTOR_PATH } from "./paths";

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
    pathname !== TWO_FACTOR_PATH &&
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

// Where the 2FA step continues to: a safe app page, or /reset-password. A reset link signs the
// browser in at aal1, so with 2FA on the code comes first and the reset page after it (unit 1.4).
// /reset-password is an open page, so safeReturnPath alone would refuse it.
const RESET_PASSWORD_PATH = "/reset-password";

export function safeTwoFactorNext(value: unknown): string {
  return value === RESET_PASSWORD_PATH ? RESET_PASSWORD_PATH : safeReturnPath(value);
}

// The 2FA step's URL, carrying where to go afterwards. The default (the dashboard) is left out, so
// the address bar stays plain. `next` must already be safe.
export function twoFactorPath(next: string): string {
  return next === DEFAULT_NEXT_PATH ? TWO_FACTOR_PATH : `${TWO_FACTOR_PATH}?next=${encodeURIComponent(next)}`;
}

// The app's own origin, from the request's Origin header, or null when it is missing or isn't an
// http(s) URL. Only the parsed origin is kept, so a path or query in the header is dropped.
function httpOrigin(origin: string | null | undefined): string | null {
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
  return url.origin;
}

function returnUrl(origin: string | null | undefined, pathname: string, next: string): string | null {
  const base = httpOrigin(origin);
  if (!base) {
    return null;
  }
  const target = new URL(pathname, base);
  target.searchParams.set("next", next);
  return target.toString();
}

// The `redirect_to` Supabase's default email links return to: `/auth/confirm` on the app's own
// origin, with a fixed `next`. Supabase only follows it when it matches the project's Redirect URLs.
// Returns null when the origin is missing or isn't an http(s) URL.
export function emailRedirectUrl(origin: string | null | undefined, next: EmailNextPath): string | null {
  return returnUrl(origin, "/auth/confirm", next);
}

// The `redirect_to` for Google sign-in: `/auth/callback` on the app's own origin, with `next` already
// passed through safeReturnPath (the callback checks it again). Supabase only follows it when it
// matches the project's Redirect URLs. Returns null when the origin is missing or isn't an http(s)
// URL. See context/feature-specs/1.3-google-sign-in.md.
export function oauthRedirectUrl(origin: string | null | undefined, next: unknown): string | null {
  return returnUrl(origin, "/auth/callback", safeReturnPath(next));
}
