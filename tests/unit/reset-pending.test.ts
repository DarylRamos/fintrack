import { NextRequest } from "next/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

// `cookies()` is mocked with a small store, and `server-only` is never loaded.
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { cookies } from "next/headers";

import {
  clearResetPending,
  hasResetPending,
  markResetPending,
  RESET_PENDING_COOKIE,
  RESET_PENDING_MAX_AGE,
} from "@/lib/auth/reset-pending";

const store = { set: vi.fn(), delete: vi.fn() };

beforeEach(() => {
  store.set.mockReset();
  store.delete.mockReset();
  vi.mocked(cookies).mockResolvedValue(store as never);
});

describe("reset-pending cookie", () => {
  test("lasts as long as Supabase's 1-hour email link", () => {
    expect(RESET_PENDING_MAX_AGE).toBe(3600);
  });

  test.each([true, false])("markResetPending sets an HttpOnly, Lax, site-wide cookie (secure: %s)", async (secure) => {
    await markResetPending({ secure });
    expect(store.set).toHaveBeenCalledWith({
      name: RESET_PENDING_COOKIE,
      value: "1",
      maxAge: 3600,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure,
    });
  });

  test("clearResetPending deletes the cookie on the same path", async () => {
    await clearResetPending();
    expect(store.delete).toHaveBeenCalledWith({ name: RESET_PENDING_COOKIE, path: "/" });
  });

  test.each([
    ["present", `${RESET_PENDING_COOKIE}=1`, true],
    ["missing", undefined, false],
    ["another value", `${RESET_PENDING_COOKIE}=true`, false],
    ["empty", `${RESET_PENDING_COOKIE}=`, false],
    ["a different cookie", "other=1", false],
  ])("hasResetPending: %s", (_case, cookie, expected) => {
    const request = new NextRequest(
      "http://localhost:3000/auth/confirm",
      cookie ? { headers: { cookie } } : undefined,
    );
    expect(hasResetPending(request)).toBe(expected);
  });
});
