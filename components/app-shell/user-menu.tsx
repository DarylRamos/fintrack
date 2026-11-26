"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { signOut } from "@/app/(auth)/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// The avatar's letter: the display name's first character, else the email's (unit 1.5). Spread into
// code points, so a name starting with an emoji or another script isn't cut in half.
export function avatarInitial(email: string, displayName: string | null): string {
  const source = displayName?.trim() || email;
  return ([...source][0] ?? "").toLocaleUpperCase("en");
}

// The signed-in user's menu: a round avatar with the name's (or email's) first letter, the name above
// the email, and Sign out.
export function UserMenu({ email, displayName = null }: { email: string; displayName?: string | null }) {
  const [pending, startTransition] = useTransition();
  const initial = avatarInitial(email, displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-inverse text-sm font-semibold text-on-inverse transition-opacity duration-200 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none motion-reduce:transition-none"
      >
        <span aria-hidden="true">{initial}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2">
        <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
          {displayName ? (
            <>
              <span className="truncate text-sm font-medium text-ink">{displayName}</span>
              <span className="truncate text-xs font-normal text-ink-muted">{email}</span>
            </>
          ) : (
            <>
              <span className="text-xs font-normal text-ink-muted">Signed in as</span>
              <span className="truncate text-sm font-medium text-ink">{email}</span>
            </>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={() => startTransition(() => signOut())}
          className="min-h-11 cursor-pointer gap-2 rounded-lg px-2 text-sm"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {pending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
