"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

// The status line after a change (unit 2.2, Question F). The transaction actions redirect to
// `/transactions?done=added|updated|deleted`; the message shows once, and the parameter is removed so
// a reload doesn't show it again (as /sign-in?error=google does). Any other value shows nothing. The
// live region is always rendered, so screen readers announce the message when it appears.

const MESSAGES: Record<string, string> = {
  added: "Transaction added.",
  updated: "Changes saved.",
  deleted: "Transaction deleted.",
};

function takeDone(): string | null {
  const url = new URL(window.location.href);
  const done = url.searchParams.get("done");
  if (done === null) {
    return null;
  }
  url.searchParams.delete("done");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return Object.hasOwn(MESSAGES, done) ? MESSAGES[done] : null;
}

// It takes no room while empty; `className` adds spacing that applies only once it shows a message.
export function DoneStatus({ className }: { className?: string }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const taken = takeDone();
    if (taken) {
      // A one-off read of the address bar after mount (an external system): the page shell is static,
      // so the server never sees the parameter, and it is removed as it is read.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(taken);
    }
  }, []);

  return (
    <p role="status" aria-live="polite" className={cn("flex items-center gap-1.5 text-sm text-ink-muted", className)}>
      {message ? (
        <>
          <Check className="size-4 text-success" aria-hidden="true" />
          {message}
        </>
      ) : null}
    </p>
  );
}
