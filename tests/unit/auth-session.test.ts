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
import { requireUser } from "@/lib/auth/session";

const getClaims = vi.fn();

beforeEach(() => {
  getClaims.mockReset();
  vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth: { getClaims } } as never);
});

describe("requireUser", () => {
  test("returns the signed-in user", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", email: "owner@example.com" } }, error: null });
    await expect(requireUser()).resolves.toEqual({ userId: "user-1", email: "owner@example.com" });
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
