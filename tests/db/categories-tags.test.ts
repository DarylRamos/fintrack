import { randomUUID } from "node:crypto";

import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { STARTER_CATEGORIES } from "@/lib/categories/starter";
import { listCategories } from "@/lib/db/categories";
import { listTagNames } from "@/lib/db/tags";
import {
  createTransaction as createOrRefuse,
  deleteTransaction,
  getTransaction,
  type TransactionView,
  updateTransaction,
} from "@/lib/db/transactions";
import type { TransactionType, TransactionValues } from "@/lib/validation/transaction";

// Categories and tags on CI's throwaway Postgres (unit 2.3): the starter set, tags created and removed by
// use, and the cross-user tests (success criterion 9), both through the data layer and against the
// database's own foreign keys in raw SQL (pg). Fresh random user IDs keep it independent of other runs.
// See context/feature-specs/2.3-categories-and-tags.md, Tests.

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
    amount: "12.00",
    currency: "SGD",
    occurredOn: "2026-11-20",
    description: "Lunch",
    categoryId: null,
    tags: [],
    ...overrides,
  };
}

async function createTransaction(userId: string, input: TransactionValues): Promise<TransactionView> {
  const result = await createOrRefuse(userId, input);
  if ("error" in result) {
    throw new Error("The category was refused.");
  }
  return result;
}

async function categoryId(userId: string, type: TransactionType, name: string): Promise<string> {
  const found = (await listCategories(userId)).find((category) => category.type === type && category.name === name);
  if (!found) {
    throw new Error(`No ${type} category named ${name}.`);
  }
  return found.id;
}

async function count(table: "categories" | "tags" | "transaction_tags", userId: string): Promise<number> {
  const result = await client.query<{ n: string }>(`select count(*)::text as n from ${table} where user_id = $1`, [
    userId,
  ]);
  return Number(result.rows[0].n);
}

describe("categories", () => {
  test("the first read seeds the starter set once, sorted with Other last", async () => {
    const userId = randomUUID();
    const first = await listCategories(userId);
    const expected = STARTER_CATEGORIES.expense.length + STARTER_CATEGORIES.income.length;
    expect(first).toHaveLength(expected);
    expect(await listCategories(userId)).toEqual(first);
    expect(await count("categories", userId)).toBe(expected);

    const expenses = first.filter((category) => category.type === "expense").map((category) => category.name);
    expect(expenses.at(-1)).toBe("Other");
    expect(expenses).toContain("Groceries");
  });

  test("two reads at once still give one set", async () => {
    const userId = randomUUID();
    const [a, b] = await Promise.all([listCategories(userId), listCategories(userId)]);
    expect(a).toHaveLength(b.length);
    expect(await count("categories", userId)).toBe(STARTER_CATEGORIES.expense.length + STARTER_CATEGORIES.income.length);
  });

  test("a transaction keeps a category of its own type, and can drop it", async () => {
    const userId = randomUUID();
    const groceries = await categoryId(userId, "expense", "Groceries");
    const created = await createTransaction(userId, values({ categoryId: groceries }));
    expect(created.category).toEqual({ id: groceries, name: "Groceries" });
    expect((await getTransaction(userId, created.id))?.category).toEqual({ id: groceries, name: "Groceries" });

    const salary = await categoryId(userId, "income", "Salary");
    const changed = await updateTransaction(userId, created.id, values({ type: "income", categoryId: salary }));
    expect(changed).toMatchObject({ type: "income", category: { id: salary, name: "Salary" } });

    expect(await updateTransaction(userId, created.id, values({ categoryId: null }))).toMatchObject({ category: null });
  });

  test("a category of the other type is refused, and nothing is written", async () => {
    const userId = randomUUID();
    const salary = await categoryId(userId, "income", "Salary");
    expect(await createOrRefuse(userId, values({ type: "expense", categoryId: salary, tags: ["refused"] }))).toEqual({
      error: "category",
    });
    expect(await count("tags", userId)).toBe(0);

    const created = await createTransaction(userId, values());
    expect(await updateTransaction(userId, created.id, values({ categoryId: salary }))).toEqual({ error: "category" });
    expect((await getTransaction(userId, created.id))?.category).toBeNull();
  });
});

describe("tags", () => {
  test("saving creates tags, matched ignoring case and keeping the first spelling", async () => {
    const userId = randomUUID();
    const first = await createTransaction(userId, values({ tags: ["Work", "travel"] }));
    expect(first.tags).toEqual(["travel", "Work"]);

    const second = await createTransaction(userId, values({ tags: ["work"] }));
    expect(second.tags).toEqual(["Work"]);
    expect(await listTagNames(userId)).toEqual(["travel", "Work"]);
    expect(await count("tags", userId)).toBe(2);
  });

  test("_ and % in a name are plain characters, not wildcards", async () => {
    const userId = randomUUID();
    await createTransaction(userId, values({ tags: ["50%_off"] }));
    const other = await createTransaction(userId, values({ tags: ["50xyoff"] }));
    expect(other.tags).toEqual(["50xyoff"]);
    expect(await listTagNames(userId)).toEqual(["50%_off", "50xyoff"]);
  });

  test("replacing tags updates the links, and a tag nothing uses any more is deleted", async () => {
    const userId = randomUUID();
    const a = await createTransaction(userId, values({ tags: ["weekly", "family"] }));
    const b = await createTransaction(userId, values({ tags: ["weekly"] }));

    expect(await updateTransaction(userId, a.id, values({ tags: ["weekly"] }))).toMatchObject({ tags: ["weekly"] });
    expect(await listTagNames(userId)).toEqual(["weekly"]);

    // Deleting a transaction removes its links, but keeps tags another transaction uses.
    expect(await deleteTransaction(userId, a.id)).toBe(true);
    expect(await listTagNames(userId)).toEqual(["weekly"]);
    expect(await count("transaction_tags", userId)).toBe(1);

    expect(await deleteTransaction(userId, b.id)).toBe(true);
    expect(await listTagNames(userId)).toEqual([]);
    expect(await count("transaction_tags", userId)).toBe(0);
  });

  test("an update of a missing transaction creates no tags", async () => {
    const userId = randomUUID();
    expect(await updateTransaction(userId, randomUUID(), values({ tags: ["ghost"] }))).toBeNull();
    expect(await count("tags", userId)).toBe(0);
  });
});

