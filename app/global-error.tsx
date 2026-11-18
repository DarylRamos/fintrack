"use client"; // Error boundaries must be Client Components.

import { ErrorStatus } from "@/components/status-page/error-status";

import { fontVariables } from "./fonts";
import "./globals.css";

// Errors in the root layout itself. This replaces the root layout, so it renders its own document,
// styles and fonts. See context/feature-specs/1.2b-http-error-pages.md.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-page text-ink">
        <ErrorStatus error={error} retry={retry} fullPageHomeLink />
      </body>
    </html>
  );
}
