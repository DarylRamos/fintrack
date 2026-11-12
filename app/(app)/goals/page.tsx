import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/app-shell/page-placeholder";

export const metadata: Metadata = {
  title: "Goals",
};

export default function GoalsPage() {
  return <PagePlaceholder href="/goals" />;
}
