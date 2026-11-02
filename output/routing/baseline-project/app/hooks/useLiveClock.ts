"use client";

import { useEffect, useState } from "react";
import {
  getNextShiftChange,
  getShiftInfo,
  getShiftTransitionState,
  type ShiftId,
  type ShiftInfo,
  type ShiftTransitionState,
} from "@/app/lib/shifts";

export type ShiftType = ShiftId;
export type { ShiftInfo, ShiftTransitionState } from "@/app/lib/shifts";
export { getShiftInfo, getShiftTransitionState } from "@/app/lib/shifts";

export interface LiveClockState {
  time: string; // "22:35:42"
  timeWithZone: string; // "22:35:42 WIB"
  dateShort: string; // "12 Sep 2026"
  dateLong: string; // "12 September 2026"
  dateFull: string; // "Sabtu, 12 September 2026"
  dayName: string; // "Sabtu"
  dayNum: string; // "12"
  monthName: string; // "September"
  year: number; // 2026
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTHS_SHORT_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

const DAYS_ID = [
  "Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"
];

function getClockState(date: Date = new Date()): LiveClockState {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_ID[date.getMonth()];
  const monthShort = MONTHS_SHORT_ID[date.getMonth()];
  const year = date.getFullYear();
  const dayName = DAYS_ID[date.getDay()];

  return {
    time: `${hours}:${minutes}:${seconds}`,
    timeWithZone: `${hours}:${minutes}:${seconds} WIB`,
    dateShort: `${day} ${monthShort} ${year}`,
    dateLong: `${day} ${month} ${year}`,
    dateFull: `${dayName}, ${day} ${month} ${year}`,
    dayName,
    dayNum: day,
    monthName: month,
    year,
  };
}

export function useLiveClock(): LiveClockState | null {
  const [clock, setClock] = useState<LiveClockState | null>(null);

  useEffect(() => {
    const update = () => {
      setClock(getClockState(new Date()));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return clock;
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
      const delay = Math.max(1, getNextShiftChange(now).getTime() - now.getTime());
      timeoutId = setTimeout(scheduleNextUpdate, delay);
    };

    scheduleNextUpdate();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return shift;
}

export function useShiftTransition(): ShiftTransitionState {
  const [transition, setTransition] = useState<ShiftTransitionState>(() => getShiftTransitionState(new Date()));

  useEffect(() => {
    const update = () => {
      setTransition(getShiftTransitionState(new Date()));
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  return transition;
}
