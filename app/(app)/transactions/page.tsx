import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { TransactionList } from "@/components/transactions/transaction-list";

export const metadata: Metadata = {
  title: "Transactions",
};

// The user's most recent transactions, with Add transaction (unit 2.2). See
// context/feature-specs/2.2-transaction-create-edit-delete.md.
export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Transactions" />
      <TransactionList />
    </div>
  );
}
