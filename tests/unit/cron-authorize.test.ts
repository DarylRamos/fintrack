import { describe, expect, test } from "vitest";

import { authorizeCron } from "@/lib/cron/authorize";

const secret = "test-secret-0123456789";

describe("authorizeCron", () => {
  test("accepts the exact bearer token", () => {
    expect(authorizeCron(`Bearer ${secret}`, secret)).toBe("ok");
  });

  test.each([
    ["a missing header", null],
    ["a wrong secret", "Bearer wrong-secret-0123456789"],
    ["a secret of a different length", `Bearer ${secret}-longer`],
    ["no Bearer prefix", secret],
    ["a lowercase prefix", `bearer ${secret}`],
    ["an extra space", `Bearer  ${secret}`],
    ["a trailing space", `Bearer ${secret} `],
  ])("refuses %s", (_case, header) => {
    expect(authorizeCron(header, secret)).toBe("unauthorized");
  });

  test.each([
    ["unset", undefined],
    ["empty", ""],
  ])("is not configured when the secret is %s", (_case, value) => {
    expect(authorizeCron("Bearer ", value)).toBe("not-configured");
    expect(authorizeCron("Bearer undefined", value)).toBe("not-configured");
    expect(authorizeCron(null, value)).toBe("not-configured");
  });
});
