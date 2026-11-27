// Shared classes for the auth forms, following ui-context.md (Inputs, Primary button, Focus).

// --bg-muted fill, no resting border, rounded-md, h-11, 2px focus ring, error border.
// text-base on phones stops iOS zooming on focus.
export const authInputClass =
  "h-11 rounded-md border-transparent bg-fill px-3 text-base text-ink placeholder:text-ink-muted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus aria-invalid:border-error aria-invalid:ring-0 md:text-sm dark:bg-fill";

// The generated NativeSelect keeps its own classes on the <select>; these restyle it from the wrapper
// to match the inputs: --bg-muted fill, no resting border, rounded-md, h-11, text-base on phones, a
// 2px focus ring and an error border. Shared by the Profile form (unit 1.5) and the currency field
// (unit 2.1).
export const selectClass =
  "w-full [&>select]:h-11 [&>select]:cursor-pointer [&>select]:rounded-md [&>select]:border-transparent [&>select]:bg-fill [&>select]:pr-10 [&>select]:pl-3 [&>select]:text-base [&>select]:text-ink [&>select]:focus-visible:border-transparent [&>select]:focus-visible:ring-2 [&>select]:focus-visible:ring-focus [&>select]:aria-invalid:border-error [&>select]:aria-invalid:ring-0 md:[&>select]:text-sm dark:[&>select]:bg-fill dark:[&>select]:hover:bg-fill [&>svg]:right-3 [&>svg]:text-ink-muted";

export const primaryButtonClass =
  "h-11 w-full cursor-pointer rounded-full bg-action font-medium text-on-action transition-colors duration-200 hover:bg-action/85 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page motion-reduce:transition-none";

// The round icon-only social button (the Google button, unit 1.3): 48px, surface fill and a 1px
// border, so it never looks like the primary button. A faint shadow in light mode only
// (ui-context.md, Elevation).
export const socialButtonClass =
  "size-12 cursor-pointer rounded-full border border-line bg-surface text-ink shadow-sm transition-colors duration-200 hover:bg-fill focus-visible:border-line focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page motion-reduce:transition-none dark:bg-surface dark:shadow-none dark:hover:bg-fill";

export const textLinkClass =
  "cursor-pointer rounded-sm font-medium text-ink underline-offset-4 transition-colors duration-200 hover:underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none";
