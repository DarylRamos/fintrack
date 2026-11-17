import type { CSSProperties } from "react";

import { AccountArea } from "@/components/app-shell/account-area";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { MobileTopBar } from "@/components/app-shell/mobile-top-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider defaultOpen style={{ "--sidebar-width": "15rem" } as CSSProperties}>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-action px-4 py-2 text-sm font-medium text-on-action focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <AppSidebar />
      {/* SidebarInset renders the <main> landmark, so the skip target is a div inside it. */}
      <SidebarInset>
        <MobileTopBar />
        <div
          id="main"
          tabIndex={-1}
          className="relative mx-auto w-full max-w-6xl px-4 py-6 outline-none md:px-6 lg:px-8"
        >
          {/* Rendered here, not in each page's header, so it stays mounted across navigations and
              never shows its skeleton again. Aligned with the page header's first row, which leaves
              room for it. */}
          <div className="absolute top-6 right-4 md:right-6 lg:right-8">
            <AccountArea />
          </div>
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
