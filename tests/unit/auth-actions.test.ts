import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Supabase, the session helper and Next's redirect are mocked, so no network call is made and
// `server-only` is never loaded.
class RedirectSignal extends Error {
  constructor(public readonly url: string) {
    super(`redirect:${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectSignal(url);
  }),
}));
vi.mock("@/lib/auth/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentClaims: vi.fn(), getSessionStatus: vi.fn() }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("@/lib/auth/reset-pending", () => ({ markResetPending: vi.fn(), clearResetPending: vi.fn() }));

import {
  requestPasswordReset,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updatePassword,
  verifyTwoFactor,
} from "@/app/(auth)/actions";
import { headers } from "next/headers";

import { clearResetPending, markResetPending } from "@/lib/auth/reset-pending";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCurrentClaims, getSessionStatus } from "@/lib/auth/session";

const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  getUser: vi.fn(),
  mfa: { challengeAndVerify: vi.fn() },
};

const factorId = "6f1c2a8e-3b4d-4c5e-8f9a-0b1c2d3e4f5a";
const verifiedTotp = { id: factorId, factor_type: "totp", status: "verified", created_at: "2026-11-23T00:00:00Z" };
const unverifiedTotp = { ...verifiedTotp, status: "unverified" };
const user = { userId: "user-1", email: "owner@example.com", aal: "aal1" as const };

const ok = { data: {}, error: null };
const email = "owner@example.com";
const origin = "http://localhost:3000";

function setOrigin(value: string | null) {
  const requestHeaders = new Headers();
  if (value !== null) {
    requestHeaders.set("origin", value);
  }
  vi.mocked(headers).mockResolvedValue(requestHeaders as never);
}

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectSignal) {
      return error.url;
    }
    throw error;
  }
  throw new Error("Expected a redirect");
}

beforeEach(() => {
  for (const fn of Object.values(auth)) {
    if (typeof fn === "function") {
      fn.mockReset();
    }
  }
  auth.mfa.challengeAndVerify.mockReset();
  vi.mocked(getSessionStatus).mockReset();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth } as never);
  vi.mocked(getCurrentClaims).mockReset();
  vi.mocked(markResetPending).mockReset();
  vi.mocked(clearResetPending).mockReset();
  setOrigin(origin);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("signUp", () => {
  const input = { email: " Owner@Example.com", password: "Sunshine1", confirmPassword: "Sunshine1" };

  test("invalid input never reaches Supabase", async () => {
    const result = await signUp({ email: "nope", password: "short", confirmPassword: "x" });
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.fieldErrors).toHaveProperty("email");
    expect(result.error.fieldErrors).toHaveProperty("password");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  test("rejects input that isn't an object", async () => {
    expect((await signUp("owner@example.com")).error.code).toBe("INVALID_INPUT");
    expect((await signUp(null)).error.code).toBe("INVALID_INPUT");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  test("sends the normalised email and the confirm link's redirect URL, then goes to check-email", async () => {
    auth.signUp.mockResolvedValue(ok);
    expect(await redirectOf(signUp(input))).toBe("/check-email?reason=sign-up");
    expect(auth.signUp).toHaveBeenCalledWith({
      email,
      password: "Sunshine1",
      options: { emailRedirectTo: "http://localhost:3000/auth/confirm?next=%2Fdashboard" },
    });
  });

  test("refuses without an Origin header and never calls Supabase", async () => {
    setOrigin(null);
    expect((await signUp(input)).error.code).toBe("AUTH_FAILED");
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  test("an email that already has an account ends on the same page", async () => {
    // Supabase returns an obfuscated user and no error for an existing, confirmed email.
    auth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null });
    expect(await redirectOf(signUp(input))).toBe("/check-email?reason=sign-up");
  });

  test.each([
    ["weak_password", 422, "WEAK_PASSWORD"],
    ["over_email_send_rate_limit", 429, "RATE_LIMITED"],
    ["email_address_not_authorized", 400, "EMAIL_NOT_AUTHORIZED"],
  ] as const)("returns %s as %s", async (code, status, expected) => {
    auth.signUp.mockResolvedValue({ data: {}, error: new AuthApiError("message", status, code) });
    expect((await signUp(input)).error.code).toBe(expected);
  });
});

describe("signIn", () => {
  test("invalid input never reaches Supabase", async () => {
    const result = await signIn({ email: "", password: "" });
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("goes to the dashboard on success", async () => {
    auth.signInWithPassword.mockResolvedValue(ok);
    expect(await redirectOf(signIn({ email, password: "anything" }))).toBe("/dashboard");
  });

  test("returns one generic message for a wrong email or password, without echoing the email", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    });
    const result = await signIn({ email, password: "wrong" });
    expect(result).toEqual({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
    expect(JSON.stringify(result)).not.toContain(email);
  });

  test("a network failure returns the generic error", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError("fetch failed", 0) });
    expect((await signIn({ email, password: "x" })).error.code).toBe("AUTH_FAILED");
  });

  // Unit 1.2a: back to the page the proxy sent the user away from.
  test.each(["/budgets", "/budgets?month=2026-11"])("returns to a safe next, %s", async (next) => {
    auth.signInWithPassword.mockResolvedValue(ok);
    expect(await redirectOf(signIn({ email, password: "anything", next }))).toBe(next);
  });

  test.each([undefined, "", "//evil.example", "https://evil.example", "/sign-in", "/reset-password", 42, null])(
    "goes to the dashboard for a missing or unsafe next (%s)",
    async (next) => {
      auth.signInWithPassword.mockResolvedValue(ok);
      expect(await redirectOf(signIn({ email, password: "anything", next }))).toBe("/dashboard");
    },
  );

  // Unit 1.4: with 2FA on, the code comes first.
  test("goes to the 2FA step when the user has a verified authenticator app", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { factors: [verifiedTotp] } }, error: null });
    expect(await redirectOf(signIn({ email, password: "anything" }))).toBe("/two-factor");
  });

  test("the 2FA step keeps a safe next, and drops an unsafe one", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { factors: [verifiedTotp] } }, error: null });
    expect(await redirectOf(signIn({ email, password: "anything", next: "/budgets?month=2026-11" }))).toBe(
      "/two-factor?next=%2Fbudgets%3Fmonth%3D2026-11",
    );
    expect(await redirectOf(signIn({ email, password: "anything", next: "//evil.example" }))).toBe("/two-factor");
  });

  test("an unverified (abandoned) setup doesn't ask for a code", async () => {
    auth.signInWithPassword.mockResolvedValue({ data: { user: { factors: [unverifiedTotp] } }, error: null });
    expect(await redirectOf(signIn({ email, password: "anything" }))).toBe("/dashboard");
  });

  test("an unsafe next never blocks sign-in or changes its errors", async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: new AuthApiError("Invalid login credentials", 400, "invalid_credentials"),
    });
    const result = await signIn({ email, password: "wrong", next: "//evil.example" });
    expect(result.error.code).toBe("INVALID_CREDENTIALS");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email, password: "wrong" });
  });
});

describe("signOut", () => {
  test("signs out this device only and goes to sign-in", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    expect(await redirectOf(signOut())).toBe("/sign-in");
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(clearResetPending).toHaveBeenCalledOnce();
  });

  test("still goes to sign-in, and clears the reset-pending cookie, when Supabase errors", async () => {
    auth.signOut.mockResolvedValue({ error: new AuthRetryableFetchError("fetch failed", 0) });
    expect(await redirectOf(signOut())).toBe("/sign-in");
    expect(clearResetPending).toHaveBeenCalledOnce();
  });
});

describe("requestPasswordReset", () => {
  test("invalid input never reaches Supabase", async () => {
    expect((await requestPasswordReset({ email: "nope" })).error.code).toBe("INVALID_INPUT");
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(markResetPending).not.toHaveBeenCalled();
  });

  test("goes to check-email on success, with the reset link's redirect URL", async () => {
    setOrigin("https://fintrack-kappa-blush.vercel.app");
    auth.resetPasswordForEmail.mockResolvedValue(ok);
    expect(await redirectOf(requestPasswordReset({ email }))).toBe("/check-email?reason=reset");
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(email, {
      redirectTo: "https://fintrack-kappa-blush.vercel.app/auth/confirm?next=%2Freset-password",
    });
    expect(markResetPending).toHaveBeenCalledWith({ secure: true });
  });

  test("marks the reset pending without Secure on plain http (localhost)", async () => {
    auth.resetPasswordForEmail.mockResolvedValue(ok);
    await redirectOf(requestPasswordReset({ email }));
    expect(markResetPending).toHaveBeenCalledWith({ secure: false });
  });

  test("refuses without an Origin header and never calls Supabase", async () => {
    setOrigin(null);
    expect((await requestPasswordReset({ email })).error.code).toBe("AUTH_FAILED");
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(markResetPending).not.toHaveBeenCalled();
  });

  test.each([
    ["user_not_found", 404],
    ["email_address_not_authorized", 400],
    ["validation_failed", 422],
  ] as const)("ends on the same page when Supabase refuses with %s", async (code, status) => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: new AuthApiError("message", status, code) });
    expect(await redirectOf(requestPasswordReset({ email }))).toBe("/check-email?reason=reset");
    // The same cookie as for a real account, so the response doesn't reveal which it was.
    expect(markResetPending).toHaveBeenCalledWith({ secure: false });
  });

  test("reports rate limits", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: new AuthApiError("message", 429, "over_email_send_rate_limit"),
    });
    expect((await requestPasswordReset({ email })).error.code).toBe("RATE_LIMITED");
    expect(markResetPending).not.toHaveBeenCalled();
  });

  test("reports network failures and outages", async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError("fetch failed", 0) });
    expect((await requestPasswordReset({ email })).error.code).toBe("AUTH_FAILED");
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: new AuthApiError("message", 500, "unexpected_failure") });
    expect((await requestPasswordReset({ email })).error.code).toBe("AUTH_FAILED");
    expect(markResetPending).not.toHaveBeenCalled();
  });
});

describe("updatePassword", () => {
  const input = { password: "Sunshine1", confirmPassword: "Sunshine1" };

  test("invalid input never reaches Supabase", async () => {
    expect((await updatePassword({ password: "weak", confirmPassword: "weak" })).error.code).toBe("INVALID_INPUT");
    expect(getSessionStatus).not.toHaveBeenCalled();
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(clearResetPending).not.toHaveBeenCalled();
  });

  test("refuses without a session", async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({ state: "signed-out", user: null });
    expect((await updatePassword(input)).error.code).toBe("NOT_SIGNED_IN");
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(clearResetPending).not.toHaveBeenCalled();
  });

  // Unit 1.4: a reset link alone can't change the password of a user with 2FA.
  test("refuses a session that still owes its 2FA code", async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({ state: "needs-2fa", user });
    expect((await updatePassword(input)).error.code).toBe("TWO_FACTOR_REQUIRED");
    expect(auth.updateUser).not.toHaveBeenCalled();
    expect(clearResetPending).not.toHaveBeenCalled();
  });

  test("updates the password and goes to the dashboard", async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({ state: "signed-in", user });
    auth.updateUser.mockResolvedValue(ok);
    expect(await redirectOf(updatePassword(input))).toBe("/dashboard");
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "Sunshine1" });
    expect(clearResetPending).toHaveBeenCalledOnce();
  });

  test("returns SAME_PASSWORD when the password didn't change", async () => {
    vi.mocked(getSessionStatus).mockResolvedValue({ state: "signed-in", user });
    auth.updateUser.mockResolvedValue({ data: {}, error: new AuthApiError("message", 422, "same_password") });
    expect((await updatePassword(input)).error.code).toBe("SAME_PASSWORD");
    // The reset isn't finished, so the cookie stays for another try.
    expect(clearResetPending).not.toHaveBeenCalled();
  });
});

describe("signInWithGoogle (unit 1.3)", () => {
  const authorizeUrl = "https://project.supabase.co/auth/v1/authorize?provider=google";

  function form(fields: Record<string, string> = {}): FormData {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) {
      data.set(name, value);
    }
    return data;
  }

  test("builds the callback URL from the origin and a safe next, then goes to Supabase", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: authorizeUrl }, error: null });
    expect(await redirectOf(signInWithGoogle(null, form({ next: "/budgets?month=2026-11" })))).toBe(authorizeUrl);
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "http://localhost:3000/auth/callback?next=%2Fbudgets%3Fmonth%3D2026-11",
        skipBrowserRedirect: true,
      },
    });
  });

  test.each([
    ["no next", form()],
    ["an off-site next", form({ next: "//evil.example" })],
    ["a guest page", form({ next: "/sign-in" })],
    ["input that isn't form data", { next: "/budgets" }],
  ])("returns to the dashboard for %s", async (_case, input) => {
    auth.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: authorizeUrl }, error: null });
    await redirectOf(signInWithGoogle(null, input));
    expect(auth.signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe(
      "http://localhost:3000/auth/callback?next=%2Fdashboard",
    );
  });

  test("ignores fields other than next", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: authorizeUrl }, error: null });
    await redirectOf(signInWithGoogle(null, form({ provider: "facebook", redirectTo: "https://evil.example" })));
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "http://localhost:3000/auth/callback?next=%2Fdashboard", skipBrowserRedirect: true },
    });
  });

  test.each([null, "null", "ftp://example.com"])("returns AUTH_FAILED without Supabase for an origin of %j", async (value) => {
    setOrigin(value);
    vi.mocked(createSupabaseServerClient).mockClear();
    expect(await signInWithGoogle(null, form())).toEqual({
      error: { code: "AUTH_FAILED", message: "Something went wrong. Try again." },
    });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  test("returns AUTH_FAILED and logs only name and code when Supabase returns an error", async () => {
    auth.signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: null },
      error: new AuthApiError("provider is not enabled", 400, "validation_failed"),
    });
    expect((await signInWithGoogle(null, form())).error.code).toBe("AUTH_FAILED");
    expect(console.error).toHaveBeenCalledWith("[auth] signInWithGoogle failed: AuthApiError (validation_failed)");
  });

  test("returns AUTH_FAILED when no URL comes back", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: "" }, error: null });
    expect((await signInWithGoogle(null, form())).error.code).toBe("AUTH_FAILED");
  });
});

describe("verifyTwoFactor (unit 1.4)", () => {
  const code = "123456";

  function withFactor() {
    vi.mocked(getCurrentClaims).mockResolvedValue(user);
    auth.getUser.mockResolvedValue({ data: { user: { factors: [verifiedTotp] } }, error: null });
  }

  test("a malformed code never reaches Supabase", async () => {
    const result = await verifyTwoFactor({ code: "12a456" });
    expect(result.error.code).toBe("INVALID_CODE");
    expect(result.error.fieldErrors?.code).toEqual(["Enter the 6-digit code from your authenticator app."]);
    expect(getCurrentClaims).not.toHaveBeenCalled();
  });

  test("refuses without a session", async () => {
    vi.mocked(getCurrentClaims).mockResolvedValue(null);
    expect((await verifyTwoFactor({ code })).error.code).toBe("NOT_SIGNED_IN");
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  test("verifies the code against the user's factor, then goes to a safe next", async () => {
    withFactor();
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    expect(await redirectOf(verifyTwoFactor({ code: "123 456", next: "/budgets" }))).toBe("/budgets");
    expect(auth.mfa.challengeAndVerify).toHaveBeenCalledWith({ factorId, code });
  });

  test.each([
    [undefined, "/dashboard"],
    ["/reset-password", "/reset-password"],
    ["//evil.example", "/dashboard"],
    ["/two-factor", "/dashboard"],
    ["/sign-in", "/dashboard"],
  ])("next %s continues to %s", async (next, expected) => {
    withFactor();
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: {}, error: null });
    expect(await redirectOf(verifyTwoFactor({ code, next }))).toBe(expected);
  });

  test("a wrong code returns INVALID_CODE and isn't logged", async () => {
    withFactor();
    auth.mfa.challengeAndVerify.mockResolvedValue({
      data: null,
      error: new AuthApiError("Invalid TOTP code entered", 422, "mfa_verification_failed"),
    });
    expect(await verifyTwoFactor({ code })).toEqual({
      error: { code: "INVALID_CODE", message: "That code didn't work. Check your authenticator app and try again." },
    });
    expect(console.error).not.toHaveBeenCalled();
  });

  test("an expired challenge is a wrong code too", async () => {
    withFactor();
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: null, error: new AuthApiError("m", 422, "mfa_challenge_expired") });
    expect((await verifyTwoFactor({ code })).error.code).toBe("INVALID_CODE");
  });

  test("too many attempts returns RATE_LIMITED", async () => {
    withFactor();
    auth.mfa.challengeAndVerify.mockResolvedValue({
      data: null,
      error: new AuthApiError("m", 429, "over_request_rate_limit"),
    });
    expect((await verifyTwoFactor({ code })).error.code).toBe("RATE_LIMITED");
  });

  test("any other failure is generic and logged by name and code only, never the code entered", async () => {
    withFactor();
    auth.mfa.challengeAndVerify.mockResolvedValue({ data: null, error: new AuthRetryableFetchError("fetch failed", 0) });
    expect((await verifyTwoFactor({ code })).error.code).toBe("AUTH_FAILED");
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).toContain("verifyTwoFactor");
    expect(logged).not.toContain(code);
    expect(logged).not.toContain(factorId);
  });

  test("a failed user lookup is generic", async () => {
    vi.mocked(getCurrentClaims).mockResolvedValue(user);
    auth.getUser.mockResolvedValue({ data: { user: null }, error: new AuthRetryableFetchError("fetch failed", 0) });
    expect((await verifyTwoFactor({ code })).error.code).toBe("AUTH_FAILED");
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  test("an aal2 session has nothing left to verify", async () => {
    vi.mocked(getCurrentClaims).mockResolvedValue({ ...user, aal: "aal2" });
    expect(await redirectOf(verifyTwoFactor({ code, next: "/budgets" }))).toBe("/budgets");
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });

  test("a user whose 2FA was turned off elsewhere goes straight on", async () => {
    vi.mocked(getCurrentClaims).mockResolvedValue(user);
    auth.getUser.mockResolvedValue({ data: { user: { factors: [] } }, error: null });
    expect(await redirectOf(verifyTwoFactor({ code }))).toBe("/dashboard");
    expect(auth.mfa.challengeAndVerify).not.toHaveBeenCalled();
  });
});
