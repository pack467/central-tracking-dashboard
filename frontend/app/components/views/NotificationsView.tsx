"use client";
import { paths } from "@/app/lib/routes";


import { useUrlQuery, useUrlSearch } from "@/app/hooks/useUrlQuery";
import { notificationsSchema } from "@/app/lib/query-state";


import { useMemo } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Plus,
  RotateCcw,
  Search,
  X,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  Check,
  Database,
  Network,
  ShieldCheck,
  Ticket,
  Layers,
  Radio,
  Zap,
  Server,
  Clock,
  Timer,
  Tag,
  ArrowUpDown,
  type LucideIcon,
} from "lucide-react";
import { DatePicker } from "@/app/components/ui/DatePicker";
import { PaginationBar } from "@/app/components/ui/PaginationBar";
import {
  useNotifications,
  type NotificationItem,
  NOTIFICATION_CATEGORIES,
} from "@/app/context/NotificationContext";
import { useClient } from "@/app/context/ClientContext";

function getNotificationIcon(item: NotificationItem): LucideIcon {
  const cat = (item.category || "").toLowerCase();
  const title = (item.title || "").toLowerCase();

  // Primary purpose-based categories
  if (cat === "sla" || cat.includes("sla") || title.includes("sla") || title.includes("batas waktu") || title.includes("breach")) return Timer;
  if (cat === "ticket" || cat.includes("ticket") || cat.includes("tiket")) return Ticket;
  if (cat === "serah terima" || cat.includes("serah") || cat.includes("handover") || cat.includes("shift")) return Clock;
  if (cat === "temuan" || cat.includes("temuan") || cat.includes("finding") || cat.includes("isu")) return AlertTriangle;
  if (cat === "monitoring" || cat.includes("monitoring") || cat === "sistem" || cat.includes("sistem")) {
    if (title.includes("database") || title.includes("d1")) return Database;
    if (title.includes("switch") || title.includes("network") || title.includes("jaringan")) return Network;
    if (title.includes("queue") || title.includes("activemq") || title.includes("antrian")) return Layers;
    if (title.includes("siem") || title.includes("usiem") || title.includes("gateway")) return ShieldCheck;
    if (title.includes("api") || title.includes("latensi")) return Zap;
    if (title.includes("redis") || title.includes("cache") || title.includes("ntp")) return Server;
    return Radio;
  }

  // Legacy contextual fallbacks
  if (cat.includes("database") || title.includes("database")) return Database;
  if (cat.includes("network") || title.includes("switch") || title.includes("jaringan")) return Network;
  if (cat.includes("usiem") || title.includes("siem") || title.includes("gateway")) return ShieldCheck;
  if (cat.includes("queue") || title.includes("activemq")) return Layers;
  if (cat.includes("kafka") || title.includes("kafka")) return Radio;

  // Severity fallbacks
  if (item.severity === "critical") return AlertOctagon;
  if (item.severity === "warning") return AlertTriangle;
  if (item.severity === "success") return CheckCircle2;
  return Info;
}

function getBubbleClasses(severity: NotificationItem["severity"]): string {
  if (severity === "critical") return "bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red-border)]";
  if (severity === "warning") return "bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)]";
  if (severity === "success") return "bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green-border)]";
  return "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)]";
}

function getCategoryClasses(category: string): string {
  const clean = (category || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean === "ticket" || clean === "tickets") {
    return "bg-[rgba(56,189,248,0.12)] text-[#38bdf8] border-[rgba(56,189,248,0.3)]";
  }
  if (["monitoring", "queue", "kafka", "usiem", "api", "cache", "sistem", "system", "database", "network"].includes(clean)) {
    return "bg-[rgba(245,158,11,0.12)] text-[#fbbf24] border-[rgba(245,158,11,0.32)]";
  }
  if (["serahterima", "shift", "handover"].includes(clean)) {
    return "bg-[rgba(168,85,247,0.12)] text-[#a855f7] border-[rgba(168,85,247,0.3)]";
  }
  if (["temuan", "finding", "issue"].includes(clean)) {
    return "bg-[rgba(239,68,68,0.12)] text-[#f87171] border-[rgba(239,68,68,0.32)]";
  }
  if (clean === "sla") {
    return "bg-[rgba(255,107,74,0.14)] text-[#ff6b4a] border-[rgba(255,107,74,0.38)] font-bold tracking-[0.4px]";
  }
  return "bg-[rgba(148,163,184,0.1)] text-[var(--ink-secondary)] border-[var(--line)]";
}

