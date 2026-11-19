"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from "react";

// Shared by the email form and the Google button on the sign-in and sign-up pages: while either is
// working, both are disabled, and both report errors in the form's one alert. Pages without a
// provider (forgot and reset password) keep each form's own state. See
// context/feature-specs/1.3-google-sign-in.md, UI.

interface AuthFormStatus {
  busy: boolean;
  setBusy: (id: string, pending: boolean) => void;
  alert: string | null;
  setAlert: (message: string | null) => void;
}

const AuthFormStatusContext = createContext<AuthFormStatus | null>(null);

export function AuthFormStatusProvider({ children }: { children: ReactNode }) {
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(() => new Set());
  const [alert, setAlert] = useState<string | null>(null);

  const setBusy = useCallback((id: string, pending: boolean) => {
    setBusyIds((current) => {
      if (current.has(id) === pending) {
        return current;
      }
      const next = new Set(current);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const value = useMemo(() => ({ busy: busyIds.size > 0, setBusy, alert, setAlert }), [busyIds, setBusy, alert]);

  return <AuthFormStatusContext.Provider value={value}>{children}</AuthFormStatusContext.Provider>;
}

export function useAuthFormStatus(): AuthFormStatus | null {
  return useContext(AuthFormStatusContext);
}

// Reports this part's pending state to the shared status, if there is one, and returns whether
// anything on the page is working.
export function useReportBusy(pending: boolean): boolean {
  const status = useAuthFormStatus();
  const id = useId();
  const setBusy = status?.setBusy;

  useEffect(() => {
    if (!setBusy) {
      return;
    }
    setBusy(id, pending);
    return () => setBusy(id, false);
  }, [setBusy, id, pending]);

  return pending || (status?.busy ?? false);
}
