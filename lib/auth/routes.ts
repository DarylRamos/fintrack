import type { SessionState } from "./assurance";
import { GUEST_PATHS, isPassThroughPath, OPEN_PATHS, TWO_FACTOR_PATH } from "./paths";
import { DEFAULT_NEXT_PATH, safeReturnPath, safeTwoFactorNext, twoFactorPath } from "./redirect";

// Where the proxy sends a request, as a pure function so every rule is unit-tested without a
// request. It decides where a browser goes; it is not the authorization boundary.
// See context/feature-specs/1.2a-route-protection-session-helpers.md, Route Rules, and
// context/feature-specs/1.4-authenticator-app-2fa.md, Route Rules (the `needs-2fa` state).

export interface RouteRequest {
  pathname: string;
  // The query string, with its leading "?", or "".
  search: string;
  method: string;
  state: SessionState;
}

export type RouteDecision = { kind: "pass" } | { kind: "redirect"; location: string };

const PASS: RouteDecision = { kind: "pass" };

export const SIGN_IN_PATH = "/sign-in";
const RESET_PASSWORD_PATH = "/reset-password";

function redirectTo(location: string): RouteDecision {
  return { kind: "redirect", location };
}

export function routeDecision({ pathname, search, method, state }: RouteRequest): RouteDecision {
  // Server Actions are POSTs to the current page's path. Redirecting them would break the call, and
  // each action checks the session itself.
  if (method !== "GET" && method !== "HEAD") {
    return PASS;
  }
  if (isPassThroughPath(pathname)) {
    return PASS;
  }
  const next = new URLSearchParams(search).get("next");

  if (pathname === TWO_FACTOR_PATH) {
    if (state === "needs-2fa") {
      return PASS;
    }
    return redirectTo(state === "signed-in" ? safeTwoFactorNext(next) : SIGN_IN_PATH);
  }
  // A reset link signs the browser in at aal1: with 2FA on, the code comes before the new password.
  if (pathname === RESET_PASSWORD_PATH && state === "needs-2fa") {
    return redirectTo(twoFactorPath(RESET_PASSWORD_PATH));
  }
  if (OPEN_PATHS.has(pathname)) {
    return PASS;
  }
  if (pathname === "/") {
    if (state === "needs-2fa") {
      return redirectTo(TWO_FACTOR_PATH);
    }
    return redirectTo(state === "signed-in" ? DEFAULT_NEXT_PATH : SIGN_IN_PATH);
  }
  if (GUEST_PATHS.has(pathname)) {
    if (state === "signed-out") {
      return PASS;
    }
    const target = safeReturnPath(next);
    return redirectTo(state === "signed-in" ? target : twoFactorPath(target));
  }
  // Everything else is protected, including unknown paths (default deny).
  if (state === "signed-in") {
    return PASS;
  }
  const requested = encodeURIComponent(`${pathname}${search}`);
  return redirectTo(`${state === "needs-2fa" ? TWO_FACTOR_PATH : SIGN_IN_PATH}?next=${requested}`);
}
