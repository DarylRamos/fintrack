import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/app-shell/page-placeholder";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return <PagePlaceholder href="/profile" />;
}
