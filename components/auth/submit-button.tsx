import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { primaryButtonClass } from "./styles";

// The full-width primary button. While pending it shows a spinner and stays disabled. `disabled`
// also turns it off while something else on the page is working (the Google button, unit 1.3).
export function SubmitButton({
  pending,
  disabled = false,
  label,
  pendingLabel,
}: {
  pending: boolean;
  disabled?: boolean;
  label: string;
  pendingLabel: string;
}) {
  const off = pending || disabled;
  return (
    <Button type="submit" disabled={off} aria-disabled={off} className={primaryButtonClass}>
      {pending ? (
        <>
          <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
