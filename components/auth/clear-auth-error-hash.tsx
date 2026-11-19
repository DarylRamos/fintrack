"use client";

import { useEffect } from "react";

// Supabase reports a used or expired email link in the URL fragment (#error=…&error_code=…). The
// browser keeps that fragment through /auth/confirm's redirect, so without this the address bar of
// /reset-password or /auth-error would still say "Email link is invalid". The server never sees the
// fragment, so it can only be removed here. Other fragments are left alone. Renders nothing. See
// context/feature-specs/1.1b-reset-link-reclick.md (Hand-Check Fix).
const SUPABASE_ERROR_HASH = /(?:^#|&)(?:error|error_code)=/;

export function ClearAuthErrorHash() {
  useEffect(() => {
    const { hash, pathname, search } = window.location;
    if (SUPABASE_ERROR_HASH.test(hash)) {
      window.history.replaceState(window.history.state, "", `${pathname}${search}`);
    }
  }, []);
  return null;
}
