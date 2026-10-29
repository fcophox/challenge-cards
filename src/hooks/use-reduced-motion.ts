"use client";

import { useSyncExternalStore } from "react";
import type { UserSettings } from "@/lib/game/types";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

/** Combines the OS preference with the in-app override. */
export function useReducedMotionPreference(pref: UserSettings["reducedMotion"]): boolean {
  const system = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
  if (pref === "on") return true;
  if (pref === "off") return false;
  return system;
}
