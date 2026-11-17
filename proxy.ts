import type { NextRequest } from "next/server";

import { refreshSession } from "@/lib/auth/proxy-session";

// Unit 1.1a: refreshes the Supabase session only, and redirects nobody. Unit 1.2 adds the
// redirects. This is not the authorization boundary: server code that reads or changes data
// checks the session itself.
export async function proxy(request: NextRequest) {
  return refreshSession(request);
}

export const config = {
  matcher: [
    // Everything except scheduled routes (their CRON_SECRET check is their authorization, and a
    // redirect would break them), Next.js assets and image files.
    "/((?!api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
