import type { Metadata } from "next";
import Link from "next/link";

import { StatusPage, statusPrimaryActionClass } from "@/components/status-page/status-page";

export const metadata: Metadata = {
  title: "Page not found",
};

// Unmatched URLs and notFound() calls. "Go to home" links to `/`, which the proxy sends to the
// dashboard or to sign-in, so this page never reads the session. See
// context/feature-specs/1.2b-http-error-pages.md.
export default function NotFound() {
  return (
    <StatusPage
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
