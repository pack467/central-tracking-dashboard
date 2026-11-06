"use client";

import { useSyncExternalStore } from "react";
import { readProfilePhoto, subscribeProfilePhoto } from "@/app/lib/profile-photo";

/** This account's photo, kept up to date everywhere it is shown. Null on the server: the photo lives in the browser. */
export function useProfilePhoto(userId: string | null | undefined): string | null {
  return useSyncExternalStore(subscribeProfilePhoto, () => readProfilePhoto(userId), () => null);
}
