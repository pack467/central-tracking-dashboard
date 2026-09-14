"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  RotateCcw, 
  SlidersHorizontal,
  CheckCircle2,
  Search,
  X
} from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { projects } from "@/app/lib/data";
import type { 
  ProjectHealthEntry, 
  Ticket, 
  MonitoringEntry, 
  HistoricalAssessmentEntry, 
  CheckpointAssessment,
  HandoverTask 
} from "@/app/lib/types";
import { 
  ServiceHealthChip, 
  ServiceHealthGrid, 
  ServiceDetailModal,
  ProblemLocationPanel,
  RelatedTasksList,
  OpenTicketsList
} from "./ServiceHealthChip";

export { 
  ServiceHealthChip, 
  ServiceHealthGrid, 
  ServiceDetailModal,
  ProblemLocationPanel,
  RelatedTasksList,
  OpenTicketsList
};

/**
 * Realistic 28-service enterprise architecture for scalability testing.
 * Includes multiple degraded microservices to verify that urgent issues
 * are ALWAYS sorted to the front and NEVER hidden across any view mode.
 */
export const SIMULATED_28_SERVICES: ProjectHealthEntry[] = [
  // ── Degraded Services (High Urgency) ──
  { name: "Kafka Broker", status: "Needs Attention", detail: "Latensi ack 920ms · 1 lag", tone: "warning", clientId: "tritronik" },
  { name: "B2B Gateway", status: "Needs Attention", detail: "Partner timeout 504 node-02", tone: "warning", clientId: "tritronik" },
  { name: "SM SMSC", status: "Needs Attention", detail: "Antrian kliring backlog", tone: "warning", clientId: "tritronik" },
  // ── Healthy Enterprise Microservices ──
  { name: "USIEM", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success", clientId: "tritronik" },
  { name: "MB Core", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success", clientId: "tritronik" },
  { name: "EPC Tools", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success", clientId: "tritronik" },
  { name: "DM Portal", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success", clientId: "tritronik" },
  { name: "UNEM Agent", status: "Healthy", detail: "Semua pemeriksaan lulus", tone: "success", clientId: "tritronik" },
  { name: "Auth Service", status: "Healthy", detail: "OAuth2 cluster stabil nominal", tone: "success", clientId: "tritronik" },
  { name: "Payment GW", status: "Healthy", detail: "Throughput 1.4k TPS normal", tone: "success", clientId: "tritronik" },
  { name: "Redis Cache", status: "Healthy", detail: "Memory 42% · Hit rate 98.4%", tone: "success", clientId: "tritronik" },
  { name: "Elasticsearch", status: "Healthy", detail: "Cluster green · 12 nodes", tone: "success", clientId: "tritronik" },
  { name: "API Gateway", status: "Healthy", detail: "Latency p99 45ms nominal", tone: "success", clientId: "tritronik" },
  { name: "Push Notif", status: "Healthy", detail: "FCM delivery queue normal", tone: "success", clientId: "tritronik" },
  { name: "Billing Engine", status: "Healthy", detail: "Rating cycle batch selesai", tone: "success", clientId: "tritronik" },
  { name: "Session Store", status: "Healthy", detail: "Sync multi-region aktif", tone: "success", clientId: "tritronik" },
  { name: "Order Processor", status: "Healthy", detail: "Zero dropped transactions", tone: "success", clientId: "tritronik" },
  { name: "Audit Logger", status: "Healthy", detail: "WORM storage sync OK", tone: "success", clientId: "tritronik" },
  { name: "S3 Storage", status: "Healthy", detail: "Object replication normal", tone: "success", clientId: "tritronik" },
  { name: "Config Server", status: "Healthy", detail: "Git-backed config nominal", tone: "success", clientId: "tritronik" },
  { name: "DNS Resolver", status: "Healthy", detail: "Anycast latency 8ms", tone: "success", clientId: "tritronik" },
  { name: "CDN Edge", status: "Healthy", detail: "Edge cache ratio 94%", tone: "success", clientId: "tritronik" },
  { name: "WAF Shield", status: "Healthy", detail: "0 anomaly flood detected", tone: "success", clientId: "tritronik" },
  { name: "DB Cluster", status: "Healthy", detail: "Primary-replica sync lag 0ms", tone: "success", clientId: "tritronik" },
  { name: "Metrics Agent", status: "Healthy", detail: "Prometheus scrape 100% OK", tone: "success", clientId: "tritronik" },
  { name: "Webhook Dispatch", status: "Healthy", detail: "Retry pool empty nominal", tone: "success", clientId: "tritronik" },
  { name: "Log Shipper", status: "Healthy", detail: "Vector agent pipeline normal", tone: "success", clientId: "tritronik" },
  { name: "Vault KMS", status: "Healthy", detail: "Key rotation schedule nominal", tone: "success", clientId: "tritronik" },
];

export interface HealthStripProps {
  entries?: ProjectHealthEntry[];
  onSelectTicket?: (ticketId: string) => void;
  onViewAllTickets?: () => void;
  onSelectTask?: (task: any) => void;
  onViewAllTasks?: () => void;
  allTickets?: Ticket[];
  schedules?: MonitoringEntry[];
  assessments?: HistoricalAssessmentEntry[] | Record<string, CheckpointAssessment>;
  activeHandoverTasks?: HandoverTask[];
}

/**
 * HealthStrip ("KESEHATAN LAYANAN") Component
 * 
 * Strict Single-Row Layout Guarantee:
 * Never wraps onto a second line across 1280px, 1440px, or 1920px viewports.
 * Reuses the identical filter tabs (Semua / Perlu Tindakan / Normal) and pagination
 * controls (counter, Prev/Next chevrons, "Lihat Semua") from "Status per Klien / Tenant".
 */
export function HealthStrip({
  entries = projects,
  onSelectTicket,
  onViewAllTickets,
  onSelectTask,
  onViewAllTasks,
  allTickets,
  schedules,
  assessments,
  activeHandoverTasks,
}: HealthStripProps) {
  const notify = useToast();

  // Simulation mode for testing scalability (7 vs 28 services)
  const [isSimulated, setIsSimulated] = useState(false);
  const rawList = isSimulated ? SIMULATED_28_SERVICES : entries;

  // Selected service state for detail modal
  const [selectedService, setSelectedService] = useState<ProjectHealthEntry | null>(null);

  // Filter mode: "all" | "urgent" | "healthy" (matching ClientStatusGrid)
  const [statusFilter, setStatusFilter] = useState<"all" | "urgent" | "healthy">("all");

  // Modal state for "Lihat Semua"
  const [isAllModalOpen, setIsAllModalOpen] = useState(false);

  // 1. Urgency-first auto-sorting: Degraded/warning/critical services ALWAYS front
  const sortedEntries = useMemo(() => {
    return [...rawList].sort((a, b) => {
      const aUrgent = a.tone !== "success" ? 0 : 1;
      const bUrgent = b.tone !== "success" ? 0 : 1;
      if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      return a.name.localeCompare(b.name);
    });
  }, [rawList]);

  // Metric counts for filter tabs
  const urgentCount = useMemo(() => sortedEntries.filter((p) => p.tone !== "success").length, [sortedEntries]);
  const healthyCount = useMemo(() => sortedEntries.filter((p) => p.tone === "success").length, [sortedEntries]);
  const totalCount = sortedEntries.length;

  // Apply active status filter
  const filteredEntries = useMemo(() => {
    if (statusFilter === "urgent") return sortedEntries.filter((p) => p.tone !== "success");
    if (statusFilter === "healthy") return sortedEntries.filter((p) => p.tone === "success");
    return sortedEntries;
  }, [sortedEntries, statusFilter]);

  // 2. Responsive Page Size: Computes how many chips fit comfortably per page
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pageSize, setPageSize] = useState(4);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const calculatePageSize = () => {
      const width = el.offsetWidth;
      if (width <= 0) return;
      // Recalculate page size based on available container width
      if (width < 800) {
        setPageSize(3);
      } else if (width < 1080) {
        setPageSize(4); // 1280px screen (~956px row width)
      } else if (width < 1400) {
        setPageSize(5); // 1440px screen (~1116px row width)
      } else {
        setPageSize(6); // 1920px screen (~1596px row width)
      }
    };

    calculatePageSize();
    const ro = new ResizeObserver(calculatePageSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 3. Carousel page index
  const [page, setPage] = useState(0);

  // Chunk filtered entries into pages of size `pageSize`
  const pages = useMemo(() => {
    if (filteredEntries.length === 0) return [];
    const chunks: ProjectHealthEntry[][] = [];
    for (let i = 0; i < filteredEntries.length; i += pageSize) {
      chunks.push(filteredEntries.slice(i, i + pageSize));
    }
    return chunks;
  }, [filteredEntries, pageSize]);

  const totalPages = pages.length;
  const safePage = Math.min(page, Math.max(0, totalPages - 1));

  const canScrollLeft = safePage > 0;
  const canScrollRight = safePage < totalPages - 1;

  const scroll = (direction: "left" | "right") => {
    if (direction === "left") {
      setPage((prev) => Math.max(0, prev - 1));
    } else {
      setPage((prev) => Math.min(totalPages - 1, prev + 1));
    }
  };

  // Accurate counter calculation reflecting actual visible range per page
  const totalItems = filteredEntries.length;
  const startIdx = totalItems === 0 ? 0 : safePage * pageSize + 1;
  const endIdx = totalItems === 0 ? 0 : Math.min((safePage + 1) * pageSize, totalItems);
  const counterLabel = totalItems === 0 ? "0 dari 0" : `${startIdx}–${endIdx} dari ${totalItems}`;

  return (
    <section className="health-strip health-strip-roomy health-strip-two-rows" aria-label="Kesehatan layanan terpantau">
      {/* ── Row 1 (Top Row): Title + Badge + Filter Tabs (Left) & Pagination Controls (Right) ── */}
      <div className="health-strip-row-top">
        <div className="health-top-left">
          {/* Title + Simulation Toggle */}
          <div className="health-group-title">
            <span className="health-title">KESEHATAN LAYANAN</span>
            <button
              type="button"
              className={`health-sim-pill ${isSimulated ? "active" : ""}`}
              onClick={() => {
                setIsSimulated((prev) => !prev);
                setPage(0);
                setStatusFilter("all");
              }}
              title={isSimulated ? "Kembali ke dataset normal (7 layanan)" : "Uji coba tata letak dengan 28 layanan enterprise"}
              aria-label="Toggle simulasi 28 layanan"
            >
              {isSimulated ? (
                <>
                  <RotateCcw size={11} /> <span>Reset (7)</span>
                </>
              ) : (
                <>
                  <SlidersHorizontal size={11} /> <span>Simulasi 28</span>
                </>
              )}
            </button>
          </div>

          <span className="health-group-divider" aria-hidden="true" />

          {/* Filter Tabs (Matches Status per Klien) */}
          <div className="health-group-filters">
            <div className="client-filter-chips" role="tablist" aria-label="Filter status kesehatan layanan">
              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "all"}
                className={`client-filter-chip ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("all");
                  setPage(0);
                }}
              >
                <span>Semua</span>
                <span className="chip-count">({totalCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={statusFilter === "urgent"}
                className={`client-filter-chip chip-urgent ${statusFilter === "urgent" ? "active" : ""}`}
                onClick={() => {
                  setStatusFilter("urgent");
                  setPage(0);
                }}
                title="Tampilkan hanya layanan yang memerlukan tindakan operasional"
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
                onClick={() => {
                  setStatusFilter("healthy");
                  setPage(0);
                }}
              >
                <span>Normal</span>
                <span className="chip-count">({healthyCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right-aligned Pagination Controls */}
        <div className="health-top-right">
          <div className="client-carousel-nav-group">
            {/* Counter Label */}
            <span className="client-carousel-counter-badge">
              {counterLabel}
            </span>

            {/* Prev/Next Chevron Icon Buttons */}
            <div className="client-carousel-nav" role="group" aria-label="Navigasi halaman kesehatan layanan">
              <button
                type="button"
                className="carousel-nav-btn"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                aria-label="Layanan sebelumnya"
                title="Layanan sebelumnya"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="carousel-nav-btn"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                aria-label="Layanan berikutnya"
                title="Layanan berikutnya"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* "Lihat Semua (X)" Button */}
            <button
              type="button"
              className="client-view-toggle-btn"
              onClick={() => setIsAllModalOpen(true)}
              title="Buka seluruh daftar layanan terpantau dalam modal lengkap"
            >
              <Grid size={13} />
              <span>Lihat Semua ({totalItems})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Row 2 (Bottom Row): Only Service Chips with Sliding Carousel Transition ── */}
      <div className="health-strip-row-chips" ref={containerRef}>
        {totalItems === 0 ? (
          <div className="service-track-empty">
            <CheckCircle2 size={14} className="text-green" />
            <span>Semua layanan beroperasi normal</span>
          </div>
        ) : (
          <div className="health-carousel-viewport">
            <div
              className="health-carousel-track"
              style={{
                transform: `translateX(-${safePage * 100}%)`,
                transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {pages.map((pageChips, pIdx) => (
                <div
                  key={pIdx}
                  className="health-carousel-page"
                  role="list"
                  aria-hidden={pIdx !== safePage}
                >
                  {pageChips.map((project) => (
                    <ServiceHealthChip
                      key={project.name}
                      project={project}
                      onClick={() => {
                        setSelectedService(project);
                        notify(
                          `${project.name}: Status ${project.status.toUpperCase()} (${project.detail})`,
                          project.tone,
                          {
                            id: `health-project-${project.name.toLowerCase().replace(/\s+/g, "-")}`,
                          }
                        );
                      }}
                      isActive={selectedService?.name === project.name}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Full Service Modal ("Lihat Semua") ── */}
      {isAllModalOpen && (
        <AllServicesModal
          entries={sortedEntries}
          onClose={() => setIsAllModalOpen(false)}
          onSelectService={(proj) => {
            setIsAllModalOpen(false);
            setSelectedService(proj);
          }}
        />
      )}

      {/* ── Operational Intelligence Modal on Chip Click ── */}
      <ServiceDetailModal
        project={selectedService}
        onClose={() => setSelectedService(null)}
        onSelectTicket={onSelectTicket}
        onViewAllTickets={onViewAllTickets}
        onSelectTask={onSelectTask}
        onViewAllTasks={onViewAllTasks}
        allTickets={allTickets}
        schedules={schedules}
        assessments={assessments}
        activeHandoverTasks={activeHandoverTasks}
      />
    </section>
  );
}

// ── Modal Dialog for "Lihat Semua" ──

export interface AllServicesModalProps {
  entries: ProjectHealthEntry[];
  onClose: () => void;
  onSelectService: (project: ProjectHealthEntry) => void;
}

export function AllServicesModal({
  entries,
  onClose,
  onSelectService,
}: AllServicesModalProps) {
  const [filter, setFilter] = useState<"all" | "urgent" | "healthy">("all");
  const [search, setSearch] = useState("");

  const urgentCount = entries.filter((p) => p.tone !== "success").length;
  const healthyCount = entries.filter((p) => p.tone === "success").length;

  const filtered = useMemo(() => {
    return entries.filter((p) => {
      if (filter === "urgent" && p.tone === "success") return false;
      if (filter === "healthy" && p.tone !== "success") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.detail.toLowerCase().includes(q);
      }
      return true;
    });
  }, [entries, filter, search]);

  return (
    <div
      className="service-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="all-services-modal-title"
    >
      <div className="service-all-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="service-all-modal-header">
          <div className="service-modal-header-left">
            <span className="service-chip-mark" style={{ width: 28, height: 28, fontSize: 11 }}>
              <Grid size={15} />
            </span>
            <div>
              <h3 id="all-services-modal-title" className="service-modal-title">
                Kesehatan Seluruh Layanan
              </h3>
              <span className="service-modal-subtitle">
                {entries.length} Layanan Terpantau · Tritronik Enterprise NOC
              </span>
            </div>
          </div>
          <button
            type="button"
            className="service-modal-close"
            onClick={onClose}
            aria-label="Tutup modal"
          >
            <X size={16} />
          </button>
        </div>

        <div className="service-all-modal-body">
          {/* Action Bar: Filter Tabs + Search Input */}
          <div className="service-all-controls-bar">
            <div className="client-filter-chips" role="tablist" aria-label="Filter seluruh layanan">
              <button
                type="button"
                role="tab"
                aria-selected={filter === "all"}
                className={`client-filter-chip ${filter === "all" ? "active" : ""}`}
                onClick={() => setFilter("all")}
              >
                <span>Semua</span>
                <span className="chip-count">({entries.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={filter === "urgent"}
                className={`client-filter-chip chip-urgent ${filter === "urgent" ? "active" : ""}`}
                onClick={() => setFilter("urgent")}
              >
                {urgentCount > 0 && <span className="chip-urgent-dot" />}
                <span>Perlu Tindakan</span>
                <span className="chip-count">({urgentCount})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={filter === "healthy"}
                className={`client-filter-chip ${filter === "healthy" ? "active" : ""}`}
                onClick={() => setFilter("healthy")}
              >
                <span>Normal</span>
                <span className="chip-count">({healthyCount})</span>
              </button>
            </div>

            <div className="service-all-modal-search">
              <Search size={13} style={{ color: "var(--ink-muted)", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Cari nama layanan atau status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* All Chips Grid in Modal */}
          <div className="service-all-chips-grid">
            {filtered.length === 0 ? (
              <div className="service-track-empty" style={{ padding: 20 }}>
                <CheckCircle2 size={16} className="text-green" />
                <span>Tidak ada layanan yang sesuai kriteria pencarian</span>
              </div>
            ) : (
              filtered.map((project) => (
                <ServiceHealthChip
                  key={project.name}
                  project={project}
                  onClick={() => onSelectService(project)}
                />
              ))
            )}
          </div>
        </div>

        <div className="service-modal-footer">
          <button
            type="button"
            className="service-modal-action-btn btn-outline"
            onClick={onClose}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
