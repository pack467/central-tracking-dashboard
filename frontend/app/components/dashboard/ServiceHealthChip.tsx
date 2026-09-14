"use client";

import React, { useMemo } from "react";
import { 
  Activity,
  AlertCircle,
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  Clock, 
  Copy, 
  Layers,
  Server, 
  ShieldAlert, 
  Ticket as TicketIcon,
  User,
  X, 
  CheckSquare,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import type { 
  ProjectHealthEntry, 
  Ticket, 
  MonitoringEntry, 
  HistoricalAssessmentEntry, 
  CheckpointAssessment,
  HandoverTask 
} from "@/app/lib/types";
import { 
  getClientMonitoringSchedule, 
  getClientHistoricalAssessments,
  CLIENT_HANDOVER_TASKS,
  ALL_COMBINED_SEED_TICKETS 
} from "@/app/lib/clientData";

// ── Types ──

export interface ServiceHealthChipProps {
  project: ProjectHealthEntry;
  onClick?: (project: ProjectHealthEntry) => void;
  className?: string;
  isActive?: boolean;
}

/**
 * ServiceHealthChip Component
 * 
 * Compact status chip displaying:
 * - Service Category / Domain Monogram (ProjectMark)
 * - Service Name (with ellipsis truncation for long labels)
 * - Colored Status Indicator Dot (Green for Healthy, Amber for Warning, Red for Critical)
 * - Accessibility-focused active border and tooltip on hover/focus
 */
export function ServiceHealthChip({
  project,
  onClick,
  className = "",
  isActive = false,
}: ServiceHealthChipProps) {
  const isHealthy = project.tone === "success";
  const isWarning = project.tone === "warning";
  const toneClass = isHealthy ? "chip-success" : isWarning ? "chip-warning" : "chip-critical";
  const clientTitle = getClientDisplayName(project.clientId);

  return (
    <button
      type="button"
      className={`service-health-chip ${toneClass} ${isActive ? "active" : ""} ${className}`}
      onClick={() => onClick?.(project)}
      aria-label={`Layanan ${project.name}: ${project.status} (${project.detail}) - ${clientTitle}`}
      aria-pressed={isActive}
    >
      <span className="service-chip-mark-wrap">
        <ProjectMark name={project.name} />
      </span>

      <span className="service-chip-name">{project.name}</span>

      <span className={`service-chip-dot dot-${project.tone}`} />

      {/* Floating Rich Tooltip */}
      <span className="service-chip-tooltip" role="tooltip">
        <strong className="tooltip-service-name">{project.name}</strong>
        <span className="tooltip-client-name">Klien: {clientTitle}</span>
        <span className="tooltip-status-text">
          Status: <span className={`tooltip-tone-${project.tone}`}>{project.status}</span>
        </span>
        <span className="tooltip-detail-text">{project.detail}</span>
        <span className="tooltip-cta-hint">Klik untuk melihat detail & dependensi</span>
      </span>
    </button>
  );
}

export interface ServiceHealthGridProps {
  children?: React.ReactNode;
  entries?: ProjectHealthEntry[];
  onSelect?: (project: ProjectHealthEntry) => void;
  selectedProject?: ProjectHealthEntry | null;
  className?: string;
}

/**
 * ServiceHealthGrid Component
 * Flex-wrap container ensuring chips wrap cleanly to new rows without overflowing.
 */
export function ServiceHealthGrid({
  children,
  entries,
  onSelect,
  selectedProject,
  className = "",
}: ServiceHealthGridProps) {
  return (
    <div
      className={`service-health-grid ${className}`}
      role="list"
      aria-label="Daftar chip kesehatan layanan"
    >
      {entries
        ? entries.map((project) => (
            <ServiceHealthChip
              key={project.name}
              project={project}
              onClick={onSelect}
              isActive={selectedProject?.name === project.name}
            />
          ))
        : children}
    </div>
  );
}

// ── Match Helper: Checks if a candidate text corresponds to the service ──

function isServiceMatch(serviceName: string, candidate: string): boolean {
  if (!serviceName || !candidate) return false;
  const s = serviceName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const c = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
  return s === c || s.includes(c) || c.includes(s);
}

function getClientDisplayName(clientId?: string): string {
  const cid = (clientId || "").toLowerCase();
  switch (cid) {
    case "telkomsel":
      return "Telkomsel Enterprise";
    case "bni":
      return "Bank Negara Indonesia (BNI)";
    case "tritronik":
      return "Tritronik NOC";
    case "indosat":
      return "Indosat Ooredoo Hutchison";
    case "xl":
      return "XL Axiata";
    case "mandiri":
      return "Bank Mandiri";
    case "bca":
      return "Bank Central Asia (BCA)";
    case "pertamina":
      return "Pertamina Digital";
    default:
      return clientId ? clientId.toUpperCase() : "Central NOC";
  }
}

// ── 1. Problem Location / Root Cause Sub-Component ──

export interface ProblemLocationInfo {
  component: string;
  category?: string;
  description: string;
  severity: "success" | "warning" | "critical" | string;
  rootCauseDetail?: string;
}

export function getServiceProblemLocation(project: ProjectHealthEntry): ProblemLocationInfo {
  const name = project.name.toLowerCase();
  const detail = project.detail || "";
  const isHealthy = project.tone === "success";

  if (isHealthy) {
    return {
      component: `${project.name} Cluster`,
      category: "All Dependencies",
      description: "All sub-components and upstream dependencies operational. No active anomalies detected.",
      severity: "success",
      rootCauseDetail: detail || "Semua pemeriksaan lulus",
    };
  }

  // Degraded / warning states with authentic Ops mappings
  if (name.includes("sm") || name.includes("smsc")) {
    return {
      component: "ActiveMQ Broker",
      category: "Message Broker / Queue",
      description: "ActiveMQ — connection timeout / queue backlog detected on cluster node 2",
      severity: project.tone || "warning",
      rootCauseDetail: "Thread pool exhaustion and pending SMS clearing queue threshold exceeded",
    };
  }

  if (name.includes("b2b")) {
    return {
      component: "Node-02 (Partner Proxy)",
      category: "Gateway / Network",
      description: "B2B Partner Gateway — partner timeout 504 on ingress node-02",
      severity: project.tone || "warning",
      rootCauseDetail: "External banking partner API endpoint handshake timeout > 5000ms",
    };
  }

  if (name.includes("kafka")) {
    return {
      component: "Kafka Broker-03",
      category: "Event Streaming",
      description: "Kafka Broker — ack latency 920ms with partition consumer lag",
      severity: project.tone || "warning",
      rootCauseDetail: "Disk I/O saturation on topic partition consumer-lag-01",
    };
  }

  if (name.includes("epc")) {
    return {
      component: "Catalog Pod 02",
      category: "Core Application",
      description: "EPC Core — catalog service replica latency spike / memory threshold 92%",
      severity: project.tone || "warning",
      rootCauseDetail: "Heap memory leak during batch catalog catalog & order sync",
    };
  }

  if (name.includes("bni") || name.includes("qris") || name.includes("mobile")) {
    return {
      component: "Biometric Auth Microservice",
      category: "Authentication API",
      description: "Biometric API — p99 latency spike to 450ms exceeding 200ms SLA",
      severity: project.tone || "warning",
      rootCauseDetail: "Database connection pool starvation on core auth cluster",
    };
  }

  if (name.includes("payment")) {
    return {
      component: "Payment Clearing Engine",
      category: "Transaction Service",
      description: "Payment Clearing — settlement throughput degradation on primary gateway",
      severity: project.tone || "warning",
      rootCauseDetail: "Network jitter on upstream ISO-8583 settlement link",
    };
  }

  // Fallback for any other service with problem
  return {
    component: `${project.name} Subsystem`,
    category: "Service Dependency",
    description: `${project.name} — ${detail || "Operational anomaly detected on service dependency"}`,
    severity: project.tone || "warning",
    rootCauseDetail: detail || "Latensi atau error rate melebihi ambang batas toleransi sistem",
  };
}

export interface ProblemLocationPanelProps {
  project: ProjectHealthEntry;
  info?: ProblemLocationInfo;
}

export function ProblemLocationPanel({ project, info }: ProblemLocationPanelProps) {
  const data = info || getServiceProblemLocation(project);
  const isHealthy = data.severity === "success";

  return (
    <div className={`service-subpanel problem-location-panel panel-${data.severity}`}>
      <div className="service-subpanel-header">
        <span className="subpanel-title-group">
          {isHealthy ? (
            <CheckCircle2 size={13} className="icon-ok" />
          ) : (
            <AlertTriangle size={13} className="icon-warn" />
          )}
          <span className="subpanel-title">Problem Location / Root Cause</span>
        </span>
        <span className={`problem-severity-badge sev-${data.severity}`}>
          {isHealthy ? "Nominal" : data.severity === "critical" ? "Critical" : "Warning"}
        </span>
      </div>

      <div className="problem-location-content">
        <div className="problem-component-line">
          <span className="problem-component-name">{data.component}</span>
          {data.category && (
            <span className="problem-dep-tag">{data.category}</span>
          )}
        </div>
        <p className="problem-desc">{data.description}</p>
        {data.rootCauseDetail && !isHealthy && (
          <div className="problem-meta-row">
            <span className="meta-label">Root Cause:</span>
            <span className="meta-value">{data.rootCauseDetail}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 2. Related Tasks List Sub-Component ──

export interface RelatedTasksListProps {
  tasks: HandoverTask[];
  onSelectTask?: (taskId: number) => void;
  onViewAllTasks?: () => void;
  maxVisible?: number;
}

export function RelatedTasksList({
  tasks,
  onSelectTask,
  onViewAllTasks,
  maxVisible = 4,
}: RelatedTasksListProps) {
  const visibleTasks = tasks.slice(0, maxVisible);
  const hasMore = tasks.length > maxVisible;

  return (
    <div className="service-subpanel">
      <div className="service-subpanel-header">
        <span className="subpanel-title-group">
          <CheckSquare size={13} />
          <span className="subpanel-title">Related Tasks</span>
          <span className="subpanel-counter">({tasks.length})</span>
        </span>
        {hasMore && onViewAllTasks && (
          <button
            type="button"
            className="service-panel-header-link"
            onClick={onViewAllTasks}
          >
            View all ({tasks.length}) →
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="service-panel-empty">
          <CheckCircle2 size={15} />
          <div className="empty-text">
            <span>No active tasks for this service</span>
            <small>All operational to-dos and mitigation tasks have been completed.</small>
          </div>
        </div>
      ) : (
        <div className="service-tasks-list" role="list">
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              className="service-task-row"
              onClick={() => onSelectTask?.(task.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTask?.(task.id);
                }
              }}
            >
              <div className="service-task-left">
                <span className={`task-status-dot dot-${(task.state || "pending").toLowerCase()}`} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <span className="service-task-title">{task.title}</span>
                  {task.detail && (
                    <small style={{ fontSize: "10.5px", color: "var(--ink-muted)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {task.detail}
                    </small>
                  )}
                </div>
              </div>
              <div className="service-task-right">
                <span className={`service-task-badge badge-${(task.state || "pending").toLowerCase()}`}>
                  {task.state || "Pending"}
                </span>
                <ChevronRight size={12} className="row-chevron" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 3. Open Tickets List Sub-Component ──

export interface OpenTicketsListProps {
  tickets: Ticket[];
  onSelectTicket?: (ticketId: string) => void;
  onViewAllTickets?: () => void;
  maxVisible?: number;
}

export function OpenTicketsList({
  tickets,
  onSelectTicket,
  onViewAllTickets,
  maxVisible = 4,
}: OpenTicketsListProps) {
  const visibleTickets = tickets.slice(0, maxVisible);
  const hasMore = tickets.length > maxVisible;

  return (
    <div className="service-subpanel">
      <div className="service-subpanel-header">
        <span className="subpanel-title-group">
          <TicketIcon size={13} />
          <span className="subpanel-title">Open Tickets</span>
          <span className="subpanel-counter">({tickets.length})</span>
        </span>
        {onViewAllTickets && (
          <button
            type="button"
            className="service-panel-header-link"
            onClick={onViewAllTickets}
          >
            {hasMore ? `View all (${tickets.length}) →` : "View all tickets →"}
          </button>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="service-panel-empty">
          <CheckCircle2 size={15} />
          <div className="empty-text">
            <span>No open tickets for this service</span>
            <small>All incident and change tickets for this service are resolved.</small>
          </div>
        </div>
      ) : (
        <div className="service-tickets-list" role="list">
          {visibleTickets.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              className="service-ticket-row"
              onClick={() => onSelectTicket?.(ticket.id)}
              title={`[${ticket.id}] ${ticket.subject} (Click to open)`}
            >
              <div className="service-ticket-left">
                <span className="service-ticket-id">#{ticket.id}</span>
                <span className="service-ticket-title">{ticket.subject}</span>
              </div>
              <div className="service-ticket-right">
                <span className="service-task-assignee">
                  <User size={10} /> {ticket.owner}
                </span>
                <span className={`ticket-sev-badge sev-${ticket.severity.toLowerCase()}`}>
                  {ticket.severity}
                </span>
                <span className={`ticket-status-pill st-${ticket.status.toLowerCase().replace(/\s+/g, "-")}`}>
                  {ticket.status}
                </span>
                <ChevronRight size={12} className="row-chevron" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ServiceDetailModal Component ──

export interface ServiceDetailModalProps {
  project: ProjectHealthEntry | null;
  onClose: () => void;
  onSelectTicket?: (ticketId: string) => void;
  onViewAllTickets?: () => void;
  onSelectTask?: (taskId: number) => void;
  onViewAllTasks?: () => void;
  allTickets?: Ticket[];
  schedules?: MonitoringEntry[];
  assessments?: HistoricalAssessmentEntry[] | Record<string, CheckpointAssessment>;
  activeHandoverTasks?: HandoverTask[];
}

/**
 * ServiceDetailModal Component
 * 
 * Replaces generic metrics (Latency, Error Rate, Uptime) with 3 ops-actionable sections:
 * 1. Problem Location / Root Cause (Sub-component, category, issue description, severity indicator)
 * 2. Related Tasks (Active to-dos tied to this service, clickable, compact list)
 * 3. Open Tickets (Open incident/change tickets tied to this service, clickable, compact list)
 * 
 * Retains:
 * - Header with service icon, name, category, status badge, close button
 * - Operational Status Note banner at top
 * - Clean footer with "Salin Ringkasan", "Jalankan Diagnostics", and "Tutup" actions
 */
export function ServiceDetailModal({
  project,
  onClose,
  onSelectTicket,
  onViewAllTickets,
  onSelectTask,
  onViewAllTasks,
  allTickets,
  schedules,
  assessments,
  activeHandoverTasks,
}: ServiceDetailModalProps) {
  const notify = useToast();

  if (!project) return null;

  const isHealthy = project.tone === "success";
  const isWarning = project.tone === "warning";
  const clientTitle = getClientDisplayName(project.clientId);

  // 1. Resolve Active Tasks for this service (Filter: NOT completed and NOT done)
  const clientTasks = activeHandoverTasks || (CLIENT_HANDOVER_TASKS[project.clientId || "tritronik"] || CLIENT_HANDOVER_TASKS.tritronik);
  const serviceTasks = clientTasks.filter((t) => {
    const matchProject = isServiceMatch(project.name, t.project);
    const isNotDone = !t.completed && (t.state || "").toLowerCase() !== "done";
    return matchProject && isNotDone;
  });

  // 2. Resolve Open Tickets for this service (Filter: NOT Closed)
  const ticketSource = allTickets || ALL_COMBINED_SEED_TICKETS;
  const relevantTickets = ticketSource.filter((t) => {
    const matchClient = !project.clientId || !t.clientId || t.clientId.toLowerCase() === project.clientId.toLowerCase();
    const matchProject = isServiceMatch(project.name, t.project) || (t.subject && isServiceMatch(project.name, t.subject));
    return matchClient && matchProject;
  });
  const openTickets = relevantTickets.filter((t) => (t.status || "").toLowerCase() !== "closed");

  // 3. Action Handlers
  const handleCopySummary = () => {
    const rootCause = getServiceProblemLocation(project);
    const lines = [
      `[SERVICE SUMMARY - ${project.name.toUpperCase()}]`,
      `Client / Tenant: ${clientTitle}`,
      `Status: ${project.status} (${project.detail})`,
      "",
      `1. PROBLEM LOCATION / ROOT CAUSE:`,
      `  • Component: ${rootCause.component} (${rootCause.category || "General"})`,
      `  • Issue: ${rootCause.description}`,
      rootCause.rootCauseDetail && rootCause.severity !== "success" ? `  • Detail: ${rootCause.rootCauseDetail}` : "",
      "",
      `2. RELATED TASKS (${serviceTasks.length}):`,
      serviceTasks.length > 0
        ? serviceTasks.map((t) => `  • [${t.state || "Pending"}] ${t.title}: ${t.detail}`).join("\n")
        : "  • No active tasks for this service.",
      "",
      `3. OPEN TICKETS (${openTickets.length}):`,
      openTickets.length > 0
        ? openTickets.map((t) => `  • #${t.id} [${t.severity} / ${t.status}] ${t.subject} (PIC: ${t.owner})`).join("\n")
        : "  • No open tickets for this service.",
    ].filter(Boolean).join("\n");

    navigator.clipboard?.writeText(lines);
    notify(`Ringkasan ${project.name} berhasil disalin ke clipboard`, "success");
  };

  const handleRunDiagnostics = () => {
    notify(`Menjalankan diagnostics otomatis untuk ${project.name}... Cluster nominal.`, "success");
  };

  const handleTicketClick = (ticketId: string) => {
    if (onSelectTicket) {
      onSelectTicket(ticketId);
      onClose();
    } else {
      notify(`Membuka tiket #${ticketId}`, "info");
    }
  };

  const handleTaskClick = (taskId: number) => {
    if (onSelectTask) {
      onSelectTask(taskId);
      onClose();
    } else if (onViewAllTasks) {
      onViewAllTasks();
      onClose();
    } else {
      notify(`Membuka tugas operasional #${taskId}`, "info");
    }
  };

  const handleGoToTickets = () => {
    if (onViewAllTickets) {
      onViewAllTickets();
      onClose();
    } else {
      notify(`Membuka antrian tiket untuk ${project.name}`, "info");
    }
  };

  const handleGoToTasks = () => {
    if (onViewAllTasks) {
      onViewAllTasks();
      onClose();
    } else {
      notify(`Membuka daftar tugas untuk ${project.name}`, "info");
    }
  };

  return (
    <div
      className="service-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-modal-title"
    >
      <div className="service-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header: Service Name, Client, Status Badge */}
        <div className="service-modal-header">
          <div className="service-modal-header-left">
            <span className="service-modal-mark">
              <ProjectMark name={project.name} />
            </span>
            <div>
              <h3 id="service-modal-title" className="service-modal-title">{project.name}</h3>
              <span className="service-modal-subtitle">
                Layanan Terpantau · {clientTitle}
              </span>
            </div>
          </div>
          <div className="service-modal-header-right">
            <span className={`service-modal-badge badge-${project.tone}`}>
              {isHealthy ? <CheckCircle2 size={12} /> : isWarning ? <AlertTriangle size={12} /> : <ShieldAlert size={12} />}
              {project.status}
            </span>
            <button
              type="button"
              className="service-modal-close"
              onClick={onClose}
              aria-label="Tutup panel detail"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: Clean, Actionable Data */}
        <div className="service-modal-body">
          {/* Operational Status Box */}
          <div className={`service-modal-banner banner-${project.tone}`}>
            <div className="service-modal-banner-icon">
              <Activity size={16} />
            </div>
            <div className="service-modal-banner-text">
              <strong>Keterangan Status Operasional:</strong>
              <p>{project.detail}</p>
            </div>
          </div>

          {/* Section 1: Problem Location / Root Cause */}
          <ProblemLocationPanel project={project} />

          {/* Section 2: Related Tasks */}
          <RelatedTasksList
            tasks={serviceTasks}
            onSelectTask={handleTaskClick}
            onViewAllTasks={handleGoToTasks}
          />

          {/* Section 3: Open Tickets */}
          <OpenTicketsList
            tickets={openTickets}
            onSelectTicket={handleTicketClick}
            onViewAllTickets={handleGoToTickets}
          />
        </div>

        {/* Footer Actions: Clean, Functional Navigation */}
        <div className="service-modal-footer">
          <button
            type="button"
            className="service-modal-action-btn btn-secondary"
            onClick={handleCopySummary}
            title="Salin ringkasan problem location, tasks, dan tiket terbuka"
          >
            <Copy size={13} />
            <span>Salin Ringkasan</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="service-modal-action-btn btn-primary"
              onClick={handleRunDiagnostics}
              title="Jalankan pemeriksaan diagnostik otomatis pada dependensi layanan"
            >
              <Activity size={13} />
              <span>Jalankan Diagnostics</span>
            </button>
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
    </div>
  );
}
