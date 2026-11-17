import type { Metadata } from "next";
import Link from "next/link";

import { AuthHeading } from "@/components/auth/auth-heading";
import { SignInForm } from "@/components/auth/sign-in-form";
import { textLinkClass } from "@/components/auth/styles";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function SignInPage() {
  return (
    <>
      <AuthHeading title="Sign in">Enter your email and password to continue.</AuthHeading>
      <SignInForm />
      <p className="text-sm text-ink-muted">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className={textLinkClass}>
          Sign up
        </Link>
      </p>
    </>
  );
}
