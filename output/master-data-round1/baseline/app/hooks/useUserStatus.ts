"use client";

import { useEffect, useState, useCallback } from "react";

export type UserPresenceStatus = "Online" | "AFK" | "On Break" | "Busy";

export interface StatusConfig {
  key: UserPresenceStatus;
  label: UserPresenceStatus;
  color: string;
  glow: string;
  badgeBg: string;
  desc: string;
}

export const USER_STATUS_CONFIG: Record<UserPresenceStatus, StatusConfig> = {
  Online: {
    key: "Online",
    label: "Online",
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.45)",
    badgeBg: "rgba(34, 197, 94, 0.15)",
    desc: "Tersedia & aktif bertugas",
  },
  Busy: {
    key: "Busy",
    label: "Busy",
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.45)",
    badgeBg: "rgba(239, 68, 68, 0.15)",
    desc: "Fokus penanganan insiden",
  },
  "On Break": {
    key: "On Break",
    label: "On Break",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.45)",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    desc: "Istirahat / ISHOMA",
  },
  AFK: {
    key: "AFK",
    label: "AFK",
    color: "#a855f7",
    glow: "rgba(168, 85, 247, 0.45)",
    badgeBg: "rgba(168, 85, 247, 0.15)",
    desc: "Away From Keyboard (Sedang tidak di tempat)",
  },
};

export const STATUS_OPTIONS: StatusConfig[] = [
  USER_STATUS_CONFIG["Online"],
  USER_STATUS_CONFIG["Busy"],
  USER_STATUS_CONFIG["On Break"],
  USER_STATUS_CONFIG["AFK"],
];

const STORAGE_KEY = "ctd.user.status";
const EVENT_KEY = "ctd:user-status-changed";

export function getStatusRingStyle(
  status?: string,
  isCurrentUser = false,
  userPresenceStatus?: UserPresenceStatus
) {
  if (isCurrentUser && userPresenceStatus && USER_STATUS_CONFIG[userPresenceStatus]) {
    const cfg = USER_STATUS_CONFIG[userPresenceStatus];
    return {
      "--status-ring-color": cfg.color,
      "--status-ring-glow": cfg.glow,
    };
  }

  const s = (status || "").toLowerCase().trim();
  if (
    s === "online" ||
    s === "on duty" ||
    s === "on_duty" ||
    s === "active" ||
    s === "aktif" ||
    s === "bertugas" ||
    s === "sedang bertugas"
  ) {
    return {
      "--status-ring-color": "#22c55e",
      "--status-ring-glow": "rgba(34, 197, 94, 0.45)",
    };
  }
  if (s === "busy" || s === "critical") {
    return {
      "--status-ring-color": "#ef4444",
      "--status-ring-glow": "rgba(239, 68, 68, 0.45)",
    };
  }
  if (
    s === "on break" ||
    s === "break" ||
    s === "standby" ||
    s === "standby / online" ||
    s === "pagi"
  ) {
    return {
      "--status-ring-color": "#f59e0b",
      "--status-ring-glow": "rgba(245, 158, 11, 0.45)",
    };
  }
  if (s === "afk" || s === "on leave" || s === "leave") {
    return {
      "--status-ring-color": "#a855f7",
      "--status-ring-glow": "rgba(168, 85, 247, 0.45)",
    };
  }
  // Offline / Off Duty
  return {
    "--status-ring-color": "#64748b",
    "--status-ring-glow": "rgba(100, 116, 139, 0.25)",
  };
}

export function useUserStatus() {
  const [userStatus, setUserStatus] = useState<UserPresenceStatus>("Online");

  const readStatusFromStorage = useCallback(() => {
    if (typeof window === "undefined") return "Online";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "On Leave") {
        localStorage.setItem(STORAGE_KEY, "AFK");
        return "AFK";
      }
      if (saved && USER_STATUS_CONFIG[saved as UserPresenceStatus]) {
        return saved as UserPresenceStatus;
      }
    } catch {
      // ignore
    }
    return "Online";
  }, []);

  useEffect(() => {
    setUserStatus(readStatusFromStorage());

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserPresenceStatus>;
      if (customEvent.detail && USER_STATUS_CONFIG[customEvent.detail]) {
        setUserStatus(customEvent.detail);
      } else {
        setUserStatus(readStatusFromStorage());
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setUserStatus(readStatusFromStorage());
      }
    };

    window.addEventListener(EVENT_KEY, handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(EVENT_KEY, handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [readStatusFromStorage]);

  const setStatus = useCallback((nextStatus: UserPresenceStatus) => {
    setUserStatus(nextStatus);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, nextStatus);
        window.dispatchEvent(new CustomEvent(EVENT_KEY, { detail: nextStatus }));
      } catch {
        // ignore
      }
    }
  }, []);

  const currentStatusConfig = USER_STATUS_CONFIG[userStatus] || USER_STATUS_CONFIG["Online"];

  return {
    userStatus,
    currentStatusConfig,
    setStatus,
  };
}
