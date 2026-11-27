"use client";

import { LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { deleteTransaction } from "@/app/(app)/transactions/actions";
import { FormAlert } from "@/components/auth/form-alert";
import { settingsDangerButtonClass, settingsOutlineButtonClass } from "@/components/settings/styles";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Deleting a transaction from its edit page (unit 2.2): a destructive outline button that asks first.
// Delete is permanent; on success the action redirects to the list. Errors show in the dialog.
export function DeleteTransaction({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTransaction(id);
      if (result?.error) {
        setError(result.error.message);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={cn(settingsDangerButtonClass, "w-full sm:w-auto")}
      >
        Delete transaction
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            setOpen(next);
          }
        }}
      >
        <DialogContent className="rounded-xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this transaction?</DialogTitle>
            <DialogDescription>It&apos;s removed for good. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <FormAlert message={error} />
          <DialogFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={pending} onClick={() => setOpen(false)} className={settingsOutlineButtonClass}>
              Cancel
            </button>
            <button
              type="button"
              disabled={pending}
              aria-disabled={pending}
              onClick={onDelete}
              className={settingsDangerButtonClass}
            >
              {pending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
