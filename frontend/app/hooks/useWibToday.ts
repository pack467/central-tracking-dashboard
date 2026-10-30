"use client";

import { useEffect, useState } from "react";
import { wibDateString, wibMsOfDay } from "@/app/lib/wib";

const DAY_MS = 86_400_000;

/**
 * Today's date in WIB (YYYY-MM-DD), kept current: it changes by itself at midnight WIB, and again when a tab that was asleep or hidden
 * becomes visible, so a dashboard left open overnight does not keep showing yesterday as "today".
 */
export function useWibToday(): string {
  const [today, setToday] = useState(() => wibDateString());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arm = () => {
      if (timer) clearTimeout(timer);
      // a moment after midnight, so the clock has certainly crossed it
      timer = setTimeout(() => { setToday(wibDateString()); arm(); }, DAY_MS - wibMsOfDay() + 250);
    };
    const resync = () => {
      if (document.visibilityState !== "visible") return;
      setToday(wibDateString());
      arm();
    };
    arm();
    document.addEventListener("visibilitychange", resync);
    return () => { if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", resync); };
  }, []);

  return today;
}
