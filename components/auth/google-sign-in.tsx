"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";

import { signInWithGoogle } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useAuthFormStatus, useReportBusy } from "./auth-form-status";
import { FormAlert } from "./form-alert";
import { GoogleLogo } from "./google-logo";
import { socialButtonClass } from "./styles";

// The "or continue with" divider and the round Google button on the sign-in and sign-up pages. The
// button shows only the Google "G"; its accessible name (and hover tooltip) is "Continue with Google",
// or "Redirecting to Google…" while pending. The form posts to the Server Action, so it works without
// JavaScript too (then without `next`). Errors go to the email form's alert through the shared status.
// See context/feature-specs/1.3-google-sign-in.md.
export function GoogleSignIn() {
  const [state, formAction, pending] = useActionState(signInWithGoogle, null);
  const status = useAuthFormStatus();
  const busy = useReportBusy(pending);
  const nextRef = useRef<HTMLInputElement>(null);
  const setAlert = status?.setAlert;
  const message = state?.error.message ?? null;
  const label = pending ? "Redirecting to Google…" : "Continue with Google";

  // The page stays static, so `next` (set by the proxy on /sign-in) is read from the address bar.
  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (nextRef.current && next) {
      nextRef.current.value = next;
    }
  }, []);

  // Each failed attempt returns a new result, so the alert is shown again even with the same text.
  useEffect(() => {
    if (state && setAlert) {
      setAlert(state.error.message);
    }
  }, [state, setAlert]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-ink-muted">or continue with</span>
        <Separator className="flex-1" />
      </div>
      <form
        action={formAction}
        onSubmit={() => setAlert?.(null)}
        className="flex flex-col gap-5"
      >
        {status ? null : <FormAlert message={message} />}
        <input ref={nextRef} type="hidden" name="next" defaultValue="" />
        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={busy}
            aria-disabled={busy}
            aria-label={label}
            title={label}
            className={socialButtonClass}
          >
            {pending ? (
              <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <GoogleLogo className="size-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
