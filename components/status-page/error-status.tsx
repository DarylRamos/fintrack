"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import {
  errorDigest,
  StatusPage,
  statusPrimaryActionClass,
  statusSecondaryActionClass,
} from "./status-page";

// The content of app/error.tsx, app/global-error.tsx and app/(app)/error.tsx. It never shows the error's message or stack,
// only its digest. Nothing is logged in the browser: the server log already has the error under the
// same digest. See context/feature-specs/1.2b-http-error-pages.md.
export function ErrorStatus({
  error,
  retry,
  fullPageHomeLink = false,
  variant = "standalone",
}: {
  error: unknown;
  retry: () => void;
  // global-error replaces the root layout, so its home link is a full page load.
  fullPageHomeLink?: boolean;
  // Inside the app shell (app/(app)/error.tsx, unit 2.2).
  variant?: "standalone" | "in-shell";
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus the title when the page appears, so screen readers announce it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [error]);

  return (
    <>
      <title>Something went wrong | FinTrack</title>
      <StatusPage
        label="Error"
        title="Something went wrong"
        description="This page couldn't load. Try again, or go back to home."
        reference={errorDigest(error)}
        headingRef={headingRef}
        variant={variant}
        actions={
          <>
            <button type="button" onClick={() => retry()} className={statusPrimaryActionClass}>
              Try again
            </button>
            {fullPageHomeLink ? (
              // A full page load: the root layout itself failed.
              // eslint-disable-next-line @next/next/no-html-link-for-pages
              <a href="/" className={statusSecondaryActionClass}>
                Go to home
              </a>
            ) : (
              <Link href="/" className={statusSecondaryActionClass}>
                Go to home
              </Link>
            )}
          </>
        }
      />
    </>
  );
}
