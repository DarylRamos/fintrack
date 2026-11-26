import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { requireUser } from "@/lib/auth/session";
import { getProfile } from "@/lib/db/profiles";

import { UserMenu } from "./user-menu";

// The display name, or null when it can't be read (database unreachable, or the production
// migration not applied yet): the shell never becomes an error page because of a name (unit 1.5).
// Logs only the error's name.
async function displayNameFor(userId: string): Promise<string | null> {
  try {
    return (await getProfile(userId)).displayName;
  } catch (error) {
    const name = error instanceof Error ? error.name : "UnknownError";
    console.error(`[profile] account menu could not read the profile: ${name}`);
    return null;
  }
}

// Reads the session at request time, so it streams in behind Suspense while the rest of the header
// stays in the static shell. The skeleton has the menu's size, so nothing shifts. The proxy keeps
// signed-out browsers off app pages; if the session ends between the proxy and this render,
// requireUser() sends the browser to sign-in (unit 1.2a).
async function AccountAreaContent() {
  const user = await requireUser();
  const displayName = await displayNameFor(user.userId);
  return <UserMenu email={user.email} displayName={displayName} />;
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
