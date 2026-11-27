import "server-only";

import { currencyDecimals, isSupportedCurrency } from "@/lib/money/currencies";
import type { TransactionType, TransactionValues } from "@/lib/validation/transaction";

import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";

// The only code that touches the `transactions` table (unit 2.2). Every query filters on `userId`,
// which always comes from the verified session, never from input (invariant 3); single-row reads and
// writes filter on `id` and `userId` together, so another user's row looks exactly like a missing one.
// Returns plain strings, never Prisma objects. Not cached (invariant 9). See
// context/feature-specs/2.2-transaction-create-edit-delete.md, Data Layer.

export interface TransactionView {
  id: string;
  type: TransactionType;
  // Unit 2.1's canonical string, with the currency's decimal places ("1234.50", "1500").
  amount: string;
  currency: string;
  // The calendar date, YYYY-MM-DD.
  occurredOn: string;
  description: string;
}

export interface RecentTransactions {
  items: TransactionView[];
  // More rows exist beyond `limit`.
  hasMore: boolean;
}

const viewFields = {
  id: true,
  type: true,
  amount: true,
  currency: true,
  occurredOn: true,
  description: true,
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
  };
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

export async function createTransaction(userId: string, input: TransactionValues): Promise<TransactionView> {
  const row = await db.transaction.create({ data: { userId, ...toDbData(input) }, select: viewFields });
  return toView(row);
}

// Updates one of the user's transactions and returns it, or null when it is missing or someone else's.
// One statement: `update` accepts the non-unique `userId` beside `id`, and reports a missing row as P2025.
export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionValues,
): Promise<TransactionView | null> {
  try {
    const row = await db.transaction.update({ where: { id, userId }, data: toDbData(input), select: viewFields });
    return toView(row);
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === "P2025") {
      return null;
    }
    throw error;
  }
}

// Deletes one of the user's transactions. False when it is missing or someone else's.
export async function deleteTransaction(userId: string, id: string): Promise<boolean> {
  const { count } = await db.transaction.deleteMany({ where: { id, userId } });
  return count === 1;
}
