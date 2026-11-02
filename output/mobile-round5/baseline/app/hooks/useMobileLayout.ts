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

const compactQuery = "(max-width: 1023px)";
const compactSubscribe = (notify: () => void) => {
  const media = window.matchMedia(compactQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const compactSnapshot = () => window.matchMedia(compactQuery).matches;

export function useCompactLayout() {
  return useSyncExternalStore(compactSubscribe, compactSnapshot, serverSnapshot);
}

const narrowTouchQuery = "(max-width: 767px), (pointer: coarse) and (max-width: 1023px)";
const narrowTouchSubscribe = (notify: () => void) => {
  const media = window.matchMedia(narrowTouchQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const narrowTouchSnapshot = () => window.matchMedia(narrowTouchQuery).matches;

export function useNarrowTouchLayout() {
  return useSyncExternalStore(narrowTouchSubscribe, narrowTouchSnapshot, serverSnapshot);
}
