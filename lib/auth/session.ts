import "server-only";

import { io } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

import { assuranceState, verifiedTotpFactor, type SessionState } from "./assurance";
import { TWO_FACTOR_PATH } from "./paths";
import { createSupabaseServerClient } from "./server";

export interface CurrentUser {
  userId: string;
  email: string;
  // The token's assurance level: aal2 once a 2FA code was entered (unit 1.4).
  aal: "aal1" | "aal2";
}

const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string(),
  aal: z.enum(["aal1", "aal2"]).catch("aal1"),
});

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function claimsFrom(supabase: SupabaseServerClient): Promise<CurrentUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) {
    return null;
  }
  const parsed = claimsSchema.safeParse(data.claims);
  if (!parsed.success) {
    return null;
  }
  return { userId: parsed.data.sub, email: parsed.data.email, aal: parsed.data.aal };
}

// The signed-in user, from verified token claims (never getSession() on the server), or null.
// Any verified session counts, whether or not its 2FA code was entered: only auth code (the 2FA step
// itself, the reset flow) uses this directly. Pages use requireUser(); data actions use
// getSignedInUser(). Not cached (architecture invariant 9).
//
// getClaims() checks the token's expiry with Date.now(), which Cache Components forbids while
// prerendering a route's App Shell (cookies are resolved there). io() suspends during prerendering
// and resolves at once during a request, so the session read streams in behind Suspense. Read the
// user only through these functions, never supabase.auth.getClaims() in a component.
export async function getCurrentClaims(): Promise<CurrentUser | null> {
  await io();
  return claimsFrom(await createSupabaseServerClient());
}

export interface SessionStatus {
  state: SessionState;
  // Set unless the state is `signed-out`.
  user: CurrentUser | null;
}

// The session and whether its 2FA is done (lib/auth/assurance.ts). An aal1 session asks Supabase
// for the user's factors; React's cache() shares the answer within one render. See
// context/feature-specs/1.4-authenticator-app-2fa.md, Session States.
export const getSessionStatus = cache(async (): Promise<SessionStatus> => {
  await io();
  const supabase = await createSupabaseServerClient();
  const user = await claimsFrom(supabase);
  if (!user) {
    return { state: "signed-out", user: null };
  }
  const state = await assuranceState(supabase.auth, user.aal);
  return { state, user: state === "signed-out" ? null : user };
});

// The signed-in user for pages and Server Components, or a redirect: to sign-in without a session,
// to the 2FA step when its code is still owed (unit 1.4). A second line behind the proxy, for a
// session that changes between the proxy and the render; inside a streamed Suspense boundary,
// Next.js sends the redirect to the browser. Server Actions use getSignedInUser() instead.
// See context/feature-specs/1.2a-route-protection-session-helpers.md.
export async function requireUser(): Promise<CurrentUser> {
  const { state, user } = await getSessionStatus();
  if (state === "needs-2fa") {
    redirect(TWO_FACTOR_PATH);
  }
  if (state !== "signed-in" || !user) {
    redirect("/sign-in");
  }
  return user;
}

// The user for Server Actions that read or change their data: only a session that finished 2FA
// (if the user has it), otherwise null, so the action returns an error result (invariant 6).
export async function getSignedInUser(): Promise<CurrentUser | null> {
  const { state, user } = await getSessionStatus();
  return state === "signed-in" ? user : null;
}

export interface TwoFactorStatus {
  enabled: boolean;
  // When the authenticator app was added (ISO timestamp), if enabled.
  addedAt: string | null;
}

// Whether the signed-in user has 2FA on, for the Settings page. Asks Supabase (getUser), never the
// session cookie's copy of the user. Call after requireUser().
export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  await io();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error("Could not read the user's 2FA status.");
  }
  const factor = verifiedTotpFactor(data.user);
  return { enabled: Boolean(factor), addedAt: factor?.created_at ?? null };
}
