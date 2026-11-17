import { AuthIllustration } from "./auth-illustration";

// The left half of the sign-in and sign-up layout on wider screens. Hidden on phones.
export function BrandPanel() {
  return (
    <aside className="hidden flex-col justify-between gap-10 bg-inverse p-10 text-on-inverse md:flex lg:p-14">
      <p className="text-lg font-semibold">FinTrack</p>
      <div className="flex flex-col gap-10">
        <div className="flex max-w-sm flex-col gap-3">
          <p className="text-4xl font-semibold">Welcome to FinTrack!</p>
          <p className="text-sm text-on-inverse-muted">
            Your income, spending and goals, all in one calm place.
          </p>
        </div>
        <AuthIllustration className="w-full max-w-sm text-on-inverse-muted" />
      </div>
    </aside>
  );
}