function formatTimestampToYMD(timestamp?: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function NotificationsView() {
  const { activeClient, activeClientId } = useClient();
  const {
    getClientNotifications,
    getClientUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    simulateNotification,
    resetNotifications,
  } = useNotifications();

  const notifications = useMemo(
    () => getClientNotifications(activeClientId),
    [getClientNotifications, activeClientId]
  );

  const unreadCount = useMemo(
    () => getClientUnreadCount(activeClientId),
    [getClientUnreadCount, activeClientId]
  );

  // Filters and search state
  const url = useUrlQuery(notificationsSchema, paths.notifications);
  const searchDraft = useUrlSearch(url.values.q, url.field("q"));
  const search = searchDraft.effective;
  const setSearch = searchDraft.set;
  const dateFilter = url.values.date;
  const setDateFilter = url.field("date", "replace");
  const statusFilter = url.values.status;
  const setStatusFilter = url.field("status", "replace");
  const categoryFilter = url.values.category;
  const setCategoryFilter = url.field("category", "replace");
  const sortBy = url.values.sort;
  const setSortBy = url.field("sort", "replace");

  // Pagination state
  const currentPage = url.values.page;
  const setCurrentPage = url.field("page", "push");
  const pageSize = url.values.size;
  const setPageSize = url.field("size", "replace");

  // Available unique categories: standard purpose-based taxonomy + dynamic extras if any
  const categories = useMemo(() => {
    const canonicalOrder = [...NOTIFICATION_CATEGORIES];
    const found = new Set<string>();
    notifications.forEach((n) => {
      if (n.category) found.add(n.category);
    });

    // Ensure all canonical categories are present in the dropdown list in logical order
    const ordered: string[] = [];
    canonicalOrder.forEach((cat) => {
      ordered.push(cat);
      found.delete(cat);
    });

    // Any remaining custom categories appended alphabetically
    const extras = Array.from(found).sort();
    return [...ordered, ...extras];
  }, [notifications]);

  // Derived statistics
  const stats = useMemo(() => {
    let warningOrCritical = 0;
    let nominalOrSuccess = 0;

    notifications.forEach((n) => {
      if (n.severity === "warning" || n.severity === "critical") {
        warningOrCritical++;
      } else {
        nominalOrSuccess++;
      }
    });

    return {
      total: notifications.length,
      unread: unreadCount,
      read: notifications.length - unreadCount,
      warningOrCritical,
      nominalOrSuccess,
    };
  }, [notifications, unreadCount]);

  // Reset pagination when filter changes


  // Filtered & sorted notifications
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    // Status filter
    if (statusFilter === "unread") {
      result = result.filter((n) => n.unread);
    } else if (statusFilter === "read") {
      result = result.filter((n) => !n.unread);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((n) => n.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Date range filter
    if (dateFilter) {
      result = result.filter((n) => {
        const notifDate = formatTimestampToYMD(n.createdAt);
        if (!notifDate) return false;
        if (dateFilter.includes("..")) {
          const [start, end] = dateFilter.split("..");
          if (start && notifDate < start) return false;
          if (end && notifDate > end) return false;
          return true;
        }
        return notifDate === dateFilter;
      });
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q) ||
          n.category.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "oldest") {
        return (a.createdAt || 0) - (b.createdAt || 0);
      }
      if (sortBy === "severity") {
        const rank = (s: NotificationItem["severity"]) => {
          if (s === "critical") return 4;
          if (s === "warning") return 3;
          if (s === "info") return 2;
          return 1;
        };
        return rank(b.severity) - rank(a.severity);
      }
      // default: newest
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return result;
  }, [notifications, statusFilter, categoryFilter, dateFilter, search, sortBy]);

  const totalFiltered = filteredNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedNotifications = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredNotifications.slice(start, start + pageSize);
  }, [filteredNotifications, safeCurrentPage, pageSize]);

  const hasActiveFilters =
    search.trim() !== "" ||
    dateFilter !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    sortBy !== "newest";

  const clearFilters = () => {
    setSearch("");
    setDateFilter("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setSortBy("newest");
  };

  // Pagination page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalFiltered);

  const isAllActive = statusFilter === "all";
  const isUnreadActive = statusFilter === "unread";
  const isReadActive = statusFilter === "read";

  return (
    <div className="flex flex-col gap-[16px] w-full">
      {/* ── Page Header ── */}
      <section className="page-heading flex justify-between items-end mb-[22px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div>
          <div className="flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] tracking-[1px] font-bold font-mono uppercase">
            <span className="live-dot live-dot-pulse" /> NOTIFIKASI · {activeClient.code}
          </div>
          <div className="flex items-center gap-[10px] m-[7px_0_6px]">
            <span className="inline-grid place-items-center w-[30px] h-[30px] rounded-[8px] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)] text-[var(--accent-blue)] shrink-0">
              <Bell size={18} />
            </span>
            <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] leading-[1.2] tracking-[-0.4px] font-bold">Notifikasi</h1>
          </div>
        </div>

        <div className="page-actions flex gap-[9px]">
          {unreadCount > 0 && (
            <button
              className="button button-secondary transform-none"
              onClick={() => markAllAsRead(activeClientId)}
              type="button"
            >
              <CheckCheck size={14} />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              className="button button-secondary transform-none"
              onClick={() => clearAll(activeClientId)}
              type="button"
              title="Bersihkan semua notifikasi dari daftar"
            >
              <Trash2 size={14} />
              <span>Bersihkan Semua</span>
            </button>
          )}

          <button
            className="button button-secondary transform-none"
            onClick={() => simulateNotification(activeClientId)}
            type="button"
            title="Tambah 1 notifikasi simulasi untuk menguji alert real-time"
          >
            <Plus size={14} />
            <span>Simulasi Alert</span>
          </button>

          {notifications.length === 0 && (
            <button
              className="button button-secondary transform-none"
              onClick={resetNotifications}
              type="button"
              title="Muat ulang contoh data notifikasi awal"
            >
              <RotateCcw size={14} />
              <span>Reset Data Awal</span>
            </button>
          )}
        </div>
      </section>

      {/* ── 1. Top Summary Stat Cards ── */}
      <section className="grid grid-cols-4 max-[960px]:grid-cols-2 max-[540px]:grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] w-full" aria-label="Ringkasan statistik notifikasi">
        {/* Card 1: Total Notifikasi */}
        <div className="flex items-center gap-[14px] p-[12px_16px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] [box-shadow:var(--shadow-sm)] transition-[border-color,background] duration-150 ease-out hover:border-[var(--line)] hover:bg-[var(--panel-bg-hover)] transform-none">
          <span className="grid place-items-center w-[38px] h-[38px] rounded-[9px] shrink-0 bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)]" aria-hidden="true">
            <Bell size={18} strokeWidth={1.9} />
          </span>
          <div className="flex flex-col gap-[1px] min-w-0">
            <span className="text-[19px] font-bold text-[var(--ink-primary)] [font-family:var(--font-mono)] leading-[1.2]">{stats.total}</span>
            <span className="text-[11px] font-medium text-[var(--ink-muted)] whitespace-nowrap">Total Notifikasi</span>
          </div>
        </div>

        {/* Card 2: Belum Dibaca */}
        <div className="flex items-center gap-[14px] p-[12px_16px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] [box-shadow:var(--shadow-sm)] transition-[border-color,background] duration-150 ease-out hover:border-[var(--line)] hover:bg-[var(--panel-bg-hover)] transform-none">
          <span className="grid place-items-center w-[38px] h-[38px] rounded-[9px] shrink-0 bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)]" aria-hidden="true">
            <Info size={18} strokeWidth={1.9} />
          </span>
          <div className="flex flex-col gap-[1px] min-w-0">
            <span className="text-[19px] font-bold text-[var(--ink-primary)] [font-family:var(--font-mono)] leading-[1.2]">{stats.unread}</span>
            <span className="text-[11px] font-medium text-[var(--ink-muted)] whitespace-nowrap">Belum Dibaca</span>
          </div>
        </div>

        {/* Card 3: Alert & Kritis */}
        <div className="flex items-center gap-[14px] p-[12px_16px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] [box-shadow:var(--shadow-sm)] transition-[border-color,background] duration-150 ease-out hover:border-[var(--line)] hover:bg-[var(--panel-bg-hover)] transform-none">
          <span className="grid place-items-center w-[38px] h-[38px] rounded-[9px] shrink-0 bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red-border)]" aria-hidden="true">
            <AlertTriangle size={18} strokeWidth={1.9} />
          </span>
          <div className="flex flex-col gap-[1px] min-w-0">
            <span className="text-[19px] font-bold text-[var(--ink-primary)] [font-family:var(--font-mono)] leading-[1.2]">{stats.warningOrCritical}</span>
            <span className="text-[11px] font-medium text-[var(--ink-muted)] whitespace-nowrap">Peringatan / Kritis</span>
          </div>
        </div>

        {/* Card 4: Normal / Pulih */}
        <div className="flex items-center gap-[14px] p-[12px_16px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] [box-shadow:var(--shadow-sm)] transition-[border-color,background] duration-150 ease-out hover:border-[var(--line)] hover:bg-[var(--panel-bg-hover)] transform-none">
          <span className="grid place-items-center w-[38px] h-[38px] rounded-[9px] shrink-0 bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green-border)]" aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={1.9} />
          </span>
          <div className="flex flex-col gap-[1px] min-w-0">
            <span className="text-[19px] font-bold text-[var(--ink-primary)] [font-family:var(--font-mono)] leading-[1.2]">{stats.nominalOrSuccess}</span>
            <span className="text-[11px] font-medium text-[var(--ink-muted)] whitespace-nowrap">Sistem Pulih / Info</span>
          </div>
        </div>
      </section>

      {/* ── 2. Main Content Panel ── */}
      <article className="flex flex-col gap-0 overflow-hidden rounded-[12px] border border-[var(--panel-border)] bg-[var(--panel-bg)]">
        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-[12px] p-[14px_18px] border-b border-[var(--line)] bg-[var(--panel-bg)] max-[1140px]:gap-[10px] max-[900px]:gap-[12px]">
          {/* Search Box */}
          <div className="flex items-center gap-[8px] px-[10px] h-[34px] rounded-[8px] border border-[var(--panel-border)] bg-[var(--input-bg,#0f172a)] w-[270px] max-w-[320px] min-w-[180px] flex-[0_1_270px] box-border transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-[var(--accent-blue)] focus-within:[box-shadow:0_0_0_3px_rgba(56,189,248,0.12)] max-[1140px]:w-[220px] max-[1140px]:flex-[0_1_220px] max-[900px]:w-full max-[900px]:max-w-full max-[900px]:flex-[1_1_100%] transform-none">
            <Search size={14} className="opacity-60" />
            <input
              type="text"
              placeholder="Cari notifikasi, pesan, topik..."
              value={searchDraft.input}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              aria-label="Cari notifikasi"
              className="flex-1 bg-transparent [border:none] outline-none text-[var(--ink-primary)] text-[11.5px]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                }}
                className="bg-transparent [border:none] text-[var(--ink-muted)] cursor-pointer grid place-items-center"
                aria-label="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Right-aligned Filter Cluster */}
          <div className="flex items-center flex-wrap gap-[10px] justify-end ml-auto max-[900px]:w-full max-[900px]:justify-start max-[900px]:ml-0 max-[640px]:gap-[8px]">
            {/* Date Range Picker */}
            <div className="relative inline-flex items-center w-[195px] min-w-[165px] shrink-0 [&_[role='button']]:h-[34px] [&_[role='button']]:rounded-[8px] [&_[role='button']]:text-[11.5px] [&_[role='button']]:border [&_[role='button']]:border-[var(--panel-border)] [&_[role='button']]:bg-[var(--input-bg,#0f172a)] [&_[role='button']]:box-border [&_[role='button']:hover]:border-[rgba(148,163,184,0.35)] [&_[role='button']:focus]:border-[var(--accent-blue)] [&_[role='button']:focus]:[box-shadow:0_0_0_3px_rgba(56,189,248,0.12)] [&_[role='button'][aria-expanded='true']]:border-[var(--accent-blue)] [&_[role='button'][aria-expanded='true']]:[box-shadow:0_0_0_3px_rgba(56,189,248,0.12)] [&_[role='button']]:transform-none">
              <DatePicker
                value={dateFilter}
                onChange={(val) => {
                  setDateFilter(val);
                }}
                placeholder="Semua Waktu"
                align="left"
                aria-label="Filter rentang tanggal notifikasi"
              />
            </div>

            {/* Status Tabs */}
            <div className="inline-flex items-center h-[34px] p-[3px] rounded-[8px] bg-[var(--input-bg,#0f172a)] border border-[var(--panel-border)] box-border shrink-0 max-[640px]:w-full max-[640px]:justify-between" role="tablist">
              <button
                type="button"
                className={`inline-flex items-center gap-[6px] h-[26px] px-[9px] text-[11px] font-semibold rounded-[6px] [border:none] cursor-pointer transition-all duration-150 whitespace-nowrap max-[640px]:flex-1 max-[640px]:justify-center transform-none ${
                  isAllActive
                    ? "bg-[var(--panel-bg)] text-[var(--accent-blue)] [box-shadow:var(--shadow-sm)]"
                    : "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
                onClick={() => {
                  setStatusFilter("all");
                }}
              >
                Semua
                <span className="px-[5px] py-[1px] rounded-[99px] text-[9px] font-bold [font-family:var(--font-mono)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]">{stats.total}</span>
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-[6px] h-[26px] px-[9px] text-[11px] font-semibold rounded-[6px] [border:none] cursor-pointer transition-all duration-150 whitespace-nowrap max-[640px]:flex-1 max-[640px]:justify-center transform-none ${
                  isUnreadActive
                    ? "bg-[var(--panel-bg)] text-[var(--accent-blue)] [box-shadow:var(--shadow-sm)]"
                    : "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
                onClick={() => {
                  setStatusFilter("unread");
                }}
              >
                Belum Dibaca
                {stats.unread > 0 && (
                  <span className="px-[5px] py-[1px] rounded-[99px] text-[9px] font-bold [font-family:var(--font-mono)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]">{stats.unread}</span>
                )}
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-[6px] h-[26px] px-[9px] text-[11px] font-semibold rounded-[6px] [border:none] cursor-pointer transition-all duration-150 whitespace-nowrap max-[640px]:flex-1 max-[640px]:justify-center transform-none ${
                  isReadActive
                    ? "bg-[var(--panel-bg)] text-[var(--accent-blue)] [box-shadow:var(--shadow-sm)]"
                    : "bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]"
                }`}
                onClick={() => {
                  setStatusFilter("read");
                }}
              >
                Sudah Dibaca
              </button>
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative inline-flex items-center shrink-0 max-[640px]:flex-[1_1_calc(50%-4px)] has-[select[data-active='true']]:[&>.select-icon]:text-[#38bdf8]">
              <Tag size={13} className="select-icon absolute left-[10px] text-[var(--ink-muted)] pointer-events-none z-[1] transition-colors duration-150" />
              <select
                className="h-[34px] px-[28px] rounded-[8px] border border-[var(--panel-border)] bg-[var(--input-bg,#0f172a)] text-[var(--ink-primary)] text-[11.5px] font-medium outline-none cursor-pointer box-border appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%27http://www.w3.org/2000/svg%27_width=%2712%27_height=%2712%27_viewBox=%270_0_24_24%27_fill=%27none%27_stroke=%27%2364748b%27_stroke-width=%272.5%27_stroke-linecap=%27round%27_stroke-linejoin=%27round%27%3E%3Cpolyline_points=%276_9_12_15_18_9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_9px_center] transition-[border-color,box-shadow,color] duration-150 ease-out hover:border-[rgba(148,163,184,0.35)] focus:border-[var(--accent-blue)] focus:[box-shadow:0_0_0_3px_rgba(56,189,248,0.12)] data-[active='true']:border-[rgba(56,189,248,0.4)] data-[active='true']:text-[#38bdf8] max-[640px]:w-full transform-none"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                }}
                aria-label="Filter kategori notifikasi"
                data-active={categoryFilter !== "all" ? "true" : undefined}
              >
                <option value="all">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter Dropdown */}
            <div className="relative inline-flex items-center shrink-0 max-[640px]:flex-[1_1_calc(50%-4px)] has-[select[data-active='true']]:[&>.select-icon]:text-[#38bdf8]">
              <ArrowUpDown size={13} className="select-icon absolute left-[10px] text-[var(--ink-muted)] pointer-events-none z-[1] transition-colors duration-150" />
              <select
                className="h-[34px] px-[28px] rounded-[8px] border border-[var(--panel-border)] bg-[var(--input-bg,#0f172a)] text-[var(--ink-primary)] text-[11.5px] font-medium outline-none cursor-pointer box-border appearance-none bg-[url('data:image/svg+xml,%3Csvg_xmlns=%27http://www.w3.org/2000/svg%27_width=%2712%27_height=%2712%27_viewBox=%270_0_24_24%27_fill=%27none%27_stroke=%27%2364748b%27_stroke-width=%272.5%27_stroke-linecap=%27round%27_stroke-linejoin=%27round%27%3E%3Cpolyline_points=%276_9_12_15_18_9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_9px_center] transition-[border-color,box-shadow,color] duration-150 ease-out hover:border-[rgba(148,163,184,0.35)] focus:border-[var(--accent-blue)] focus:[box-shadow:0_0_0_3px_rgba(56,189,248,0.12)] data-[active='true']:border-[rgba(56,189,248,0.4)] data-[active='true']:text-[#38bdf8] max-[640px]:w-full transform-none"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as "newest" | "oldest" | "severity");
                }}
                aria-label="Urutkan notifikasi"
                data-active={sortBy !== "newest" ? "true" : undefined}
              >
                <option value="newest">Terbaru (Newest)</option>
                <option value="oldest">Terlama (Oldest)</option>
                <option value="severity">Tingkat Keparahan</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                className="button button-secondary button-sm h-[30px] rounded-[8px] px-[10px] text-[11.5px] inline-flex items-center gap-[5px] whitespace-nowrap shrink-0 max-[640px]:w-full max-[640px]:justify-center transform-none"
                onClick={clearFilters}
                title="Reset semua filter ke kondisi awal"
              >
                <RotateCcw size={12} />
                <span>Reset Filter</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 3. Notification Cards List ── */}
        <div className="flex flex-col gap-[10px] p-[16px_18px] bg-[var(--bg)] min-h-[260px]" role="list">
          {paginatedNotifications.length > 0 ? (
            paginatedNotifications.map((item) => {
              const IconComp = getNotificationIcon(item);
              const bubbleClasses = getBubbleClasses(item.severity);
              const categoryClasses = getCategoryClasses(item.category);

              return (
                <div
                  key={item.id}
                  className={`relative flex items-start gap-[14px] p-[14px_18px] rounded-[10px] [box-shadow:0_1px_3px_rgba(0,0,0,0.2)] cursor-pointer text-left transition-[border-color,background] duration-150 ease-out transform-none border ${
                    item.unread
                      ? "bg-[color-mix(in_srgb,var(--accent-blue-soft)_35%,var(--panel-bg))] border-[color-mix(in_srgb,var(--accent-blue-border)_70%,var(--panel-border))] border-l-[3.5px] border-l-[var(--accent-blue)] hover:bg-[color-mix(in_srgb,var(--accent-blue-soft)_55%,var(--panel-bg))]"
                      : "bg-[var(--panel-bg)] opacity-90 hover:opacity-100 hover:bg-[var(--panel-bg-hover)] border-[var(--panel-border)] hover:border-[var(--line)]"
                  }`}
                  onClick={() => markAsRead(item.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Notifikasi: ${item.title}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      markAsRead(item.id);
                    }
                  }}
                >
                  {/* Category/Severity Circular Icon Bubble */}
                  <div className={`grid place-items-center w-[38px] h-[38px] rounded-[50%] shrink-0 transform-none ${bubbleClasses}`} aria-hidden="true">
                    <IconComp size={18} strokeWidth={1.9} />
                  </div>

                  {/* Notification Content Body */}
                  <div className="flex-1 min-w-0 flex flex-col gap-[4px]">
                    <div className="flex items-baseline justify-between gap-[12px]">
                      <div className="flex items-center gap-[8px] min-w-0">
                        <strong className={`text-[13.5px] leading-[1.35] whitespace-nowrap overflow-hidden text-ellipsis ${item.unread ? "font-bold text-[#ffffff]" : "font-semibold text-[var(--ink-primary)]"}`}>
                          {item.title}
                        </strong>
                        {item.unread && (
                          <span className="inline-flex items-center gap-[4px] px-[7px] py-[2px] rounded-[99px] bg-[var(--accent-blue)] text-[#090d16] text-[9.5px] font-extrabold [font-family:var(--font-mono)] tracking-[0.4px] shrink-0">
                            <span className="w-[5px] h-[5px] rounded-[50%] bg-[#090d16]" /> BARU
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[var(--ink-muted)] text-[11px] [font-family:var(--font-mono)]">{item.time}</span>
                    </div>

                    <p className="m-[2px_0_6px] text-[var(--ink-secondary)] text-[12px] leading-[1.5]">{item.message}</p>

                    <div className="flex items-center gap-[8px] mt-[2px] flex-wrap">
                      {/* Distinct Category Tag */}
                      <span className={`inline-flex items-center px-[8px] py-[2px] rounded-[5px] text-[10.5px] font-semibold [font-family:var(--font-mono)] tracking-[0.3px] border ${categoryClasses}`}>
                        {item.category}
                      </span>

                      {/* Right actions: Read indicator / Mark as read + Delete */}
                      <div className="ml-auto inline-flex items-center gap-[8px]">
                        {item.unread ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-[4px] px-[9px] py-[3px] text-[11px] font-semibold text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)] rounded-[6px] cursor-pointer transition-all duration-150 ease-out hover:bg-[color-mix(in_srgb,var(--accent-blue-soft)_120%,var(--accent-blue)_25%)] hover:border-[var(--accent-blue)] transform-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(item.id);
                            }}
                            title="Tandai sudah dibaca"
                          >
                            <Check size={12} strokeWidth={2.2} />
                            <span>Tandai Dibaca</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-[4px] text-[11px] [font-family:var(--font-mono)] text-[var(--ink-muted)] bg-[rgba(148,163,184,0.08)] px-[7px] py-[2px] rounded-[4px]" title="Sudah dibaca">
                            <Check size={12} strokeWidth={2.2} />
                            <span>Dibaca</span>
                          </span>
                        )}

                        <button
                          type="button"
                          className="grid place-items-center w-[26px] h-[26px] rounded-full border border-transparent bg-transparent text-[var(--ink-muted)] cursor-pointer transition-colors duration-150 hover:text-[var(--red)] hover:bg-[var(--red-soft)] hover:border-[var(--red-border)] transform-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(item.id);
                          }}
                          title="Hapus notifikasi ini"
                          aria-label="Hapus notifikasi ini"
                        >
                          <X size={13} strokeWidth={2.2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-[48px_24px] gap-[12px]">
              <div className={`grid place-items-center w-[52px] h-[52px] rounded-[50%] mb-[4px] border ${hasActiveFilters ? "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border-[var(--accent-blue-border)]" : "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green-border)]"}`} aria-hidden="true">
                {hasActiveFilters ? <Search size={22} /> : <CheckCircle2 size={24} />}
              </div>
              <h3 className="m-0 text-[15px] font-bold text-[var(--ink-primary)]">
                {hasActiveFilters ? "Tidak Ada Notifikasi yang Sesuai Filter" : "Tidak Ada Notifikasi Saat Ini"}
              </h3>
              <p className="m-0 text-[12px] text-[var(--ink-secondary)] max-w-[380px] leading-[1.5]">
                {hasActiveFilters
                  ? "Coba ubah kata kunci pencarian atau reset filter untuk melihat seluruh notifikasi."
                  : "Semua sistem pemantauan dan operasional berjalan dalam kondisi nominal tanpa kendala aktif."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-[6px] h-[30px] px-[10px] text-[11.5px] font-semibold rounded-[7px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-primary)] cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] transform-none"
                  onClick={clearFilters}
                >
                  <RotateCcw size={13} />
                  <span>Reset Filter</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-[6px] h-[30px] px-[10px] text-[11.5px] font-semibold rounded-[7px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-primary)] cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] transform-none"
                  onClick={() => simulateNotification(activeClientId)}
                >
                  <Plus size={13} />
                  <span>Simulasi Alert</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── 4. Pagination Bar ── */}
        {totalFiltered > 0 && (
          <PaginationBar
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
            }}
            currentPage={safeCurrentPage}
            onPageChange={setCurrentPage}
            totalCount={totalFiltered}
            startIdx={startIdx}
            endIdx={endIdx}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            pageSizeOptions={[5, 10, 20, 50]}
            itemLabel="notifikasi"
            className="rounded-b-[10px] mt-[12px]"
            selectAriaLabel="Jumlah notifikasi per halaman"
          />
        )}
      </article>
    </div>
  );
}


