import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { SidebarNav } from "./sidebar-nav";

export function AppSidebar() {
  return (
    <Sidebar className="border-r-0!">
      <SidebarHeader className="px-4 py-5">
        <Link
          href="/dashboard"
          className="flex h-11 items-center rounded-2xl px-2 text-lg font-semibold text-ink"
        >
          FinTrack
        </Link>
      </SidebarHeader>
      {/* The generated separator is full width plus its margin, so it overflows without this. */}
      <SidebarSeparator className="data-horizontal:w-auto" />
      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <nav aria-label="Main navigation">
            <SidebarNav group="main" />
          </nav>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs tracking-wide text-ink-muted uppercase">
            Account
          </SidebarGroupLabel>
          <nav aria-label="Account navigation">
            <SidebarNav group="account" />
          </nav>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
