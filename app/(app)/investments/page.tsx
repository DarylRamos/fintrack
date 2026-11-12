import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/app-shell/page-placeholder";

export const metadata: Metadata = {
  title: "Investments",
};

export default function InvestmentsPage() {
  return <PagePlaceholder href="/investments" />;
}
