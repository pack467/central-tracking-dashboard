import { useMemo, useState, useRef, useEffect } from "react";
import {
  AlertCircle,
  AlertTriangle,
  FileText,
  Clock,
  Check,
  X,
  Filter,
  ChevronDown,
  Layers,
  Server,
} from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { useToast } from "@/app/components/ui/Toast";
import { Avatar } from "@/app/components/ui/Avatar";
import { getOwnerRole } from "@/app/lib/data";
import type { CheckpointAssessment, MonitoringEntry } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { CLIENT_PROJECTS } from "@/app/lib/clientData";

export function matchesProject(entryProject: string, targetProject: string): boolean {
  if (!entryProject || !targetProject) return false;
  const ep = entryProject.toLowerCase().trim();
  const tp = targetProject.toLowerCase().trim();
  if (ep === tp) return true;
  if (ep.startsWith(tp + "/") || ep.startsWith(tp + " ")) return true;
  if (tp === "epc" && ep.startsWith("epc")) return true;
  return false;
}

export function matchesSystem(text: string, system: string) {
  const aliases: Record<string, string[]> = {
    ActiveMQ: ["activemq", "queue", "antrian", "settlement", "backlog"],
    Kafka: ["kafka", "topik", "topic", "stream", "throttle", "cdr"],
    Grafana: ["grafana", "cpu", "throughput", "latensi", "latency", "response", "peak", "utilisasi", "thread"],
    Graylog: ["graylog", "siem", "auth", "log", "audit", "anomali", "score", "charging", "diameter"],
    "Disk Usage": ["disk", "/apps", "database", "node", "storage", "bin-range", "ledger", "balancing", "replikasi", "subscriber", "hss"],
    "Network / Switch": ["network", "switch", "link", "atm", "leased-line", "jaringan"],
    "Network / 5G": ["network", "edge", "upf", "gnodeb", "5g", "link", "jaringan"],
  };
  const haystack = text.toLowerCase();
  return (aliases[system] ?? [system.toLowerCase()]).some((alias) => haystack.includes(alias));
}

export const CLIENT_MONITORING_SYSTEMS: Record<string, string[]> = {
  tritronik: ["ActiveMQ", "Kafka", "Grafana", "Graylog", "Disk Usage"],
  bni: ["ActiveMQ", "Kafka", "Grafana", "Graylog", "Disk Usage", "Network / Switch"],
  telkomsel: ["ActiveMQ", "Kafka", "Grafana", "Graylog", "Disk Usage", "Network / 5G"],
};

interface ScheduleFilterDropdownProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  allLabel: string;
  totalCount: number;
  selectedValue: string | null;
  options: { name: string; count: number }[];
  onSelect: (val: string | null) => void;
}

