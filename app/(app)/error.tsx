"use client"; // Error boundaries must be Client Components.

import { ErrorStatus } from "@/components/status-page/error-status";

// Errors thrown while rendering an app page (unit 2.2): the error content inside the app shell, with
// the digest only. `retry` re-fetches and re-renders the segment. See
// context/feature-specs/2.2-transaction-create-edit-delete.md.
export default function AppErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorStatus error={error} retry={retry} variant="in-shell" />;
}
