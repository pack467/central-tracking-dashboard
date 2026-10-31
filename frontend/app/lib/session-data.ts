import { resetTicketCache, setTicketCacheOwner } from "@/app/services/backend-tickets";
import { claimLocalData } from "@/app/lib/local-data-owner";
import { resetNotesStore } from "@/app/lib/shift-notes";
import { getQueryClient } from "@/app/lib/query-client";

/**
 * Data loaded from the backend belongs to whoever was logged in when it was loaded. Call this whenever the logged-in person changes
 * (login, logout, a 401 that ends the session, another account after a session change): everything cached for the previous person
 * is dropped, in memory and in sessionStorage, so the next one never sees it. Calling it again for the same person does nothing.
 *
 * The server data cache (TanStack Query) is emptied here too, and every query key carries the person's id (useSessionUserId), so a screen
 * still on display asks for the new person's data instead of showing the previous person's.
 *
 * What the person keeps in this browser (shift memo, checkpoint verdicts, notifications...) is not dropped but put aside under their id when
 * somebody else logs in, and comes back when they do (lib/local-data-owner.ts).
 */
let activeUserId: string | null = null;
const listeners = new Set<() => void>();

export function bindSessionData(userId: string | null) {
  // "nobody" is always acted on: opening the app without a session must not leave a previous person's tickets in this tab
  if (userId !== null && userId === activeUserId) return;
  activeUserId = userId;
  setTicketCacheOwner(userId);
  if (userId !== null && typeof window !== "undefined") {
    try {
      // the memo store also keeps its notes in memory: after a switch it must read the new person's again
      if (claimLocalData(window.localStorage, userId) === "switched") resetNotesStore();
    } catch { /* storage blocked: nothing is kept in this browser anyway */ }
  }
  if (userId === null) resetTicketCache();
  if (typeof window !== "undefined") getQueryClient().removeQueries();
  listeners.forEach(listener => listener());
}

/** Who the cached data is for (null: nobody logged in). For query keys, through useSessionUserId. */
export const sessionUserId = () => activeUserId;
export function subscribeSessionUser(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
