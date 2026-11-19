"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

// Loads the sign-in panel's picture (auth-showcase.tsx, which pulls in Recharts) only in the browser,
// and only at `md` and wider, where the brand panel shows. Phones never download it, and the auth
// pages stay static. The box keeps its size before the picture arrives, so nothing shifts. Hidden
// from assistive technology and inert: the picture is decorative.
const AuthShowcase = dynamic(() => import("./auth-showcase").then((mod) => mod.AuthShowcase), {
  ssr: false,
  loading: () => null,
});

const WIDE = "(min-width: 48rem)";

function subscribeWide(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function AuthShowcaseLoader({ className = "" }: { className?: string }) {
  const wide = useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  );

  return (
    <div aria-hidden="true" inert data-testid="auth-showcase" className={`relative aspect-6/5 w-full ${className}`}>
      {wide ? <AuthShowcase /> : null}
    </div>
  );
}
