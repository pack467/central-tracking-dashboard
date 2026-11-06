
import { Select } from "@/app/components/ui/Select";
import { useMemo, useState, useEffect, useId } from "react";
import { AlertTriangle, Check, X, Layers, Server, MessageSquare, Pencil, Globe } from "lucide-react";
import { ProjectTile } from "@/app/components/monitoring/ProjectTile";
import { useToast } from "@/app/components/ui/Toast";
import { Avatar } from "@/app/components/ui/Avatar";
import { NotAdequateModal } from "@/app/components/dashboard/AssessmentModals";
import { MonitoringLinksModal } from "@/app/components/monitoring/MonitoringLinksModal";
import { getOwnerRole } from "@/app/lib/data";
import type { CheckpointAssessment, MonitoringEntry } from "@/app/lib/types";
import { useClient } from "@/app/context/ClientContext";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";

import { matchesLegacyProject as matchesProject } from "@/app/lib/master-data-model";
export { matchesLegacyProject as matchesProject } from "@/app/lib/master-data-model";

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

function ScheduleFilterDropdown({ id, icon, label, allLabel, totalCount, selectedValue, options, onSelect }: ScheduleFilterDropdownProps) {
  const activeOption = options.find(option => option.name.toLowerCase() === selectedValue?.toLowerCase());
  const displayLabel = selectedValue ? selectedValue + " (" + (activeOption?.count ?? 0) + ")" : allLabel + " (" + totalCount + ")";
  return <Select id={id} label={label} aria-label={"Filter " + label + ": " + displayLabel} title={"Filter " + label + ": " + displayLabel} value={selectedValue ?? ""} onValueChange={value => onSelect(value || null)} icon={icon} renderValue={() => displayLabel} className="h-8 text-[11.5px] font-semibold" options={[{ value: "", label: allLabel, meta: totalCount }, ...options.map(option => ({ value: option.name, label: option.name, meta: option.count }))]} />;
}

interface MonitoringScheduleProps {
  selectedStatus?: MonitoringFilter;
  onSelectStatus?: (value: MonitoringFilter) => void;
  entries: MonitoringEntry[];
  assessments: Record<string, CheckpointAssessment>;
  onAssess: (key: string, verdict: "ok" | "nok" | "adequate" | "not-adequate" | null) => void;
  onRequestNote: (key: string) => void;
  onUpdateNote?: (key: string, note: string) => void;
  currentHour?: string | null;
  showFilter?: boolean;
  selectedSystem?: string | null;
  onSelectSystem?: (system: string | null) => void;
  selectedProject?: string | null;
  onSelectProject?: (project: string | null) => void;
  footer?: React.ReactNode;
}

export const FILTERS = ["Semua", "Needs Attention", "Upcoming"] as const;
export type MonitoringFilter = (typeof FILTERS)[number];

export const TAG_VARIANTS = {
  live: {
    container:
      "inline-flex items-center justify-center gap-[6px] h-[20px] w-[78px] min-w-[78px] px-2.5 rounded-full border border-[rgb(56_189_248_/_0.4)] bg-[rgb(56_189_248_/_0.14)] text-[#38bdf8] text-[10px] font-semibold font-mono uppercase tracking-[0.08em] leading-none shrink-0 select-none",
    dot: "w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse motion-reduce:animate-none shrink-0",
    label: "LIVE",
  },
  overdue: {
    container:
      "inline-flex items-center justify-center gap-[6px] h-[20px] w-[78px] min-w-[78px] px-2.5 rounded-full border border-[rgb(251_191_36_/_0.4)] bg-[rgb(251_191_36_/_0.14)] text-[#fbbf24] text-[10px] font-semibold font-mono uppercase tracking-[0.08em] leading-none shrink-0 select-none",
    dot: "w-1.5 h-1.5 rounded-full bg-[#fbbf24] shrink-0",
    label: "OVERDUE",
  },
} as const;

export const PENDING_AVATAR_VARIANTS = {
  overdue: {
    textColor: "text-[#fbbf24]",
    text: "Belum diverifikasi",
  },
  live: {
    textColor: "text-[#94a3b8]",
    text: "Menunggu verifikasi",
  },
  upcoming: {
    textColor: "text-[#64748b]",
    text: "Belum waktunya",
  },
} as const;

