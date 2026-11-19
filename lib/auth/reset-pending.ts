import "server-only";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

// A note, kept in the browser that asked for a password reset, that the reset isn't finished yet.
// It lets that browser reopen "Set a new password" from a reset link Supabase has already used up.
// It is only a hint: the confirm route also requires a signed-in session, and a signed-in user can
// open /reset-password anyway. It holds no secret. See context/feature-specs/1.1b-reset-link-reclick.md.

export const RESET_PENDING_COOKIE = "fintrack-reset-pending";

// Matches Supabase's "Email OTP Expiration" (3600 seconds in both projects), so the note lasts as
// long as the link. Change both together.
export const RESET_PENDING_MAX_AGE = 3600;

const VALUE = "1";

// Secure when the request came over HTTPS; plain http://localhost keeps working in development.
export async function markResetPending({ secure }: { secure: boolean }): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: RESET_PENDING_COOKIE,
    value: VALUE,
    maxAge: RESET_PENDING_MAX_AGE,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure,
  });
}

export async function clearResetPending(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: RESET_PENDING_COOKIE, path: "/" });
}

export function hasResetPending(request: NextRequest): boolean {
  return request.cookies.get(RESET_PENDING_COOKIE)?.value === VALUE;
}
