"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { type ActionResult, failure, type FieldErrors, logActionError } from "@/lib/actions/result";
import { getSignedInUser } from "@/lib/auth/session";
import { saveProfile, type ProfileView } from "@/lib/db/profiles";
import { profileSchema } from "@/lib/validation/profile";

// Saving the Profile page (unit 1.5). A public endpoint: it needs a session that finished 2FA
// (invariant 6), validates its input with Zod, and saves only for the session's user (the user ID
// never comes from input). See context/feature-specs/1.5-profile-and-preferred-currency.md.
//
// The result shape is shared with the other data actions (lib/actions/result.ts, unit 2.2); the codes
// and messages are this page's. Auth's NOT_SIGNED_IN message is about email links, so it isn't reused.

export type ProfileErrorCode = "NOT_SIGNED_IN" | "INVALID_INPUT" | "SAVE_FAILED";

const MESSAGES: Record<ProfileErrorCode, string> = {
  NOT_SIGNED_IN: "Your session has ended. Sign in again.",
  INVALID_INPUT: "Check the highlighted fields.",
  SAVE_FAILED: "Couldn't save your profile. Try again.",
};

export type ProfileActionResult = ActionResult<ProfileView, ProfileErrorCode>;

function profileFailure(code: ProfileErrorCode, fieldErrors?: FieldErrors): ProfileActionResult {
  return failure(code, MESSAGES[code], fieldErrors);
}

export async function updateProfile(input: unknown): Promise<ProfileActionResult> {
  const user = await getSignedInUser();
  if (!user) {
    return profileFailure("NOT_SIGNED_IN");
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return profileFailure("INVALID_INPUT", z.flattenError(parsed.error).fieldErrors);
  }

  let saved: ProfileView;
  try {
    saved = await saveProfile(user.userId, parsed.data);
  } catch (error) {
    logActionError("profile", "updateProfile", error);
    return profileFailure("SAVE_FAILED");
  }

  // Re-render the page's server parts, so the account menu shows the new name at once.
  refresh();
  return { data: saved };
}