export const RESULT_BADGE_VARIANTS = {
  ok: {
    container:
      "w-[72px] min-w-[72px] h-8 px-2 rounded-full inline-flex items-center justify-center gap-1.5 select-none pointer-events-none bg-[#14805f] text-white transition-all duration-150 motion-reduce:transition-none shrink-0",
    disc: "w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center shrink-0",
    iconColor: "text-[#14805f]",
    label: "OK",
    labelClass: "font-mono text-[11.5px] font-bold tracking-[0.04em] leading-none text-white",
    srText: "Hasil verifikasi: OK",
  },
  nok: {
    container:
      "w-[72px] min-w-[72px] h-8 px-2 rounded-full inline-flex items-center justify-center gap-1.5 select-none pointer-events-none bg-[#c94545] text-white transition-all duration-150 motion-reduce:transition-none shrink-0",
    disc: "w-[22px] h-[22px] rounded-full bg-white flex items-center justify-center shrink-0",
    iconColor: "text-[#c94545]",
    label: "NOK",
    labelClass: "font-mono text-[11.5px] font-bold tracking-[0.04em] leading-none text-white",
    srText: "Hasil verifikasi: NOK",
  },
} as const;

/**
 * Nobody has checked this checkpoint yet: the classic "no profile photo" mark, a grey circle with a white head and
 * shoulders cut off by the circle (a thin grey rim stays visible). Same 26 px as the assigned avatar (ui/Avatar sm).
 */
