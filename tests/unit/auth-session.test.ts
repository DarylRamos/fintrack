import { AuthApiError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, test, vi } from "vitest";

// The Supabase client, `io()` and Next's redirect are mocked; `server-only` is never loaded.
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ io: vi.fn(async () => undefined) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
}));
vi.mock("@/lib/auth/server", () => ({ createSupabaseServerClient: vi.fn() }));

import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCurrentClaims, getSignedInUser, getTwoFactorStatus, requireUser } from "@/lib/auth/session";

const getClaims = vi.fn();
const getUser = vi.fn();

const verifiedTotp = { id: "f", factor_type: "totp", status: "verified", created_at: "2026-11-23T01:02:03Z" };

function claims(aal?: string) {
  return { data: { claims: { sub: "user-1", email: "owner@example.com", ...(aal ? { aal } : {}) } }, error: null };
}

beforeEach(() => {
  getClaims.mockReset();
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { factors: [] } }, error: null });
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getClaims, getUser } } as never);
});

describe("getCurrentClaims", () => {
  test("includes the assurance level, aal1 when missing", async () => {
    getClaims.mockResolvedValue(claims("aal2"));
    await expect(getCurrentClaims()).resolves.toEqual({ userId: "user-1", email: "owner@example.com", aal: "aal2" });
    getClaims.mockResolvedValue(claims());
    await expect(getCurrentClaims()).resolves.toMatchObject({ aal: "aal1" });
  });
});

describe("requireUser", () => {
  test("returns the signed-in user", async () => {
    getClaims.mockResolvedValue(claims("aal1"));
    await expect(requireUser()).resolves.toEqual({ userId: "user-1", email: "owner@example.com", aal: "aal1" });
  });

  // Unit 1.4.
  test("redirects to the 2FA step when the code is owed", async () => {
    getClaims.mockResolvedValue(claims("aal1"));
    getUser.mockResolvedValue({ data: { user: { factors: [verifiedTotp] } }, error: null });
    await expect(requireUser()).rejects.toMatchObject({ url: "/two-factor" });
  });

  test("an aal2 session is let through without asking Supabase", async () => {
    getClaims.mockResolvedValue(claims("aal2"));
    await expect(requireUser()).resolves.toMatchObject({ userId: "user-1" });
    expect(getUser).not.toHaveBeenCalled();
  });

  test("a session Supabase no longer accepts goes to sign-in", async () => {
    getClaims.mockResolvedValue(claims("aal1"));
    getUser.mockResolvedValue({ data: { user: null }, error: new AuthApiError("gone", 403, "session_not_found") });
    await expect(requireUser()).rejects.toMatchObject({ url: "/sign-in" });
  });

  test("redirects to sign-in when there is no session", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireUser()).rejects.toMatchObject({ url: "/sign-in" });
  });

  test("redirects to sign-in when the claims can't be verified", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid") });
    await expect(requireUser()).rejects.toMatchObject({ url: "/sign-in" });
  });
});

describe("getSignedInUser (unit 1.4)", () => {
  test("returns the user once 2FA is done, or when there is none", async () => {
    getClaims.mockResolvedValue(claims("aal2"));
    await expect(getSignedInUser()).resolves.toMatchObject({ userId: "user-1" });
    getClaims.mockResolvedValue(claims("aal1"));
    await expect(getSignedInUser()).resolves.toMatchObject({ userId: "user-1" });
  });

  test("returns null while the code is owed, or without a session", async () => {
    getClaims.mockResolvedValue(claims("aal1"));
    getUser.mockResolvedValue({ data: { user: { factors: [verifiedTotp] } }, error: null });
    await expect(getSignedInUser()).resolves.toBeNull();
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(getSignedInUser()).resolves.toBeNull();
  });
});

describe("getTwoFactorStatus (unit 1.4)", () => {
  test("reports a verified authenticator app and when it was added", async () => {
    getUser.mockResolvedValue({ data: { user: { factors: [verifiedTotp] } }, error: null });
    await expect(getTwoFactorStatus()).resolves.toEqual({ enabled: true, addedAt: "2026-11-23T01:02:03Z" });
  });

  test("an unverified setup counts as off", async () => {
    getUser.mockResolvedValue({ data: { user: { factors: [{ ...verifiedTotp, status: "unverified" }] } }, error: null });
    await expect(getTwoFactorStatus()).resolves.toEqual({ enabled: false, addedAt: null });
  });
});
