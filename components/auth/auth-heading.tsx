import type { ReactNode } from "react";

// The heading and one line of text at the top of each auth page.
export function AuthHeading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      <p className="text-sm text-ink-muted">{children}</p>
    </header>
  );
}
