import { getNavItem } from "./nav-items";
import { PageHeader } from "./page-header";

export function PagePlaceholder({ href }: { href: string }) {
  const item = getNavItem(href);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={item.title} />
      <p className="text-sm text-ink-muted">{item.description}</p>
    </div>
  );
}
