import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Supabase and the session helper are mocked, so no network call is made and `server-only` is
// never loaded. See context/feature-specs/1.4-authenticator-app-2fa.md, Flows.
vi.mock("@/lib/auth/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSessionStatus: vi.fn() }));

import {
  cancelTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  startTwoFactorSetup,
} from "@/app/(app)/settings/actions";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getSessionStatus } from "@/lib/auth/session";

const auth = {
  getUser: vi.fn(),
  refreshSession: vi.fn(),
  mfa: { enroll: vi.fn(), unenroll: vi.fn(), challengeAndVerify: vi.fn() },
};

const user = { userId: "user-1", email: "owner@example.com", aal: "aal2" as const };
const factorId = "6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f5a";
const otherFactorId = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const secret = "JBSWY3DPEHPK3PXP";
const code = "123456";
const factor = (status: "verified" | "unverified", id = factorId) => ({
  id,
  factor_type: "totp",
  status,
  created_at: "2026-11-23T00:00:00Z",
});
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path fill="#000" d="M0 0h1v1H0z"/></svg>';

function userWith(...factors: unknown[]) {
  auth.getUser.mockResolvedValue({ data: { user: { id: "user-1", factors } }, error: null });
}

function logged(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

beforeEach(() => {
  auth.getUser.mockReset();
  auth.refreshSession.mockReset();
  auth.refreshSession.mockResolvedValue({ data: {}, error: null });
  for (const fn of Object.values(auth.mfa)) {
    fn.mockReset();
  }
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth } as never);
  vi.mocked(getSessionStatus).mockResolvedValue({ state: "signed-in", user });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("every action needs a session that finished 2FA", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["startTwoFactorSetup", () => startTwoFactorSetup()],
    ["confirmTwoFactorSetup", () => confirmTwoFactorSetup({ factorId, code })],
    ["cancelTwoFactorSetup", () => cancelTwoFactorSetup({ factorId })],
    ["disableTwoFactor", () => disableTwoFactor({ code })],
  ];

  test.each(calls)("%s refuses a signed-out browser", async (_name, call) => {
    vi.mocked(getSessionStatus).mockResolvedValue({ state: "signed-out", user: null });
    expect(await call()).toMatchObject({ error: { code: "NOT_SIGNED_IN" } });
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  test.each(calls)("%s refuses a session that still owes its code", async (_name, call) => {
    vi.mocked(getSessionStatus).mockResolvedValue({ state: "needs-2fa", user: { ...user, aal: "aal1" } });
    expect(await call()).toMatchObject({ error: { code: "TWO_FACTOR_REQUIRED" } });
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});

describe("startTwoFactorSetup", () => {
  test("enrolls an authenticator app and returns the QR code and setup key", async () => {
    userWith();
    auth.mfa.enroll.mockResolvedValue({
      data: { id: factorId, type: "totp", totp: { qr_code: `data:image/svg+xml;utf-8,${svg}`, secret, uri: "otpauth://x" } },
      error: null,
    });
    const result = await startTwoFactorSetup();
    expect(auth.mfa.enroll).toHaveBeenCalledWith({ factorType: "totp", friendlyName: "Authenticator app", issuer: "FinTrack" });
    expect(result).toEqual({
      data: { factorId, secret, qrCode: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` },
    });
    // The `#` in the SVG is encoded, so it can't cut the data URL short.
    expect("data" in result && result.data.qrCode).not.toContain("#");
  });

  test("removes an abandoned setup first", async () => {
    userWith(factor("unverified", otherFactorId));
    auth.mfa.unenroll.mockResolvedValue({ data: {}, error: null });
    auth.mfa.enroll.mockResolvedValue({
      data: { id: factorId, type: "totp", totp: { qr_code: `data:image/svg+xml;utf-8,${svg}`, secret, uri: "" } },
      error: null,
    });
    await startTwoFactorSetup();
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId: otherFactorId });
    expect(auth.mfa.unenroll.mock.invocationCallOrder[0]).toBeLessThan(auth.mfa.enroll.mock.invocationCallOrder[0]);
  });

  test("refuses when 2FA is already on", async () => {
    userWith(factor("verified"));
    expect(await startTwoFactorSetup()).toMatchObject({ error: { code: "TWO_FACTOR_ALREADY_ON" } });
    expect(auth.mfa.enroll).not.toHaveBeenCalled();
  });

  test("accepts Supabase's SVG with an XML declaration and a generator comment", async () => {
    userWith();
    const goSvg = `<?xml version="1.0"?>\n<!-- Generated by SVGo -->\n${svg}`;
    auth.mfa.enroll.mockResolvedValue({
      data: { id: factorId, type: "totp", totp: { qr_code: `data:image/svg+xml;utf-8,${goSvg}`, secret, uri: "" } },
      error: null,
    });
    expect(await startTwoFactorSetup()).toEqual({
      data: { factorId, secret, qrCode: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(goSvg)}` },
    });
  });

  test("a QR code that isn't an SVG data URL is refused, logged as fixed text", async () => {
    userWith();
    auth.mfa.enroll.mockResolvedValue({
      data: { id: factorId, type: "totp", totp: { qr_code: "javascript:alert(1)", secret, uri: "" } },
      error: null,
    });
    expect(await startTwoFactorSetup()).toMatchObject({ error: { code: "AUTH_FAILED" } });
  });

  test("an enroll failure is generic and logged without the secret", async () => {
    userWith();
    auth.mfa.enroll.mockResolvedValue({ data: null, error: new AuthApiError("m", 422, "mfa_totp_enroll_not_enabled") });
    expect(await startTwoFactorSetup()).toMatchObject({ error: { code: "AUTH_FAILED" } });
    expect(logged()).toContain("mfa_totp_enroll_not_enabled");
  });
});

describe("confirmTwoFactorSetup", () => {
  test("verifies the code for the user's own unconfirmed setup", async () => {
    userWith(factor("unverified"));
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    expect(await confirmTwoFactorSetup({ factorId, code: "123 456" })).toEqual({ data: { enabled: true } });
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId, code });
  });

  test("a malformed code never reaches Supabase", async () => {
    const result = await confirmTwoFactorSetup({ factorId, code: "12" });
    expect(result).toMatchObject({ error: { code: "INVALID_CODE" } });
    expect(getSessionStatus).not.toHaveBeenCalled();
  });

  test.each([
    ["another user's (unlisted) factor", () => userWith(factor("unverified", otherFactorId))],
    ["an already verified factor", () => userWith(factor("verified"))],
  ])("refuses %s", async (_case, setUp) => {
    setUp();
    expect(await confirmTwoFactorSetup({ factorId, code })).toMatchObject({ error: { code: "AUTH_FAILED" } });
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  test("a wrong code returns INVALID_CODE, unlogged", async () => {
    userWith(factor("unverified"));
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: null, error: new AuthApiError("m", 422, "mfa_verification_failed") });
    expect(await confirmTwoFactorSetup({ factorId, code })).toMatchObject({ error: { code: "INVALID_CODE" } });
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("cancelTwoFactorSetup", () => {
  test("removes the user's own unconfirmed setup", async () => {
    userWith(factor("unverified"));
    auth.mfa.unenroll.mockResolvedValue({ data: {}, error: null });
    expect(await cancelTwoFactorSetup({ factorId })).toEqual({ data: { cancelled: true } });
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId });
  });

  test("never removes a verified factor (that needs a code, through disableTwoFactor)", async () => {
    userWith(factor("verified"));
    expect(await cancelTwoFactorSetup({ factorId })).toMatchObject({ error: { code: "AUTH_FAILED" } });
    expect(auth.mfa.unenroll).not.toHaveBeenCalled();
  });

  test("refuses a factor the user doesn't have", async () => {
    userWith(factor("unverified", otherFactorId));
    expect(await cancelTwoFactorSetup({ factorId })).toMatchObject({ error: { code: "AUTH_FAILED" } });
    expect(auth.mfa.unenroll).not.toHaveBeenCalled();
  });
});

describe("disableTwoFactor", () => {
  test("verifies a current code, removes the factor, then refreshes the session", async () => {
    userWith(factor("verified"));
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    auth.mfa.unenroll.mockResolvedValue({ data: {}, error: null });
    expect(await disableTwoFactor({ code })).toEqual({ data: { disabled: true } });
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId, code });
    expect(auth.mfa.unenroll).toHaveBeenCalledWith({ factorId });
    expect(auth.refreshSession).toHaveBeenCalledOnce();
  });

  test("a wrong code leaves 2FA on", async () => {
    userWith(factor("verified"));
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: null, error: new AuthApiError("m", 422, "mfa_verification_failed") });
    expect(await disableTwoFactor({ code })).toMatchObject({ error: { code: "INVALID_CODE" } });
    expect(auth.mfa.unenroll).not.toHaveBeenCalled();
  });

  test("nothing to do when 2FA is already off", async () => {
    userWith();
    expect(await disableTwoFactor({ code })).toEqual({ data: { disabled: true } });
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  test("a failed removal is generic, and logs neither the code nor the factor ID", async () => {
    userWith(factor("verified"));
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    auth.mfa.unenroll.mockResolvedValue({ data: null, error: new AuthRetryableFetchError("fetch failed", 0) });
    expect(await disableTwoFactor({ code })).toMatchObject({ error: { code: "AUTH_FAILED" } });
    expect(logged()).not.toContain(code);
    expect(logged()).not.toContain(factorId);
  });
});
