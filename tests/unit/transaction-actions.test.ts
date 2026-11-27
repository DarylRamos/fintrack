import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// The session helper, the data layer and Next's redirect are mocked, so no database is touched and
// `server-only` is never loaded. `redirect` throws in Next.js; the mock throws a marker the same way.
// See context/feature-specs/2.2-transaction-create-edit-delete.md, Server Actions.
vi.mock("@/lib/auth/session", () => ({ getSignedInUser: vi.fn() }));
vi.mock("@/lib/db/transactions", () => ({
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectMarker(url);
  }),
}));

class RedirectMarker extends Error {
  constructor(readonly url: string) {
    super("redirect");
  }
}

import { createTransaction, deleteTransaction, updateTransaction } from "@/app/(app)/transactions/actions";
import { getSignedInUser } from "@/lib/auth/session";
import * as data from "@/lib/db/transactions";

const user = { userId: "1b4e28ba-2fa1-41d2-883f-0016d3cca427", email: "owner@example.com", aal: "aal2" as const };
const id = "7d444840-9dc0-41c8-8f38-8a7b1e2f4a10";
const valid = {
  type: "expense",
  amount: "45",
  currency: "SGD",
  occurredOn: "2026-11-20",
  description: "Secret groceries 9f2c",
};
const saved = { id, type: "expense", amount: "45.00", currency: "SGD", occurredOn: "2026-11-20", description: "x" } as const;

function logged(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

async function redirectOf(promise: Promise<unknown>): Promise<string> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(RedirectMarker);
  return (error as RedirectMarker).url;
}

function dbError(): Error {
  // Prisma errors carry a P#### code; the message can hold values, which must never be logged.
  return Object.assign(new Error("insert failed for Secret groceries 9f2c 45.00 owner@example.com"), {
    name: "PrismaClientKnownRequestError",
    code: "P1001",
  });
}

beforeEach(() => {
  vi.mocked(getSignedInUser).mockReset().mockResolvedValue(user);
  vi.mocked(data.createTransaction).mockReset().mockResolvedValue(saved);
  vi.mocked(data.updateTransaction).mockReset().mockResolvedValue(saved);
  vi.mocked(data.deleteTransaction).mockReset().mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const notSignedIn = { error: { code: "NOT_SIGNED_IN", message: "Your session has ended. Sign in again." } };
const notFound = { error: { code: "NOT_FOUND", message: "This transaction no longer exists." } };

describe("createTransaction", () => {
  test("refuses a browser without a finished session (signed out, or 2FA owed)", async () => {
    vi.mocked(getSignedInUser).mockResolvedValue(null);
    expect(await createTransaction(valid)).toEqual(notSignedIn);
    expect(data.createTransaction).not.toHaveBeenCalled();
  });

  test("refuses invalid input with field errors, and saves nothing", async () => {
    expect(await createTransaction({ ...valid, amount: "12.345", description: "" })).toEqual({
      error: {
        code: "INVALID_INPUT",
        message: "Check the highlighted fields.",
        fieldErrors: {
          amount: ["SGD amounts have at most 2 decimal places."],
          description: ["Enter a description."],
        },
      },
    });
    expect(data.createTransaction).not.toHaveBeenCalled();
  });

  test("saves for the session's user only, with canonical values, then goes to the list", async () => {
    const url = await redirectOf(createTransaction({ ...valid, id: "x", userId: "someone-else" }));
    expect(url).toBe("/transactions?done=added");
    expect(data.createTransaction).toHaveBeenCalledWith(user.userId, {
      type: "expense",
      amount: "45.00",
      currency: "SGD",
      occurredOn: "2026-11-20",
      description: "Secret groceries 9f2c",
    });
  });

  test("a failed save returns SAVE_FAILED and logs only the error's name and code", async () => {
    vi.mocked(data.createTransaction).mockRejectedValue(dbError());
    expect(await createTransaction(valid)).toEqual({
      error: { code: "SAVE_FAILED", message: "Couldn't save this transaction. Try again." },
    });
    expect(logged()).toContain("[transactions] createTransaction failed: PrismaClientKnownRequestError (P1001)");
    for (const secret of ["Secret groceries", "45.00", "owner@example.com", user.userId]) {
      expect(logged()).not.toContain(secret);
    }
  });
});

describe("updateTransaction", () => {
  test("refuses a browser without a finished session", async () => {
    vi.mocked(getSignedInUser).mockResolvedValue(null);
    expect(await updateTransaction(id, valid)).toEqual(notSignedIn);
    expect(data.updateTransaction).not.toHaveBeenCalled();
  });

  test.each([["not-a-uuid"], [""], [undefined], [42]])("a malformed ID (%j) is NOT_FOUND, with no query", async (bad) => {
    expect(await updateTransaction(bad, valid)).toEqual(notFound);
    expect(data.updateTransaction).not.toHaveBeenCalled();
  });

  test("refuses invalid input", async () => {
    const result = await updateTransaction(id, { ...valid, type: "transfer" });
    expect(result).toMatchObject({ error: { code: "INVALID_INPUT", fieldErrors: { type: ["Choose income or expense."] } } });
    expect(data.updateTransaction).not.toHaveBeenCalled();
  });

  test("a missing or other user's transaction is NOT_FOUND", async () => {
    vi.mocked(data.updateTransaction).mockResolvedValue(null);
    expect(await updateTransaction(id, valid)).toEqual(notFound);
  });

  test("updates for the session's user, then goes to the list", async () => {
    expect(await redirectOf(updateTransaction(id, valid))).toBe("/transactions?done=updated");
    expect(data.updateTransaction).toHaveBeenCalledWith(user.userId, id, expect.objectContaining({ amount: "45.00" }));
  });

  test("a failed update returns SAVE_FAILED with safe logging", async () => {
    vi.mocked(data.updateTransaction).mockRejectedValue(dbError());
    expect(await updateTransaction(id, valid)).toMatchObject({ error: { code: "SAVE_FAILED" } });
    expect(logged()).toContain("[transactions] updateTransaction failed: PrismaClientKnownRequestError (P1001)");
    expect(logged()).not.toContain(id);
  });
});

describe("deleteTransaction", () => {
  test("refuses a browser without a finished session", async () => {
    vi.mocked(getSignedInUser).mockResolvedValue(null);
    expect(await deleteTransaction(id)).toEqual(notSignedIn);
    expect(data.deleteTransaction).not.toHaveBeenCalled();
  });

  test("a malformed ID is NOT_FOUND, with no query", async () => {
    expect(await deleteTransaction("1; drop table transactions")).toEqual(notFound);
    expect(data.deleteTransaction).not.toHaveBeenCalled();
  });

  test("a missing or other user's transaction is NOT_FOUND", async () => {
    vi.mocked(data.deleteTransaction).mockResolvedValue(false);
    expect(await deleteTransaction(id)).toEqual(notFound);
  });

  test("deletes for the session's user, then goes to the list", async () => {
    expect(await redirectOf(deleteTransaction(id))).toBe("/transactions?done=deleted");
    expect(data.deleteTransaction).toHaveBeenCalledWith(user.userId, id);
  });

  test("a failed delete returns DELETE_FAILED with safe logging", async () => {
    vi.mocked(data.deleteTransaction).mockRejectedValue(new TypeError("boom 45.00"));
    expect(await deleteTransaction(id)).toEqual({
      error: { code: "DELETE_FAILED", message: "Couldn't delete this transaction. Try again." },
    });
    expect(logged()).toContain("[transactions] deleteTransaction failed: TypeError (none)");
    expect(logged()).not.toContain("45.00");
  });
});
