"use client";

import { useSyncExternalStore } from "react";

const query = "(max-width: 767px)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

/** The server and initial hydration agree; CSS handles the initial narrow layout. */
export function useMobileLayout() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
