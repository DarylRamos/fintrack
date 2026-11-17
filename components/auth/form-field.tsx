import type { ReactNode } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export interface ControlProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}

// One labelled field: label above (with an optional link beside it), the control, helper text,
// then the error directly under the field, linked with aria-describedby.
export function FormField({
  id,
  label,
  error,
  description,
  labelAside,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  description?: string;
  labelAside?: ReactNode;
  children: (control: ControlProps) => ReactNode;
}) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <Field className="gap-2">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </FieldLabel>
        {labelAside}
      </div>
      {children({ id, "aria-invalid": Boolean(error), "aria-describedby": describedBy })}
      {description ? (
        <FieldDescription id={descriptionId} className="text-xs text-ink-muted">
          {description}
        </FieldDescription>
      ) : null}
      {error ? (
        <FieldError id={errorId} className="text-sm text-error">
          {error}
        </FieldError>
      ) : null}
    </Field>
  );
}
