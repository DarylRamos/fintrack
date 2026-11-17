import "server-only";

import { io } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "./server";

export interface CurrentUser {
  userId: string;
  email: string;
}

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string(),
});

// The signed-in user, from verified token claims (never getSession() on the server), or null.
// Not cached (architecture invariant 9). Unit 1.2 extends this file.
//
// getClaims() checks the token's expiry with Date.now(), which Cache Components forbids while
// prerendering a route's App Shell (cookies are resolved there). io() suspends during prerendering
// and resolves at once during a request, so the session read streams in behind Suspense. Read the
// user only through this function, never supabase.auth.getClaims() in a component.
export async function getCurrentClaims(): Promise<CurrentUser | null> {
  await io();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return null;
  }
  const parsed = claimsSchema.safeParse(data.claims);
  if (!parsed.success) {
    return null;
  }
  return { userId: parsed.data.sub, email: parsed.data.email };
}