function ScheduleFilterDropdown({
  id,
  icon,
  label,
  allLabel,
  totalCount,
  selectedValue,
  options,
  onSelect,
}: ScheduleFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const activeOption = options.find((opt) => opt.name.toLowerCase() === selectedValue?.toLowerCase());
  const displayLabel = selectedValue
    ? `${selectedValue} (${activeOption?.count ?? 0})`
    : `${allLabel} (${totalCount})`;

  return (
    <div className="schedule-filter-dropdown-wrap" ref={containerRef} id={id}>
      <button
        type="button"
        className={`schedule-filter-dropdown-btn ${isOpen ? "open" : ""} ${selectedValue ? "has-value" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter ${label}: ${displayLabel}`}
        title={`Filter ${label}: ${displayLabel}`}
      >
        <span className="sched-dropdown-icon">{icon}</span>
        <span className="sched-dropdown-label">{displayLabel}</span>
        <ChevronDown size={12} className={`sched-dropdown-chevron ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className="schedule-filter-popover"
          role="listbox"
          aria-label={`Pilihan filter ${label}`}
        >
          <div className="sched-popover-header">
            <span className="sched-popover-title">PILIH {label.toUpperCase()}</span>
          </div>

          <div className="sched-popover-list">
            {/* "Semua" Option */}
            <button
              type="button"
              role="option"
              aria-selected={!selectedValue}
              className={`sched-popover-item ${!selectedValue ? "selected" : ""}`}
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
            >
              <div className="sched-item-main">
                <span className="sched-item-name">{allLabel}</span>
              </div>
              <span className="sched-item-count">{totalCount}</span>
              {!selectedValue && <Check size={13} className="sched-item-check" />}
            </button>

            <div className="sched-popover-divider" />

            {/* Individual Options */}
            {options.map((opt) => {
              const isSelected = selectedValue?.toLowerCase() === opt.name.toLowerCase();
              return (
                <button
                  key={opt.name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`sched-popover-item ${isSelected ? "selected" : ""} ${opt.count === 0 ? "is-zero" : ""}`}
                  onClick={() => {
                    onSelect(opt.name);
                    setIsOpen(false);
                  }}
                >
                  <div className="sched-item-main">
                    <span className="sched-item-name">{opt.name}</span>
                  </div>
                  <span className={`sched-item-count ${opt.count === 0 ? "count-zero" : ""}`}>
                    {opt.count}
                  </span>
                  {isSelected && <Check size={13} className="sched-item-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface MonitoringScheduleProps {
  entries: MonitoringEntry[];
  assessments: Record<string, CheckpointAssessment>;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  currentHour?: string | null;
  showFilter?: boolean;
  selectedSystem?: string | null;
  onSelectSystem?: (system: string | null) => void;
  selectedProject?: string | null;
  onSelectProject?: (project: string | null) => void;
  footer?: React.ReactNode;
}

const FILTERS = ["Semua", "Needs Attention", "Upcoming"] as const;

export function PendingUserSilhouette() {
  return (
    <svg
      viewBox="0 0 100 100"
      className="pending-user-silhouette"
      aria-hidden="true"
      fill="currentColor"
    >
      <circle cx="50" cy="34" r="18" />
      <path d="M 0 100 L 0 78 C 0 62, 26 58, 50 58 C 74 58, 100 62, 100 78 L 100 100 Z" />
    </svg>
  );
}

export function rowKey(entry: MonitoringEntry) {
  return `${entry.time}-${entry.project}-${entry.task}`;
}

export function MonitoringSchedule({
  entries,
  assessments,
  onAssess,
  onRequestNote,
  currentHour = null,
  showFilter = true,
  selectedSystem = undefined,
  onSelectSystem,
  selectedProject = undefined,
  onSelectProject,
  footer,
}: MonitoringScheduleProps) {
  const notify = useToast();
  const { activeClientId } = useClient();

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const [internalProjectFilter, setInternalProjectFilter] = useState<string | null>(null);
  const [internalSystemFilter, setInternalSystemFilter] = useState<string | null>(null);

  // Sync external props if controlled, otherwise use internal state
  const isProjectControlled = onSelectProject !== undefined || selectedProject !== undefined;
  const effectiveProjectFilter = isProjectControlled ? (selectedProject ?? null) : internalProjectFilter;
  const setProjectFilter = (val: string | null) => {
    setInternalProjectFilter(val);
    onSelectProject?.(val);
  };

  const isSystemControlled = onSelectSystem !== undefined || selectedSystem !== undefined;
  const effectiveSystemFilter = isSystemControlled ? (selectedSystem ?? null) : internalSystemFilter;
  const setSystemFilter = (val: string | null) => {
    setInternalSystemFilter(val);
    onSelectSystem?.(val);
  };

  // Auto-reset project filter if no longer exists in current client entries
  useEffect(() => {
    if (effectiveProjectFilter && !entries.some((e) => matchesProject(e.project, effectiveProjectFilter))) {
      setProjectFilter(null);
    }
  }, [entries, effectiveProjectFilter]);

  // Dynamic project options from active client's projects + any unmapped entries
  const projectOptions = useMemo(() => {
    const definedProjects = (CLIENT_PROJECTS[activeClientId] || CLIENT_PROJECTS.tritronik).map((p) => p.name);
    const list: { name: string; count: number }[] = [];
    const seen = new Set<string>();

    definedProjects.forEach((name) => {
      const count = entries.filter((e) => matchesProject(e.project, name)).length;
      list.push({ name, count });
      seen.add(name.toLowerCase());
    });

    // Add any remaining unmapped project names from entries (e.g. "Handover")
    entries.forEach((e) => {
      if (e.project && !seen.has(e.project.toLowerCase())) {
        const matchesAnyDefined = definedProjects.some((dp) => matchesProject(e.project, dp));
        if (!matchesAnyDefined) {
          seen.add(e.project.toLowerCase());
          const count = entries.filter((item) => matchesProject(item.project, e.project)).length;
          list.push({ name: e.project, count });
        }
      }
    });

    return list;
  }, [entries, activeClientId]);

  // Dynamic system options from active client's monitoring tools
  const systemOptions = useMemo(() => {
    const systems = CLIENT_MONITORING_SYSTEMS[activeClientId] || CLIENT_MONITORING_SYSTEMS.tritronik;
    return systems.map((sys) => {
      const count = entries.filter((item) => matchesSystem(`${item.task} ${item.project}`, sys)).length;
      return { name: sys, count };
    });
  }, [entries, activeClientId]);

  // Counts for tabs (scoped to active project/system if selected)
  const counts = useMemo(() => {
    let scoped = entries;
    if (effectiveProjectFilter) {
      scoped = scoped.filter((item) => matchesProject(item.project, effectiveProjectFilter));
    }
    if (effectiveSystemFilter) {
      scoped = scoped.filter((item) => matchesSystem(`${item.task} ${item.project}`, effectiveSystemFilter));
    }
    const total = scoped.length;
    const needsAttention = scoped.filter((item) => {
      const key = rowKey(item);
      const isNok = assessments[key]?.verdict === "nok" || assessments[key]?.verdict === "not-adequate";
      return item.tone === "warning" || isNok;
    }).length;
    const upcoming = scoped.filter((item) => item.state === "Upcoming" || item.state === "Mendatang").length;
    return { total, needsAttention, upcoming };
  }, [entries, effectiveProjectFilter, effectiveSystemFilter, assessments]);

  const visibleEntries = useMemo(() => {
    let result = entries;

    // 1. Filter by tab
    if (filter === "Needs Attention") {
      result = result.filter((item) => {
        const key = rowKey(item);
        const isNok = assessments[key]?.verdict === "nok" || assessments[key]?.verdict === "not-adequate";
        return item.tone === "warning" || isNok;
      });
    } else if (filter === "Upcoming") {
      result = result.filter((item) => item.state === "Upcoming" || item.state === "Mendatang");
    }

    // 2. Filter by project (business service)
    if (effectiveProjectFilter) {
      result = result.filter((item) => matchesProject(item.project, effectiveProjectFilter));
    }

    // 3. Filter by system (monitoring tool)
    if (effectiveSystemFilter) {
      result = result.filter((item) => matchesSystem(`${item.task} ${item.project}`, effectiveSystemFilter));
    }

    return result;
  }, [entries, filter, effectiveProjectFilter, effectiveSystemFilter, assessments]);

  return (
    <article className="panel schedule-panel">
      <div className="panel-heading schedule-heading">
        <div className="schedule-title-wrap">
          <div className="panel-title">Monitoring Schedule</div>
          {(effectiveProjectFilter || effectiveSystemFilter) && (
            <div className="schedule-active-filters-cluster">
              {effectiveProjectFilter && (
                <span className="system-active-filter-badge">
                  Proyek: <strong>{effectiveProjectFilter}</strong>
                  <button
                    type="button"
                    className="clear-system-filter-btn"
                    onClick={() => setProjectFilter(null)}
                    title="Hapus filter proyek"
                    aria-label="Hapus filter proyek"
                  >
                    ×
                  </button>
                </span>
              )}
              {effectiveSystemFilter && (
                <span className="system-active-filter-badge">
                  Sistem: <strong>{effectiveSystemFilter}</strong>
                  <button
                    type="button"
                    className="clear-system-filter-btn"
                    onClick={() => setSystemFilter(null)}
                    title="Hapus filter sistem"
                    aria-label="Hapus filter sistem"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {showFilter && (
          <div className="schedule-controls-row">
            {/* 1. Project / Service Filter Dropdown */}
            <ScheduleFilterDropdown
              id="schedule-project-filter"
              icon={<Layers size={13} className="sched-select-icon" />}
              label="Proyek"
              allLabel="Semua Proyek"
              totalCount={entries.length}
              selectedValue={effectiveProjectFilter}
              options={projectOptions}
              onSelect={setProjectFilter}
            />

            {/* 2. Technical System / Tool Filter Dropdown */}
            <ScheduleFilterDropdown
              id="schedule-system-filter"
              icon={<Server size={13} className="sched-select-icon" />}
              label="Sistem"
              allLabel="Semua Sistem"
              totalCount={entries.length}
              selectedValue={effectiveSystemFilter}
              options={systemOptions}
              onSelect={setSystemFilter}
            />

            {/* 3. Status Tabs (Semua / Needs Attention / Upcoming) */}
            <div className="filter-tabs" aria-label="Filter status monitoring">
              <button
                className={filter === "Semua" ? "selected" : ""}
                onClick={() => setFilter("Semua")}
              >
                Semua <span className="tab-count-badge">{counts.total}</span>
              </button>
              <button
                className={filter === "Needs Attention" ? "selected" : ""}
                onClick={() => setFilter("Needs Attention")}
              >
                Needs Attention <span className="tab-count-badge warn">{counts.needsAttention}</span>
              </button>
              <button
                className={filter === "Upcoming" ? "selected" : ""}
                onClick={() => setFilter("Upcoming")}
              >
                Upcoming <span className="tab-count-badge">{counts.upcoming}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="schedule-table" role="table" aria-label="Jadwal monitoring">
        <div className="schedule-header" role="row">
          <span>TIME</span>
          <span>CHECKPOINT</span>
          <span>CHECKED BY</span>
          <span>STATUS / VERDICT</span>
        </div>

        <div className="schedule-body">
          {visibleEntries.map((item) => {
          const key = rowKey(item);
          const assessment = assessments[key];
          const canAssess = item.state !== "Upcoming" && item.state !== "Mendatang";
          const isOk = assessment?.verdict === "ok" || assessment?.verdict === "adequate";
          const isNok = assessment?.verdict === "nok" || assessment?.verdict === "not-adequate";
          const hasVerdict = Boolean(assessment?.verdict);
          const isCurrentHour = currentHour === item.time;

          // Overdue calculation: if not yet assessed and time has passed currentHour
          const isOverdue = canAssess && !hasVerdict && currentHour && item.time < currentHour;
          const ownerRole = getOwnerRole(item.owner);

          return (
            <div
              className={[
                "schedule-row-wrapper",
                isOverdue ? "row-overdue" : "",
                isCurrentHour ? "row-current" : "",
                hasVerdict ? "row-assessed" : "row-pending",
              ].filter(Boolean).join(" ")}
              key={key}
            >
              <div
                className={`schedule-row ${isCurrentHour ? "current-hour" : ""} ${isOverdue ? "overdue-hour" : ""}`}
                role="row"
              >
                {/* 1. Time Column with Overdue / LIVE badge */}
                <span className="schedule-time">
                  <strong>{item.time}</strong>
                  {isCurrentHour && <small className="badge-live-tag">LIVE</small>}
                  {isOverdue && !isCurrentHour && (
                    <small className="badge-overdue-tag" title="Checkpoint ini belum dinilai dan telah melewati jadwal">
                      OVERDUE
                    </small>
                  )}
                </span>

                {/* 2. Checkpoint Details */}
                <span className="schedule-check">
                  <ProjectMark name={item.project} />
                  <span className="schedule-check-text">
                    <span className="schedule-check-heading">
                      <strong>{item.project}</strong>
                      {item.tone === "warning" && (
                        <span className="warn-indicator-dot" title="Perlu perhatian khusus">
                          <AlertTriangle size={13} className="warn-indicator-icon" />
                        </span>
                      )}
                    </span>
                    <small className="schedule-task-desc">{item.task}</small>
                    {assessment && isNok && assessment.note && (
                      <small className="checkpoint-note">
                        <FileText size={11} className="checkpoint-note-icon" />
                        <span>{assessment.note}</span>
                      </small>
                    )}
                  </span>
                </span>

                {/* 3. Checked By column: Name with role tooltip */}
                <span className="schedule-owner">
                  <div className="avatar-tooltip-container">
                    <Avatar
                      size="sm"
                      name={hasVerdict ? item.owner : undefined}
                      statusRing={hasVerdict ? "verified" : "pending"}
                      className="mini-avatar"
                      title={hasVerdict ? `${item.owner} (${ownerRole})` : "Pending verification"}
                    >
                      {!hasVerdict && <PendingUserSilhouette />}
                    </Avatar>
                    <div className="avatar-tooltip-card" role="tooltip">
                      <strong>{hasVerdict ? item.owner : "Pending Verification"}</strong>
                      <span>{hasVerdict ? ownerRole : "Menunggu verifikasi penilaian"}</span>
                    </div>
                  </div>

                  {hasVerdict ? (
                    <span
                      className="checked-by-name anim-reveal-name"
                      title={`${item.owner} (${ownerRole})`}
                    >
                      {item.owner}
                    </span>
                  ) : (
                    <span
                      className={`checked-by-placeholder ${isOverdue ? "placeholder-overdue" : ""}`}
                      title="Menunggu verifikasi penilaian OK/NOK"
                    >
                      {isOverdue ? "Belum diverifikasi (Overdue)" : "Pending verification"}
                    </span>
                  )}
                </span>

                {/* 4. Verdict / Status Actions Cell */}
                <span className="schedule-assessment-cell">
                  {canAssess ? (
                    <div className="verdict-cell-inner">
                      {hasVerdict ? (
                        /* De-emphasized state for already resolved checkpoint */
                        <div className="assessed-verdict-display">
                          <span
                            className={`verdict-pill-solid ${isOk ? "verdict-pill-ok" : "verdict-pill-nok"}`}
                            title={`Status ${isOk ? "OK" : "NOK"} tercatat.`}
                          >
                            {isOk ? <Check size={12} strokeWidth={2.5} /> : <X size={12} strokeWidth={2.5} />}
                            <span>{isOk ? "OK" : "NOK"}</span>
                          </span>

                          <button
                            type="button"
                            className="ubah-btn"
                            onClick={() => {
                              onAssess(key, null);
                              notify.info("Penilaian checkpoint dibatalkan.", { id: `checkpoint-${key}` });
                            }}
                            title="Batalkan penilaian dan ubah verdict"
                          >
                            Ubah
                          </button>
                        </div>
                      ) : (
                        /* Clearly prominent dual buttons for unassessed checkpoint */
                        <span className="assessment-actions">
                          <button
                            type="button"
                            className="assess-btn assess-ok"
                            title="Tandai checkpoint ini sebagai OK"
                            onClick={() => {
                              onAssess(key, "ok");
                              notify.success("Checkpoint ditandai OK.", {
                                id: `checkpoint-${key}`,
                                duration: 6500,
                                action: {
                                  label: "Undo",
                                  onClick: () => {
                                    onAssess(key, null);
                                    notify.info("Penilaian OK dibatalkan.", { id: `checkpoint-${key}` });
                                  },
                                },
                              });
                            }}
                          >
                            <Check size={12} strokeWidth={2.5} className="assess-btn-icon" />
                            <span className="assess-btn-text">OK</span>
                          </button>
                          <button
                            type="button"
                            className="assess-btn assess-fail"
                            title="Tandai sebagai NOK dan tambahkan catatan"
                            onClick={() => {
                              onRequestNote(key);
                            }}
                          >
                            <X size={12} strokeWidth={2.5} className="assess-btn-icon" />
                            <span className="assess-btn-text">NOK</span>
                          </button>
                        </span>
                      )}
                    </div>
                  ) : (
                    <Badge tone={item.tone}>{item.state}</Badge>
                  )}
                </span>
              </div>


            </div>
          );
        })}

        {visibleEntries.length === 0 && (
          <div className="schedule-empty">Tidak ada checkpoint yang cocok dengan filter ini.</div>
        )}
        </div>
      </div>

      {footer}
    </article>
  );
}

