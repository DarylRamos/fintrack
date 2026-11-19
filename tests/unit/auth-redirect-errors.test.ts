import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, describe, expect, test, vi } from "vitest";

import { authError, logAuthError, logProviderError, mapAuthError, safeProviderErrorCode } from "@/lib/auth/errors";
import { emailRedirectUrl, oauthRedirectUrl, safeNextPath, safeReturnPath } from "@/lib/auth/redirect";

describe("safeNextPath", () => {
  test.each(["/dashboard", "/reset-password"])("allows %s", (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  test.each([
    null,
    undefined,
    "",
    "//evil.example",
    "https://evil.example",
    "/dashboard/../x",
    "/dashboard?x=1",
    "/transactions",
    "dashboard",
    "/\\evil.example",
  ])("falls back to /dashboard for %j", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });
});

describe("safeReturnPath (unit 1.2a)", () => {
  test.each(["/budgets", "/budgets?month=2026-11", "/dashboard", "/transactions/abc?tag=food&sort=date"])(
    "accepts the same-origin app page %s",
    (path) => {
      expect(safeReturnPath(path)).toBe(path);
    },
  );

  test("drops a fragment", () => {
    expect(safeReturnPath("/budgets?month=x#top")).toBe("/budgets?month=x");
  });

  test.each([
    null,
    undefined,
    42,
    "",
    "budgets",
    "//evil.example",
    "//evil.example/budgets",
    "/\\evil.example",
    "/\\/evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/budgets\nSet-Cookie:x=1",
    "/budgets\u0000",
    "/budgets\t",
    `/${"a".repeat(2048)}`,
    "/",
    "/?next=/budgets",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/sign-in?next=/budgets",
    "/reset-password",
    "/check-email",
    "/auth-error",
    "/auth",
    "/auth/confirm",
    "/api",
    "/api/cron/heartbeat",
  ])("falls back to the dashboard for %j", (value) => {
    expect(safeReturnPath(value)).toBe("/dashboard");
  });

  test("normalises dot segments before checking the path", () => {
    expect(safeReturnPath("/budgets/../sign-in")).toBe("/dashboard");
    expect(safeReturnPath("/x/../budgets")).toBe("/budgets");
  });
});

describe("emailRedirectUrl", () => {
  test.each([
    ["http://localhost:3000", "/dashboard", "http://localhost:3000/auth/confirm?next=%2Fdashboard"],
    [
      "https://fintrack-kappa-blush.vercel.app",
      "/reset-password",
      "https://fintrack-kappa-blush.vercel.app/auth/confirm?next=%2Freset-password",
    ],
  ] as const)("builds the confirm link for %s and %s", (origin, next, expected) => {
    expect(emailRedirectUrl(origin, next)).toBe(expected);
  });

  test("keeps only the origin when the value has a path or query", () => {
    expect(emailRedirectUrl("https://example.com/somewhere?x=1#y", "/dashboard")).toBe(
      "https://example.com/auth/confirm?next=%2Fdashboard",
    );
  });

  test.each([null, undefined, "", "not a url", "null", "javascript:alert(1)", "ftp://example.com", "file:///etc"])(
    "returns null for %j",
    (origin) => {
      expect(emailRedirectUrl(origin, "/dashboard")).toBeNull();
    },
  );
});

describe("mapAuthError", () => {
  test.each([
    ["invalid_credentials", 400, "INVALID_CREDENTIALS"],
    ["email_not_confirmed", 400, "EMAIL_NOT_CONFIRMED"],
    ["email_address_not_authorized", 400, "EMAIL_NOT_AUTHORIZED"],
    ["weak_password", 422, "WEAK_PASSWORD"],
    ["same_password", 422, "SAME_PASSWORD"],
    ["over_request_rate_limit", 429, "RATE_LIMITED"],
    ["over_email_send_rate_limit", 429, "RATE_LIMITED"],
  ] as const)("maps %s to %s", (code, status, expected) => {
    expect(mapAuthError(new AuthApiError("message", status, code))).toBe(expected);
  });

  test("maps an unknown 429 to RATE_LIMITED", () => {
    expect(mapAuthError(new AuthApiError("message", 429, undefined))).toBe("RATE_LIMITED");
  });

  test.each([
    ["an unknown Supabase code", new AuthApiError("message", 400, "unexpected_failure")],
    ["a network failure", new AuthRetryableFetchError("fetch failed", 0)],
    ["a plain Error", new Error("boom")],
    ["a non-error value", "boom"],
  ])("maps %s to AUTH_FAILED", (_case, error) => {
    expect(mapAuthError(error)).toBe("AUTH_FAILED");
  });
});

describe("authError", () => {
  test("builds the standard error shape", () => {
    expect(authError("INVALID_CREDENTIALS")).toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." },
    });
  });

  test("includes field errors when given", () => {
    expect(authError("INVALID_INPUT", { email: ["Enter a valid email address."] })).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Check the highlighted fields.",
        fieldErrors: { email: ["Enter a valid email address."] },
      },
    });
  });

  test("no message says whether an account exists", () => {
    for (const code of ["INVALID_CREDENTIALS", "AUTH_FAILED", "RATE_LIMITED"] as const) {
      expect(authError(code).error.message).not.toMatch(/no account|not found|exists|registered/i);
    }
  });
});

