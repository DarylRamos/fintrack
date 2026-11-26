import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { getProfile, saveProfile } from "@/lib/db/profiles";

// The profiles data layer on CI's throwaway Postgres (unit 1.5), including the first cross-user
// access test (success criterion 9). It goes through lib/db/profiles.ts, never Prisma Client
// directly; raw SQL (pg) is used only to check the table's own constraints. Fresh random user IDs keep
// it independent of other runs. See context/feature-specs/1.5-profile-and-preferred-currency.md.

// Next.js handles `server-only` in its build; outside it, the import needs a stub (vi.mock is hoisted
// above the imports).
vi.mock("server-only", () => ({}));

const client = new Client({ connectionString: process.env.DIRECT_URL });

beforeAll(async () => {
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

async function rowsFor(userId: string) {
  const result = await client.query<{ display_name: string | null; preferred_currency: string }>(
    "select display_name, preferred_currency from profiles where id = $1",
    [userId],
  );
  return result.rows;
}

describe("getProfile and saveProfile", () => {
  test("a user who never saved gets the defaults, and reading creates no row", async () => {
    const userId = randomUUID();
    expect(await getProfile(userId)).toEqual({ displayName: null, preferredCurrency: "USD" });
    expect(await rowsFor(userId)).toEqual([]);
  });

  test("the first save creates the row; later saves update the same row", async () => {
    const userId = randomUUID();
    expect(await saveProfile(userId, { displayName: "Ada", preferredCurrency: "SGD" })).toEqual({
      displayName: "Ada",
      preferredCurrency: "SGD",
    });
    await saveProfile(userId, { displayName: null, preferredCurrency: "EUR" });

    expect(await getProfile(userId)).toEqual({ displayName: null, preferredCurrency: "EUR" });
    expect(await rowsFor(userId)).toEqual([{ display_name: null, preferred_currency: "EUR" }]);
  });

  test("one user never sees or changes another user's profile", async () => {
    const userA = randomUUID();
    const userB = randomUUID();

    await saveProfile(userA, { displayName: "User A", preferredCurrency: "JPY" });
    expect(await getProfile(userB)).toEqual({ displayName: null, preferredCurrency: "USD" });

    await saveProfile(userB, { displayName: "User B", preferredCurrency: "GBP" });
    expect(await getProfile(userA)).toEqual({ displayName: "User A", preferredCurrency: "JPY" });
    expect(await getProfile(userB)).toEqual({ displayName: "User B", preferredCurrency: "GBP" });
    expect(await rowsFor(userA)).toEqual([{ display_name: "User A", preferred_currency: "JPY" }]);
  });

  test("a stored code that left the list reads as the default", async () => {
    const userId = randomUUID();
    await client.query(
      "insert into profiles (id, display_name, preferred_currency, updated_at) values ($1, null, 'BGN', now())",
      [userId],
    );
    expect(await getProfile(userId)).toEqual({ displayName: null, preferredCurrency: "USD" });
  });
});

describe("the table's own checks", () => {
  test("refuse a currency code that isn't three upper-case letters", async () => {
    await expect(
      client.query("insert into profiles (id, preferred_currency, updated_at) values ($1, 'usd', now())", [
        randomUUID(),
      ]),
    ).rejects.toMatchObject({ constraint: "profiles_preferred_currency_format" });
  });

  test("refuse a blank display name", async () => {
    await expect(
      client.query(
        "insert into profiles (id, display_name, preferred_currency, updated_at) values ($1, '   ', 'USD', now())",
        [randomUUID()],
      ),
    ).rejects.toMatchObject({ constraint: "profiles_display_name_not_blank" });
  });

  test("refuse a name longer than 50 characters", async () => {
    await expect(
      client.query(
        "insert into profiles (id, display_name, preferred_currency, updated_at) values ($1, $2, 'USD', now())",
        [randomUUID(), "a".repeat(51)],
      ),
    ).rejects.toMatchObject({ code: "22001" });
  });
});
