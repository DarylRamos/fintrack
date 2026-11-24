import { isAuthApiError, isAuthSessionMissingError, type AuthError, type Factor, type User } from "@supabase/supabase-js";

import { logAuthError } from "./errors";

// Whether a verified session has finished 2FA. Shared by the proxy (route rules) and session.ts
// (requireUser, getSignedInUser), so the two can't disagree. See
// context/feature-specs/1.4-authenticator-app-2fa.md, Session States.
//
// - `signed-out`: no session, or one Supabase no longer accepts.
// - `needs-2fa`: signed in at aal1, with a verified authenticator-app factor.
// - `signed-in`: aal2, or aal1 with no verified factor.
export type SessionState = "signed-out" | "needs-2fa" | "signed-in";

type FactorList = Pick<User, "factors"> | null | undefined;

// The user's verified authenticator-app (TOTP) factor, if any. Only for a user object that came
// straight from Supabase (getUser, or a sign-in response), never the copy in the session cookie,
// which the browser can edit.
export function verifiedTotpFactor(user: FactorList): Factor | undefined {
  return user?.factors?.find((factor) => factor.factor_type === "totp" && factor.status === "verified");
}

export function unverifiedTotpFactors(user: FactorList): Factor[] {
  return (user?.factors ?? []).filter((factor) => factor.factor_type === "totp" && factor.status === "unverified");
}

// Errors meaning the session itself is gone (signed out elsewhere, revoked when a new factor was
// verified, or the user was deleted), rather than Supabase being unreachable.
function isSessionGone(error: AuthError): boolean {
  if (isAuthSessionMissingError(error)) {
    return true;
  }
  return (
    isAuthApiError(error) &&
    (error.status === 401 || error.code === "session_not_found" || error.code === "user_not_found")
  );
}

interface UserReader {
  getUser(): Promise<{ data: { user: User | null }; error: AuthError | null }>;
}

// The state of a session whose claims were already verified (getClaims). An aal2 token needs no
// network call. An aal1 token asks Supabase for the user's factors. If Supabase can't answer, the
// session is held at the 2FA step, never let through (fail closed).
export async function assuranceState(auth: UserReader, aal: unknown): Promise<SessionState> {
  if (aal === "aal2") {
    return "signed-in";
  }
  const { data, error } = await auth.getUser();
  if (error) {
    if (isSessionGone(error)) {
      return "signed-out";
    }
    logAuthError("sessionState", error);
    return "needs-2fa";
  }
  if (!data.user) {
    return "signed-out";
  }
  return verifiedTotpFactor(data.user) ? "needs-2fa" : "signed-in";
}
