import { describe, expect, test } from "vitest";

import { mainNav, accountNav } from "@/components/app-shell/nav-items";
import { routeDecision, type RouteRequest } from "@/lib/auth/routes";

// Every row of the Route Rules table in context/feature-specs/1.2a-route-protection-session-helpers.md,
// in both states.

function decide(pathname: string, signedIn: boolean, extra: Partial<RouteRequest> = {}) {
  return routeDecision({ pathname, search: "", method: "GET", signedIn, ...extra });
}

const pass = { kind: "pass" };
const to = (location: string) => ({ kind: "redirect", location });

const appPages = [...mainNav, ...accountNav].map((item) => item.href);
const guestPages = ["/sign-in", "/sign-up", "/forgot-password"];
const openPages = ["/reset-password", "/check-email", "/auth-error"];
const passThrough = ["/auth/confirm", "/auth/callback", "/api/export/csv", "/api/cron/heartbeat"];

describe("/", () => {
  test("signed out goes to sign-in", () => {
    expect(decide("/", false)).toEqual(to("/sign-in"));
  });

  test("signed in goes to the dashboard", () => {
    expect(decide("/", true)).toEqual(to("/dashboard"));
  });
});

describe("guest pages", () => {
  test.each(guestPages)("%s is shown when signed out", (path) => {
    expect(decide(path, false)).toEqual(pass);
  });

  test.each(guestPages)("%s goes to the dashboard when signed in", (path) => {
    expect(decide(path, true)).toEqual(to("/dashboard"));
  });

  test("a signed-in visit with a safe next goes there", () => {
    expect(decide("/sign-in", true, { search: "?next=%2Fbudgets%3Fmonth%3D2026-11" })).toEqual(
      to("/budgets?month=2026-11"),
    );
  });

  test.each(["?next=%2F%2Fevil.example", "?next=https%3A%2F%2Fevil.example", "?next=%2Fsign-in", "?next="])(
    "a signed-in visit with an unsafe next (%s) goes to the dashboard",
    (search) => {
      expect(decide("/sign-in", true, { search })).toEqual(to("/dashboard"));
    },
  );
});

describe("open pages and passed-through paths", () => {
  test.each([...openPages, ...passThrough])("%s passes when signed out", (path) => {
    expect(decide(path, false)).toEqual(pass);
  });

  test.each([...openPages, ...passThrough])("%s passes when signed in", (path) => {
    expect(decide(path, true)).toEqual(pass);
  });
});

describe("protected pages", () => {
  test.each(appPages)("%s redirects to sign-in with next when signed out", (path) => {
    expect(decide(path, false)).toEqual(to(`/sign-in?next=${encodeURIComponent(path)}`));
  });

  test.each(appPages)("%s is shown when signed in", (path) => {
    expect(decide(path, true)).toEqual(pass);
  });

  test("next keeps the query, encoded", () => {
    expect(decide("/budgets", false, { search: "?month=2026-11&tag=a b" })).toEqual(
      to("/sign-in?next=%2Fbudgets%3Fmonth%3D2026-11%26tag%3Da%20b"),
    );
  });

  test("an unknown path is protected too (default deny)", () => {
    expect(decide("/no-such-page", false)).toEqual(to("/sign-in?next=%2Fno-such-page"));
    expect(decide("/no-such-page", true)).toEqual(pass);
  });

  test("a path that only starts like a public one is protected", () => {
    expect(decide("/sign-in-later", false)).toEqual(to("/sign-in?next=%2Fsign-in-later"));
    expect(decide("/authority", false)).toEqual(to("/sign-in?next=%2Fauthority"));
  });
});

describe("methods", () => {
  test("HEAD follows the same rules as GET", () => {
    expect(decide("/budgets", false, { method: "HEAD" })).toEqual(to("/sign-in?next=%2Fbudgets"));
  });

  test.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("%s is never redirected", (method) => {
    expect(decide("/dashboard", false, { method })).toEqual(pass);
    expect(decide("/", false, { method })).toEqual(pass);
    expect(decide("/sign-in", true, { method })).toEqual(pass);
  });
});
