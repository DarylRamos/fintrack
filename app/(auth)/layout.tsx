import { BrandPanel } from "@/components/auth/brand-panel";
import { ClearAuthErrorHash } from "@/components/auth/clear-auth-error-hash";

// Sign-in, sign-up and password pages: a 50/50 split on wider screens, and the form alone, with the
// wordmark above it, on phones. No app sidebar. See ui-context.md, Sign-In and Sign-Up.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 md:min-h-svh md:grid-cols-2">
      <ClearAuthErrorHash />
      <BrandPanel />
      <main className="flex flex-col items-center justify-center px-4 py-10 md:px-8">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <p className="text-lg font-semibold text-ink md:hidden">FinTrack</p>
          {children}
        </div>
      </main>
    </div>
  );
}
