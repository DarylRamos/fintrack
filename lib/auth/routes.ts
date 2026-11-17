import { GUEST_PATHS, isPassThroughPath, OPEN_PATHS } from "./paths";
import { DEFAULT_NEXT_PATH, safeReturnPath } from "./redirect";

// Where the proxy sends a request, as a pure function so every rule is unit-tested without a
// request. It decides where a browser goes; it is not the authorization boundary.
// See context/feature-specs/1.2a-route-protection-session-helpers.md, Route Rules.

export interface RouteRequest {
  pathname: string;
  // The query string, with its leading "?", or "".
  search: string;
  method: string;
  signedIn: boolean;
}

export type RouteDecision = { kind: "pass" } | { kind: "redirect"; location: string };

const PASS: RouteDecision = { kind: "pass" };

export const SIGN_IN_PATH = "/sign-in";

function redirectTo(location: string): RouteDecision {
  return { kind: "redirect", location };
}

export function routeDecision({ pathname, search, method, signedIn }: RouteRequest): RouteDecision {
  // Server Actions are POSTs to the current page's path. Redirecting them would break the call, and
  // each action checks the session itself.
  if (method !== "GET" && method !== "HEAD") {
    return PASS;
  }
  if (isPassThroughPath(pathname) || OPEN_PATHS.has(pathname)) {
    return PASS;
  }
  if (pathname === "/") {
    return redirectTo(signedIn ? DEFAULT_NEXT_PATH : SIGN_IN_PATH);
  }
  if (GUEST_PATHS.has(pathname)) {
    return signedIn ? redirectTo(safeReturnPath(new URLSearchParams(search).get("next"))) : PASS;
  }
  // Everything else is protected, including unknown paths (default deny).
  if (signedIn) {
    return PASS;
  }
  return redirectTo(`${SIGN_IN_PATH}?next=${encodeURIComponent(`${pathname}${search}`)}`);
}
