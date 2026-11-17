import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { textLinkClass } from "@/components/auth/styles";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <>
      <AuthHeading title="Create your account">
        We&apos;ll send you a link to confirm your email.
      </AuthHeading>
      <SignUpForm />
      <p className="text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className={textLinkClass}>
          Sign in
        </Link>
      </p>
    </>
  );
}
