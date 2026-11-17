// Shared classes for the auth forms, following ui-context.md (Inputs, Primary button, Focus).

// --bg-muted fill, no resting border, rounded-md, h-11, 2px focus ring, error border.
// text-base on phones stops iOS zooming on focus.
export const authInputClass =
  "h-11 rounded-md border-transparent bg-fill px-3 text-base text-ink placeholder:text-ink-muted focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-focus aria-invalid:border-error aria-invalid:ring-0 md:text-sm dark:bg-fill";

export const primaryButtonClass =
  "h-11 w-full cursor-pointer rounded-full bg-action font-medium text-on-action transition-colors duration-200 hover:bg-action/85 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page motion-reduce:transition-none";

export const textLinkClass =
  "cursor-pointer rounded-sm font-medium text-ink underline-offset-4 transition-colors duration-200 hover:underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none";
