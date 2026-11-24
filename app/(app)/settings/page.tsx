import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { SecurityCard } from "@/components/settings/security-card";

export const metadata: Metadata = {
  title: "Settings",
};

// Settings. Unit 1.4 adds the first section, Security (two-factor authentication); later phases add
// privacy and themes. See context/feature-specs/1.4-authenticator-app-2fa.md.
export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" />
      <SecurityCard />
    </div>
  );
}
