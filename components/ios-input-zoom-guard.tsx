"use client";

import { useEffect } from "react";

// iOS Safari zooms the page in when a field whose text is under 16px gets the focus, and FinTrack's fields
// use 14px text (owner's choice, 2026-11-27). On iOS only, this adds `maximum-scale=1` to the viewport,
// which stops that zoom; iOS ignores it for pinch zoom, so people can still zoom in. Other browsers never
// get it, because Android's Chrome would block pinch zoom with it (WCAG 1.4.4). Renders nothing.
export function IosInputZoomGuard() {
  useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      // iPadOS reports itself as a Mac; a touch screen tells them apart.
      (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (ios && viewport && !viewport.content.includes("maximum-scale")) {
      viewport.content = `${viewport.content}, maximum-scale=1`;
    }
  }, []);
  return null;
}
