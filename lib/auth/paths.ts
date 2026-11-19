// The public pages, shared by the proxy's route rules (routes.ts) and the sign-in return path check
// (redirect.ts), so the two can't drift apart. Every path not listed here, or under a passed-through
// prefix, is protected. A new public page must be added here.
// See context/feature-specs/1.2a-route-protection-session-helpers.md, Route Rules.

// Signed out: shown. Signed in: redirected to the dashboard (or a safe `next`).
export const GUEST_PATHS: ReadonlySet<string> = new Set(["/sign-in", "/sign-up", "/forgot-password"]);

// Shown whether or not the browser is signed in. /reset-password must stay here: a reset link signs
// the browser in, and the user still has to set the new password (units 1.1a and 1.1b).
export const OPEN_PATHS: ReadonlySet<string> = new Set(["/reset-password", "/check-email", "/auth-error"]);

// Never redirected. `/auth/*` holds the email link handler (and unit 1.3's OAuth callback);
// `/api/*` routes check their own auth and answer 401 rather than redirecting to a page.
// `/api/cron/*` doesn't reach the proxy at all (its matcher leaves it out).
export const PASS_THROUGH_PREFIXES: readonly string[] = ["/auth/", "/api/"];

export function isPassThroughPath(pathname: string): boolean {
  return PASS_THROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
