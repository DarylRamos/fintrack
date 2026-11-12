import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/app-shell/page-placeholder";

export const metadata: Metadata = {
  title: "Debts",
};

export default function DebtsPage() {
  return <PagePlaceholder href="/debts" />;
}
