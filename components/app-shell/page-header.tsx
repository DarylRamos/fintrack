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
// #main, so it stays mounted across navigations. pr-24 keeps the title clear of it (the signed-out
// "Sign in" link is its widest state).
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="flex items-start pr-24">
      <div className="flex min-w-0 flex-col gap-1">
        <Breadcrumb>
          <BreadcrumbList className="text-xs text-ink-muted">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
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
