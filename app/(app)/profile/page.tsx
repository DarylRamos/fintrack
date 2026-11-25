import type { Metadata } from "next";

import { PageHeader } from "@/components/app-shell/page-header";
import { ProfileCard } from "@/components/profile/profile-card";

export const metadata: Metadata = {
  title: "Profile",
};

// The user's display name and preferred currency (unit 1.5). See
// context/feature-specs/1.5-profile-and-preferred-currency.md.
export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" />
      <ProfileCard />
    </div>
  );
}
