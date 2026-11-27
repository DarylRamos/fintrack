import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { EditTransactionCard } from "@/components/transactions/transaction-form-card";

export const metadata: Metadata = {
  title: "Edit transaction",
};

// Changing or deleting one of the user's transactions (unit 2.2). The ID is runtime data under Cache
// Components, so it is read inside the card's Suspense boundary. See
// context/feature-specs/2.2-transaction-create-edit-delete.md.
export default function EditTransactionPage({ params }: PageProps<"/transactions/[id]/edit">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Edit transaction" parent={{ title: "Transactions", href: "/transactions" }} />
      <EditTransactionCard params={params} />
    </div>
  );
}
