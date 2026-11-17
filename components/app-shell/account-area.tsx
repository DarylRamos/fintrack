import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentClaims } from "@/lib/auth/session";

import { UserMenu } from "./user-menu";

// Reads the session at request time, so it streams in behind Suspense while the rest of the header
// stays in the static shell. The skeleton has the menu's size, so nothing shifts.
async function AccountAreaContent() {
  const user = await getCurrentClaims();

  if (!user) {
    return (
      <Link
        href="/sign-in"
        className="flex h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium text-ink transition-colors duration-200 hover:bg-fill focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none motion-reduce:transition-none"
      >
        Sign in
      </Link>
    );
  }

  return <UserMenu email={user.email} />;
}

export function AccountArea() {
  return (
    <div className="flex min-h-11 min-w-11 shrink-0 items-center justify-end">
      <Suspense fallback={<Skeleton className="size-11 rounded-full" />}>
        <AccountAreaContent />
      </Suspense>
    </div>
  );
}
