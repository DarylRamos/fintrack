import { AuthShowcaseLoader } from "./auth-showcase-loader";

// The left half of the sign-in and sign-up layout on wider screens. Hidden on phones. The wordmark
// sits at the top left; below it, a centred column holds the welcome text and, further down, the
// animated laptop-and-charts picture (ui-context.md, Sign-In and Sign-Up).
export function BrandPanel() {
  return (
    <aside className="hidden flex-col gap-10 bg-inverse p-10 text-on-inverse md:flex lg:p-14">
      <p className="text-lg font-semibold">FinTrack</p>
      <div className="flex flex-1 flex-col items-center justify-center gap-12 lg:gap-16">
        <div className="flex w-full max-w-lg flex-col gap-3">
          <p className="text-4xl font-semibold">Welcome to FinTrack!</p>
          <p className="text-sm text-on-inverse-muted">
            Your income, spending and goals, all in one calm place.
          </p>
        </div>
        <AuthShowcaseLoader className="max-w-lg" />
      </div>
    </aside>
  );
}
