import { describe, expect, test } from "vitest";

import { findRlsProblems } from "../db/rls-check";

// Proves the database RLS test can fail, without creating a bad table anywhere.

describe("findRlsProblems", () => {
  test("reports nothing when every table has RLS on and there are no policies", () => {
    expect(findRlsProblems([{ table: "_prisma_migrations", rlsEnabled: true }], [])).toEqual([]);
  });

  test("names a table with RLS off", () => {
    expect(
      findRlsProblems(
        [
          { table: "_prisma_migrations", rlsEnabled: true },
          { table: "transactions", rlsEnabled: false },
        ],
        [],
      ),
    ).toEqual(["RLS is off on public.transactions."]);
  });

  test("names any policy", () => {
    expect(
      findRlsProblems(
        [{ table: "transactions", rlsEnabled: true }],
        [{ table: "transactions", policy: "allow_all" }],
      ),
    ).toEqual(["public.transactions has a policy, allow_all. App tables have none."]);
  });

  test("fails on an empty schema, so the check can't pass by finding nothing", () => {
    expect(findRlsProblems([], [])).toEqual([
      "The public schema has no tables, so RLS can't be checked.",
    ]);
  });
});
