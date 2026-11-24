import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { assuranceState, unverifiedTotpFactors, verifiedTotpFactor } from "@/lib/auth/assurance";

// The session states in context/feature-specs/1.4-authenticator-app-2fa.md, Session States. No
// network: getUser is a mock.

const totp = (status: "verified" | "unverified", id = "f1") => ({
  id,
  factor_type: "totp",
  status,
  created_at: "2026-11-23T00:00:00Z",
});
const phone = { id: "p1", factor_type: "phone", status: "verified", created_at: "2026-11-23T00:00:00Z" };

const getUser = vi.fn();
const auth = { getUser };

function userWith(factors: unknown[] | undefined) {
  getUser.mockResolvedValue({ data: { user: { factors } }, error: null });
}

beforeEach(() => {
  getUser.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("assuranceState", () => {
  test("aal2 is signed in, with no call to Supabase", async () => {
    expect(await assuranceState(auth as never, "aal2")).toBe("signed-in");
    expect(getUser).not.toHaveBeenCalled();
  });

  test("aal1 with a verified authenticator app needs its code", async () => {
    userWith([totp("verified")]);
    expect(await assuranceState(auth as never, "aal1")).toBe("needs-2fa");
  });

  test.each([
    ["no factors", []],
    ["no factor list", undefined],
    ["only an unverified (abandoned) setup", [totp("unverified")]],
    ["only a non-TOTP factor", [phone]],
  ])("aal1 with %s is signed in", async (_case, factors) => {
    userWith(factors);
    expect(await assuranceState(auth as never, "aal1")).toBe("signed-in");
  });

  test("a missing or odd aal is treated as aal1", async () => {
    userWith([totp("verified")]);
    expect(await assuranceState(auth as never, undefined)).toBe("needs-2fa");
    expect(await assuranceState(auth as never, "AAL2")).toBe("needs-2fa");
  });

  test("Supabase unreachable fails closed, logging only name and code", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new AuthRetryableFetchError("fetch failed", 0) });
    expect(await assuranceState(auth as never, "aal1")).toBe("needs-2fa");
    expect(console.error).toHaveBeenCalledWith("[auth] sessionState failed: AuthRetryableFetchError (none)");
  });

  test.each([
    ["a missing session", new AuthSessionMissingError()],
    ["a revoked session", new AuthApiError("gone", 403, "session_not_found")],
    ["a deleted user", new AuthApiError("gone", 404, "user_not_found")],
    ["a refused token", new AuthApiError("bad", 401, "bad_jwt")],
  ])("%s is signed out", async (_case, error) => {
    getUser.mockResolvedValue({ data: { user: null }, error });
    expect(await assuranceState(auth as never, "aal1")).toBe("signed-out");
  });

  test("no user and no error is signed out", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await assuranceState(auth as never, "aal1")).toBe("signed-out");
  });
});

describe("factor helpers", () => {
  test("verifiedTotpFactor finds only a verified TOTP factor", () => {
    expect(verifiedTotpFactor({ factors: [totp("unverified"), totp("verified", "f2")] as never })?.id).toBe("f2");
    expect(verifiedTotpFactor({ factors: [phone] as never })).toBeUndefined();
    expect(verifiedTotpFactor(null)).toBeUndefined();
  });

  test("unverifiedTotpFactors lists abandoned setups only", () => {
    const factors = [totp("unverified", "a"), totp("verified", "b"), totp("unverified", "c")] as never;
    expect(unverifiedTotpFactors({ factors }).map((factor) => factor.id)).toEqual(["a", "c"]);
    expect(unverifiedTotpFactors(undefined)).toEqual([]);
  });
});
