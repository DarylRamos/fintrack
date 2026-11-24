"use client";

import { Check, Copy, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  cancelTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  startTwoFactorSetup,
  type TwoFactorSetup,
} from "@/app/(app)/settings/actions";
import { FormAlert } from "@/components/auth/form-alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { settingsDangerButtonClass, settingsOutlineButtonClass, settingsPrimaryButtonClass } from "./styles";
import { TwoFactorCodeForm } from "./two-factor-code-form";

// The "Two-factor authentication" row of Settings → Security (unit 1.4): off, setting up (QR code,
// setup key, code), or on (with a turn-off dialog that asks for a current code). The setup key is
// held only in this component's state; it is never part of the page's server render. See
// context/feature-specs/1.4-authenticator-app-2fa.md, Flows and UI.

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function groupKey(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export function TwoFactorSection({ enabled, addedAt }: { enabled: boolean; addedAt: string | null }) {
  const router = useRouter();
  // The state just set here, until the refresh brings the server's state (and the date) back in.
  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, startStarting] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const isOn = !setup && (localEnabled ?? enabled);

  function start() {
    setError(null);
    startStarting(async () => {
      const result = await startTwoFactorSetup();
      if ("error" in result) {
        setError(result.error.message);
        if (result.error.code === "TWO_FACTOR_ALREADY_ON") {
          router.refresh();
        }
        return;
      }
      setSetup(result.data);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium text-ink">Two-factor authentication</h3>
            <span
              className={
                isOn
                  ? "rounded-md bg-inverse px-2 py-0.5 text-xs font-medium text-on-inverse"
                  : "rounded-md bg-fill px-2 py-0.5 text-xs font-medium text-ink"
              }
            >
              {isOn ? "On" : "Off"}
            </span>
          </div>
          <p className="text-sm text-ink-muted">Ask for a code from an authenticator app every time you sign in.</p>
          {isOn && addedAt ? (
            <p className="text-xs text-ink-muted">
              Added{" "}
              <time dateTime={addedAt} suppressHydrationWarning>
                {dateFormat.format(new Date(addedAt))}
              </time>
            </p>
          ) : null}
        </div>
        {!isOn && !setup ? (
          <button
            type="button"
            onClick={start}
            disabled={starting}
            aria-disabled={starting}
            className={`${settingsPrimaryButtonClass} shrink-0 self-start`}
          >
            {starting ? (
              <>
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                Setting up…
              </>
            ) : (
              "Set up"
            )}
          </button>
        ) : null}
        {isOn ? (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={`${settingsDangerButtonClass} shrink-0 self-start`}
          >
            Turn off
          </button>
        ) : null}
      </div>

      <FormAlert message={error} />

      {setup ? (
        <SetupPanel
          setup={setup}
          onDone={() => {
            setSetup(null);
            setLocalEnabled(true);
            router.refresh();
          }}
          onCancelled={() => {
            setSetup(null);
            setLocalEnabled(false);
          }}
        />
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Turn off two-factor authentication?</DialogTitle>
            <DialogDescription>
              Enter a current code from your authenticator app. Signing in will then need only your password or
              Google.
            </DialogDescription>
          </DialogHeader>
          <TwoFactorCodeForm
            id="disable-code"
            submitLabel="Turn off"
            pendingLabel="Turning off…"
            submitClassName={settingsDangerButtonClass}
            alignEnd
            onCode={async (code) => {
              const result = await disableTwoFactor({ code });
              if ("error" in result) {
                return result;
              }
              setDialogOpen(false);
              setLocalEnabled(false);
              router.refresh();
              return undefined;
            }}
            secondary={(pending) => (
              <DialogFooter className="contents">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setDialogOpen(false)}
                  className={settingsOutlineButtonClass}
                >
                  Cancel
                </button>
              </DialogFooter>
            )}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SetupPanel({
  setup,
  onDone,
  onCancelled,
}: {
  setup: TwoFactorSetup;
  onDone: () => void;
  onCancelled: () => void;
}) {
  const [cancelling, startCancelling] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus into the new panel, so keyboard and screen reader users start at step 1.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  function cancel() {
    setCancelError(null);
    startCancelling(async () => {
      const result = await cancelTwoFactorSetup({ factorId: setup.factorId });
      if ("error" in result) {
        setCancelError(result.error.message);
        return;
      }
      onCancelled();
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-line p-4 md:p-6">
      <h4 ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-ink outline-none">
        Set up your authenticator app
      </h4>
      <FormAlert message={cancelError} />
      <ol className="flex max-w-md flex-col gap-6">
        <li className="flex flex-col gap-3">
          <p className="text-sm text-ink">
            <span className="font-medium">1.</span> Scan this QR code with your authenticator app.
          </p>
          {/* QR codes need dark modules on a light background to scan, so this tile is white in
              both modes (ui-context.md, Colors: exceptions). */}
          <div className="self-start rounded-lg bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data: URL; next/image adds nothing here */}
            <img
              src={setup.qrCode}
              alt="QR code for setting up your authenticator app"
              width={176}
              height={176}
              className="size-44"
            />
          </div>
          <SetupKey secret={setup.secret} />
        </li>
        <li className="flex flex-col gap-3">
          <p className="text-sm text-ink">
            <span className="font-medium">2.</span> Enter the 6-digit code your app shows for FinTrack.
          </p>
          <TwoFactorCodeForm
            id="setup-code"
            submitLabel="Turn on"
            pendingLabel="Turning on…"
            submitClassName={settingsPrimaryButtonClass}
            onCode={async (code) => {
              const result = await confirmTwoFactorSetup({ factorId: setup.factorId, code });
              if ("error" in result) {
                return result;
              }
              onDone();
              return undefined;
            }}
            secondary={(pending) => (
              <button
                type="button"
                onClick={cancel}
                disabled={pending || cancelling}
                aria-disabled={pending || cancelling}
                className={settingsOutlineButtonClass}
              >
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            )}
          />
        </li>
      </ol>
    </div>
  );
}

function SetupKey({ secret }: { secret: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access refused: the key is still selectable on the page.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-muted">Can&apos;t scan it? Enter this setup key instead:</p>
      <div className="flex items-center gap-2">
        <code
          data-testid="setup-key"
          className="min-w-0 flex-1 rounded-md bg-fill px-3 py-2.5 font-mono text-sm break-all text-ink select-all"
        >
          {groupKey(secret)}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy setup key"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line sm:size-9 bg-surface text-ink transition-colors duration-200 hover:bg-fill focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none motion-reduce:transition-none"
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copied ? "Setup key copied" : ""}
      </p>
    </div>
  );
}
