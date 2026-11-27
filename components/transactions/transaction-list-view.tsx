import { Plus } from "lucide-react";
import Link from "next/link";

import { settingsPrimaryButtonClass } from "@/components/settings/styles";
import type { TransactionView } from "@/lib/db/transactions";
import { formatCalendarDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { signedAmount, TYPE_LABELS } from "./amount-text";
import { DoneStatus } from "./done-status";

// The Transactions list (unit 2.2): the user's most recent transactions, newest first, each row one
// link to its edit page. No hooks or data access, so it is render-tested directly; the page streams it
// in with the data. 2.4 replaces it with the full history table. See
// context/feature-specs/2.2-transaction-create-edit-delete.md, Pages and UI.

export const RECENT_TRANSACTIONS_LIMIT = 50;

const addButtonClass = cn(settingsPrimaryButtonClass, "w-full sm:w-auto");

function AddTransactionLink() {
  return (
    <Link href="/transactions/new" className={addButtonClass}>
      <Plus className="size-4" aria-hidden="true" />
      Add transaction
    </Link>
  );
}

function TransactionRow({ transaction }: { transaction: TransactionView }) {
  const amount = signedAmount(transaction);
  const date = formatCalendarDate(transaction.occurredOn);
  const type = TYPE_LABELS[transaction.type];

  return (
    <li>
      <Link
        href={`/transactions/${transaction.id}/edit`}
        aria-label={`${transaction.description}, ${type.toLowerCase()}, ${amount}, ${date}`}
        className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3 transition-colors duration-200 outline-none hover:bg-fill focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset motion-reduce:transition-none md:px-6"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-ink">{transaction.description}</span>
          <span className="text-xs text-ink-muted">
            {date} · {type}
          </span>
        </div>
        <span className="shrink-0 text-right text-sm font-medium whitespace-nowrap text-ink tabular-nums">{amount}</span>
      </Link>
    </li>
  );
}

export function TransactionListView({ items, hasMore }: { items: TransactionView[]; hasMore: boolean }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col">
        <DoneStatus className="[&:not(:empty)]:mb-4" />
        <section className="flex flex-col items-start gap-4 rounded-xl border border-line bg-surface p-4 md:p-6">
          <p className="text-sm text-ink">No transactions yet.</p>
          <AddTransactionLink />
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <DoneStatus className="[&:not(:empty)]:mt-3 sm:[&:not(:empty)]:mt-0" />
        <AddTransactionLink />
      </div>
      <section aria-labelledby="recent-transactions-heading" className="rounded-xl border border-line bg-surface">
        <h2 id="recent-transactions-heading" className="sr-only">
          Recent transactions
        </h2>
        <ul className="divide-y divide-line">
          {items.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </ul>
      </section>
      {hasMore ? (
        <p className="text-xs text-ink-muted">Showing your {RECENT_TRANSACTIONS_LIMIT} most recent transactions.</p>
      ) : null}
    </div>
  );
}
