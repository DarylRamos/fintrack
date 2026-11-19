import type { Metadata } from "next";
import Link from "next/link";

import { AuthFormStatusProvider } from "@/components/auth/auth-form-status";
import { AuthHeading } from "@/components/auth/auth-heading";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { textLinkClass } from "@/components/auth/styles";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignUpPage() {
  return (
    <>
      <AuthHeading title="Create your account">
        Get started in just a few minutes. We&apos;ll email you a link to confirm your account.
      </AuthHeading>
      <AuthFormStatusProvider>
        <SignUpForm />
        <GoogleSignIn />
      </AuthFormStatusProvider>
      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className={textLinkClass}>
          Sign in
        </Link>
      </p>
    </>
  );
}
