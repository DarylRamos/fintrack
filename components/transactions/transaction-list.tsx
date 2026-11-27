import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { listRecentTransactions } from "@/lib/db/transactions";

import { RECENT_TRANSACTIONS_LIMIT, TransactionListView } from "./transaction-list-view";

// The Transactions page's content (unit 2.2), read at request time behind Suspense so the page shell
// stays static; the skeleton keeps the toolbar's and five rows' height.
async function RecentTransactions() {
  const user = await requireUser();
  const { items, hasMore } = await listRecentTransactions(user.userId, RECENT_TRANSACTIONS_LIMIT);
  return <TransactionListView items={items} hasMore={hasMore} />;
}

function TransactionListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex sm:justify-end">
        <Skeleton className="h-11 w-full rounded-lg sm:h-9 sm:w-40" />
      </div>
      <div className="divide-y divide-line rounded-xl border border-line bg-surface">
        {[0, 1, 2, 3, 4].map((index) => (
          <div key={index} className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 md:px-6">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function TransactionList() {
  return (
    <Suspense fallback={<TransactionListSkeleton />}>
      <RecentTransactions />
    </Suspense>
  );
}
