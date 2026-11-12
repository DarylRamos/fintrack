import {
  ArrowLeftRight,
  ChartColumn,
  CreditCard,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Target,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** One-sentence placeholder shown until the feature's own unit replaces the page. */
  description: string;
}

export const mainNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Your income, expenses, savings and investments will appear here.",
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
    description: "Your income and expenses will appear here.",
  },
  {
    title: "Budgets",
    href: "/budgets",
    icon: PiggyBank,
    description: "Your budgets and how much of each you've used will appear here.",
  },
  {
    title: "Goals",
    href: "/goals",
    icon: Target,
    description: "Your savings goals and their progress will appear here.",
  },
  {
    title: "Reports",
    href: "/reports",
    icon: ChartColumn,
    description: "Your spending and income reports will appear here.",
  },
  {
    title: "Investments",
    href: "/investments",
    icon: TrendingUp,
    description: "Your investment portfolio will appear here.",
  },
  {
    title: "Debts",
    href: "/debts",
    icon: CreditCard,
    description: "Your debts and payoff plans will appear here.",
  },
];

export const accountNav: NavItem[] = [
  {
    title: "Profile",
    href: "/profile",
    icon: User,
    description: "Your personal details and preferred currency will appear here.",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Your app settings will appear here.",
  },
];

const allNav = [...mainNav, ...accountNav];

export function getNavItem(href: string): NavItem {
  const item = allNav.find((navItem) => navItem.href === href);
  if (!item) {
    throw new Error(`No navigation item for ${href}`);
  }
  return item;
}
