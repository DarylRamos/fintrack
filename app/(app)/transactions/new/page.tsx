import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { NewTransactionCard } from "@/components/transactions/transaction-form-card";

export const metadata: Metadata = {
  title: "Add transaction",
};

// Adding a transaction (unit 2.2). See context/feature-specs/2.2-transaction-create-edit-delete.md.
export default function NewTransactionPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Add transaction" parent={{ title: "Transactions", href: "/transactions" }} />
      <NewTransactionCard />
    </div>
  );
}
