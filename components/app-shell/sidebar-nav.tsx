"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function SidebarNav({ group }: { group: keyof typeof navGroups }) {
  const items = navGroups[group];
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarMenu className="gap-1">
      {items.map((item) => {
        const isActive = isActivePath(pathname, item.href);
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
