import { useMemo, useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  FileText,
  Check,
  X,
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
    <div
      className={`relative inline-flex items-center ${
        id === "schedule-project-filter"
          ? "supports-[anchor-name:--test]:[anchor-name:--dd-proyek]"
          : id === "schedule-system-filter"
          ? "supports-[anchor-name:--test]:[anchor-name:--dd-sistem]"
          : ""
      }`}
      ref={containerRef}
      id={id}
    >
      <button
        type="button"
        className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-[7px] text-[11.5px] font-semibold cursor-pointer transition-all user-select-none outline-none ${
          id === "schedule-project-filter"
            ? "supports-[anchor-name:--test]:[anchor-name:--dd-proyek]"
            : id === "schedule-system-filter"
            ? "supports-[anchor-name:--test]:[anchor-name:--dd-sistem]"
            : ""
        } ${
          isOpen ? "border-[#38bdf8] shadow-[0_0_0_1px_#38bdf8]" : ""
        } ${
          selectedValue
            ? "border border-[rgba(56,189,248,0.3)] bg-[rgba(56,189,248,0.12)] text-[#38bdf8]"
            : "bg-[#0f172a] border border-[#334155] text-[#cbd5e1] hover:border-[#64748b] hover:text-[#f8fafc]"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Filter ${label}: ${displayLabel}`}
        title={`Filter ${label}: ${displayLabel}`}
      >
        <span className="grid place-items-center text-[#94a3b8]">{icon}</span>
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 text-[#94a3b8] ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 sm:left-0 sm:right-auto top-full mt-1.5 group-has-[.schedule-empty-state]/card:top-auto group-has-[.schedule-empty-state]/card:bottom-full group-has-[.schedule-empty-state]/card:mt-0 group-has-[.schedule-empty-state]/card:mb-1.5 z-50 min-w-[200px] max-w-[calc(100vw-32px)] rounded-[10px] bg-[#1e293b] border border-[#334155] shadow-[0_20px_40px_rgba(0,0,0,0.45)] animate-in fade-in zoom-in-95 duration-150 p-1.5 ${
            id === "schedule-project-filter"
              ? "supports-[position-anchor:--test]:[position-anchor:--dd-proyek] supports-[position-anchor:--test]:[top:anchor(bottom)] supports-[position-anchor:--test]:[position-try-fallbacks:flip-block]"
              : id === "schedule-system-filter"
              ? "supports-[position-anchor:--test]:[position-anchor:--dd-sistem] supports-[position-anchor:--test]:[top:anchor(bottom)] supports-[position-anchor:--test]:[position-try-fallbacks:flip-block]"
              : ""
          }`}
          role="listbox"
          aria-label={`Pilihan filter ${label}`}
        >
          <div className="px-2.5 py-1.5 mb-1 border-b border-[#334155]">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#94a3b8] uppercase">
              PILIH {label.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 max-h-[18rem] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#475569]">
            {/* "Semua" Option */}
            <button
              type="button"
              role="option"
              aria-selected={!selectedValue}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium cursor-pointer transition-all ${
                !selectedValue ? "bg-[rgba(56,189,248,0.12)] text-[#38bdf8] font-bold" : "text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#243044]"
              }`}
              onClick={() => {
                onSelect(null);
                setIsOpen(false);
              }}
            >
              <div className="flex-1 min-w-0 truncate text-left">
                <span className="text-[11.5px] truncate">{allLabel}</span>
              </div>
              <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/10 text-[#94a3b8] shrink-0">
                {totalCount}
              </span>
              {!selectedValue && <Check size={13} className="text-[#38bdf8] shrink-0" />}
            </button>

            <div className="h-px bg-[#334155] my-1" />

            {/* Individual Options */}
            {options.map((opt) => {
              const isSelected = selectedValue?.toLowerCase() === opt.name.toLowerCase();
              return (
                <button
                  key={opt.name}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium cursor-pointer transition-all ${
                    isSelected ? "bg-[rgba(56,189,248,0.12)] text-[#38bdf8] font-bold" : "text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#243044]"
                  } ${opt.count === 0 ? "opacity-50" : ""}`}
                  onClick={() => {
                    onSelect(opt.name);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex-1 min-w-0 truncate text-left">
                    <span className="text-[11.5px] truncate">{opt.name}</span>
                  </div>
                  <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${opt.count === 0 ? "text-[#64748b]" : "bg-white/10 text-[#94a3b8]"}`}>
                    {opt.count}
                  </span>
                  {isSelected && <Check size={13} className="text-[#38bdf8] shrink-0" />}
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
      className="w-3.5 h-3.5 opacity-60 fill-current"
      aria-hidden="true"
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
    <article className="rounded-[10px] border border-[#334155] bg-[#1e293b] shadow-[0_4px_12px_rgba(0,0,0,0.25)] mb-6 min-[1920px]:-mb-8 group/card has-[button[aria-expanded=true]]:min-h-[460px]">
      <div className="rounded-t-[10px] p-[16px_20px_14px] border-b border-[#334155] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="text-[14px] font-bold text-[#f8fafc] flex items-center gap-2">Monitoring Schedule</div>
          {(effectiveProjectFilter || effectiveSystemFilter) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {effectiveProjectFilter && (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 rounded-full bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] text-[11px] text-[#38bdf8]">
                  <span>Proyek: <strong>{effectiveProjectFilter}</strong></span>
                  <button
                    type="button"
                    className="relative inline-flex items-center justify-center w-4 h-4 rounded-full text-[#f87171] bg-[#f87171]/15 border border-[#f87171]/40 hover:bg-[#f87171]/30 hover:text-[#fca5a5] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f87171]/60 transition-all duration-150 cursor-pointer shrink-0 before:absolute before:-inset-1 before:content-['']"
                    onClick={() => setProjectFilter(null)}
                    title="Hapus filter proyek"
                    aria-label="Hapus filter proyek"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </span>
              )}
              {effectiveSystemFilter && (
                <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 rounded-full bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] text-[11px] text-[#38bdf8]">
                  <span>Sistem: <strong>{effectiveSystemFilter}</strong></span>
                  <button
                    type="button"
                    className="relative inline-flex items-center justify-center w-4 h-4 rounded-full text-[#f87171] bg-[#f87171]/15 border border-[#f87171]/40 hover:bg-[#f87171]/30 hover:text-[#fca5a5] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f87171]/60 transition-all duration-150 cursor-pointer shrink-0 before:absolute before:-inset-1 before:content-['']"
                    onClick={() => setSystemFilter(null)}
                    title="Hapus filter sistem"
                    aria-label="Hapus filter sistem"
                  >
                    <X size={10} strokeWidth={2.5} />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {showFilter && (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              {/* 1. Project / Service Filter Dropdown */}
              <ScheduleFilterDropdown
                id="schedule-project-filter"
                icon={<Layers size={13} />}
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
                icon={<Server size={13} />}
                label="Sistem"
                allLabel="Semua Sistem"
                totalCount={entries.length}
                selectedValue={effectiveSystemFilter}
                options={systemOptions}
                onSelect={setSystemFilter}
              />
            </div>

            {/* 3. Status Tabs (Semua / Needs Attention / Upcoming) */}
            <div
              className="inline-flex items-center gap-[3px] p-[3px] rounded-[6px] bg-[#0f172a] border border-[#334155]"
              aria-label="Filter status monitoring"
            >
              <button
                type="button"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer ${
                  filter === "Semua"
                    ? "text-[#38bdf8] bg-[#1e293b] shadow-[0_1px_2px_rgba(0,0,0,0.2)] font-bold"
                    : "text-[#94a3b8] hover:text-[#f8fafc]"
                }`}
                onClick={() => setFilter("Semua")}
              >
                <span>Semua</span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-[rgba(148,163,184,0.2)] text-inherit font-bold">
                  {counts.total}
                </span>
              </button>

              <button
                type="button"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer ${
                  filter === "Needs Attention"
                    ? "text-[#fbbf24] bg-[#1e293b] shadow-[0_1px_2px_rgba(0,0,0,0.2)] font-bold"
                    : "text-[#94a3b8] hover:text-[#f8fafc]"
                }`}
                onClick={() => setFilter("Needs Attention")}
              >
                <span>Needs Attention</span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-[rgba(251,191,36,0.14)] text-[#fbbf24] font-bold">
                  {counts.needsAttention}
                </span>
              </button>

              <button
                type="button"
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer ${
                  filter === "Upcoming"
                    ? "text-[#38bdf8] bg-[#1e293b] shadow-[0_1px_2px_rgba(0,0,0,0.2)] font-bold"
                    : "text-[#94a3b8] hover:text-[#f8fafc]"
                }`}
                onClick={() => setFilter("Upcoming")}
              >
                <span>Upcoming</span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded-full bg-[rgba(148,163,184,0.2)] text-inherit font-bold">
                  {counts.upcoming}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-b-[10px] p-[4px_12px_12px] max-md:px-2 flex flex-col min-w-0 overflow-x-hidden md:overflow-x-auto" role="table" aria-label="Jadwal monitoring">
        {/* Table Header - Hidden on mobile (<md) */}
        <div
          className="max-md:hidden md:grid md:[grid-template-columns:64px_minmax(0,1.8fr)_minmax(140px,0.9fr)_minmax(166px,auto)] items-center [column-gap:12px] h-9 px-2.5 text-[#94a3b8] text-[9.5px] font-bold tracking-[0.8px] font-mono uppercase shrink-0"
          role="row"
        >
          <span>TIME</span>
          <span>CHECKPOINT</span>
          <span>CHECKED BY</span>
          <span className="text-right">STATUS / VERDICT</span>
        </div>

        {/* Table Body - Natural page scroll on mobile, scroll area on desktop */}
        <div className="flex flex-col min-w-0 md:max-h-[round(down,calc(100vh-240px),58px)] md:min-h-0 md:overflow-y-auto overflow-x-hidden md:pr-1 snap-y snap-proximity [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#475569]">
          {visibleEntries.map((item) => {
            const key = rowKey(item);
            const assessment = assessments[key];
            const canAssess = item.state !== "Upcoming" && item.state !== "Mendatang";
            const isOk = assessment?.verdict === "ok" || assessment?.verdict === "adequate";
            const isNok = assessment?.verdict === "nok" || assessment?.verdict === "not-adequate";
            const hasVerdict = Boolean(assessment?.verdict);
            const isCurrentHour = currentHour === item.time;
            const isOverdue = canAssess && !hasVerdict && currentHour && item.time < currentHour;
            const ownerRole = getOwnerRole(item.owner);

            return (
              <div
                key={key}
                className={`grid grid-cols-[1fr_auto] [grid-template-areas:'time_actions''checkpoint_checkpoint''checked_checked'] gap-y-2.5 gap-x-2 p-[12px_14px] my-1 rounded-[9px] border border-[#334155]/60 bg-[#1e293b]/70 md:grid-cols-[64px_minmax(0,1.8fr)_minmax(140px,0.9fr)_minmax(166px,auto)] md:[grid-template-areas:none] md:items-center md:[column-gap:12px] md:min-h-[52px] md:px-2.5 md:py-0 md:my-[3px] md:border-transparent md:border-t-[#334155] md:hover:bg-[#243044] md:hover:border-[#334155] md:snap-start transition-all duration-150 ${
                  isCurrentHour
                    ? "!bg-[color-mix(in_srgb,#38bdf8_8%,#1e293b)] !border-[#38bdf8]/30 !border-l-[3px] !border-l-[#38bdf8]"
                    : isOverdue
                    ? "!bg-[color-mix(in_srgb,#fbbf24_8%,#1e293b)] !border-[#fbbf24]/30 !border-l-[3px] !border-l-[#fbbf24]"
                    : ""
                }`}
                role="row"
              >
                {/* 1. Time Column with Overdue / LIVE badge (Baris atas kiri pada mobile) */}
                <div className="[grid-area:time] md:[grid-area:auto] flex items-center gap-2 md:flex-col md:items-start min-w-0">
                  <strong className="text-[12px] md:text-[11.5px] font-bold font-mono text-[#f8fafc] shrink-0">{item.time}</strong>
                  {isCurrentHour && (
                    <span className="inline-block md:mt-0.5 px-1.5 py-0.5 md:px-1 md:py-0.5 rounded-[4px] text-[8.5px] font-extrabold font-mono tracking-[0.5px] bg-[rgba(56,189,248,0.12)] text-[#38bdf8] border border-[rgba(56,189,248,0.3)] w-max leading-none shrink-0">
                      LIVE
                    </span>
                  )}
                  {isOverdue && !isCurrentHour && (
                    <span
                      className="inline-block md:mt-0.5 px-1.5 py-0.5 md:px-1 md:py-0.5 rounded-[4px] text-[8.5px] font-extrabold font-mono tracking-[0.5px] bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border border-[rgba(251,191,36,0.3)] w-max leading-none shrink-0"
                      title="Checkpoint ini belum dinilai dan telah melewati jadwal"
                    >
                      OVERDUE
                    </span>
                  )}
                </div>

                {/* 2. Checkpoint Details (Baris tengah pada mobile) */}
                <div className="[grid-area:checkpoint] md:[grid-area:auto] flex items-start md:items-center gap-2 min-w-0">
                  <div className="shrink-0 mt-0.5 md:mt-0">
                    <ProjectMark name={item.project} />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                      <strong className="text-[12px] font-semibold text-[#f8fafc] truncate max-w-full">{item.project}</strong>
                      {item.tone === "warning" && (
                        <span className="text-[#fbbf24] shrink-0" title="Perlu perhatian khusus">
                          <AlertTriangle size={13} className="stroke-[2.3px]" />
                        </span>
                      )}
                    </div>
                    <small className="block mt-[1px] text-[10px] text-[#94a3b8] line-clamp-2 leading-tight">{item.task}</small>
                    {assessment && isNok && assessment.note && (
                      <small className="inline-flex items-center gap-1 mt-1 text-[10px] font-mono text-[#f87171] break-all">
                        <FileText size={10} className="shrink-0" />
                        <span>{assessment.note}</span>
                      </small>
                    )}
                  </div>
                </div>

                {/* 3. Checked By column (Baris bawah pada mobile) */}
                <div className="[grid-area:checked] md:[grid-area:auto] flex items-center gap-[10px] min-w-0 max-md:pt-1 max-md:border-t max-md:border-[#334155]/40 md:border-t-0">
                  <div className="relative group inline-flex items-center shrink-0">
                    {hasVerdict ? (
                      <Avatar
                        size="sm"
                        name={item.owner}
                        statusRing="verified"
                        className="shrink-0"
                        title={`${item.owner} (${ownerRole})`}
                      />
                    ) : (
                      <Avatar
                        size="sm"
                        shape="circle"
                        className="shrink-0 overflow-hidden p-0 leading-none select-none"
                      >
                        <svg viewBox="0 0 40 40" className="size-full pointer-events-none">
                          <circle cx="20" cy="14.7" r="7.1" fill="#9aa09e" />
                          <ellipse cx="20" cy="40" rx="18" ry="15.2" fill="#9aa09e" />
                        </svg>
                      </Avatar>
                    )}

                    {/* Tooltip on hover */}
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col p-[6px_10px] bg-[#0f172a] text-white rounded-[6px] text-[11px] leading-[1.3] whitespace-nowrap shadow-[0_20px_40px_rgba(0,0,0,0.45)] z-50 border border-[#334155] select-none"
                    >
                      <strong className="text-[11px] text-white font-bold leading-tight">{hasVerdict ? item.owner : "Pending Verification"}</strong>
                      <span className="text-[10px] text-[#94a3b8] mt-0.5 leading-tight">{hasVerdict ? ownerRole : "Menunggu verifikasi penilaian"}</span>
                    </div>
                  </div>

                  {hasVerdict ? (
                    <span className="text-[11.5px] font-semibold text-[#f8fafc] md:truncate min-w-0 break-words" title={`${item.owner} (${ownerRole})`}>
                      {item.owner}
                    </span>
                  ) : (
                    <span
                      className={`font-mono text-[11px] md:truncate min-w-0 break-words select-none ${isOverdue ? "text-[#fbbf24] font-semibold" : "text-[#94a3b8] opacity-80"}`}
                      title="Menunggu verifikasi penilaian OK/NOK"
                    >
                      {isOverdue ? "Belum diverifikasi (Overdue)" : "Pending verification"}
                    </span>
                  )}
                </div>

                {/* 4. Verdict / Status Actions Cell (Baris atas kanan pada mobile) */}
                <div className="[grid-area:actions] md:[grid-area:auto] flex items-center justify-end min-w-0">
                  {canAssess ? (
                    <div className="flex items-center justify-end w-full">
                      {hasVerdict ? (
                        <div className="inline-flex items-center gap-2 flex-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 h-9 md:h-[28px] px-3 rounded-[6px] text-[11px] font-bold font-mono leading-none select-none pointer-events-none whitespace-nowrap ${
                              isOk
                                ? "text-[#3dbc8d] bg-[#253e48] border border-[#246259]"
                                : "text-[#f87171] bg-[#3b232e] border border-[#6e2b3b]"
                            }`}
                            title={`Status ${isOk ? "OK" : "NOK"} tercatat.`}
                          >
                            {isOk ? <Check size={13} strokeWidth={2.5} className="shrink-0" /> : <X size={13} strokeWidth={2.5} className="shrink-0" />}
                            <span>{isOk ? "OK" : "NOK"}</span>
                          </span>

                          <button
                            type="button"
                            className="inline-flex items-center h-9 md:h-[28px] px-2.5 rounded-[6px] border border-[#334155] bg-slate-900/50 text-[#cbd5e1] hover:text-[#38bdf8] hover:border-[#38bdf8]/60 hover:bg-[rgba(56,189,248,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-1 focus-visible:ring-offset-[#1e293b] text-[11px] font-semibold font-sans cursor-pointer whitespace-nowrap transition-all duration-150 shrink-0 active:scale-95"
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
                        <div className="inline-flex items-center justify-end gap-2 flex-nowrap">
                          <button
                            type="button"
                            className="inline-flex h-9 md:h-[28px] min-w-[64px] md:min-w-[60px] items-center justify-center gap-1.5 rounded-[6px] border border-[#4ade80]/40 bg-[#4ade80]/[0.06] px-3 md:px-2.5 font-mono text-[11px] font-bold text-[#4ade80] leading-none whitespace-nowrap select-none transition-colors duration-150 hover:border-[#4ade80]/70 hover:bg-[#4ade80]/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]/50 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                            title="Tandai checkpoint ini sebagai OK"
                            aria-label="Tandai checkpoint sebagai OK"
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
                            <Check size={13} strokeWidth={2.5} className="shrink-0" />
                            <span>OK</span>
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 md:h-[28px] min-w-[64px] md:min-w-[60px] items-center justify-center gap-1.5 rounded-[6px] border border-[#f87171]/40 bg-[#f87171]/[0.06] px-3 md:px-2.5 font-mono text-[11px] font-bold text-[#f87171] leading-none whitespace-nowrap select-none transition-colors duration-150 hover:border-[#f87171]/70 hover:bg-[#f87171]/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f87171]/50 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
                            title="Tandai sebagai NOK dan tambahkan catatan"
                            aria-label="Tandai checkpoint sebagai NOK"
                            onClick={() => {
                              onRequestNote(key);
                            }}
                          >
                            <X size={13} strokeWidth={2.5} className="shrink-0" />
                            <span>NOK</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Badge tone={item.tone}>{item.state}</Badge>
                  )}
                </div>
              </div>
            );
          })}

          {visibleEntries.length === 0 && (
            <div className="schedule-empty-state p-8 text-center text-xs text-[#94a3b8]">Tidak ada checkpoint yang cocok dengan filter ini.</div>
          )}
        </div>
      </div>

      {footer}
    </article>
  );
}

