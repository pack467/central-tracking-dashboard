"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Layers,
  Ticket as TicketIcon,
  CheckSquare,
  ArrowRight,
  Check,
  Clock,
  ChevronLeft,
  ChevronRight,
  Grid,
  SlidersHorizontal,
  Info,
  Flame,
} from "lucide-react";
import { useClient, type ClientOrganization, type ClientId } from "@/app/context/ClientContext";
import {
  getClientMonitoringSchedule,
  getClientTickets,
  getClientHandoverTasks,
  ALL_COMBINED_SEED_TICKETS,
} from "@/app/lib/clientData";
import { rowKey } from "@/app/components/dashboard/MonitoringSchedule";
import { useToast } from "@/app/components/ui/Toast";
import { NoImagePlaceholder } from "@/app/components/ui/NoImagePlaceholder";
import type { CheckpointAssessment, HandoverTask, Ticket } from "@/app/lib/types";

interface ClientStatusGridProps {
  allTickets?: Ticket[];
  assessments?: Record<string, CheckpointAssessment>;
  onNavigateToMonitoring?: () => void;
  activeHandoverTasks?: HandoverTask[];
  overrideClients?: readonly ClientOrganization[];
  forceShowSingleClient?: boolean;
}

type StatusFilterType = "all" | "urgent" | "healthy";

