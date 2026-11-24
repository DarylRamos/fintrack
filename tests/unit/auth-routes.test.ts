import { describe, expect, test } from "vitest";

import { mainNav, accountNav } from "@/components/app-shell/nav-items";
import type { SessionState } from "@/lib/auth/assurance";
import { routeDecision, type RouteRequest } from "@/lib/auth/routes";

// Every row of the Route Rules tables in context/feature-specs/1.2a-route-protection-session-helpers.md
// and context/feature-specs/1.4-authenticator-app-2fa.md, in all three states.

function decide(pathname: string, state: SessionState, extra: Partial<RouteRequest> = {}) {
  return routeDecision({ pathname, search: "", method: "GET", state, ...extra });
}

const pass = { kind: "pass" };
const to = (location: string) => ({ kind: "redirect", location });

const appPages = [...mainNav, ...accountNav].map((item) => item.href);
const guestPages = ["/sign-in", "/sign-up", "/forgot-password"];
const passThrough = ["/auth/confirm", "/auth/callback", "/api/export/csv", "/api/cron/heartbeat"];
const states: SessionState[] = ["signed-out", "needs-2fa", "signed-in"];

describe("/", () => {
  test("signed out goes to sign-in", () => {
    expect(decide("/", "signed-out")).toEqual(to("/sign-in"));
  });

  test("a session that owes its code goes to the 2FA step", () => {
    expect(decide("/", "needs-2fa")).toEqual(to("/two-factor"));
  });

  test("signed in goes to the dashboard", () => {
    expect(decide("/", "signed-in")).toEqual(to("/dashboard"));
  });
});

describe("guest pages", () => {
  test.each(guestPages)("%s is shown when signed out", (path) => {
    expect(decide(path, "signed-out")).toEqual(pass);
  });

  test.each(guestPages)("%s goes to the dashboard when signed in", (path) => {
    expect(decide(path, "signed-in")).toEqual(to("/dashboard"));
  });

  test.each(guestPages)("%s goes to the 2FA step when the code is owed", (path) => {
    expect(decide(path, "needs-2fa")).toEqual(to("/two-factor"));
  });

  test("a signed-in visit with a safe next goes there", () => {
    expect(decide("/sign-in", "signed-in", { search: "?next=%2Fbudgets%3Fmonth%3D2026-11" })).toEqual(
      to("/budgets?month=2026-11"),
    );
  });

  test("a needs-2fa visit with a safe next keeps it for after the code", () => {
    expect(decide("/sign-in", "needs-2fa", { search: "?next=%2Fbudgets" })).toEqual(to("/two-factor?next=%2Fbudgets"));
  });

  test.each(["?next=%2F%2Fevil.example", "?next=https%3A%2F%2Fevil.example", "?next=%2Fsign-in", "?next="])(
    "an unsafe next (%s) goes to the dashboard, or a plain 2FA step",
    (search) => {
      expect(decide("/sign-in", "signed-in", { search })).toEqual(to("/dashboard"));
      expect(decide("/sign-in", "needs-2fa", { search })).toEqual(to("/two-factor"));
    },
  );
});

describe("/two-factor (unit 1.4)", () => {
  test("signed out goes to sign-in", () => {
    expect(decide("/two-factor", "signed-out", { search: "?next=%2Fbudgets" })).toEqual(to("/sign-in"));
  });

  test("is shown while the code is owed", () => {
    expect(decide("/two-factor", "needs-2fa", { search: "?next=%2Fbudgets" })).toEqual(pass);
  });

  test("signed in continues to a safe next, the reset page, or the dashboard", () => {
    expect(decide("/two-factor", "signed-in", { search: "?next=%2Fbudgets" })).toEqual(to("/budgets"));
    expect(decide("/two-factor", "signed-in", { search: "?next=%2Freset-password" })).toEqual(to("/reset-password"));
    expect(decide("/two-factor", "signed-in")).toEqual(to("/dashboard"));
    expect(decide("/two-factor", "signed-in", { search: "?next=%2F%2Fevil.example" })).toEqual(to("/dashboard"));
    expect(decide("/two-factor", "signed-in", { search: "?next=%2Ftwo-factor" })).toEqual(to("/dashboard"));
  });
});

describe("open pages", () => {
  test.each(states)("/reset-password: %s", (state) => {
    const expected = state === "needs-2fa" ? to("/two-factor?next=%2Freset-password") : pass;
    expect(decide("/reset-password", state)).toEqual(expected);
  });

  test.each(["/check-email", "/auth-error"])("%s passes in every state", (path) => {
    for (const state of states) {
      expect(decide(path, state)).toEqual(pass);
    }
  });
});

describe("passed-through paths", () => {
  test.each(passThrough)("%s passes in every state", (path) => {
    for (const state of states) {
      expect(decide(path, state)).toEqual(pass);
    }
  });
});

describe("protected pages", () => {
  test.each(appPages)("%s redirects to sign-in with next when signed out", (path) => {
    expect(decide(path, "signed-out")).toEqual(to(`/sign-in?next=${encodeURIComponent(path)}`));
  });

  test.each(appPages)("%s redirects to the 2FA step with next when the code is owed", (path) => {
    expect(decide(path, "needs-2fa")).toEqual(to(`/two-factor?next=${encodeURIComponent(path)}`));
  });

  test.each(appPages)("%s is shown when signed in", (path) => {
    expect(decide(path, "signed-in")).toEqual(pass);
  });

  test("next keeps the query, encoded", () => {
    expect(decide("/budgets", "signed-out", { search: "?month=2026-11&tag=a b" })).toEqual(
      to("/sign-in?next=%2Fbudgets%3Fmonth%3D2026-11%26tag%3Da%20b"),
    );
    expect(decide("/budgets", "needs-2fa", { search: "?month=2026-11" })).toEqual(
      to("/two-factor?next=%2Fbudgets%3Fmonth%3D2026-11"),
    );
  });

  test("an unknown path is protected too (default deny)", () => {
    expect(decide("/no-such-page", "signed-out")).toEqual(to("/sign-in?next=%2Fno-such-page"));
    expect(decide("/no-such-page", "needs-2fa")).toEqual(to("/two-factor?next=%2Fno-such-page"));
    expect(decide("/no-such-page", "signed-in")).toEqual(pass);
  });

  test("a path that only starts like a public one is protected", () => {
    expect(decide("/sign-in-later", "signed-out")).toEqual(to("/sign-in?next=%2Fsign-in-later"));
    expect(decide("/authority", "signed-out")).toEqual(to("/sign-in?next=%2Fauthority"));
    expect(decide("/two-factor-extra", "needs-2fa")).toEqual(to("/two-factor?next=%2Ftwo-factor-extra"));
  });
});

describe("methods", () => {
  test("HEAD follows the same rules as GET", () => {
    expect(decide("/budgets", "signed-out", { method: "HEAD" })).toEqual(to("/sign-in?next=%2Fbudgets"));
    expect(decide("/budgets", "needs-2fa", { method: "HEAD" })).toEqual(to("/two-factor?next=%2Fbudgets"));
  });

  test.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("%s is never redirected, in any state", (method) => {
    for (const state of states) {
      expect(decide("/dashboard", state, { method })).toEqual(pass);
      expect(decide("/", state, { method })).toEqual(pass);
      expect(decide("/sign-in", state, { method })).toEqual(pass);
      expect(decide("/two-factor", state, { method })).toEqual(pass);
    }
  });
});
