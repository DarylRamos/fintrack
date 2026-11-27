import { afterEach, describe, expect, test, vi } from "vitest";

import { failure, logActionError } from "@/lib/actions/result";

// The result shape and safe logging shared by the data Server Actions (unit 2.2). See
// context/feature-specs/2.2-transaction-create-edit-delete.md, Server Actions.

afterEach(() => {
  vi.restoreAllMocks();
});

describe("failure", () => {
  test("builds the error shape, with field errors only when given", () => {
    expect(failure("SAVE_FAILED", "Try again.")).toEqual({ error: { code: "SAVE_FAILED", message: "Try again." } });
    expect(failure("INVALID_INPUT", "Check.", { amount: ["Enter an amount."] })).toEqual({
      error: { code: "INVALID_INPUT", message: "Check.", fieldErrors: { amount: ["Enter an amount."] } },
    });
  });
});

describe("logActionError", () => {
  function logOf(error: unknown): string {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logActionError("scope", "doThing", error);
    return JSON.stringify(spy.mock.calls);
  }

  test("logs the error's name and a Prisma code, never its message", () => {
    const error = Object.assign(new Error("password=hunter2 amount 45.00"), {
      name: "PrismaClientKnownRequestError",
      code: "P2002",
    });
    const log = logOf(error);
    expect(log).toContain("[scope] doThing failed: PrismaClientKnownRequestError (P2002)");
    expect(log).not.toContain("hunter2");
    expect(log).not.toContain("45.00");
  });

  test("ignores a code that isn't a Prisma code, and non-Error values", () => {
    expect(logOf(Object.assign(new Error("x"), { code: "secret-value" }))).toContain("Error (none)");
    expect(logOf("a string with 45.00")).toContain("UnknownError (none)");
    expect(logOf(null)).toContain("UnknownError (none)");
  });
});
