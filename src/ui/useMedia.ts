import { useSyncExternalStore } from "react";

/** Phone-sized screens (portrait iPhone, narrow windows): the compact header and dock. */
export const PHONE = "(max-width: 600px)";

/** Whether a media query matches, live. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
