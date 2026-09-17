"use client";
import { useEffect } from "react";

/** Removes one-time query flags (?deleted=1, ?welcome=1…) so a refresh doesn't show the message again. */
export function FlashCleaner({ keys }: { keys: string[] }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const k of keys) {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [keys]);
  return null;
}
