// Button classes for the Settings page. Swiss-style and compact (owner's choice on 2026-11-23, with the
// UI UX Pro Max minimalism profile): small radius (rounded-lg), sized to the label, 36px from `sm` up (above WCAG's
// 24px minimum) and 44px on phones for touch.

const base =
  "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none sm:h-9 sm:px-3.5";

export const settingsPrimaryButtonClass = `${base} bg-action text-on-action hover:bg-action/85`;

export const settingsOutlineButtonClass = `${base} border border-line bg-surface text-ink hover:bg-fill`;

// Turning a protection off: a quiet outline with error-coloured text, whose border turns error-coloured
// on hover (the word says what it does, not the colour alone).
export const settingsDangerButtonClass = `${base} border border-line bg-surface text-error hover:border-error hover:bg-fill`;
