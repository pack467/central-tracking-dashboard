"use client";

import { useState, useMemo, useEffect } from "react";
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

function getBubbleClass(item: NotificationItem): string {
  if (item.severity === "critical") return "bubble-critical";
  if (item.severity === "warning") return "bubble-warning";
  if (item.severity === "success") return "bubble-success";
  return "bubble-info";
}

function getCategoryClass(category: string): string {
  const clean = (category || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `cat-${clean}`;
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
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity">("newest");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter, statusFilter, categoryFilter, sortBy, pageSize]);

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
    setCurrentPage(1);
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

  return (
    <div className="notifications-page-container anim-fade">
      {/* ── Page Header ── */}
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot live-dot-pulse" /> PUSAT NOTIFIKASI SISTEM · {activeClient.name.toUpperCase()}
          </div>
          <div className="notifications-title-row">
            <span className="notifications-title-icon">
              <Bell size={18} />
            </span>
            <h1>Notifikasi — {activeClient.shortName}</h1>
          </div>
          <p className="notifications-header-desc">
            Daftar riwayat lengkap notifikasi, alert sistem, dan status pemantauan operasional untuk klien {activeClient.name}.
          </p>
        </div>

        <div className="page-actions">
          {unreadCount > 0 && (
            <button
              className="button button-secondary"
              onClick={() => markAllAsRead(activeClientId)}
              type="button"
            >
              <CheckCheck size={14} />
              <span>Tandai Semua Dibaca</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              className="button button-secondary"
              onClick={() => clearAll(activeClientId)}
              type="button"
              title="Bersihkan semua notifikasi dari daftar"
            >
              <Trash2 size={14} />
              <span>Bersihkan Semua</span>
            </button>
          )}

          <button
            className="button button-secondary"
            onClick={() => simulateNotification(activeClientId)}
            type="button"
            title="Tambah 1 notifikasi simulasi untuk menguji alert real-time"
          >
            <Plus size={14} />
            <span>Simulasi Alert</span>
          </button>

          {notifications.length === 0 && (
            <button
              className="button button-secondary"
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
      <section className="notifications-stats-grid" aria-label="Ringkasan statistik notifikasi">
        {/* Card 1: Total Notifikasi */}
        <div className="notif-stat-card">
          <span className="notif-stat-icon is-total" aria-hidden="true">
            <Bell size={18} strokeWidth={1.9} />
          </span>
          <div className="notif-stat-meta">
            <span className="notif-stat-val">{stats.total}</span>
            <span className="notif-stat-lbl">Total Notifikasi</span>
          </div>
        </div>

        {/* Card 2: Belum Dibaca */}
        <div className="notif-stat-card">
          <span className="notif-stat-icon is-unread" aria-hidden="true">
            <Info size={18} strokeWidth={1.9} />
          </span>
          <div className="notif-stat-meta">
            <span className="notif-stat-val">{stats.unread}</span>
            <span className="notif-stat-lbl">Belum Dibaca</span>
          </div>
        </div>

        {/* Card 3: Alert & Kritis */}
        <div className="notif-stat-card">
          <span className="notif-stat-icon is-alert" aria-hidden="true">
            <AlertTriangle size={18} strokeWidth={1.9} />
          </span>
          <div className="notif-stat-meta">
            <span className="notif-stat-val">{stats.warningOrCritical}</span>
            <span className="notif-stat-lbl">Peringatan / Kritis</span>
          </div>
        </div>

        {/* Card 4: Normal / Pulih */}
        <div className="notif-stat-card">
          <span className="notif-stat-icon is-resolved" aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={1.9} />
          </span>
          <div className="notif-stat-meta">
            <span className="notif-stat-val">{stats.nominalOrSuccess}</span>
            <span className="notif-stat-lbl">Sistem Pulih / Info</span>
          </div>
        </div>
      </section>

      {/* ── 2. Main Content Panel ── */}
      <article className="notifications-panel">
        {/* Toolbar & Filters */}
        <div className="notifications-toolbar">
          {/* Search Box */}
          <div className="notifications-search-box">
            <Search size={14} className="search-icon" style={{ opacity: 0.6 }} />
            <input
              type="text"
              placeholder="Cari notifikasi, pesan, topik..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Cari notifikasi"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCurrentPage(1);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--ink-muted)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                }}
                aria-label="Hapus pencarian"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Right-aligned Filter Cluster */}
          <div className="notifications-filters-right">
            {/* Date Range Picker */}
            <div className="notifications-date-filter-wrap">
              <DatePicker
                value={dateFilter}
                onChange={(val) => {
                  setDateFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="Semua Waktu"
                align="left"
                aria-label="Filter rentang tanggal notifikasi"
              />
            </div>

            {/* Status Tabs */}
            <div className="notifications-tab-group" role="tablist">
              <button
                type="button"
                className={`notifications-tab-btn ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
              >
                Semua
                <span className="notifications-tab-badge">{stats.total}</span>
              </button>
              <button
                type="button"
                className={`notifications-tab-btn ${statusFilter === "unread" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("unread");
                  setCurrentPage(1);
                }}
              >
                Belum Dibaca
                {stats.unread > 0 && (
                  <span className="notifications-tab-badge">{stats.unread}</span>
                )}
              </button>
              <button
                type="button"
                className={`notifications-tab-btn ${statusFilter === "read" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("read");
                  setCurrentPage(1);
                }}
              >
                Sudah Dibaca
              </button>
            </div>

            {/* Category Filter Dropdown */}
            <div className="filter-select-wrap">
              <Tag size={13} className="select-icon" />
              <select
                className="notifications-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
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
            <div className="filter-select-wrap">
              <ArrowUpDown size={13} className="select-icon" />
              <select
                className="notifications-select"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as "newest" | "oldest" | "severity");
                  setCurrentPage(1);
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
                className="button button-secondary button-sm notif-reset-filters-btn"
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
        <div className="notifications-cards-container" role="list">
          {paginatedNotifications.length > 0 ? (
            paginatedNotifications.map((item) => {
              const IconComp = getNotificationIcon(item);
              const bubbleClass = getBubbleClass(item);
              const categoryClass = getCategoryClass(item.category);

              return (
                <div
                  key={item.id}
                  className={`notification-card ${item.unread ? "is-unread" : "is-read"} severity-${item.severity}`}
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
                  <div className={`notif-icon-bubble ${bubbleClass}`} aria-hidden="true">
                    <IconComp size={18} strokeWidth={1.9} />
                  </div>

                  {/* Notification Content Body */}
                  <div className="notif-card-body">
                    <div className="notif-card-header">
                      <div className="notif-title-wrap">
                        <strong className="notif-card-title">{item.title}</strong>
                        {item.unread && (
                          <span className="notif-badge-new">
                            <span className="notif-new-dot" /> BARU
                          </span>
                        )}
                      </div>
                      <span className="notif-card-time">{item.time}</span>
                    </div>

                    <p className="notif-card-message">{item.message}</p>

                    <div className="notif-card-footer">
                      {/* Distinct Category Tag */}
                      <span className={`notif-category-tag ${categoryClass}`}>
                        {item.category}
                      </span>

                      {/* Right actions: Read indicator / Mark as read + Delete */}
                      <div className="notif-card-actions">
                        {item.unread ? (
                          <button
                            type="button"
                            className="notif-btn-markread"
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
                          <span className="notif-read-indicator" title="Sudah dibaca">
                            <Check size={12} strokeWidth={2.2} />
                            <span>Dibaca</span>
                          </span>
                        )}

                        <button
                          type="button"
                          className="notif-delete-btn"
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
            <div className="notif-empty-card">
              <div className={`notif-empty-icon ${hasActiveFilters ? "is-filter" : "is-nominal"}`} aria-hidden="true">
                {hasActiveFilters ? <Search size={22} /> : <CheckCircle2 size={24} />}
              </div>
              <h3 className="notif-empty-title">
                {hasActiveFilters ? "Tidak Ada Notifikasi yang Sesuai Filter" : "Tidak Ada Notifikasi Saat Ini"}
              </h3>
              <p className="notif-empty-msg">
                {hasActiveFilters
                  ? "Coba ubah kata kunci pencarian atau reset filter untuk melihat seluruh notifikasi."
                  : "Semua sistem pemantauan dan operasional berjalan dalam kondisi nominal tanpa kendala aktif."}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  onClick={clearFilters}
                >
                  <RotateCcw size={13} />
                  <span>Reset Filter</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="button button-secondary button-sm"
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
          <div className="roster-pagination-bar shift-log-pagination-bar">
            <div className="roster-pagination-left">
              <div className="roster-rows-per-page">
                <span className="roster-pagination-label">Rows per page:</span>
                <select
                  className="roster-filter-select roster-page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Jumlah notifikasi per halaman"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>

              <span className="roster-pagination-info">
                Menampilkan <strong>{totalFiltered === 0 ? 0 : startIdx + 1}–{endIdx}</strong> dari <strong>{totalFiltered}</strong> notifikasi
              </span>
            </div>

            <div className="roster-pagination-actions">
              <button
                type="button"
                className="roster-page-btn roster-page-nav"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                aria-label="Halaman sebelumnya"
              >
                Prev
              </button>

              <div className="roster-page-numbers">
                {pageNumbers.map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} className="roster-page-ellipsis">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      className={`roster-page-btn roster-page-num ${p === safeCurrentPage ? "active" : ""}`}
                      onClick={() => setCurrentPage(Number(p))}
                      aria-label={`Halaman ${p}`}
                      aria-current={p === safeCurrentPage ? "page" : undefined}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                className="roster-page-btn roster-page-nav"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages || totalPages <= 1}
                aria-label="Halaman berikutnya"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
