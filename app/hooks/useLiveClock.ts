"use client";

import { useEffect, useState } from "react";

export type ShiftType = "morning" | "evening" | "dawn";

export interface ShiftInfo {
  type: ShiftType;
  name: string;
  label: string;
  period: string;
  tag: string;
}

export function getShiftInfo(date: Date = new Date()): ShiftInfo {
  const h = date.getHours();
  if (h >= 7 && h < 15) {
    return {
      type: "morning",
      name: "Shift Pagi (Morning)",
      label: "Shift Pagi",
      period: "07:00 – 14:59 WIB",
      tag: "MORNING",
    };
  } else if (h >= 15 && h < 23) {
    return {
      type: "evening",
      name: "Shift Sore (Evening)",
      label: "Shift Sore",
      period: "15:00 – 22:59 WIB",
      tag: "EVENING",
    };
  } else {
    return {
      type: "dawn",
      name: "Shift Malam / Subuh (Dawn)",
      label: "Shift Malam / Subuh",
      period: "23:00 – 06:59 WIB",
      tag: "DAWN / NIGHT",
    };
  }
}

export function useLiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds} WIB`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return time;
}

function getCurrentHour(date: Date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

/**
 * Returns the hour used by the monitoring schedule and updates only when that
 * value can change. The visual clock still updates once per second in Topbar.
 */
export function useCurrentHour() {
  const [hour, setHour] = useState(() => getCurrentHour());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextUpdate = () => {
      const now = new Date();
      setHour(getCurrentHour(now));
      const delay = 3_600_000 - (now.getMinutes() * 60_000 + now.getSeconds() * 1_000 + now.getMilliseconds()) + 20;
      timeoutId = setTimeout(scheduleNextUpdate, delay);
    };

    scheduleNextUpdate();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return hour;
}

export function useActiveShift() {
  const [shift, setShift] = useState<ShiftInfo>(() => getShiftInfo(new Date()));

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextUpdate = () => {
      const now = new Date();
      setShift(getShiftInfo(now));
      const delay = 3_600_000 - (now.getMinutes() * 60_000 + now.getSeconds() * 1_000 + now.getMilliseconds()) + 20;
      timeoutId = setTimeout(scheduleNextUpdate, delay);
    };

    scheduleNextUpdate();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return shift;
}
