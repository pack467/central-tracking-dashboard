"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/app/components/ui/Toast";

export type NotificationCategory =
  | "Ticket"
  | "Monitoring"
  | "Serah Terima"
  | "Temuan"
  | "SLA";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "Ticket",
  "Monitoring",
  "Serah Terima",
  "Temuan",
  "SLA",
];

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  category: NotificationCategory | string;
  project?: string;
  severity: "warning" | "critical" | "success" | "info";
  unread: boolean;
  createdAt: number;
  clientId?: string;
}

export function evaluateTicketSlaStatus(ticket: {
  id: string;
  subject?: string;
  project?: string;
  severity: string;
  slaTargetMinutes?: number;
  resolutionMinutes?: number;
  agingHours?: number;
  status?: string;
}): { status: "breached" | "approaching" | "nominal"; targetMinutes: number; actualMinutes: number; remainingMinutes: number } {
  const target = ticket.slaTargetMinutes || (ticket.severity.toLowerCase() === "critical" || ticket.severity.toLowerCase() === "high" ? 60 : 120);
  const actual = ticket.resolutionMinutes ?? (ticket.agingHours ? Math.round(ticket.agingHours * 60) : 0);
  const remaining = Math.max(0, target - actual);

  if (actual > target) {
    return { status: "breached", targetMinutes: target, actualMinutes: actual, remainingMinutes: 0 };
  }
  // Approaching breach if 75% of target time elapsed (or <= 20 minutes remaining)
  if (actual >= target * 0.75 || (remaining > 0 && remaining <= 20)) {
    return { status: "approaching", targetMinutes: target, actualMinutes: actual, remainingMinutes: remaining };
  }
  return { status: "nominal", targetMinutes: target, actualMinutes: actual, remainingMinutes: remaining };
}

