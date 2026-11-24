import type { Metadata } from "next";

import { signOut } from "@/app/(auth)/actions";
import { AuthHeading } from "@/components/auth/auth-heading";
import { textLinkClass } from "@/components/auth/styles";
import { TwoFactorForm } from "@/components/auth/two-factor-form";

export const metadata: Metadata = {
  title: "Two-factor authentication",
};

// The 2FA step (unit 1.4). The proxy shows it only to a browser that signed in but still owes its
// code, so the page itself reads no session and stays static. Sign out is a plain form, so it works
// without JavaScript. See context/feature-specs/1.4-authenticator-app-2fa.md.
export default function TwoFactorPage() {
  return (
    <>
      <AuthHeading title="Enter your code">
        Open your authenticator app and enter the 6-digit code for FinTrack.
      </AuthHeading>
      <TwoFactorForm />
      <form action={signOut} className="text-center text-sm text-ink-muted">
        Not you, or can&apos;t use your app right now?{" "}
        <button type="submit" className={`inline-flex min-h-6 items-center ${textLinkClass}`}>
          Sign out
        </button>
      </form>
    </>
  );
}
