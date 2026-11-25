"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { getSignedInUser } from "@/lib/auth/session";
import { saveProfile, type ProfileView } from "@/lib/db/profiles";
import { profileSchema } from "@/lib/validation/profile";

// Saving the Profile page (unit 1.5). A public endpoint: it needs a session that finished 2FA
// (invariant 6), validates its input with Zod, and saves only for the session's user (the user ID
// never comes from input). See context/feature-specs/1.5-profile-and-preferred-currency.md.
//
// The codes live here until Phase 2 adds the second data action; auth's NOT_SIGNED_IN message is
// about email links, so it isn't reused.

export type ProfileErrorCode = "NOT_SIGNED_IN" | "INVALID_INPUT" | "SAVE_FAILED";

const MESSAGES: Record<ProfileErrorCode, string> = {
  NOT_SIGNED_IN: "Your session has ended. Sign in again.",
  INVALID_INPUT: "Check the highlighted fields.",
  SAVE_FAILED: "Couldn't save your profile. Try again.",
};

export type ProfileActionResult =
  | { data: ProfileView }
  | {
      error: {
        code: ProfileErrorCode;
        message: string;
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

function failure(code: ProfileErrorCode, fieldErrors?: Record<string, string[] | undefined>): ProfileActionResult {
  return { error: fieldErrors ? { code, message: MESSAGES[code], fieldErrors } : { code, message: MESSAGES[code] } };
}

// Only the error's name and a Prisma error code (such as P1001), never its message, which can hold
// the query, values or connection details.
function logSaveError(error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const raw = (error as { code?: unknown } | null)?.code;
  const code = typeof raw === "string" && /^P\d{4}$/.test(raw) ? raw : "none";
  console.error(`[profile] updateProfile failed: ${name} (${code})`);
}

export async function updateProfile(input: unknown): Promise<ProfileActionResult> {
  const user = await getSignedInUser();
  if (!user) {
    return failure("NOT_SIGNED_IN");
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return failure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }

  let saved: ProfileView;
  try {
    saved = await saveProfile(user.userId, parsed.data);
  } catch (error) {
    logSaveError(error);
    return failure("SAVE_FAILED");
  }

  // Re-render the page's server parts, so the account menu shows the new name at once.
  refresh();
  return { data: saved };
}
