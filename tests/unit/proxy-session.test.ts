import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

// @supabase/ssr is mocked, so no network call is made; `server-only` is never loaded.
vi.mock("server-only", () => ({}));
vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/auth/env", () => ({
  getSupabaseEnv: () => ({ url: "http://127.0.0.1:54321", publishableKey: "sb_publishable_test" }),
}));

import { createServerClient } from "@supabase/ssr";

import { redirectWithSession, refreshSession } from "@/lib/auth/proxy-session";

type SetAll = (
  cookies: { name: string; value: string; options: Record<string, unknown> }[],
  headers: Record<string, string>,
) => void;

const getClaims = vi.fn();
const getUser = vi.fn();
let setAll: SetAll;

const noCache = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};

beforeEach(() => {
  getClaims.mockReset();
  getUser.mockReset();
  getUser.mockResolvedValue({ data: { user: { factors: [] } }, error: null });
  vi.mocked(createServerClient).mockImplementation((_url, _key, options) => {
    setAll = (options as unknown as { cookies: { setAll: SetAll } }).cookies.setAll;
    return { auth: { getClaims, getUser } } as never;
  });
});

function request(path = "/budgets") {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe("refreshSession", () => {
  test("is signed in when getClaims returns claims and the user has no 2FA", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", aal: "aal1" } }, error: null });
    expect((await refreshSession(request())).state).toBe("signed-in");
  });

  test("is signed out when there are no claims, without asking for the user", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect((await refreshSession(request())).state).toBe("signed-out");
    expect(getUser).not.toHaveBeenCalled();
  });

  test("is signed out when getClaims fails (fails closed)", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("network") });
    expect((await refreshSession(request())).state).toBe("signed-out");
  });

  test("is signed out when the claims have no subject", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "" } }, error: null });
    expect((await refreshSession(request())).state).toBe("signed-out");
  });

  // Unit 1.4.
  test("an aal2 session is signed in with no call to Supabase", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", aal: "aal2" } }, error: null });
    expect((await refreshSession(request())).state).toBe("signed-in");
    expect(getUser).not.toHaveBeenCalled();
  });

  test("an aal1 session with a verified authenticator app needs its code", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", aal: "aal1" } }, error: null });
    getUser.mockResolvedValue({
      data: { user: { factors: [{ id: "f", factor_type: "totp", status: "verified" }] } },
      error: null,
    });
    expect((await refreshSession(request())).state).toBe("needs-2fa");
  });
});

describe("redirectWithSession", () => {
  test("is a same-origin 307 to the location", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const session = await refreshSession(request());
    const response = redirectWithSession(request(), session, "/sign-in?next=%2Fbudgets");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/sign-in?next=%2Fbudgets");
  });

  test("carries the refreshed session cookies and Supabase's no-cache headers", async () => {
    getClaims.mockImplementation(async () => {
      setAll([{ name: "sb-127-auth-token", value: "refreshed", options: { path: "/", httpOnly: true } }], noCache);
      return { data: { claims: { sub: "user-1" } }, error: null };
    });
    const session = await refreshSession(request("/"));
    const response = redirectWithSession(request("/"), session, "/dashboard");

    expect(response.cookies.get("sb-127-auth-token")?.value).toBe("refreshed");
    expect(response.headers.get("cache-control")).toBe(noCache["Cache-Control"]);
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
  });

  test("adds no session cookie or no-cache header when nothing was refreshed", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    const session = await refreshSession(request());
    const response = redirectWithSession(request(), session, "/sign-in");
    expect(response.cookies.getAll()).toEqual([]);
    expect(response.headers.get("pragma")).toBeNull();
  });
});
