import type { Metadata } from "next";
import Link from "next/link";

import { AuthFormStatusProvider } from "@/components/auth/auth-form-status";
import { AuthHeading } from "@/components/auth/auth-heading";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { SignInForm } from "@/components/auth/sign-in-form";
import { textLinkClass } from "@/components/auth/styles";
import { authError } from "@/lib/auth/errors";

export const metadata: Metadata = {
  title: "Sign in",
};

const googleErrorMessage = authError("GOOGLE_FAILED").error.message;

export default function SignInPage() {
  return (
    <>
      <AuthHeading title="Welcome back!">Sign in to see your income, spending and goals.</AuthHeading>
      <AuthFormStatusProvider>
        <SignInForm googleErrorMessage={googleErrorMessage} />
        <GoogleSignIn />
      </AuthFormStatusProvider>
      <p className="text-center text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className={textLinkClass}>
          Sign up
        </Link>
      </p>
    </>
  );
}
