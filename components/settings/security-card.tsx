import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getTwoFactorStatus, requireUser } from "@/lib/auth/session";

import { TwoFactorSection } from "./two-factor-section";

// Settings → Security (unit 1.4). The 2FA state is read at request time (from Supabase, not the
// cookie), so it streams in behind Suspense while the page's shell stays static; the skeleton keeps
// the row's height.
async function TwoFactorRow() {
  await requireUser();
  const status = await getTwoFactorStatus();
  return <TwoFactorSection enabled={status.enabled} addedAt={status.addedAt} />;
}

function TwoFactorRowSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-11 w-24 self-start rounded-lg sm:h-9 sm:w-20" />
    </div>
  );
}

export function SecurityCard() {
  return (
    <section aria-labelledby="security-heading" className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 md:p-6">
      <h2 id="security-heading" className="text-base font-semibold text-ink">
        Security
      </h2>
      <div className="border-t border-line pt-5">
        <Suspense fallback={<TwoFactorRowSkeleton />}>
          <TwoFactorRow />
        </Suspense>
      </div>
    </section>
  );
}
