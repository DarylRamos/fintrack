import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { textLinkClass } from "@/components/auth/styles";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentClaims } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Set a new password",
};

// Reached from the reset email's link, which signs the user in. Without a session the link has
// expired or was already used.
async function ResetPasswordContent() {
  const user = await getCurrentClaims();

  if (!user) {
    return (
      <>
        <AuthHeading title="Link expired">This link has expired or was already used.</AuthHeading>
        <p className="text-sm text-ink-muted">
          <Link href="/forgot-password" className={textLinkClass}>
            Request a new link
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Set a new password">Choose a new password for your account.</AuthHeading>
      <ResetPasswordForm />
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-5">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
