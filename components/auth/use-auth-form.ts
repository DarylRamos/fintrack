"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import type { z } from "zod";

import { useAuthFormStatus, useReportBusy } from "./auth-form-status";

// What the hook reads from a failed action: auth actions' results, and app data actions' (such as
// the Profile form's, unit 1.5), which have their own codes.
export interface FormActionResult {
  error: { code: string; message: string; fieldErrors?: Record<string, string[] | undefined> };
}

// Wires a Zod schema, React Hook Form and an auth Server Action together. The schema runs in the
// browser and again in the action. On success the action redirects; on failure its field errors go
// under the fields and its message into the form alert.
//
// Fields are first checked on submit, then again as the user types. They are never checked on
// blur: an error appearing then grows the vertically centred form, which shifts every link and
// button under the pointer between mouse down and mouse up, so the click misses (unit 1.1a's
// "Forgot password?" needed two clicks).
//
// On the sign-in and sign-up pages the alert and the busy state are shared with the Google button
// (auth-form-status.tsx); `busy` is true while either is working.
export function useAuthForm<TInput extends FieldValues, TOutput extends FieldValues>(
  schema: z.ZodType<TOutput, TInput>,
  // Nothing (undefined) means success for a caller that doesn't redirect (Settings, unit 1.4).
  action: (input: unknown) => Promise<FormActionResult | undefined>,
  defaultValues: DefaultValues<TInput>,
) {
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const status = useAuthFormStatus();
  const [localError, setLocalError] = useState<string | null>(null);
  const formError = status ? status.alert : localError;
  const setFormError = status ? status.setAlert : setLocalError;
  const [pending, startTransition] = useTransition();
  const busy = useReportBusy(pending);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await action(values);
      if (!result?.error) {
        return;
      }
      for (const [field, messages] of Object.entries(result.error.fieldErrors ?? {})) {
        if (messages?.[0]) {
          form.setError(field as Path<TInput>, { message: messages[0] });
        }
      }
      setFormError(result.error.message);
    });
  });

  return { form, formError, setFormError, pending, busy, onSubmit };
}