describe("one user never reaches another user's categories or tags", () => {
  test("through the data layer", async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const aGroceries = await categoryId(userA, "expense", "Groceries");
    const mine = await createTransaction(userA, values({ categoryId: aGroceries, tags: ["food", "secret-a"] }));

    // B can't use A's category.
    expect(await createOrRefuse(userB, values({ categoryId: aGroceries }))).toEqual({ error: "category" });

    // B's "food" is B's own tag, and B's suggestions never include A's tags.
    const theirs = await createTransaction(userB, values({ tags: ["FOOD"] }));
    expect(theirs.tags).toEqual(["FOOD"]);
    expect(await listTagNames(userB)).toEqual(["FOOD"]);
    expect(await listTagNames(userA)).toEqual(["food", "secret-a"]);

    // B's update and delete of A's transaction change nothing of A's.
    expect(await updateTransaction(userB, mine.id, values({ tags: [] }))).toBeNull();
    expect(await deleteTransaction(userB, mine.id)).toBe(false);
    expect(await getTransaction(userA, mine.id)).toEqual(mine);
    expect(await listTagNames(userA)).toEqual(["food", "secret-a"]);

    // B's own categories are a separate set.
    expect(await categoryId(userB, "expense", "Groceries")).not.toBe(aGroceries);
  });

  test("the database's own foreign keys refuse cross-user and cross-type links", async () => {
    const userA = randomUUID();
    const userB = randomUUID();
    const aGroceries = await categoryId(userA, "expense", "Groceries");
    const aSalary = await categoryId(userA, "income", "Salary");
    const insertTransaction = (userId: string, type: TransactionType, category: string | null) =>
      client.query<{ id: string }>(
        `insert into transactions (user_id, type, amount, currency, occurred_on, description, updated_at, category_id)
         values ($1, $2, 1, 'SGD', '2026-11-20', 'x', now(), $3) returning id`,
        [userId, type, category],
      );

    const fkey = { code: "23503", constraint: "transactions_category_id_user_id_type_fkey" };
    await expect(insertTransaction(userB, "expense", aGroceries)).rejects.toMatchObject(fkey);
    await expect(insertTransaction(userA, "expense", aSalary)).rejects.toMatchObject(fkey);
    // Changing the type away from the category's is refused too.
    const own = (await insertTransaction(userA, "expense", aGroceries)).rows[0].id;
    await expect(client.query("update transactions set type = 'income' where id = $1", [own])).rejects.toMatchObject(fkey);

    // A link can only join a transaction and a tag of the same user.
    const bTag = (
      await client.query<{ id: string }>("insert into tags (user_id, name) values ($1, 'b-tag') returning id", [userB])
    ).rows[0].id;
    await expect(
      client.query("insert into transaction_tags (transaction_id, tag_id, user_id) values ($1, $2, $3)", [own, bTag, userA]),
    ).rejects.toMatchObject({ code: "23503", constraint: "transaction_tags_tag_id_user_id_fkey" });
    await expect(
      client.query("insert into transaction_tags (transaction_id, tag_id, user_id) values ($1, $2, $3)", [own, bTag, userB]),
    ).rejects.toMatchObject({ code: "23503", constraint: "transaction_tags_transaction_id_user_id_fkey" });
  });
});

describe("the tables' own checks", () => {
  test("refuse blank names", async () => {
    await expect(
      client.query("insert into categories (user_id, type, name, updated_at) values ($1, 'expense', '  ', now())", [
        randomUUID(),
      ]),
    ).rejects.toMatchObject({ constraint: "categories_name_not_blank" });
    await expect(client.query("insert into tags (user_id, name) values ($1, ' ')", [randomUUID()])).rejects.toMatchObject({
      constraint: "tags_name_not_blank",
    });
  });

  test("refuse a second name that differs only in case", async () => {
    const userId = randomUUID();
    await client.query("insert into tags (user_id, name) values ($1, 'Work')", [userId]);
    await expect(client.query("insert into tags (user_id, name) values ($1, 'WORK')", [userId])).rejects.toMatchObject({
      code: "23505",
      constraint: "tags_user_id_name_key",
    });
    // Another user may use the same name.
    await client.query("insert into tags (user_id, name) values ($1, 'work')", [randomUUID()]);

    await client.query("insert into categories (user_id, type, name, updated_at) values ($1, 'expense', 'Pets', now())", [
      userId,
    ]);
    await expect(
      client.query("insert into categories (user_id, type, name, updated_at) values ($1, 'expense', 'PETS', now())", [
        userId,
      ]),
    ).rejects.toMatchObject({ code: "23505", constraint: "categories_user_id_type_name_key" });
    // The same name for the other type is a different category.
    await client.query("insert into categories (user_id, type, name, updated_at) values ($1, 'income', 'Pets', now())", [
      userId,
    ]);
  });
});
