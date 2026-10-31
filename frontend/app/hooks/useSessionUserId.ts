"use client";

import { useSyncExternalStore } from "react";
import { sessionUserId, subscribeSessionUser } from "@/app/lib/session-data";

/**
 * The id of the person the cached data belongs to (lib/session-data.ts), or null. Every query key includes it, so a change of person is a
 * change of key: screens on display load the new person's data, never show the previous person's.
 */
export function useSessionUserId(): string | null {
  return useSyncExternalStore(subscribeSessionUser, sessionUserId, () => null);
}
