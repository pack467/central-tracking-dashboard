"use client";

import { useEffect, useRef, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);
  const [ready, setReady] = useState(false);
  const initialRef = useRef(initial);
  initialRef.current = initial;

  // localStorage is only available after hydration; reading it here keeps the
  // server-rendered markup and the first client render identical.
  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) {
          let parsed = JSON.parse(raw) as T;
          const currentInitial = initialRef.current;

          if (Array.isArray(parsed)) {
            parsed = (parsed as any[]).filter((item: any) => item?.project !== "L2") as T;
          }

          // If stored tickets in localStorage has fewer items than seedTickets (e.g. stale mock data with only 5 tickets),
          // upgrade to the full simulated dataset
          if (
            key.startsWith("ctd.tickets") &&
            Array.isArray(parsed) &&
            Array.isArray(currentInitial) &&
            parsed.length < currentInitial.length
          ) {
            setValue(currentInitial);
            window.localStorage.setItem(key, JSON.stringify(currentInitial));
          } else {
            setValue(parsed);
            if (Array.isArray(parsed)) {
              window.localStorage.setItem(key, JSON.stringify(parsed));
            }
          }
        }
      } catch {
        /* ignore corrupt entries */
      }
      hydrated.current = true;
      setReady(true);
    };
    const interval = window.setTimeout(read, 0);
    return () => window.clearTimeout(interval);
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage may be unavailable */
    }
  }, [key, value]);

  return [value, setValue, ready] as const;
}
