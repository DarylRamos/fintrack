import type { Metadata } from "next";

import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FinTrack",
    template: "%s | FinTrack",
  },
  description:
    "Track your income, expenses, budgets, goals, investments and debts in one place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-page text-ink">{children}</body>
    </html>
  );
}
