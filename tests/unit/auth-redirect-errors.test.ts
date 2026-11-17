import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, describe, expect, test, vi } from "vitest";

import { authError, logAuthError, mapAuthError } from "@/lib/auth/errors";
import { emailRedirectUrl, safeNextPath } from "@/lib/auth/redirect";

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
