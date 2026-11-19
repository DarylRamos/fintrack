"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";

import { authInputClass } from "./styles";

// A password input with a show/hide button. The button has an accessible name and state.
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`${authInputClass} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-0 right-0 flex size-11 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors duration-200 hover:text-ink focus-visible:ring-2 focus-visible:ring-focus focus-visible:outline-none motion-reduce:transition-none"
      >
        {visible ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
      </button>
    </div>
  );
}
