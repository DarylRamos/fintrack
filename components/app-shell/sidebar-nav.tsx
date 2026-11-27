"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { accountNav, mainNav } from "./nav-items";

// Icons are components, which can't be passed from a Server Component, so the lists are
// imported here and the caller picks one by name.
const navGroups = { main: mainNav, account: accountNav };

const baseClasses =
  "h-11 gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors duration-200 [&_svg]:size-4 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar";

// The generated button styles active items with data-active and hover with hover:, which would
// override the slate pill on hover. These classes replace both for the active item.
const activeClasses =
  "bg-inverse text-on-inverse hover:bg-inverse hover:text-on-inverse active:bg-inverse active:text-on-inverse data-active:bg-inverse data-active:text-on-inverse";

const inactiveClasses = "text-ink hover:bg-fill hover:text-ink active:bg-fill active:text-ink";

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavGroup = keyof typeof navGroups;

// Under Cache Components, usePathname() suspends while prerendering a page with an unknown dynamic
// param (unit 2.2's /transactions/[id]/edit), so the active-link part sits behind Suspense. Its
// fallback is the same list with no active item, so nothing shifts; static pages resolve the pathname
// while prerendering and never show it.
export function SidebarNav({ group }: { group: NavGroup }) {
  return (
    <Suspense fallback={<NavList group={group} pathname={null} />}>
      <ActiveSidebarNav group={group} />
    </Suspense>
  );
}

function ActiveSidebarNav({ group }: { group: NavGroup }) {
  return <NavList group={group} pathname={usePathname()} />;
}

function NavList({ group, pathname }: { group: NavGroup; pathname: string | null }) {
  const items = navGroups[group];
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const isActive = pathname !== null && isActivePath(pathname, item.href);
        const Icon = item.icon;

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(baseClasses, isActive ? activeClasses : inactiveClasses)}
            >
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpenMobile(false)}
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface text-ink",
                    !isActive && "shadow-sm dark:border dark:border-line dark:shadow-none",
                  )}
                >
                  <Icon aria-hidden="true" />
                </span>
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
