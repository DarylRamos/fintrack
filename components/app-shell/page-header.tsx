import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// The account menu isn't part of the header: the app layout renders it once at the top right of
// #main, so it stays mounted across navigations. pr-14 keeps the title clear of its 44px avatar
// button plus a 12px gap (unit 1.2a removed the wider signed-out "Sign in" link).
//
// `parent` adds a middle crumb for sub-pages, such as "Home / Transactions / Add transaction" (unit 2.2).
export function PageHeader({ title, parent }: { title: string; parent?: { title: string; href: string } }) {
  return (
    <header className="flex items-start pr-14">
      <div className="flex min-w-0 flex-col gap-1">
        <Breadcrumb>
          <BreadcrumbList className="text-xs text-ink-muted">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {parent ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={parent.href}>{parent.title}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            ) : null}
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-ink">{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-xl font-semibold text-ink md:text-2xl">{title}</h1>
      </div>
    </header>
  );
}
