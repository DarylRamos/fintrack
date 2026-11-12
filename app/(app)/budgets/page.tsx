import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/app-shell/page-placeholder";

export const metadata: Metadata = {
  title: "Budgets",
};

export default function BudgetsPage() {
  return <PagePlaceholder href="/budgets" />;
}
