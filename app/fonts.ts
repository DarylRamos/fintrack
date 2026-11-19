import { Geist, Geist_Mono } from "next/font/google";

// The font definitions, loaded once and shared by the root layout and app/global-error.tsx (which
// replaces the root layout, so it must load the fonts itself). See ui-context.md, Typography.
export const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The classes that define both font variables, for the <html> element.
export const fontVariables = `${geistSans.variable} ${geistMono.variable}`;
