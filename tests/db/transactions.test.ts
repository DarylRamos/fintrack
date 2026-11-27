import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import {
  type CategoryRefused,
  createTransaction as createOrRefuse,
  deleteTransaction,
  getTransaction,
  listRecentTransactions,
  type TransactionView,
  updateTransaction,
} from "@/lib/db/transactions";
import type { TransactionValues } from "@/lib/validation/transaction";

// The transactions data layer on CI's throwaway Postgres (unit 2.2), including the cross-user access
// test (success criterion 9). It goes through lib/db/transactions.ts, never Prisma Client directly; raw
// SQL (pg) is used only to check the table's own constraints and stored values. Fresh random user IDs
// keep it independent of other runs. See context/feature-specs/2.2-transaction-create-edit-delete.md.

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

function values(overrides: Partial<TransactionValues> = {}): TransactionValues {
  return {
    type: "expense",
    amount: "45.50",
    currency: "SGD",
    occurredOn: "2026-11-20",
    description: "Groceries",
    categoryId: null,
    tags: [],
    ...overrides,
  };
}

// What these values read back as, with no category and no tags (unit 2.3's fields; categories and tags
// have their own tests in categories-tags.test.ts).
function view(input: TransactionValues): Omit<TransactionView, "id"> {
  const { type, amount, currency, occurredOn, description, tags } = input;
  return { type, amount, currency, occurredOn, description, category: null, tags };
}

// Creation can refuse a category (unit 2.3); these tests use none, so a refusal is a failure.
async function createTransaction(userId: string, input: TransactionValues): Promise<TransactionView> {
  const result: TransactionView | CategoryRefused = await createOrRefuse(userId, input);
  if ("error" in result) {
    throw new Error("The category was refused.");
  }
  return result;
}

async function storedRow(id: string) {
  const result = await client.query<{ amount: string; occurred_on: string; user_id: string }>(
    "select amount::text as amount, occurred_on::text as occurred_on, user_id::text as user_id from transactions where id = $1",
    [id],
  );
  return result.rows[0];
}

describe("create, read, update and delete", () => {
  test("a created transaction reads back exactly, with canonical amounts", async () => {
    const userId = randomUUID();
    const created = await createTransaction(userId, values());
    expect(created).toEqual({ id: expect.any(String), ...view(values()) });
    expect(await getTransaction(userId, created.id)).toEqual(created);
    expect(await storedRow(created.id)).toEqual({ amount: "45.5000", occurred_on: "2026-11-20", user_id: userId });

    const jpy = await createTransaction(userId, values({ type: "income", amount: "1500", currency: "JPY" }));
    expect(jpy.amount).toBe("1500");
    const large = await createTransaction(userId, values({ amount: "999999999999.99" }));
    expect(large.amount).toBe("999999999999.99");
  });

  test("dates round-trip unchanged at the year's edges and on 29 Feb", async () => {
    const userId = randomUUID();
    for (const occurredOn of ["2000-01-01", "2026-12-31", "2028-02-29"]) {
      const created = await createTransaction(userId, values({ occurredOn }));
      expect(created.occurredOn).toBe(occurredOn);
      expect((await getTransaction(userId, created.id))?.occurredOn).toBe(occurredOn);
      expect((await storedRow(created.id)).occurred_on).toBe(occurredOn);
    }
  });

  test("the list is newest first, then by entry within a day, and reports more", async () => {
    const userId = randomUUID();
    const older = await createTransaction(userId, values({ occurredOn: "2026-11-01", description: "Older" }));
    const first = await createTransaction(userId, values({ occurredOn: "2026-11-15", description: "First" }));
    // created_at has millisecond precision; keep the two entries apart so their order is certain.
    await new Promise((resolve) => setTimeout(resolve, 10));
    const second = await createTransaction(userId, values({ occurredOn: "2026-11-15", description: "Second" }));

    const all = await listRecentTransactions(userId, 10);
    expect(all.items.map((item) => item.id)).toEqual([second.id, first.id, older.id]);
    expect(all.hasMore).toBe(false);

    const limited = await listRecentTransactions(userId, 2);
    expect(limited.items.map((item) => item.id)).toEqual([second.id, first.id]);
    expect(limited.hasMore).toBe(true);
  });

  test("update changes the row and returns it; delete removes it", async () => {
    const userId = randomUUID();
    const created = await createTransaction(userId, values());
    const changed = values({ type: "income", amount: "2000", currency: "JPY", occurredOn: "2026-10-01", description: "Fee" });

    expect(await updateTransaction(userId, created.id, changed)).toEqual({ id: created.id, ...view(changed) });
    expect(await getTransaction(userId, created.id)).toEqual({ id: created.id, ...view(changed) });

    expect(await deleteTransaction(userId, created.id)).toBe(true);
    expect(await getTransaction(userId, created.id)).toBeNull();
    expect(await deleteTransaction(userId, created.id)).toBe(false);
    expect(await updateTransaction(userId, created.id, changed)).toBeNull();
  });

  test("a missing ID reads as null", async () => {
    expect(await getTransaction(randomUUID(), randomUUID())).toBeNull();
  });
});

describe("one user never sees, changes or deletes another user's transactions", () => {
  test("user B can't reach user A's transaction in any way", async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const mine = await createTransaction(userA, values({ description: "User A's rent" }));

    expect((await listRecentTransactions(userB, 50)).items).toEqual([]);
    expect(await getTransaction(userB, mine.id)).toBeNull();

    expect(await updateTransaction(userB, mine.id, values({ amount: "1.00", description: "Changed by B" }))).toBeNull();
    expect(await getTransaction(userA, mine.id)).toEqual(mine);

    expect(await deleteTransaction(userB, mine.id)).toBe(false);
    expect(await getTransaction(userA, mine.id)).toEqual(mine);

    await createTransaction(userB, values({ description: "User B's lunch" }));
    expect((await listRecentTransactions(userA, 50)).items).toEqual([mine]);
    expect((await storedRow(mine.id)).user_id).toBe(userA);
  });
});

describe("the table's own checks", () => {
  async function insert(amount: string, currency: string, description: string) {
    return client.query(
      `insert into transactions (user_id, type, amount, currency, occurred_on, description, updated_at)
       values ($1, 'expense', $2, $3, '2026-11-20', $4, now())`,
      [randomUUID(), amount, currency, description],
    );
  }

  test.each([["0"], ["-5"], ["1000000000000"]])("refuse the amount %s", async (amount) => {
    await expect(insert(amount, "SGD", "x")).rejects.toMatchObject({ constraint: "transactions_amount_range" });
  });

  test("refuse a currency code that isn't three upper-case letters", async () => {
    await expect(insert("1", "sgd", "x")).rejects.toMatchObject({ constraint: "transactions_currency_format" });
  });

  test("refuse a blank description", async () => {
    await expect(insert("1", "SGD", "   ")).rejects.toMatchObject({
      constraint: "transactions_description_not_blank",
    });
  });

  test("refuse a type outside the enum", async () => {
    await expect(
      client.query(
        `insert into transactions (user_id, type, amount, currency, occurred_on, description, updated_at)
         values ($1, 'transfer', 1, 'SGD', '2026-11-20', 'x', now())`,
        [randomUUID()],
      ),
    ).rejects.toMatchObject({ code: "22P02" });
  });
});
