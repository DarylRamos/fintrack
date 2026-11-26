import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/db/profiles";

import { ProfileForm } from "./profile-form";

// Profile → Personal details (unit 1.5). The values are read at request time, so they stream in behind
// Suspense while the page's shell stays static; the skeleton keeps the form's height. See
// context/feature-specs/1.5-profile-and-preferred-currency.md, UI.
async function PersonalDetails() {
  const user = await requireUser();
  const profile = await getProfile(user.userId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-sm font-medium text-ink">Email</p>
        <p className="truncate text-sm text-ink">{user.email}</p>
        <p className="text-xs text-ink-muted">You sign in with this email.</p>
      </div>
      <ProfileForm initial={profile} />
    </div>
  );
}

function PersonalDetailsSkeleton() {
  return (
    <div className="flex max-w-md flex-col gap-5" aria-hidden="true">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-56 max-w-full" />
        <Skeleton className="h-3 w-40" />
      </div>
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-lg sm:h-9 sm:w-16" />
    </div>
  );
}

export function ProfileCard() {
  return (
    <section
      aria-labelledby="personal-details-heading"
      className="flex flex-col gap-5 rounded-xl border border-line bg-surface p-4 md:p-6"
    >
      <h2 id="personal-details-heading" className="text-base font-semibold text-ink">
        Personal details
      </h2>
      <div className="border-t border-line pt-5">
        <Suspense fallback={<PersonalDetailsSkeleton />}>
          <PersonalDetails />
        </Suspense>
      </div>
    </section>
  );
}
