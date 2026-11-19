import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { textLinkClass } from "@/components/auth/styles";

export const metadata: Metadata = {
  title: "Link not valid",
};

export default function AuthErrorPage() {
  return (
    <>
      <AuthHeading title="That link didn't work">
        It may have expired, already been used, or been opened in a different browser.
      </AuthHeading>
      <div className="flex flex-col gap-2 text-sm text-ink-muted">
        <p>Confirming your email? Your account may already be confirmed, so try signing in.</p>
        <p>Resetting your password? Request a new link and open it in this browser.</p>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        <li>
          <Link href="/sign-in" className={textLinkClass}>
            Sign in
          </Link>
        </li>
        <li>
          <Link href="/forgot-password" className={textLinkClass}>
            Request a new password reset link
          </Link>
        </li>
      </ul>
    </>
  );
}
