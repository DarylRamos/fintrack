import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { textLinkClass } from "@/components/auth/styles";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset your password">
        Enter your email and we&apos;ll send you a link to set a new password.
      </AuthHeading>
      <ForgotPasswordForm />
      <p className="text-sm text-ink-muted">
        Remembered it?{" "}
        <Link href="/sign-in" className={textLinkClass}>
          Back to sign in
        </Link>
      </p>
    </>
  );
}
