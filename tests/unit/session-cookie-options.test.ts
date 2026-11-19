import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

// @supabase/ssr is mocked, so no network call is made; `server-only` is never loaded.
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock("@/lib/auth/env", () => ({
  getSupabaseEnv: () => ({ url: "http://127.0.0.1:54321", publishableKey: "sb_publishable_test" }),
}));

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

import { sessionCookieOptions } from "@/lib/auth/cookie-options";
import { refreshSession } from "@/lib/auth/proxy-session";
import { createSupabaseServerClient } from "@/lib/auth/server";

function passedCookieOptions(): unknown {
  const options = vi.mocked(createServerClient).mock.calls.at(-1)?.[2] as { cookieOptions?: unknown };
  return options.cookieOptions;
}

beforeEach(() => {
  vi.mocked(createServerClient).mockReset();
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: null, error: null }) },
  } as never);
  vi.mocked(cookies).mockResolvedValue({ getAll: () => [], set: vi.fn() } as never);
});

describe("sessionCookieOptions", () => {
  test.each([
    ["https", true],
    ["HTTPS", true],
    ["https:", true],
    ["https, http", true],
    ["http", false],
    ["http:", false],
    ["http, https", false],
    ["", false],
    [null, false],
    [undefined, false],
  ])("%j gives secure %j", (protocol, secure) => {
    expect(sessionCookieOptions(protocol)).toEqual({ secure });
  });
});

describe("createSupabaseServerClient", () => {
  test("sets Secure cookies for an HTTPS request", async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-forwarded-proto": "https" }) as never);
    await createSupabaseServerClient();
    expect(passedCookieOptions()).toEqual({ secure: true });
  });

  test("doesn't for plain HTTP or a missing header (localhost)", async () => {
    vi.mocked(headers).mockResolvedValue(new Headers({ "x-forwarded-proto": "http" }) as never);
    await createSupabaseServerClient();
    expect(passedCookieOptions()).toEqual({ secure: false });

    vi.mocked(headers).mockResolvedValue(new Headers() as never);
    await createSupabaseServerClient();
    expect(passedCookieOptions()).toEqual({ secure: false });
  });
});

describe("refreshSession (proxy)", () => {
  test("sets Secure cookies for an HTTPS URL", async () => {
    await refreshSession(new NextRequest("https://fintrack.example/budgets"));
    expect(passedCookieOptions()).toEqual({ secure: true });
  });

  test("uses x-forwarded-proto when present", async () => {
    await refreshSession(
      new NextRequest("http://localhost:3000/budgets", { headers: { "x-forwarded-proto": "https" } }),
    );
    expect(passedCookieOptions()).toEqual({ secure: true });
  });

  test("doesn't on http://localhost", async () => {
    await refreshSession(new NextRequest("http://localhost:3000/budgets"));
    expect(passedCookieOptions()).toEqual({ secure: false });
  });
});
