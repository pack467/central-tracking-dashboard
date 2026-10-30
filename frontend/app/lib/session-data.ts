import { resetTicketCache, setTicketCacheOwner } from "@/app/services/backend-tickets";
import { resetBackendTeam } from "@/app/hooks/useBackendTeam";
import { claimLocalData } from "@/app/lib/local-data-owner";
import { resetNotesStore } from "@/app/lib/shift-notes";

/**
 * Data loaded from the backend belongs to whoever was logged in when it was loaded. Call this whenever the logged-in person changes
 * (login, logout, a 401 that ends the session, another account after a session change): everything cached for the previous person
 * is dropped, in memory and in sessionStorage, so the next one never sees it. Calling it again for the same person does nothing.
 *
 * What the person keeps in this browser (shift memo, checkpoint verdicts, notifications...) is not dropped but put aside under their id when
 * somebody else logs in, and comes back when they do (lib/local-data-owner.ts).
 */
let activeUserId: string | null = null;

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
  resetBackendTeam();
}