export function PendingUserSilhouette({ className = "", size = 26 }: { className?: string; size?: number }) {
  const clipId = `pending-avatar-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      role="img"
      aria-label="Belum ada pemeriksa"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill="#475569" />
      <circle cx="50" cy="45" r="17.5" fill="#cbd5e1" />
      <path d="M21.5 110 V82 Q21.5 67.5 36 67.5 H64 Q78.5 67.5 78.5 82 V110 Z" fill="#cbd5e1" clipPath={`url(#${clipId})`} />
    </svg>
  );
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function rowKey(entry: MonitoringEntry) {
  return `${entry.time}-${entry.project}-${entry.task}`;
}

export function MonitoringSchedule({
  entries,
  assessments,
  onAssess,
  onRequestNote,
  onUpdateNote,
  currentHour = null,
  selectedStatus,
  onSelectStatus,
  showFilter = true,
  selectedSystem = undefined,
  onSelectSystem,
  selectedProject = undefined,
  onSelectProject,
  footer,
}: MonitoringScheduleProps) {
  const notify = useToast();
  const { activeClientId, projects: masterProjects } = useClient();

  const [localFilter, setLocalFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const filter = selectedStatus ?? localFilter;
  const setFilter = (value: MonitoringFilter) => { if (onSelectStatus) onSelectStatus(value); else setLocalFilter(value); };
  const [internalProjectFilter, setInternalProjectFilter] = useState<string | null>(null);
  const [internalSystemFilter, setInternalSystemFilter] = useState<string | null>(null);
  const [activeNoteModal, setActiveNoteModal] = useState<{
    item: MonitoringEntry;
    key: string;
    verdict: "ok" | "nok" | "adequate" | "not-adequate";
    note: string;
  } | null>(null);
  const [activeLinksModal, setActiveLinksModal] = useState<{
    project: string;
    task?: string;
    clientId?: string;
    url?: string;
  } | null>(null);

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
      const timer = setTimeout(() => {
        setInternalProjectFilter(null);
        onSelectProject?.(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [entries, effectiveProjectFilter, onSelectProject]);

  // Dynamic project options from active client's projects + any unmapped entries
  const projectOptions = useMemo(() => {
    const definedProjects = masterProjects.filter(p => p.clientId === activeClientId && p.status === "active").map(p => p.name);
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
  }, [entries, activeClientId, masterProjects]);

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

  // Minutes since the schedule's first slot, so a schedule that runs past midnight (… 23:00, 00:00) stays in order.
  const scheduleStart = entries.length ? toMinutes(entries[0].time) : 0;
  const scheduleOrder = (time: string) => (toMinutes(time) - scheduleStart + 1440) % 1440;

  return (
    <article className="rounded-[10px] border border-[#334155] bg-[#1e293b] shadow-[0_4px_12px_rgba(0,0,0,0.25)] mb-6 min-[1920px]:-mb-8 group/card has-[button[aria-expanded=true]]:min-h-[460px]">
      <div className="rounded-t-[10px] p-[16px_20px_14px] max-md:p-[14px_12px_12px] max-md:gap-3 border-b border-[#334155] flex flex-wrap items-center justify-between gap-4">
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
          <div className="flex flex-wrap items-center gap-2.5 max-md:w-full max-md:flex-col max-md:items-stretch">
            <div className="grid grid-cols-2 gap-2 md:flex md:items-center [&>*]:min-w-0">
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
              className="inline-flex items-center gap-[3px] p-[3px] rounded-[6px] bg-[#0f172a] border border-[#334155] max-md:grid max-md:grid-cols-[auto_1fr_auto] max-md:[&>button]:justify-center max-md:[&>button]:h-9 max-md:[&>button]:px-2 max-md:[&>button]:whitespace-nowrap max-md:[&>button]:text-[11.5px]"
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

      <div className="@container/schedule rounded-b-[10px] p-[4px_12px_12px] max-md:px-2 flex flex-col min-w-0 overflow-x-hidden md:overflow-x-auto" role="table" aria-label="Jadwal monitoring">
        {/* Table Header - Hidden on mobile (<md) */}
        <div
          className="max-md:hidden md:grid md:grid-cols-[88px_minmax(0,1.8fr)_minmax(140px,0.9fr)_152px] @min-[900px]/schedule:grid-cols-[144px_minmax(0,1.8fr)_minmax(140px,0.9fr)_152px] items-center [column-gap:12px] h-9 px-3 text-[#94a3b8] text-[9.5px] font-bold tracking-[0.8px] font-mono uppercase shrink-0"
          role="row"
        >
          <span className="text-center @min-[900px]/schedule:text-left">TIME</span>
          <span>CHECKPOINT</span>
          <span>CHECKED BY</span>
          <span className="text-right">STATUS / VERDICT</span>
        </div>

        {/* Table Body - Natural page scroll on mobile, scroll area on desktop */}
        <div className="flex flex-col min-w-0 md:max-h-[round(down,calc(100vh-240px),58px)] md:min-h-0 md:overflow-y-auto overflow-x-hidden md:pr-1 snap-y snap-proximity [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#475569]">
          {visibleEntries.map((item) => {
            const key = rowKey(item);
            const assessment = assessments[key];
            // A checkpoint can be judged from its own hour on; before that OK/NOK stay locked.
            const notYetDue = item.state === "Upcoming" || item.state === "Mendatang" || Boolean(currentHour && scheduleOrder(item.time) > scheduleOrder(currentHour));
            const canAssess = !notYetDue;
            const isOk = assessment?.verdict === "ok" || assessment?.verdict === "adequate";
            const hasVerdict = Boolean(assessment?.verdict);
            const isCurrentHour = currentHour === item.time;
            const isOverdue = canAssess && !hasVerdict && currentHour && scheduleOrder(item.time) < scheduleOrder(currentHour);
            const ownerRole = getOwnerRole(item.owner);
            const pendingVariant = isOverdue
              ? PENDING_AVATAR_VARIANTS.overdue
              : isCurrentHour
              ? PENDING_AVATAR_VARIANTS.live
              : PENDING_AVATAR_VARIANTS.upcoming;

            return (
              <div
                key={key}
                className={`grid grid-cols-[minmax(0,1fr)_auto] [grid-template-areas:'time_time''checkpoint_checkpoint''checked_actions'] gap-y-2.5 gap-x-3 p-[12px] my-1 rounded-[8px] border border-[#334155]/60 bg-[#1e293b]/70 md:grid-cols-[88px_minmax(0,1.8fr)_minmax(140px,0.9fr)_152px] @min-[900px]/schedule:grid-cols-[144px_minmax(0,1.8fr)_minmax(140px,0.9fr)_152px] md:[grid-template-areas:none] md:items-center md:[column-gap:12px] md:min-h-[64px] md:px-3 md:py-0 md:my-[2px] md:border-transparent md:border-t-[#334155] md:hover:bg-[#243044] md:hover:border-[#334155] md:snap-start transition-all duration-150 border-l-[3px] ${
                  isCurrentHour
                    ? "bg-[color-mix(in_srgb,#38bdf8_8%,#1e293b)] border-[#38bdf8]/30 border-l-[#38bdf8]"
                    : isOverdue
                    ? "bg-[color-mix(in_srgb,#fbbf24_8%,#1e293b)] border-[#fbbf24]/30 border-l-[#fbbf24]"
                    : "border-l-transparent"
                }`}
                role="row"
              >
                {/* 1. Time Column with Overdue / LIVE badge */}
                <div className="[grid-area:time] md:[grid-area:auto] flex items-center gap-2 md:w-[88px] md:flex-col md:items-center md:justify-center md:gap-[6px] @min-[900px]/schedule:w-[144px] @min-[900px]/schedule:grid @min-[900px]/schedule:grid-cols-[52px_84px] @min-[900px]/schedule:gap-2 @min-[900px]/schedule:items-center min-w-0 md:h-full">
                  <strong className="text-[12px] md:text-[14px] font-bold font-mono text-[#f8fafc] tabular-nums shrink-0 leading-none text-left md:text-center @min-[900px]/schedule:text-left @min-[900px]/schedule:w-[52px]">
                    {item.time}
                  </strong>
                  {isCurrentHour ? (
                    <span className={TAG_VARIANTS.live.container}>
                      <span className={TAG_VARIANTS.live.dot} aria-hidden="true" />
                      <span>{TAG_VARIANTS.live.label}</span>
                    </span>
                  ) : isOverdue ? (
                    <span
                      className={TAG_VARIANTS.overdue.container}
                      title="Checkpoint ini belum dinilai dan telah melewati jadwal"
                    >
                      <span className={TAG_VARIANTS.overdue.dot} aria-hidden="true" />
                      <span>{TAG_VARIANTS.overdue.label}</span>
                    </span>
                  ) : (
                    <div className="hidden @min-[900px]/schedule:block w-[84px] shrink-0" aria-hidden="true" />
                  )}
                </div>

                {/* 2. Checkpoint Details */}
                <div className="[grid-area:checkpoint] md:[grid-area:auto] flex items-center gap-2.5 min-w-0">
                  <ProjectTile name={item.project} clientId={item.clientId || activeClientId} />
                  <div className="flex flex-col justify-center min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <strong className="text-[13px] md:text-[12px] font-semibold text-[#f8fafc] truncate min-w-0"><MasterProjectName value={item.project} historical /></strong>
                      {item.tone === "warning" && (
                        <span className="text-[#fbbf24] shrink-0" title="Perlu perhatian khusus">
                          <AlertTriangle size={13} className="stroke-[2.3px]" />
                        </span>
                      )}
                    </div>
                    <small className="block mt-[2px] text-[11.5px] md:text-[10.5px] text-[#94a3b8] leading-snug md:truncate">{item.task}</small>
                  </div>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => {
                      setActiveLinksModal({
                        project: item.project,
                        task: item.task,
                        clientId: item.clientId || activeClientId,
                        url: item.url,
                      });
                    }}
                    title={`Buka link monitoring ${item.project}`}
                    aria-label={`Buka link monitoring ${item.project}`}
                    className="w-8 h-8 max-md:w-10 max-md:h-10 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 grid place-items-center [&>svg]:block rounded-lg border border-[#38bdf8]/30 bg-[#38bdf8]/10 text-[#38bdf8] hover:bg-[#38bdf8]/20 hover:border-[#38bdf8]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] transition-colors duration-150 cursor-pointer shrink-0"
                  >
                    <Globe size={16} strokeWidth={1.75} absoluteStrokeWidth />
                  </button>
                </div>

                {/* 3. Checked By column */}
                <div className="[grid-area:checked] md:[grid-area:auto] flex items-center gap-2 min-w-0 max-md:pt-2.5 max-md:border-t max-md:border-[#334155]/50">
                  {hasVerdict ? (
                    <Avatar size="sm" name={item.owner} title={`${item.owner} (${ownerRole})`} />
                  ) : (
                    <PendingUserSilhouette />
                  )}
                  {hasVerdict ? (
                    <span className="flex flex-col min-w-0" title={`${item.owner} (${ownerRole})`}>
                      <span className="text-[12px] font-medium text-[#f8fafc] truncate leading-tight">{item.owner}</span>
                      <span className="text-[10.5px] text-[#94a3b8] truncate leading-tight max-md:hidden">{ownerRole}</span>
                    </span>
                  ) : (
                    <span
                      className={`text-[12px] truncate min-w-0 select-none ${pendingVariant.textColor}`}
                      title="Menunggu penilaian OK/NOK"
                    >
                      {pendingVariant.text}
                    </span>
                  )}
                </div>

                {/* 4. Verdict / Status Actions Cell */}
                <div className="[grid-area:actions] md:[grid-area:auto] flex items-center justify-end md:w-[152px] shrink-0 min-w-0 max-md:pt-2.5 max-md:border-t max-md:border-[#334155]/50">
                  {canAssess ? (
                    <div className="flex items-center justify-end w-full shrink-0">
                      {hasVerdict ? (
                        <div className="inline-flex items-center justify-end gap-2 md:w-[152px] flex-nowrap shrink-0 transition-all duration-150 motion-reduce:transition-none">
                          {/* Distinct Solid Result Badge */}
                          <div
                            className={isOk ? RESULT_BADGE_VARIANTS.ok.container : RESULT_BADGE_VARIANTS.nok.container}
                            title={`Status ${isOk ? "OK" : "NOK"} tercatat.`}
                          >
                            <span className={isOk ? RESULT_BADGE_VARIANTS.ok.disc : RESULT_BADGE_VARIANTS.nok.disc}>
                              {isOk ? (
                                <Check size={13} strokeWidth={3} className={RESULT_BADGE_VARIANTS.ok.iconColor} />
                              ) : (
                                <X size={13} strokeWidth={3} className={RESULT_BADGE_VARIANTS.nok.iconColor} />
                              )}
                            </span>
                            <span className={isOk ? RESULT_BADGE_VARIANTS.ok.labelClass : RESULT_BADGE_VARIANTS.nok.labelClass}>
                              {isOk ? RESULT_BADGE_VARIANTS.ok.label : RESULT_BADGE_VARIANTS.nok.label}
                            </span>
                            <span className="sr-only">{isOk ? RESULT_BADGE_VARIANTS.ok.srText : RESULT_BADGE_VARIANTS.nok.srText}</span>
                          </div>

                          {/* Catatan / Update Button */}
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            aria-label={assessment?.note ? "Ubah catatan" : "Tambah catatan"}
                            title={assessment?.note ? assessment.note.slice(0, 80) : "Tambah catatan"}
                            onClick={() => {
                              setActiveNoteModal({
                                item,
                                key,
                                verdict: assessment.verdict,
                                note: assessment.note || "",
                              });
                            }}
                            className={`relative inline-flex items-center justify-center w-8 h-8 max-sm:w-10 max-sm:h-10 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 rounded-lg border transition-all duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] ${
                              assessment?.note
                                ? "border-[#38bdf8]/40 bg-[rgba(56,189,248,0.12)] text-[#38bdf8] hover:bg-[rgba(56,189,248,0.2)] hover:border-[#38bdf8]/70 shadow-[0_1px_3px_rgba(56,189,248,0.15)]"
                                : "border-[#334155] bg-transparent text-[#94a3b8] hover:bg-[#243044] hover:text-[#f8fafc] hover:border-[#475569]"
                            }`}
                          >
                            <MessageSquare size={15} />
                            {Boolean(assessment?.note) && (
                              <span
                                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#38bdf8] ring-2 ring-[#1e293b]"
                                aria-hidden="true"
                              />
                            )}
                          </button>

                          {/* Ubah Icon Button */}
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-8 h-8 max-sm:w-10 max-sm:h-10 [@media(pointer:coarse)]:w-10 [@media(pointer:coarse)]:h-10 rounded-lg border border-[#334155] bg-transparent text-[#94a3b8] hover:bg-[#243044] hover:text-[#f8fafc] hover:border-[#475569] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-1 focus-visible:ring-offset-[#1e293b] transition-all duration-150 shrink-0 cursor-pointer active:scale-95"
                            onClick={() => {
                              onAssess(key, null);
                              notify.info("Penilaian checkpoint dibatalkan.", { id: `checkpoint-${key}` });
                            }}
                            title="Ubah verifikasi"
                            aria-label="Ubah verifikasi"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-2 md:w-[152px] flex-nowrap shrink-0">
                          <button
                            type="button"
                            className="inline-flex h-8 w-[72px] min-w-[72px] max-sm:h-10 max-sm:w-[70px] max-sm:min-w-[70px] [@media(pointer:coarse)]:h-10 items-center justify-center gap-1.5 rounded-lg border border-[#4ade80]/40 bg-[#4ade80]/[0.06] px-2 font-mono text-[11px] font-bold text-[#4ade80] leading-none whitespace-nowrap select-none transition-colors duration-150 hover:border-[#4ade80]/70 hover:bg-[#4ade80]/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]/50 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
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
                            className="inline-flex h-8 w-[72px] min-w-[72px] max-sm:h-10 max-sm:w-[70px] max-sm:min-w-[70px] [@media(pointer:coarse)]:h-10 items-center justify-center gap-1.5 rounded-lg border border-[#f87171]/40 bg-[#f87171]/[0.06] px-2 font-mono text-[11px] font-bold text-[#f87171] leading-none whitespace-nowrap select-none transition-colors duration-150 hover:border-[#f87171]/70 hover:bg-[#f87171]/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f87171]/50 active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
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
                    <div
                      className="inline-flex items-center justify-end gap-2 md:w-[152px] flex-nowrap shrink-0 cursor-not-allowed"
                      title={`Belum waktunya. Checkpoint ini bisa dinilai mulai pukul ${item.time}.`}
                    >
                      {(["ok", "nok"] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          disabled
                          aria-label={`${v.toUpperCase()} belum bisa dipilih, checkpoint mulai pukul ${item.time}`}
                          className="pointer-events-none inline-flex h-8 w-[72px] min-w-[72px] max-sm:h-10 max-sm:w-[70px] max-sm:min-w-[70px] [@media(pointer:coarse)]:h-10 items-center justify-center gap-1.5 rounded-lg border border-[#334155] bg-transparent px-2 font-mono text-[11px] font-bold text-[#475569] leading-none whitespace-nowrap select-none"
                        >
                          {v === "ok" ? <Check size={13} strokeWidth={2.5} className="shrink-0" /> : <X size={13} strokeWidth={2.5} className="shrink-0" />}
                          <span>{v.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
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

      {activeNoteModal && (
        <NotAdequateModal
          open
          mode="catatan"
          entry={activeNoteModal.item}
          verdict={activeNoteModal.verdict}
          initialNote={activeNoteModal.note}
          onClose={() => setActiveNoteModal(null)}
          onSubmit={(newNote) => {
            if (onUpdateNote) {
              onUpdateNote(activeNoteModal.key, newNote);
            }
            notify.success("Catatan disimpan.", { id: `note-${activeNoteModal.key}` });
            setActiveNoteModal(null);
          }}
          onDeleteNote={() => {
            if (onUpdateNote) {
              onUpdateNote(activeNoteModal.key, "");
            }
            notify.info("Catatan dihapus.", { id: `note-${activeNoteModal.key}` });
            setActiveNoteModal(null);
          }}
        />
      )}

      {activeLinksModal && (
        <MonitoringLinksModal
          open
          project={activeLinksModal.project}
          task={activeLinksModal.task}
          clientId={activeLinksModal.clientId}
          explicitUrl={activeLinksModal.url}
          onClose={() => setActiveLinksModal(null)}
        />
      )}

      {footer}
    </article>
  );
}

