"use client"; // Error boundaries must be Client Components.

import { ErrorStatus } from "@/components/status-page/error-status";

// Errors thrown while rendering any page or nested layout. `retry` re-fetches and re-renders the
// segment. See context/feature-specs/1.2b-http-error-pages.md.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorStatus error={error} retry={retry} />;
}