describe("logAuthError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("logs the name and code only, never the message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    logAuthError("signIn", new AuthApiError("owner@example.com is not allowed", 400, "email_address_not_authorized"));
    expect(log).toHaveBeenCalledWith("[auth] signIn failed: AuthApiError (email_address_not_authorized)");
    expect(JSON.stringify(log.mock.calls)).not.toContain("owner@example.com");
  });
});

describe("oauthRedirectUrl (unit 1.3)", () => {
  const origin = "http://localhost:3000";

  test("builds the callback URL with an encoded safe next", () => {
    expect(oauthRedirectUrl(origin, "/budgets?month=2026-11")).toBe(
      "http://localhost:3000/auth/callback?next=%2Fbudgets%3Fmonth%3D2026-11",
    );
    expect(oauthRedirectUrl("https://fintrack-kappa-blush.vercel.app", "/goals")).toBe(
      "https://fintrack-kappa-blush.vercel.app/auth/callback?next=%2Fgoals",
    );
  });

  test.each([undefined, null, 42, "", "//evil.example", "https://evil.example", "/sign-in", "/auth/confirm", "/"])(
    "uses the dashboard for a next of %j",
    (next) => {
      expect(oauthRedirectUrl(origin, next)).toBe("http://localhost:3000/auth/callback?next=%2Fdashboard");
    },
  );

  test("keeps only the origin when the value has a path or query", () => {
    expect(oauthRedirectUrl("https://example.com/somewhere?x=1#y", "/budgets")).toBe(
      "https://example.com/auth/callback?next=%2Fbudgets",
    );
  });

  test.each([null, undefined, "", "not a url", "null", "javascript:alert(1)", "ftp://example.com"])(
    "returns null for an origin of %j",
    (value) => {
      expect(oauthRedirectUrl(value, "/budgets")).toBeNull();
    },
  );
});

describe("Google sign-in errors (unit 1.3)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("GOOGLE_FAILED has one message that names no reason", () => {
    expect(authError("GOOGLE_FAILED").error).toEqual({
      code: "GOOGLE_FAILED",
      message: "Google sign-in didn't finish. Try again, or use your email and password.",
    });
    expect(authError("GOOGLE_FAILED").error.message).not.toMatch(/no account|not found|exists|registered|denied/i);
  });

  test.each([
    ["access_denied", "access_denied"],
    ["server_error", "server_error"],
    [null, "unknown"],
    ["", "unknown"],
    ["Access Denied", "unknown"],
    ["owner@example.com", "unknown"],
    ["a".repeat(65), "unknown"],
    ["access_denied\nforged", "unknown"],
  ])("safeProviderErrorCode(%j) is %j", (value, expected) => {
    expect(safeProviderErrorCode(value)).toBe(expected);
  });

  test("logProviderError logs only the safe code", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    logProviderError("oauthCallback", "access_denied");
    logProviderError("oauthCallback", "owner@example.com");
    expect(log.mock.calls).toEqual([
      ["[auth] oauthCallback failed: ProviderError (access_denied)"],
      ["[auth] oauthCallback failed: ProviderError (unknown)"],
    ]);
  });
});
