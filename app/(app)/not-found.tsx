import type { Metadata } from "next";
import Link from "next/link";

import { StatusPage, statusPrimaryActionClass } from "@/components/status-page/status-page";

export const metadata: Metadata = {
  title: "Page not found",
};

// notFound() inside an app page, such as a missing or another user's transaction (unit 2.2): the 404
// content inside the app shell, so the sidebar stays. Unmatched URLs still get the standalone
// app/not-found.tsx. See context/feature-specs/2.2-transaction-create-edit-delete.md.
export default function AppNotFound() {
  return (
    <StatusPage
      variant="in-shell"
      label="Error 404"
      title="Page not found"
      description="The page you're looking for doesn't exist or may have moved."
      actions={
        <Link href="/" className={statusPrimaryActionClass}>
          Go to home
        </Link>
      }
    />
  );
}
