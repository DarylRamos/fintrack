import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// The session helper, the data layer and Next's refresh are mocked, so no database is touched and
// `server-only` is never loaded. See context/feature-specs/1.5-profile-and-preferred-currency.md.
vi.mock("@/lib/auth/session", () => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/db/profiles", () => ({ saveProfile: vi.fn() }));
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

import { refresh } from "next/cache";

import { updateProfile } from "@/app/(app)/profile/actions";
import { getSignedInUser } from "@/lib/auth/session";
import { saveProfile } from "@/lib/db/profiles";

const user = { userId: "1b4e28ba-2fa1-41d2-883f-0016d3cca427", email: "owner@example.com", aal: "aal2" as const };
const valid = { displayName: "  Ada  ", preferredCurrency: "SGD" };

function logged(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

beforeEach(() => {
  vi.mocked(getSignedInUser).mockReset().mockResolvedValue(user);
  vi.mocked(saveProfile)
    .mockReset()
    .mockImplementation(async (_userId, input) => input);
  vi.mocked(refresh).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("updateProfile", () => {
  test("refuses a browser without a finished session (signed out, or 2FA owed)", async () => {
    vi.mocked(getSignedInUser).mockResolvedValue(null);
    expect(await updateProfile(valid)).toEqual({
      error: { code: "NOT_SIGNED_IN", message: "Your session has ended. Sign in again." },
    });
    expect(saveProfile).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  test("refuses invalid input with field errors, and saves nothing", async () => {
    const result = await updateProfile({ displayName: "a".repeat(51), preferredCurrency: "XXX" });
    expect(result).toMatchObject({
      error: {
        code: "INVALID_INPUT",
        message: "Check the highlighted fields.",
        fieldErrors: {
          displayName: ["Use at most 50 characters."],
          preferredCurrency: ["Choose a currency from the list."],
        },
      },
    });
    expect(saveProfile).not.toHaveBeenCalled();
  });

  test.each([null, undefined, "text", 42])("refuses a non-object input (%j)", async (input) => {
    expect(await updateProfile(input)).toMatchObject({ error: { code: "INVALID_INPUT" } });
    expect(saveProfile).not.toHaveBeenCalled();
  });

  test("saves the cleaned values for the session's user, refreshes, and returns them", async () => {
    const result = await updateProfile(valid);
    expect(saveProfile).toHaveBeenCalledWith(user.userId, { displayName: "Ada", preferredCurrency: "SGD" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(result).toEqual({ data: { displayName: "Ada", preferredCurrency: "SGD" } });
  });

  test("ignores any user ID in the input", async () => {
    await updateProfile({ ...valid, id: "someone-else", userId: "someone-else" });
    expect(saveProfile).toHaveBeenCalledWith(user.userId, { displayName: "Ada", preferredCurrency: "SGD" });
  });

  test.each(["", "  ", null])("an empty name (%j) is saved as null", async (displayName) => {
    expect(await updateProfile({ displayName, preferredCurrency: "EUR" })).toEqual({
      data: { displayName: null, preferredCurrency: "EUR" },
    });
    expect(saveProfile).toHaveBeenCalledWith(user.userId, { displayName: null, preferredCurrency: "EUR" });
  });

  test("a failed save returns SAVE_FAILED and logs only the error's name and Prisma code", async () => {
    const error = Object.assign(new Error(`connect failed for ${user.email} at secret-host:5432 "Ada"`), {
      name: "PrismaClientKnownRequestError",
      code: "P1001",
    });
    vi.mocked(saveProfile).mockRejectedValue(error);

    expect(await updateProfile(valid)).toEqual({
      error: { code: "SAVE_FAILED", message: "Couldn't save your profile. Try again." },
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(logged()).toContain("PrismaClientKnownRequestError (P1001)");
    for (const secret of [user.email, user.userId, "secret-host", "Ada", "SGD"]) {
      expect(logged()).not.toContain(secret);
    }
  });

  test("a code that isn't a Prisma code isn't logged", async () => {
    vi.mocked(saveProfile).mockRejectedValue(Object.assign(new Error("x"), { code: "owner@example.com" }));
    await updateProfile(valid);
    expect(logged()).toContain("Error (none)");
    expect(logged()).not.toContain("owner@example.com");
  });
});
