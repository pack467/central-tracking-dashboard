"use client";

import { useEffect, useRef, useState } from "react";

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  // localStorage is only available after hydration; reading it here keeps the
  // server-rendered markup and the first client render identical.
  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) setValue(JSON.parse(raw) as T);
      } catch {
        /* ignore corrupt entries */
      }
      hydrated.current = true;
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

  return [value, setValue] as const;
}
