import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import { primaryButtonClass } from "./styles";

// The full-width primary button. While pending it shows a spinner and stays disabled.
export function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} className={primaryButtonClass}>
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
