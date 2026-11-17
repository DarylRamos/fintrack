"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, type DefaultValues, type FieldValues, type Path } from "react-hook-form";
import type { z } from "zod";

import type { AuthActionResult } from "@/lib/auth/errors";

// Wires a Zod schema, React Hook Form and an auth Server Action together. The schema runs in the
// browser and again in the action. On success the action redirects; on failure its field errors go
// under the fields and its message into the form alert.
//
// Fields are first checked on submit, then again as the user types. They are never checked on
// blur: an error appearing then grows the vertically centred form, which shifts every link and
// button under the pointer between mouse down and mouse up, so the click misses (unit 1.1a's
// "Forgot password?" needed two clicks).
export function useAuthForm<TInput extends FieldValues, TOutput extends FieldValues>(
  schema: z.ZodType<TOutput, TInput>,
  action: (input: unknown) => Promise<AuthActionResult>,
  defaultValues: DefaultValues<TInput>,
) {
  const form = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  return { form, formError, pending, onSubmit };
}
