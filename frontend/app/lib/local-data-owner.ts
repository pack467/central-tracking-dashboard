/**
 * Data the app keeps in this browser belongs to whoever worked with it. On a shared computer (a NOC desk) the next operator must not see
 * the previous one's shift memo, checkpoint verdicts or notifications, and must not lose them either: nothing is deleted. When another
 * person logs in, the previous person's data is put aside under their own id and their own data (if they had any here before) is put back.
 *
 * Only personal work data is handled. Device settings (sidebar, splash, selected client), Master Data, the ticket store of the mock mode and
 * the login itself are left alone.
 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The personal work data in localStorage. */
export const PER_USER_KEYS: readonly string[] = [
  "ctd.memo.v2",
  "ctd.memo.draft.v1",
  "ctd.memo.invalid.v1",
  "ctd_shift_notepad_memo",
  "ctd.checkpoints",
  "ctd.handover.notes",
  "ctd.acknowledged",
  "ctd.notifications.v6",
  "ctd.user.status",
];

const OWNER_KEY = "ctd.dataOwner";
const stashKey = (userId: string, key: string) => `ctd.stash.${userId}.${key}`;

export type ClaimResult = "same" | "claimed" | "switched";

/**
 * Makes the personal data in `store` this person's. Call it with the id of whoever just logged in.
 *  - "same":     it already was theirs, nothing to do.
 *  - "claimed":  nobody had claimed it yet (data from before this rule), so the first person to log in keeps it.
 *  - "switched": it was somebody else's: theirs is put aside and this person's own data, if any, comes back.
 */
export function claimLocalData(store: KeyValueStore, userId: string, keys: readonly string[] = PER_USER_KEYS): ClaimResult {
  const owner = store.getItem(OWNER_KEY);
  if (owner === userId) return "same";
  if (owner === null) {
    store.setItem(OWNER_KEY, userId);
    return "claimed";
  }
  for (const key of keys) {
    const value = store.getItem(key);
    if (value !== null) store.setItem(stashKey(owner, key), value);
    store.removeItem(key);
  }
  for (const key of keys) {
    const kept = store.getItem(stashKey(userId, key));
    if (kept !== null) {
      store.setItem(key, kept);
      store.removeItem(stashKey(userId, key));
    }
  }
  store.setItem(OWNER_KEY, userId);
  return "switched";
}
