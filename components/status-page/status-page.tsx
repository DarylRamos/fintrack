import type { ReactNode, Ref } from "react";

import { primaryButtonClass } from "@/components/auth/styles";

// The shared layout of the 404 and error pages: a calm, centred column with the wordmark, a short
// label, the title, one sentence, the actions and an optional reference. The `in-shell` variant (unit
// 2.2, app/(app)/not-found.tsx and error.tsx) sits inside the app shell, which already has the wordmark
// and the <main> landmark, so it leaves out both and doesn't fill the viewport. No hooks, so Server and
// Client Components can both use it. See context/feature-specs/1.2b-http-error-pages.md and
// ui-context.md, Status Pages.

// Links and buttons share the auth forms' pill style (ui-context.md, Primary and Secondary buttons).
export const statusPrimaryActionClass = `inline-flex items-center justify-center text-sm outline-none ${primaryButtonClass}`;

export const statusSecondaryActionClass =
  "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-line bg-surface text-sm font-medium text-ink outline-none transition-colors duration-200 hover:bg-fill focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page motion-reduce:transition-none";

export function StatusPage({
  label,
  title,
  description,
  actions,
  reference,
  headingRef,
  variant = "standalone",
}: {
  label: string;
  title: string;
  description: string;
  actions: ReactNode;
  reference?: string | null;
  headingRef?: Ref<HTMLHeadingElement>;
  variant?: "standalone" | "in-shell";
}) {
  const inShell = variant === "in-shell";
  const Container = inShell ? "div" : "main";
  return (
    <Container
      className={
        inShell
          ? "flex flex-col items-center px-4 py-16 md:py-24"
          : "flex flex-1 flex-col items-center justify-center px-4 py-10 md:px-8"
      }
    >
      <div className="flex w-full max-w-80 flex-col gap-8 text-center">
        {inShell ? null : <p className="text-lg font-semibold text-ink">FinTrack</p>}
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-ink outline-none">
            {title}
          </h1>
          <p className="text-sm text-ink-muted">{description}</p>
        </header>
        <div className="flex flex-col gap-3">{actions}</div>
        {reference ? (
          <p className="font-mono text-xs break-all text-ink-muted">Reference: {reference}</p>
        ) : null}
      </div>
    </Container>
  );
}

// The error's digest, a hash that matches the server log entry. Only a non-empty string is used;
// nothing else from the error (its message or stack) is ever shown.
export function errorDigest(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("digest" in error)) {
    return null;
  }
  const { digest } = error;
  return typeof digest === "string" && digest.trim() !== "" ? digest : null;
}
