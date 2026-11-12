import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/app-shell/page-placeholder";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return <PagePlaceholder href="/transactions" />;
}
