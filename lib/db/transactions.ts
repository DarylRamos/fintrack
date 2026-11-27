import "server-only";

import { currencyDecimals, isSupportedCurrency } from "@/lib/money/currencies";
import type { TransactionType, TransactionValues } from "@/lib/validation/transaction";

import { db, type TxClient } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { deleteUnusedTags, resolveTags } from "./tags";

// The only code that touches the `transactions` table (unit 2.2) and, since unit 2.3, its tag links in
// `transaction_tags`, which only change as part of a transaction's save. Every query filters on
// `userId`, which always comes from the verified session, never from input (invariant 3); single-row
// reads and writes filter on `id` and `userId` together, so another user's row looks exactly like a
// missing one. A save with tags (the row, its tags and links) is one database transaction. Whether the
// category is the user's own, of the transaction's type, is the composite foreign key's check
// (transactions_category_id_user_id_type_fkey): its violation is the refusal, so no read is needed.
// Each round trip counts (about 300ms from a laptop to the pooler), so the work is kept to a few.
// Returns plain strings, never Prisma objects. Not cached (invariant 9). See
// context/feature-specs/2.2-transaction-create-edit-delete.md and 2.3-categories-and-tags.md.

export interface TransactionView {
  id: string;
  type: TransactionType;
  // Unit 2.1's canonical string, with the currency's decimal places ("1234.50", "1500").
  amount: string;
  currency: string;
  // The calendar date, YYYY-MM-DD.
  occurredOn: string;
  description: string;
  // Unit 2.3: optional (Question C).
  category: { id: string; name: string } | null;
  // Unit 2.3: the tag names, sorted ignoring case.
  tags: string[];
}

export interface RecentTransactions {
  items: TransactionView[];
  // More rows exist beyond `limit`.
  hasMore: boolean;
}

// The category isn't one of the user's of the transaction's type (missing, another user's, or the
// other type). Nothing was written.
export interface CategoryRefused {
  error: "category";
}

const CATEGORY_REFUSED: CategoryRefused = { error: "category" };

// Prisma's foreign-key error. The category foreign key is the only one on `transactions`, so on a write
// to that table it means the category was refused.
function isForeignKeyError(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === "P2003";
}

// Thrown out of a database transaction when the row's category is refused, so the transaction rolls back
// and the caller returns CATEGORY_REFUSED.
class CategoryRefusedSignal extends Error {}

async function refusingCategory<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    throw isForeignKeyError(error) ? new CategoryRefusedSignal() : error;
  }
}

async function orRefused<T>(work: () => Promise<T>): Promise<T | CategoryRefused> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof CategoryRefusedSignal) {
      return CATEGORY_REFUSED;
    }
    throw error;
  }
}

// Interactive transactions time out after 5 seconds by default; a save from a laptop takes a few round
// trips of about 300ms each, so allow more. On Vercel, next to the database, it takes milliseconds.
const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 };

const viewFields = {
  id: true,
  type: true,
  amount: true,
  currency: true,
  occurredOn: true,
  description: true,
  category: { select: { id: true, name: true } },
  tags: { select: { tag: { select: { name: true } } } },
} as const satisfies Prisma.TransactionSelect;

type TransactionRow = Prisma.TransactionGetPayload<{ select: typeof viewFields }>;

function toView(row: TransactionRow): TransactionView {
  // A code no longer in the list (only if the list shrinks) keeps 2 decimal places; editing the
  // transaction then asks for a supported currency.
  const decimals = isSupportedCurrency(row.currency) ? currencyDecimals(row.currency) : 2;
  return {
    id: row.id,
    type: row.type,
    amount: row.amount.toFixed(decimals),
    currency: row.currency,
    occurredOn: row.occurredOn.toISOString().slice(0, 10),
    description: row.description,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    tags: row.tags.map((link) => link.tag.name).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
  };
}

// A calendar date is written as that day's UTC midnight and read back as the UTC date, so no time zone
// ever shifts it by a day.
function toDbDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function toDbData(input: TransactionValues) {
  return {
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    occurredOn: toDbDate(input.occurredOn),
    description: input.description,
    categoryId: input.categoryId,
  };
}

// Links the transaction to these names' tags, creating new tags.
async function linkTags(tx: TxClient, userId: string, transactionId: string, names: readonly string[]) {
  const tagIds = await resolveTags(tx, userId, names);
  if (tagIds.length > 0) {
    await tx.transactionTag.createMany({ data: tagIds.map((tagId) => ({ transactionId, tagId, userId })) });
  }
}

async function readView(tx: TxClient, userId: string, id: string): Promise<TransactionView> {
  return toView(await tx.transaction.findFirstOrThrow({ where: { id, userId }, select: viewFields }));
}

// The user's most recent transactions: latest date first, then the newest entry within a day.
export async function listRecentTransactions(userId: string, limit: number): Promise<RecentTransactions> {
  const rows = await db.transaction.findMany({
    where: { userId },
    orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: viewFields,
  });
  return { items: rows.slice(0, limit).map(toView), hasMore: rows.length > limit };
}

// One of the user's transactions, or null when it is missing or belongs to someone else.
export async function getTransaction(userId: string, id: string): Promise<TransactionView | null> {
  const row = await db.transaction.findFirst({ where: { id, userId }, select: viewFields });
  return row ? toView(row) : null;
}

// A new transaction can't leave a tag unused, so there's no clean-up. With no tags it is one query.
export async function createTransaction(
  userId: string,
  input: TransactionValues,
): Promise<TransactionView | CategoryRefused> {
  const data = { userId, ...toDbData(input) };
  if (input.tags.length === 0) {
    return orRefused(async () => toView(await refusingCategory(() => db.transaction.create({ data, select: viewFields }))));
  }
  return orRefused(() =>
    db.$transaction(async (tx) => {
      const { id } = await refusingCategory(() => tx.transaction.create({ data, select: { id: true } }));
      await linkTags(tx, userId, id, input.tags);
      return readView(tx, userId, id);
    }, TRANSACTION_OPTIONS),
  );
}

// Updates one of the user's transactions and returns it, or null when it is missing or someone else's.
// The row is written before any tag work, so a missing row creates no tags.
export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionValues,
): Promise<TransactionView | CategoryRefused | null> {
  return orRefused(() =>
    db.$transaction(async (tx) => {
      const { count } = await refusingCategory(() =>
        tx.transaction.updateMany({ where: { id, userId }, data: toDbData(input) }),
      );
      if (count === 0) {
        return null;
      }
      await tx.transactionTag.deleteMany({ where: { transactionId: id, userId } });
      await linkTags(tx, userId, id, input.tags);
      await deleteUnusedTags(tx, userId);
      return readView(tx, userId, id);
    }, TRANSACTION_OPTIONS),
  );
}

// Deletes one of the user's transactions (its tag links go with it, by cascade) and any tags it leaves
// unused. False when it is missing or someone else's.
export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const { count } = await tx.transaction.deleteMany({ where: { id, userId } });
    if (count === 0) {
      return false;
    }
    await deleteUnusedTags(tx, userId);
    return true;
  }, TRANSACTION_OPTIONS);
}