export function ClientStatusGrid({
  allTickets,
  assessments = {},
  onNavigateToMonitoring,
  activeHandoverTasks,
  overrideClients,
  forceShowSingleClient = false,
}: ClientStatusGridProps) {
  const { clients, activeClientId, setActiveClientId } = useClient();
  const notify = useToast();

  // Status Filter: "all" (default), "urgent" (needs action), "healthy" (nominal)
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");

  // View mode for > 3 clients: carousel (horizontal scroll) vs expanded (multi-row grid)
  const [isExpanded, setIsExpanded] = useState(false);

  // Scroll state & ref for horizontal carousel
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollIndex, setScrollIndex] = useState(0);

  // Effective clients (allows override for testing/props)
  const effectiveClients = useMemo(() => {
    return overrideClients ?? clients;
  }, [overrideClients, clients]);

  const clientCount = effectiveClients.length;

  // 1. Compute summaries for every client
  const clientSummaries = useMemo(() => {
    const rawTickets = allTickets ?? ALL_COMBINED_SEED_TICKETS;

    return effectiveClients.map((client) => {
      // Schedule & Checkpoints
      const schedule = getClientMonitoringSchedule(client.id);
      const totalCheckpoints = schedule.length;

      let completedCheckpoints = 0;
      let nokCount = 0;
      schedule.forEach((item) => {
        const key = rowKey(item);
        const a = assessments[key];
        const hasVerdict = Boolean(a?.verdict);
        const isCompleted = hasVerdict || (item.state !== "Upcoming" && item.state !== "Mendatang");
        if (isCompleted) {
          completedCheckpoints++;
        }
        if (hasVerdict) {
          if (a.verdict === "nok" || a.verdict === "not-adequate") nokCount++;
        } else if (item.tone === "warning") {
          nokCount++;
        }
      });

      const nokRate = totalCheckpoints > 0 ? Math.round((nokCount / totalCheckpoints) * 100) : 0;

      // Tickets
      const tickets = getClientTickets(rawTickets, client.id);
      const totalTickets = tickets.length;
      const openTickets = tickets.filter((t) => t.status !== "Closed").length;
      const criticalTickets = tickets.filter(
        (t) => t.status !== "Closed" && (t.severity === "Critical" || t.severity === "High")
      ).length;

      // Operational Tasks (Handover Checklist)
      const tasks = getClientHandoverTasks(client.id, activeHandoverTasks, activeClientId);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.completed || t.state === "repeat").length;
      const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Health status verdict
      const hasCritical = criticalTickets > 0 || nokCount >= 2;
      const hasWarning = nokCount > 0 || openTickets > 0;
      const isUnassessed = completedCheckpoints === 0 && openTickets === 0;

      let statusLabel: string;
      let statusTone: "success" | "warning" | "danger" | "neutral";
      let urgencyRank: number; // Lower number = higher priority / urgency

      if (hasCritical) {
        statusLabel = "Perlu Mitigasi";
        statusTone = "danger";
        urgencyRank = 0;
      } else if (hasWarning) {
        statusLabel = "Perlu Perhatian";
        statusTone = "warning";
        urgencyRank = 1;
      } else if (isUnassessed) {
        statusLabel = "Belum Ada Data";
        statusTone = "neutral";
        urgencyRank = 4;
      } else {
        statusLabel = "All Normal";
        statusTone = "success";
        urgencyRank = 3;
      }

      const isActive = client.id === activeClientId;
      // If client is currently active and normal, surface it slightly higher than other normal clients
      if (isActive && urgencyRank === 3) {
        urgencyRank = 2;
      }

      return {
        client,
        totalCheckpoints,
        completedCheckpoints,
        nokCount,
        nokRate,
        totalTickets,
        openTickets,
        criticalTickets,
        totalTasks,
        completedTasks,
        taskPct,
        statusLabel,
        statusTone,
        urgencyRank,
        isActive,
      };
    });
  }, [effectiveClients, activeClientId, allTickets, assessments, activeHandoverTasks]);

  // 2. Compute Fleet Health Metrics for Executive Tally
  const dangerCount = useMemo(
    () => clientSummaries.filter((s) => s.statusTone === "danger").length,
    [clientSummaries]
  );
  const warningCount = useMemo(
    () => clientSummaries.filter((s) => s.statusTone === "warning").length,
    [clientSummaries]
  );
  const healthyCount = useMemo(
    () => clientSummaries.filter((s) => s.statusTone === "success").length,
    [clientSummaries]
  );
  const urgentCount = dangerCount + warningCount;

  // 3. Strict Urgency Auto-Sorting: Distressed clients ALWAYS appear at the very front
  const sortedSummaries = useMemo(() => {
    return [...clientSummaries].sort((a, b) => {
      // Primary: Urgency Rank (0: Danger, 1: Warning, 2: Active Normal, 3: Normal, 4: Neutral)
      if (a.urgencyRank !== b.urgencyRank) {
        return a.urgencyRank - b.urgencyRank;
      }
      // Secondary: Critical tickets descending
      if (b.criticalTickets !== a.criticalTickets) {
        return b.criticalTickets - a.criticalTickets;
      }
      // Tertiary: Open tickets descending
      if (b.openTickets !== a.openTickets) {
        return b.openTickets - a.openTickets;
      }
      // Quaternary: NOK count descending
      if (b.nokCount !== a.nokCount) {
        return b.nokCount - a.nokCount;
      }
      return a.client.shortName.localeCompare(b.client.shortName);
    });
  }, [clientSummaries]);

  // 4. Apply Status Filter
  const displaySummaries = useMemo(() => {
    if (statusFilter === "urgent") {
      return sortedSummaries.filter(
        (s) => s.statusTone === "danger" || s.statusTone === "warning"
      );
    }
    if (statusFilter === "healthy") {
      return sortedSummaries.filter(
        (s) => s.statusTone === "success" || s.statusTone === "neutral"
      );
    }
    return sortedSummaries;
  }, [sortedSummaries, statusFilter]);

  const displayCount = displaySummaries.length;

  // 5. Carousel Scroll Logic (Clean, no visible scrollbar)
  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);

    const firstCard = el.querySelector(".client-status-card") as HTMLElement | null;
    const cardWidth = firstCard ? firstCard.offsetWidth + 14 : 350;
    const idx = Math.min(Math.round(scrollLeft / cardWidth), Math.max(0, displayCount - 1));
    setScrollIndex(Math.max(0, idx));
  }, [displayCount]);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, displayCount, isExpanded]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector(".client-status-card") as HTMLElement | null;
    const step = firstCard ? firstCard.offsetWidth + 14 : 350;
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  const handleSelectClient = (clientId: ClientId, clientName: string) => {
    if (clientId !== activeClientId) {
      setActiveClientId(clientId);
      notify.info(`Beralih ke pemantauan klien: ${clientName}`, {
        id: `switch-client-${clientId}`,
      });
    }
  };

  // Scenario 2: Single-tenant handling
  const isSingleClient = clientCount <= 1;

  if (isSingleClient && !forceShowSingleClient) {
    return null;
  }

  // Determine grid container classes
  const isMultiRow = isExpanded;
  const isCarousel = displayCount > 3 && !isMultiRow;
  const isTwoClients = displayCount === 2;

  let gridClassName = "client-cards-grid";
  if (isSingleClient) {
    gridClassName += " single-client-grid";
  } else if (isTwoClients) {
    gridClassName += " two-client-grid";
  } else if (isCarousel) {
    gridClassName += " carousel-mode";
  } else if (isMultiRow) {
    gridClassName += " expanded-grid-mode";
  }

  return (
    <section className="client-status-section" aria-label="Status operasional per klien atau tenant">
      {/* ── Executive Header: Title + Real-Time Triage Tally + Quick Filter Chips ── */}
      <div className="client-status-header">
        <div className="client-status-header-text">
          <div className="client-title-row">
            <span className="client-status-title">
              STATUS PER KLIEN / TENANT ({clientCount} TERPANTAU)
            </span>

            {/* Executive Triage Tally Badges: 0-second health glance */}
            <div className="client-triage-summary" aria-label="Ringkasan kesehatan seluruh klien">
              {dangerCount > 0 && (
                <span className="client-triage-pill triage-danger" title={`${dangerCount} klien memiliki tiket kritis atau checkpoint gagal`}>
                  <Flame size={11} strokeWidth={2.5} />
                  <span>{dangerCount} Perlu Mitigasi</span>
                </span>
              )}
              {warningCount > 0 && (
                <span className="client-triage-pill triage-warning" title={`${warningCount} klien memiliki tiket aktif atau potensi anomali`}>
                  <AlertTriangle size={11} strokeWidth={2.5} />
                  <span>{warningCount} Perlu Perhatian</span>
                </span>
              )}
              <span className="client-triage-pill triage-success" title={`${healthyCount} klien dalam kondisi normal tanpa isu aktif`}>
                <Check size={11} strokeWidth={2.5} />
                <span>{healthyCount} Normal</span>
              </span>
            </div>

            {/* Carousel Position Badge (when in carousel mode) */}
            {isCarousel && (
              <span className="client-carousel-counter-badge">
                {scrollIndex + 1}–{Math.min(scrollIndex + 3, displayCount)} dari {displayCount}
              </span>
            )}
          </div>

          <p className="client-status-subtitle">
            Ringkasan kesehatan seluruh tenant. Diurutkan otomatis berdasarkan urgensi operasional (isu kritis selalu tampil terdepan).
          </p>
        </div>

        {/* ── Action Strip: Quick Filter Chips + View Mode & Carousel Nav ── */}
        <div className="client-header-controls">
          {/* Quick Status Filter Chips (only when > 3 clients) */}
          {clientCount > 3 && (
            <div className="client-filter-chips" role="tablist" aria-label="Filter status klien">
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "all"}
                className={`client-filter-chip ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                <span>Semua</span>
                <span className="chip-count">({clientCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "urgent"}
                className={`client-filter-chip chip-urgent ${statusFilter === "urgent" ? "active" : ""}`}
                onClick={() => setStatusFilter("urgent")}
                title="Tampilkan hanya klien yang memerlukan tindakan atau mitigasi"
              >
                {urgentCount > 0 && <span className="chip-urgent-dot" />}
                <span>Perlu Tindakan</span>
                <span className="chip-count">({urgentCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "healthy"}
                className={`client-filter-chip ${statusFilter === "healthy" ? "active" : ""}`}
                onClick={() => setStatusFilter("healthy")}
              >
                <span>Normal</span>
                <span className="chip-count">({healthyCount})</span>
              </button>
            </div>
          )}

          {/* Navigation Controls for Carousel and Grid Toggle */}
          {displayCount > 3 && (
            <div className="client-carousel-nav-group">
              {!isMultiRow && (
                <div className="client-carousel-nav" role="group" aria-label="Navigasi carousel klien">
                  <button
                    type="button"
                    className="carousel-nav-btn"
                    onClick={() => scroll("left")}
                    disabled={!canScrollLeft}
                    aria-label="Klien sebelumnya"
                    title="Gulir ke klien sebelumnya"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    className="carousel-nav-btn"
                    onClick={() => scroll("right")}
                    disabled={!canScrollRight}
                    aria-label="Klien berikutnya"
                    title="Gulir ke klien berikutnya"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* View Mode Toggle: Compact Carousel vs Multi-Row Grid */}
              <button
                type="button"
                className="client-view-toggle-btn"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Kembali ke mode baris tunggal" : "Buka semua kartu dalam grid bertingkat"}
              >
                {isExpanded ? (
                  <>
                    <SlidersHorizontal size={13} />
                    <span>Mode Geser</span>
                  </>
                ) : (
                  <>
                    <Grid size={13} />
                    <span>Lihat Semua ({displayCount})</span>
                  </>
                )}
              </button>
            </div>
          )}

          {displayCount <= 3 && (
            <span className="client-status-hint">
              Klik kartu klien untuk berpindah konteks
            </span>
          )}
        </div>
      </div>

      {/* ── Single-Client Note (if forced mode) ── */}
      {isSingleClient && (
        <div className="single-client-notice">
          <Info size={14} className="notice-icon" />
          <span>
            <strong>Mode Tenant Tunggal:</strong> Kartu klien berukuran proporsional (tidak meregang). Bagian cross-tenant otomatis tersembunyi pada konfigurasi single-tenant riil.
          </span>
        </div>
      )}

      {/* ── Empty State if filter returns 0 ── */}
      {displayCount === 0 && (
        <div className="client-empty-filter-state">
          <Check size={18} className="text-emerald-400" />
          <span>Tidak ada klien yang memerlukan tindakan darurat saat ini. Seluruh sistem beroperasi nominal.</span>
          <button
            type="button"
            className="client-reset-filter-btn"
            onClick={() => setStatusFilter("all")}
          >
            Tampilkan Semua Klien
          </button>
        </div>
      )}

      {/* ── Cards Track / Grid Container ── */}
      {displayCount > 0 && (
        <div className="client-carousel-wrapper">
          {/* Subtle edge fades (only in carousel mode) */}
          {isCarousel && (
            <>
              <div
                className={`carousel-fade-edge carousel-fade-left ${canScrollLeft ? "is-visible" : ""}`}
                aria-hidden="true"
              />
              <div
                className={`carousel-fade-edge carousel-fade-right ${canScrollRight ? "is-visible" : ""}`}
                aria-hidden="true"
              />
            </>
          )}

          <div
            ref={scrollRef}
            className={gridClassName}
            tabIndex={isCarousel ? 0 : undefined}
            role={isCarousel ? "region" : undefined}
            aria-label={isCarousel ? "Daftar klien yang dapat digeser" : undefined}
          >
            {displaySummaries.map(
              ({
                client,
                totalCheckpoints,
                completedCheckpoints,
                nokCount,
                nokRate,
                totalTickets,
                openTickets,
                totalTasks,
                completedTasks,
                taskPct,
                statusLabel,
                statusTone,
                isActive,
              }) => {
                const checkpointPct = Math.round(
                  (completedCheckpoints / (totalCheckpoints || 1)) * 100
                );
                const ticketPct = Math.round(
                  (openTickets / (totalTickets || 1)) * 100
                );

                const isDistressed = statusTone === "danger" || statusTone === "warning";

                return (
                  <div
                    key={client.id}
                    role="button"
                    tabIndex={0}
                    className={`client-status-card ${isActive ? "active-client-card" : ""} ${
                      statusTone === "danger"
                        ? "card-tone-danger"
                        : statusTone === "warning"
                        ? "card-tone-warning"
                        : ""
                    }`}
                    onClick={() => handleSelectClient(client.id, client.shortName)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectClient(client.id, client.shortName);
                      }
                    }}
                    aria-pressed={isActive}
                    title={`Klik untuk beralih ke organisasi ${client.name}`}
                  >
                    {/* Top: Identity & Status */}
                    <div className="client-card-top">
                      <div className="client-card-identity">
                        <NoImagePlaceholder />
                        <div className="client-meta-names">
                          <div className="client-meta-title-row">
                            <strong className="client-card-name">{client.shortName}</strong>
                          </div>
                          <span className="client-card-fullname">{client.name}</span>
                        </div>
                      </div>

                      <div className="client-card-badges">
                        {isActive && <span className="client-active-tag">Active</span>}
                        <span className={`client-dot dot-${statusTone}`} aria-hidden="true" />
                      </div>
                    </div>

                    {/* Middle: 4 Compact Key Metrics with Fraction Progress */}
                    <div className="client-metrics-row">
                      {/* 1. Checkpoints: Completed / Total */}
                      <div className="client-metric-cell">
                        <span className="client-metric-cell-label" title="Checkpoints">
                          <Layers size={10} strokeWidth={2.2} className="client-metric-icon" />
                          <span className="client-metric-label-text">Checkpoints</span>
                        </span>
                        <div className="client-metric-fraction-group">
                          <strong className="client-metric-cell-val">
                            {completedCheckpoints}
                            <span className="client-metric-denom">/{totalCheckpoints}</span>
                          </strong>
                        </div>
                        <span
                          className="client-metric-caption"
                          title={`${completedCheckpoints} checkpoint selesai dari total ${totalCheckpoints} (${checkpointPct}%)`}
                        >
                          {completedCheckpoints} dari {totalCheckpoints} ({checkpointPct}%)
                        </span>
                      </div>

                      {/* 2. Tiket Aktif: Active / Total with qualifier badge */}
                      <div className="client-metric-cell">
                        <span className="client-metric-cell-label" title="Tiket Aktif">
                          <TicketIcon size={10} strokeWidth={2.2} className="client-metric-icon" />
                          <span className="client-metric-label-text">Tiket Aktif</span>
                        </span>
                        <div className="client-metric-fraction-group">
                          <strong
                            className={`client-metric-cell-val ${openTickets > 0 ? "val-warn" : ""}`}
                          >
                            {openTickets}
                            <span className="client-metric-denom">/{totalTickets}</span>
                          </strong>
                          <span className="client-metric-qualifier-badge badge-active">Aktif</span>
                        </div>
                        <span
                          className="client-metric-caption"
                          title={`${openTickets} tiket aktif dari total ${totalTickets} tiket (${ticketPct}%)`}
                        >
                          {openTickets} dari {totalTickets} ({ticketPct}%)
                        </span>
                      </div>

                      {/* 3. Anomali: Fraction (Detected / Total Checkpoints) */}
                      <div className="client-metric-cell">
                        <span className="client-metric-cell-label" title="Anomali">
                          <AlertTriangle size={10} strokeWidth={2.2} className="client-metric-icon" />
                          <span className="client-metric-label-text">Anomali</span>
                        </span>
                        <div className="client-metric-fraction-group">
                          <strong
                            className={`client-metric-cell-val ${
                              nokCount > 0
                                ? "val-nok"
                                : totalCheckpoints === 0
                                ? "val-neutral"
                                : ""
                            }`}
                          >
                            {nokCount}
                            <span className="client-metric-denom">/{totalCheckpoints}</span>
                          </strong>
                        </div>
                        <span
                          className="client-metric-caption"
                          title={`${nokCount} anomali terdeteksi dari ${totalCheckpoints} checkpoint (${nokRate}%)`}
                        >
                          {nokCount} dari {totalCheckpoints} ({nokRate}%)
                        </span>
                      </div>

                      {/* 4. Tugas: Completed / Total with qualifier badge */}
                      <div className="client-metric-cell">
                        <span className="client-metric-cell-label" title="Tugas">
                          <CheckSquare size={10} strokeWidth={2.2} className="client-metric-icon" />
                          <span className="client-metric-label-text">Tugas</span>
                        </span>
                        <div className="client-metric-fraction-group">
                          <strong className="client-metric-cell-val">
                            {completedTasks}
                            <span className="client-metric-denom">/{totalTasks}</span>
                          </strong>
                          <span className="client-metric-qualifier-badge badge-done">Selesai</span>
                        </div>
                        <span
                          className="client-metric-caption"
                          title={`${completedTasks} tugas selesai dari total ${totalTasks} (${taskPct}%)`}
                        >
                          {completedTasks} dari {totalTasks} ({taskPct}%)
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Health Summary Tag & CTA */}
                    <div className="client-card-footer">
                      <span className={`client-health-badge badge-${statusTone}`}>
                        {statusTone === "success" ? (
                          <Check size={11} strokeWidth={2.5} />
                        ) : statusTone === "neutral" ? (
                          <Clock size={11} strokeWidth={2.5} />
                        ) : (
                          <AlertTriangle size={11} strokeWidth={2.5} />
                        )}
                        <span>{statusLabel}</span>
                      </span>

                      <span className="client-action-cta">
                        {isActive ? (
                          <span>Sedang Dilihat ✓</span>
                        ) : (
                          <>
                            <span>Beralih ke Klien</span>
                            <ArrowRight size={11} />
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </section>
  );
}
