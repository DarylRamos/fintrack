import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/db/profiles";
import { getTransaction } from "@/lib/db/transactions";
import type { CurrencyCode } from "@/lib/money/currencies";
import { transactionIdSchema } from "@/lib/validation/transaction";

import { DeleteTransaction } from "./delete-transaction";
import { TransactionForm } from "./transaction-form";

// The new and edit pages' card (unit 2.2). The values are read at request time behind Suspense, so the
// page shell stays static. A malformed, missing or other user's ID is a 404 (code-standards.md), shown
// inside the app shell by app/(app)/not-found.tsx. See
// context/feature-specs/2.2-transaction-create-edit-delete.md, Pages and UI.

function FormCard({ children }: { children: ReactNode }) {
  // Capped at max-w-xl, so Amount isn't squeezed beside the 14rem Currency column (unit 2.1's notes).
  return (
    <section className="rounded-xl border border-line bg-surface p-4 md:p-6">
      <div className="flex max-w-xl flex-col gap-6">{children}</div>
    </section>
  );
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-11 w-full rounded-md sm:w-64" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_14rem] sm:gap-4">
        {[0, 1].map((index) => (
          <div key={index} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-11 w-full rounded-md sm:w-56" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-11 w-full rounded-lg sm:h-9 sm:w-36" />
        <Skeleton className="h-11 w-full rounded-lg sm:h-9 sm:w-20" />
      </div>
    </div>
  );
}

async function NewTransactionForm() {
  const user = await requireUser();
  const { preferredCurrency } = await getProfile(user.userId);
  return (
    <TransactionForm
      mode="new"
      // The date is set in the browser after mount (its own "today", Question B).
      initial={{ type: "expense", amount: "", currency: preferredCurrency, occurredOn: "", description: "" }}
    />
  );
}

export function NewTransactionCard() {
  return (
    <FormCard>
      <Suspense fallback={<FormSkeleton />}>
        <NewTransactionForm />
      </Suspense>
    </FormCard>
  );
}

async function EditTransactionForm({ id }: { id: string }) {
  const user = await requireUser();
  const parsedId = transactionIdSchema.safeParse(id);
  const transaction = parsedId.success ? await getTransaction(user.userId, parsedId.data) : null;
  if (!transaction) {
    notFound();
  }
  const { type, amount, occurredOn, description } = transaction;
  // A stored code no longer in the list (only if the list shrinks) is kept as it is, so saving asks for
  // a supported currency ("Choose a currency from the list.") rather than changing it silently.
  const currency = transaction.currency as CurrencyCode;
  return (
    <>
      <TransactionForm mode="edit" id={transaction.id} initial={{ type, amount, currency, occurredOn, description }} />
      <div className="border-t border-line pt-6">
        <DeleteTransaction id={transaction.id} />
      </div>
    </>
  );
}

export function EditTransactionCard({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <FormCard>
          <FormSkeleton />
        </FormCard>
      }
    >
      {params.then(({ id }) => (
        <FormCard>
          <EditTransactionForm id={id} />
        </FormCard>
      ))}
    </Suspense>
  );
}
