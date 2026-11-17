import { AuthApiError } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mocked, so no network call is made and `server-only` is never loaded. The reset-pending cookie
// check is the real one.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getCurrentClaims: vi.fn() }));

import { GET } from "@/app/auth/confirm/route";
import { RESET_PENDING_COOKIE } from "@/lib/auth/reset-pending";
import { createSupabaseServerClient } from "@/lib/auth/server";
import { getCurrentClaims } from "@/lib/auth/session";

const verifyOtp = vi.fn();
const exchangeCodeForSession = vi.fn();
const base = "http://localhost:3000/auth/confirm";

function request(query: string, cookie?: string): NextRequest {
  return new NextRequest(`${base}${query}`, cookie ? { headers: { cookie } } : undefined);
}

const pending = `${RESET_PENDING_COOKIE}=1`;
const signedIn = { userId: "user-1", email: "owner@example.com" };

function location(response: Response): string {
  return new URL(response.headers.get("location") ?? "").pathname;
}

beforeEach(() => {
  verifyOtp.mockReset();
  exchangeCodeForSession.mockReset();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { verifyOtp, exchangeCodeForSession } } as never);
  vi.mocked(getCurrentClaims).mockReset();
  vi.mocked(getCurrentClaims).mockResolvedValue(null);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /auth/confirm", () => {
  test.each([
    ["no token", "?type=email&next=/dashboard"],
    ["no type", "?token_hash=abc&next=/dashboard"],
    ["a type that isn't allowed", "?token_hash=abc&type=magiclink&next=/dashboard"],
    ["the signup type", "?token_hash=abc&type=signup&next=/dashboard"],
  ])("sends %s to /auth-error without calling Supabase", async (_case, query) => {
    const response = await GET(request(query));
    expect(response.status).toBe(307);
    expect(location(response)).toBe("/auth-error");
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  test("sends a failed verification to /auth-error, with no error text in the URL", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: new AuthApiError("Token has expired", 403, "otp_expired") });
    const response = await GET(request("?token_hash=abc&type=email&next=/dashboard"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/auth-error");
  });

  test("verifies a confirmation link and goes to the dashboard", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    const response = await GET(request("?token_hash=abc&type=email&next=/dashboard"));
    expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
    expect(location(response)).toBe("/dashboard");
  });

  test("verifies a recovery link and goes to the reset page", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    const response = await GET(request("?token_hash=abc&type=recovery&next=/reset-password"));
    expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "abc" });
    expect(location(response)).toBe("/reset-password");
  });

  test.each(["https://evil.example", "//evil.example", "/transactions", ""])(
    "replaces an unsafe next of %j with /dashboard, on this site",
    async (next) => {
      verifyOtp.mockResolvedValue({ data: {}, error: null });
      const response = await GET(request(`?token_hash=abc&type=email&next=${encodeURIComponent(next)}`));
      expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    },
  );

  describe("PKCE code links from the default templates", () => {
    test("exchanges a confirmation code and goes to the dashboard", async () => {
      exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
      const response = await GET(request("?next=%2Fdashboard&code=abc-123"));
      expect(exchangeCodeForSession).toHaveBeenCalledWith("abc-123");
      expect(verifyOtp).not.toHaveBeenCalled();
      expect(location(response)).toBe("/dashboard");
    });

    test("exchanges a reset code and goes to the reset page", async () => {
      exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
      const response = await GET(request("?next=%2Freset-password&code=abc-123"));
      expect(location(response)).toBe("/reset-password");
    });

    test.each(["https://evil.example", "//evil.example", "/transactions"])(
      "replaces an unsafe next of %j with /dashboard, on this site",
      async (next) => {
        exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
        const response = await GET(request(`?code=abc&next=${encodeURIComponent(next)}`));
        expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
      },
    );

    test("sends a failed exchange (such as another browser) to /auth-error, with no error text", async () => {
      exchangeCodeForSession.mockResolvedValue({
        data: {},
        error: new AuthApiError("code verifier missing", 400, "bad_code_verifier"),
      });
      const response = await GET(request("?code=abc&next=%2Fdashboard"));
      expect(response.headers.get("location")).toBe("http://localhost:3000/auth-error");
    });

    test.each([
      ["an empty code", "?code=&next=%2Fdashboard"],
      ["an over-long code", `?code=${"a".repeat(513)}&next=%2Fdashboard`],
      [
        "Supabase's error redirect",
        "?next=%2Fdashboard&error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
      ],
    ])("sends %s to /auth-error without calling Supabase", async (_case, query) => {
      const response = await GET(request(query));
      expect(location(response)).toBe("/auth-error");
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
      expect(verifyOtp).not.toHaveBeenCalled();
    });

    test("accepts a code of exactly 512 characters", async () => {
      exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
      const response = await GET(request(`?code=${"a".repeat(512)}&next=%2Fdashboard`));
      expect(location(response)).toBe("/dashboard");
    });

    test("a token hash takes precedence when both are present", async () => {
      verifyOtp.mockResolvedValue({ data: {}, error: null });
      await GET(request("?token_hash=abc&type=email&code=xyz&next=%2Fdashboard"));
      expect(verifyOtp).toHaveBeenCalledWith({ type: "email", token_hash: "abc" });
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
    });
  });

  describe("a used reset link in the browser that asked for the reset (unit 1.1b)", () => {
    const usedLink =
      "?next=%2Freset-password&error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid";
    const failedExchange = () =>
      exchangeCodeForSession.mockResolvedValue({ data: {}, error: new AuthApiError("m", 400, "flow_state_not_found") });

    test("Supabase's error redirect opens the reset page when signed in with the cookie", async () => {
      vi.mocked(getCurrentClaims).mockResolvedValue(signedIn);
      const response = await GET(request(usedLink, pending));
      expect(response.headers.get("location")).toBe("http://localhost:3000/reset-password");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(exchangeCodeForSession).not.toHaveBeenCalled();
    });

    test("a failed code exchange opens the reset page when signed in with the cookie", async () => {
      vi.mocked(getCurrentClaims).mockResolvedValue(signedIn);
      failedExchange();
      const response = await GET(request("?code=abc&next=%2Freset-password", pending));
      expect(location(response)).toBe("/reset-password");
    });

    test("without the cookie, it goes to /auth-error", async () => {
      vi.mocked(getCurrentClaims).mockResolvedValue(signedIn);
      expect(location(await GET(request(usedLink)))).toBe("/auth-error");
      failedExchange();
      expect(location(await GET(request("?code=abc&next=%2Freset-password")))).toBe("/auth-error");
    });

    test("with a cookie value other than 1, it goes to /auth-error", async () => {
      vi.mocked(getCurrentClaims).mockResolvedValue(signedIn);
      expect(location(await GET(request(usedLink, `${RESET_PENDING_COOKIE}=yes`)))).toBe("/auth-error");
    });

    test("when signed out, it goes to /auth-error even with the cookie", async () => {
      expect(location(await GET(request(usedLink, pending)))).toBe("/auth-error");
      failedExchange();
      expect(location(await GET(request("?code=abc&next=%2Freset-password", pending)))).toBe("/auth-error");
    });

    test.each([
      ["a confirmation link", "?next=%2Fdashboard&error=access_denied"],
      ["a missing next", "?error=access_denied"],
      ["an unsafe next", `?next=${encodeURIComponent("https://evil.example/reset-password")}&error=access_denied`],
    ])("for %s, it goes to /auth-error even when signed in with the cookie", async (_case, query) => {
      vi.mocked(getCurrentClaims).mockResolvedValue(signedIn);
      expect(location(await GET(request(query, pending)))).toBe("/auth-error");
    });

    test("a failed token-hash link still goes to /auth-error", async () => {
      vi.mocked(getCurrentClaims).mockResolvedValue(signedIn);
      verifyOtp.mockResolvedValue({ data: {}, error: new AuthApiError("m", 403, "otp_expired") });
      const response = await GET(request("?token_hash=abc&type=recovery&next=%2Freset-password", pending));
      expect(location(response)).toBe("/auth-error");
    });

    test("a working link goes to next without checking the session or touching the cookie", async () => {
      exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
      const response = await GET(request("?code=abc&next=%2Freset-password", pending));
      expect(location(response)).toBe("/reset-password");
      expect(getCurrentClaims).not.toHaveBeenCalled();
      expect(response.headers.get("set-cookie") ?? "").not.toContain(RESET_PENDING_COOKIE);
    });
  });

  test("sets Cache-Control: no-store", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    const success = await GET(request("?token_hash=abc&type=email&next=/dashboard"));
    const failure = await GET(request(""));
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    const codeSuccess = await GET(request("?code=abc&next=%2Fdashboard"));
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: new AuthApiError("m", 400, "bad_code_verifier") });
    const codeFailure = await GET(request("?code=abc&next=%2Fdashboard"));
    for (const response of [success, failure, codeSuccess, codeFailure]) {
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
  });
});
