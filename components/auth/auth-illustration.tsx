// Decorative line drawing for the sign-in panel: a rising line chart over a small stack of coins.
// Strokes use currentColor, so the parent's token color (text-on-inverse-muted) sets it in both
// light and dark mode. Hidden from assistive technology.
export function AuthIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 220"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Axes */}
      <path d="M24 196 H296" />
      <path d="M24 196 V28" opacity={0.5} />

      {/* Faint gridlines */}
      <path d="M24 148 H296 M24 100 H296 M24 52 H296" opacity={0.2} strokeDasharray="4 6" />

      {/* Rising trend line with points */}
      <path d="M108 160 L146 140 L184 150 L222 108 L256 96 L288 48" strokeWidth={2.5} />
      <circle cx={108} cy={160} r={4} />
      <circle cx={146} cy={140} r={4} />
      <circle cx={184} cy={150} r={4} />
      <circle cx={222} cy={108} r={4} />
      <circle cx={256} cy={96} r={4} />
      <circle cx={288} cy={48} r={5} />

      {/* Stack of coins, bottom left, clear of the line */}
      <ellipse cx={62} cy={186} rx={24} ry={6} />
      <path d="M38 186 V178 M86 186 V178" />
      <ellipse cx={62} cy={178} rx={24} ry={6} />
      <path d="M38 178 V170 M86 178 V170" />
      <ellipse cx={62} cy={170} rx={24} ry={6} />
    </svg>
  );
}
