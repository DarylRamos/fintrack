import { AuthApiError } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Supabase is mocked, so no network call is made and `server-only` is never loaded. See
// context/feature-specs/1.3-google-sign-in.md.
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/server", () => ({ createSupabaseServerClient: vi.fn() }));

import { GET } from "@/app/auth/callback/route";
import { createSupabaseServerClient } from "@/lib/auth/server";

const exchangeCodeForSession = vi.fn();
const base = "http://localhost:3000/auth/callback";
const failed = "http://localhost:3000/sign-in?error=google";

function request(query: string): NextRequest {
  return new NextRequest(`${base}${query}`);
}

beforeEach(() => {
  exchangeCodeForSession.mockReset();
  vi.mocked(createSupabaseServerClient).mockClear();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { exchangeCodeForSession } } as never);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /auth/callback", () => {
  test("exchanges the code and returns to a safe next", async () => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    const response = await GET(request("?code=abc&next=%2Fbudgets%3Fmonth%3D2026-11"));
    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/budgets?month=2026-11");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  test.each([
    ["no next", "?code=abc"],
    ["an off-site next", "?code=abc&next=%2F%2Fevil.example"],
    ["an absolute next", "?code=abc&next=https%3A%2F%2Fevil.example"],
    ["a guest page", "?code=abc&next=%2Fsign-in"],
    ["an auth route", "?code=abc&next=%2Fauth%2Fconfirm"],
  ])("goes to the dashboard for %s", async (_case, query) => {
    exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    const response = await GET(request(query));
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
  });

  test.each([
    ["a cancel at Google", "?error=access_denied&error_description=The+user+denied+access"],
    ["a refusal with a code too", "?error=server_error&code=abc"],
    ["no code", ""],
    ["an empty code", "?code="],
    ["an overlong code", `?code=${"a".repeat(513)}`],
  ])("sends %s to the sign-in page without calling Supabase", async (_case, query) => {
    const response = await GET(request(query));
    expect(response.headers.get("location")).toBe(failed);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  });

  test("sends a failed exchange to the sign-in page, logging only name and code", async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: {},
      error: new AuthApiError("code verifier missing for owner@example.com", 400, "bad_code_verifier"),
    });
    const response = await GET(request("?code=abc&next=%2Fbudgets"));
    expect(response.headers.get("location")).toBe(failed);
    expect(console.error).toHaveBeenCalledWith("[auth] oauthCallback failed: AuthApiError (bad_code_verifier)");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("owner@example.com");
  });

  test("logs a provider error as its code only, never the description", async () => {
    await GET(request("?error=access_denied&error_description=owner%40example.com+denied"));
    expect(console.error).toHaveBeenCalledWith("[auth] oauthCallback failed: ProviderError (access_denied)");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(/owner|denied access|description/);
  });
});
