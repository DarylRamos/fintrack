import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";

import { UserMenu } from "./user-menu";

// Reads the session at request time, so it streams in behind Suspense while the rest of the header
// stays in the static shell. The skeleton has the menu's size, so nothing shifts. The proxy keeps
// signed-out browsers off app pages; if the session ends between the proxy and this render,
// requireUser() sends the browser to sign-in (unit 1.2a).
async function AccountAreaContent() {
  const user = await requireUser();
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
