import Link from "next/link";

import { SidebarTrigger } from "@/components/ui/sidebar";

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-line bg-page px-2 md:hidden">
      <SidebarTrigger aria-label="Open menu" className="size-11 rounded-full [&_svg]:size-5" />
      <Link href="/dashboard" className="flex h-11 items-center px-1 text-lg font-semibold text-ink">
        FinTrack
      </Link>
    </header>
  );
}
