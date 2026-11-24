import type { NextRequest } from "next/server";

import { redirectWithSession, refreshSession } from "@/lib/auth/proxy-session";
import { routeDecision } from "@/lib/auth/routes";

// Refreshes the Supabase session on every page request (unit 1.1a), then applies the route rules
// (unit 1.2a): signed-out visitors go to sign-in, signed-in users leave the guest pages, and `/`
// sends each to the right place; a browser that still owes its 2FA code goes to /two-factor
// (unit 1.4). See context/feature-specs/1.2a-route-protection-session-helpers.md.
// This is not the authorization boundary: server code that reads or changes data checks the session
// itself.
export async function proxy(request: NextRequest) {
  const session = await refreshSession(request);
  const decision = routeDecision({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    method: request.method,
    state: session.state,
  });
  if (decision.kind === "redirect") {
    return redirectWithSession(request, session, decision.location);
  }
  return session.response;
}

export const config = {
  matcher: [
    // Everything except scheduled routes (their CRON_SECRET check is their authorization, and a
    // redirect would break them), Next.js assets and image files.
    "/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
