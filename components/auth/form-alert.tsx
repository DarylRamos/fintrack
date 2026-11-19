"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef } from "react";

// The form-level error (for example "Email or password is incorrect."). Announced to screen
// readers, and focused when it appears so keyboard users land on it.
export function FormAlert({ message }: { message: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) {
      ref.current?.focus();
    }
  }, [message]);

  if (!message) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="flex items-start gap-2 rounded-md border border-error px-3 py-2.5 text-sm text-error outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