export function normalizeNotificationCategory(category: string, title?: string): NotificationCategory {
  const cat = (category || "").trim().toLowerCase();
  const t = (title || "").toLowerCase();

  // SLA takes high priority
  if (cat === "sla" || t.includes("sla") || t.includes("batas waktu") || t.includes("breach") || t.includes("deadline")) return "SLA";
  if (cat === "ticket" || cat === "tickets" || t.includes("tiket") || t.includes("ad-hoc")) return "Ticket";
  if (cat === "serah terima" || cat === "shift" || cat === "handover" || t.includes("handover") || t.includes("serah terima") || t.includes("rotasi shift")) return "Serah Terima";
  if (cat === "temuan" || cat === "finding" || cat === "issue" || t.includes("temuan") || t.includes("anomali disk")) return "Temuan";
  
  // Re-home legacy "sistem" / "system" / housekeeping into "Monitoring"
  if (cat === "sistem" || cat === "system" || cat === "database" || cat === "network" || t.includes("sinkronisasi") || t.includes("pencadangan") || t.includes("switch core") || t.includes("ntp")) return "Monitoring";
  if (cat === "monitoring" || cat === "queue" || cat === "kafka" || cat === "usiem" || cat === "api" || cat === "cache") return "Monitoring";

  return "Monitoring";
}

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  // ── Tritronik Notifications ──
  {
    id: "notif-1",
    title: "Queue ActiveMQ 228 memerlukan validasi",
    message: "Penumpukan queue dilaporkan pada checkpoint 18:00 WIB. Belum ada konfirmasi dari penanggung jawab.",
    time: "10 menit lalu",
    category: "Monitoring",
    project: "SM",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 10 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-2",
    title: "Aliran pesan tidak ada pada topik b2b-f…",
    message: "Terdeteksi saat validasi Kafka UI. Periksa kesehatan producer sebelum checkpoint berikutnya.",
    time: "25 menit lalu",
    category: "Monitoring",
    project: "B2B",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 25 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-3",
    title: "Satu permintaan ad-hoc masih berlangsung",
    message: "Tinjau tugas approval entities EPC Tools sebelum handover shift.",
    time: "1 jam lalu",
    category: "Ticket",
    project: "EPC Tools",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 60 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-4",
    title: "Pemulihan Otomatis Gateway SIEM",
    message: "Uji kesehatan gateway log USIEM berhasil dipulihkan secara otomatis.",
    time: "1 jam lalu",
    category: "Monitoring",
    project: "USIEM",
    severity: "success",
    unread: false,
    createdAt: Date.now() - 65 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-5",
    title: "Temuan Anomali Disk I/O Server DB",
    message: "Temuan audit storage pada node DB-02 dicatat saat checklist: utilitas IOPS mencapai 94%.",
    time: "1.5 jam lalu",
    category: "Temuan",
    project: "DM",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 90 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-6",
    title: "Sinkronisasi Database D1 Berhasil",
    message: "Replikasi data handover dan audit log ke edge database selesai tanpa anomali.",
    time: "2 jam lalu",
    category: "Monitoring",
    project: "DM",
    severity: "info",
    unread: false,
    createdAt: Date.now() - 120 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-7",
    title: "Pencadangan Konfigurasi Switch Core",
    message: "Backup rutin konfigurasi perangkat jaringan NOC selesai pada storage cadangan.",
    time: "4 jam lalu",
    category: "Monitoring",
    project: "UNEM",
    severity: "info",
    unread: false,
    createdAt: Date.now() - 240 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-8",
    title: "Catatan Serah Terima Shift Siang Tersimpan",
    message: "Ringkasan handover shift siang telah diverifikasi oleh SPV. Siap untuk rotasi shift malam.",
    time: "5 jam lalu",
    category: "Serah Terima",
    project: "NOC",
    severity: "info",
    unread: false,
    createdAt: Date.now() - 300 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-9",
    title: "Penyelesaian Tiket Insiden #86d4054rh",
    message: "Tiket eskalasi latency berhasil ditutup oleh Galih Khairi setelah normalisasi rute.",
    time: "6 jam lalu",
    category: "Ticket",
    project: "EPC Tools",
    severity: "success",
    unread: false,
    createdAt: Date.now() - 360 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-10",
    title: "Peringatan SLA: Tiket #86d4052 mendekati batas waktu (15 menit tersisa)",
    message: "Tiket eskalasi EPC Tools mendekati batas toleransi SLA 60 menit. Sisa 15m sebelum eskalasi otomatis.",
    time: "15 menit lalu",
    category: "SLA",
    project: "EPC Tools",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 15 * 60 * 1000,
    clientId: "tritronik",
  },
  {
    id: "notif-11",
    title: "SLA Breach: Tiket Insiden #86d4041 terlampaui",
    message: "Waktu penanganan tiket incident SM melampaui batas SLA 120m (actual 142m). Sistem mengeksekusi eskalasi otomatis ke Lead Operator.",
    time: "2 jam lalu",
    category: "SLA",
    project: "SM",
    severity: "critical",
    unread: false,
    createdAt: Date.now() - 120 * 60 * 1000,
    clientId: "tritronik",
  },

  // ── Bank BNI Notifications ──
  {
    id: "notif-bni-1",
    title: "Lonjakan Latensi API Auth BNI Mobile",
    message: "Rata-rata respons API authentication nasabah mencapai 850ms pada checkpoint 20:00 WIB.",
    time: "15 menit lalu",
    category: "Monitoring",
    project: "BNI Mobile",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 15 * 60 * 1000,
    clientId: "bni",
  },
  {
    id: "notif-bni-2",
    title: "Peringatan SLA: Tiket #bni-86d402 (10 menit tersisa)",
    message: "Antrian transaksi kliring QRIS mendekati batas toleransi SLA 60m. Segera lakukan balancing thread pool.",
    time: "20 menit lalu",
    category: "SLA",
    project: "QRIS Settle",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 20 * 60 * 1000,
    clientId: "bni",
  },
  {
    id: "notif-bni-3",
    title: "SLA Breach: Batch Kliring QRIS Terlambat",
    message: "Antrian settlement transaksi pedagang melampaui SLA resolusi 60m (actual 75m). Eskalasi otomatis aktif.",
    time: "1 jam lalu",
    category: "SLA",
    project: "QRIS Settle",
    severity: "critical",
    unread: true,
    createdAt: Date.now() - 60 * 60 * 1000,
    clientId: "bni",
  },
  {
    id: "notif-bni-4",
    title: "Sinkronisasi Ledger Core Banking Selesai",
    message: "Replikasi data transaksi antar-cabang selesai diproses sebelum batas window EOD.",
    time: "3 jam lalu",
    category: "Monitoring",
    project: "Core Banking",
    severity: "info",
    unread: false,
    createdAt: Date.now() - 180 * 60 * 1000,
    clientId: "bni",
  },
  {
    id: "notif-bni-5",
    title: "Penyelesaian Tiket #bni-86d405 (Partner Whitelist)",
    message: "Pendaftaran CIDR partner pembayaran OpenBanking API berhasil diverifikasi oleh Pangondion.",
    time: "5 jam lalu",
    category: "Ticket",
    project: "OpenBanking",
    severity: "success",
    unread: false,
    createdAt: Date.now() - 300 * 60 * 1000,
    clientId: "bni",
  },

  // ── Telkomsel Notifications ──
  {
    id: "notif-tsel-1",
    title: "Diameter Session Charging OCS Mengalami Delay",
    message: "Waktu respons CCR/CCA Diameter melampaui ambang batas 450ms pada cluster node Surabaya.",
    time: "10 menit lalu",
    category: "Monitoring",
    project: "OCS Billing",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 10 * 60 * 1000,
    clientId: "telkomsel",
  },
  {
    id: "notif-tsel-2",
    title: "Peringatan SLA: Tiket #tsel-86d401 mendekati batas SLA",
    message: "Tiket penanganan latency OCS Billing tersisa 12 menit sebelum batas toleransi resolusi 60m terlampaui.",
    time: "25 menit lalu",
    category: "SLA",
    project: "OCS Billing",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 25 * 60 * 1000,
    clientId: "telkomsel",
  },
  {
    id: "notif-tsel-3",
    title: "Backlog Antrian USSD *363# Melampaui Batas",
    message: "Antrian menu promo internet mencapai 5.200 TPS pada checkpoint jam sibuk malam.",
    time: "40 menit lalu",
    category: "Monitoring",
    project: "USSD *363#",
    severity: "warning",
    unread: true,
    createdAt: Date.now() - 40 * 60 * 1000,
    clientId: "telkomsel",
  },
  {
    id: "notif-tsel-4",
    title: "Penyelesaian Tiket #tsel-86d405 (SMSC OTP Buffer)",
    message: "Buffer antrian SMS OTP banking partner telah dinormalisasi oleh Pangondion Kurniawan.",
    time: "4 jam lalu",
    category: "Ticket",
    project: "SMSC Core",
    severity: "success",
    unread: false,
    createdAt: Date.now() - 240 * 60 * 1000,
    clientId: "telkomsel",
  },
];

