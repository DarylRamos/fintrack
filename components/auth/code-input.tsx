import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";

import { authInputClass } from "./styles";

// The 6-digit authenticator-app code field (unit 1.4), shared by the 2FA step and Settings. One
// field rather than six boxes: simpler for screen readers, paste and password managers. Numeric
// keypad on phones; `one-time-code` lets the browser or a password manager fill it. Seven
// characters allow one space ("123 456"), which the schema removes.
export function CodeInput(props: Omit<ComponentProps<"input">, "type" | "inputMode" | "autoComplete">) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={7}
      spellCheck={false}
      placeholder="Type the 6-digit code"
      className={`${authInputClass} tabular-nums`}
    />
  );
}
