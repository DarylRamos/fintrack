import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthHeading } from "@/components/auth/auth-heading";
import { textLinkClass } from "@/components/auth/styles";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Check your email",
};

// Never shows the address the email went to.
const MESSAGES = {
  "sign-up":
    "Check your inbox for a confirmation link, and open it in this browser. If you already have an account, sign in instead.",
  reset:
    "If an account exists for that email, we sent a link to reset your password. Open the link in this browser.",
} as const;

async function CheckEmailMessage({ searchParams }: { searchParams: PageProps<"/check-email">["searchParams"] }) {
  const { reason } = await searchParams;
  const message = reason === "reset" ? MESSAGES.reset : MESSAGES["sign-up"];
  return <AuthHeading title="Check your email">{message}</AuthHeading>;
}

export default function CheckEmailPage(props: PageProps<"/check-email">) {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-full" />
          </div>
        }
      >
        <CheckEmailMessage searchParams={props.searchParams} />
      </Suspense>
      <p className="text-sm text-ink-muted">
        <Link href="/sign-in" className={textLinkClass}>
          Back to sign in
        </Link>
      </p>
    </>
  );
}