const SIMULATED_ALERTS: Array<Omit<NotificationItem, "id" | "time" | "createdAt">> = [
  // Tritronik Templates
  {
    title: "Peringatan SLA: Tiket #86d4078 mendekati batas (15 menit tersisa)",
    message: "Tiket prioritas tinggi EPC Tools memerlukan tindakan segera sebelum melewati batas toleransi SLA 60m.",
    category: "SLA",
    project: "EPC Tools",
    severity: "warning",
    unread: true,
    clientId: "tritronik",
  },
  {
    title: "SLA Breach Terdeteksi: Tiket #86d4063 terlampaui",
    message: "Tiket penanganan latency B2B terlewati dari target SLA. Notifikasi eskalasi otomatis dikirim ke Supervisor shift.",
    category: "SLA",
    project: "B2B",
    severity: "critical",
    unread: true,
    clientId: "tritronik",
  },
  {
    title: "Lonjakan Latensi API Switcher",
    message: "Rata-rata respons API payment melampaui ambang batas 1200ms pada node cluster 02.",
    category: "Monitoring",
    project: "EPC Core",
    severity: "critical",
    unread: true,
    clientId: "tritronik",
  },
  {
    title: "Koneksi Redis Cache Timeout",
    message: "Cluster Redis sesi operator mencatat 5 percobaan timeout berulang.",
    category: "Monitoring",
    project: "APH",
    severity: "warning",
    unread: true,
    clientId: "tritronik",
  },
  // BNI Templates
  {
    title: "Peringatan SLA: Tiket #bni-86d402 mendekati batas SLA",
    message: "Antrian transaksi settlement QRIS mendekati ambang batas toleransi resolusi 60m.",
    category: "SLA",
    project: "QRIS Settle",
    severity: "warning",
    unread: true,
    clientId: "bni",
  },
  {
    title: "Lonjakan Error Rate Gateway OpenBanking",
    message: "Error rate HTTP 504 pada gateway open banking mencapai 3.4% pada node Jakarta.",
    category: "Monitoring",
    project: "OpenBanking",
    severity: "critical",
    unread: true,
    clientId: "bni",
  },
  // Telkomsel Templates
  {
    title: "SLA Breach: Tiket #tsel-86d401 Diameter OCS Terlampaui",
    message: "Waktu resolusi tiket penanganan Diameter session charging telah melampaui SLA 60m.",
    category: "SLA",
    project: "OCS Billing",
    severity: "critical",
    unread: true,
    clientId: "telkomsel",
  },
  {
    title: "Utilisasi Link 5G Edge Jawa-Bali Mencapai 92%",
    message: "Trafik data 5G edge cloud regional Jawa-Bali mendekati kapasitas saturasi rute primer.",
    category: "Monitoring",
    project: "5G Edge",
    severity: "warning",
    unread: true,
    clientId: "telkomsel",
  },
];

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAsUnread: (id: string) => void;
  markAllAsRead: (clientId?: string) => void;
  clearAll: (clientId?: string) => void;
  removeNotification: (id: string) => void;
  simulateNotification: (clientId?: string) => void;
  resetNotifications: () => void;
  addNotification: (item: Omit<NotificationItem, "id" | "time" | "createdAt"> & { time?: string; createdAt?: number }) => void;
  getClientNotifications: (clientId?: string) => NotificationItem[];
  getClientUnreadCount: (clientId?: string) => number;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const STORAGE_KEY = "ctd.notifications.v6";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const notify = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const isHydratedRef = useRef(false);

  // Read localStorage after hydration to guarantee server-rendered HTML and initial client render match identically
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as NotificationItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotifications(
            parsed.map((item) => ({
              ...item,
              category: normalizeNotificationCategory(item.category, item.title),
            }))
          );
        }
      }
    } catch {
      // Ignore parse errors and fallback to initial
    }
    isHydratedRef.current = true;
  }, []);

  // Save to localStorage only after hydration
  useEffect(() => {
    if (!isHydratedRef.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // Ignore storage errors
    }
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  }, []);

  const markAsUnread = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback((clientId?: string) => {
    const targetCid = clientId ? clientId.toLowerCase() : null;
    setNotifications((prev) =>
      prev.map((n) => {
        const nCid = (n.clientId || "tritronik").toLowerCase();
        if (!targetCid || nCid === targetCid) {
          return { ...n, unread: false };
        }
        return n;
      })
    );
    notify.success("Semua notifikasi ditandai sudah dibaca.", {
      id: "notif-mark-all-read",
    });
  }, [notify]);

  const clearAll = useCallback((clientId?: string) => {
    const targetCid = clientId ? clientId.toLowerCase() : null;
    if (!targetCid) {
      setNotifications([]);
    } else {
      setNotifications((prev) =>
        prev.filter((n) => (n.clientId || "tritronik").toLowerCase() !== targetCid)
      );
    }
    notify.info("Notifikasi telah dibersihkan.", { id: "notif-clear-all" });
  }, [notify]);

  const removeNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      notify.info("Notifikasi dihapus.", { id: `notif-remove-${id}` });
    },
    [notify]
  );

  const getClientNotifications = useCallback(
    (clientId?: string) => {
      const cid = (clientId || "tritronik").toLowerCase();
      return notifications.filter((n) => {
        const nCid = (n.clientId || "tritronik").toLowerCase();
        return nCid === cid;
      });
    },
    [notifications]
  );

  const getClientUnreadCount = useCallback(
    (clientId?: string) => {
      const cid = (clientId || "tritronik").toLowerCase();
      return notifications.filter((n) => {
        const nCid = (n.clientId || "tritronik").toLowerCase();
        return nCid === cid && n.unread;
      }).length;
    },
    [notifications]
  );

  const addNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "time" | "createdAt"> & { time?: string; createdAt?: number }) => {
      const category = normalizeNotificationCategory(item.category, item.title);
      const newItem: NotificationItem = {
        ...item,
        category,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        time: item.time || "Baru saja",
        createdAt: item.createdAt || Date.now(),
        unread: item.unread ?? true,
        clientId: item.clientId || "tritronik",
      };

      setNotifications((prev) => [newItem, ...prev]);
      notify.info(`Notifikasi baru: ${newItem.title}`, {
        id: `add-notif-${newItem.id}`,
      });
    },
    [notify]
  );

  const simulateNotification = useCallback((clientId?: string) => {
    const targetCid = (clientId || "tritronik").toLowerCase();
    const candidateTemplates = SIMULATED_ALERTS.filter(
      (a) => (a.clientId || "tritronik").toLowerCase() === targetCid
    );
    const pool = candidateTemplates.length > 0 ? candidateTemplates : SIMULATED_ALERTS;
    const template = pool[Math.floor(Math.random() * pool.length)];

    const newItem: NotificationItem = {
      ...template,
      category: normalizeNotificationCategory(template.category, template.title),
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      time: "Baru saja",
      createdAt: Date.now(),
      unread: true,
      clientId: targetCid,
    };

    setNotifications((prev) => [newItem, ...prev]);
    notify.info(`Notifikasi baru: ${newItem.title}`, {
      id: `sim-notif-${newItem.id}`,
    });
  }, [notify]);

  const resetNotifications = useCallback(() => {
    setNotifications(INITIAL_NOTIFICATIONS);
    notify.success("Daftar notifikasi direset ke data awal.", {
      id: "notif-reset",
    });
  }, [notify]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      clearAll,
      removeNotification,
      simulateNotification,
      resetNotifications,
      addNotification,
      getClientNotifications,
      getClientUnreadCount,
    }),
    [
      notifications,
      unreadCount,
      markAsRead,
      markAsUnread,
      markAllAsRead,
      clearAll,
      removeNotification,
      simulateNotification,
      resetNotifications,
      addNotification,
      getClientNotifications,
      getClientUnreadCount,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
