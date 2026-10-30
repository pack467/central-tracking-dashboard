"use client";
import { MasterProjectName } from "@/app/components/ui/MasterProjectName";

import { useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, Eye, FileText, Info, ListChecks, Lock, ShieldCheck, Ticket as TicketIcon, Trash2, UserCheck, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { Avatar } from "@/app/components/ui/Avatar";
import { formatHandoverDate, isOpenTicket } from "@/app/lib/data";
import { canEditHandover, canReceiveHandover } from "@/app/lib/handover";
import { getShiftTagClass } from "@/app/lib/shifts";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
import type { HandoverTask, Ticket } from "@/app/lib/types";
import { ticketCode } from "@/app/lib/ticket-code";

export type HandoverWorkflow = ReturnType<typeof useHandoverWorkflow>;

export interface HandoverModalProps {
  workflow: HandoverWorkflow;
  tickets?: Ticket[];
  onSelectTicket?: (ticket: Ticket) => void;
}

function formatDateTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return `${d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}, ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`;
  } catch {
    return iso;
  }
}

const fallbackCheckpoints = [
  { time: "07:00", project: "B2B", task: "Health check gateway B2B & failover", verdict: "ok" as const, note: "Response time normal < 180ms" },
  { time: "07:15", project: "SM", task: "Queue distributor check", verdict: "ok" as const, note: "Trafik antrian stabil" },
  { time: "07:30", project: "USIEM", task: "Log collector audit", verdict: "nok" as const, note: "Log direct MSS sempat tertumpuk" },
  { time: "07:45", project: "DM", task: "Database sync check", verdict: "ok" as const, note: "Replika in sync" },
  { time: "08:00", project: "ActiveMQ", task: "Broker heap & consumer count", verdict: "ok" as const, note: "Heap normal" },
];

/** A project named in a list: plain text in a quiet chip, the same in every tab. */
function ProjectPill({ name, large }: { name: string; large?: boolean }) {
  return <span className={`inline-flex shrink-0 items-center rounded-md border border-slate-600/60 bg-slate-800/70 font-mono font-semibold text-slate-200 ${large ? "px-2 py-1 text-[12px]" : "px-1.5 py-0.5 text-[10.5px]"}`}>{name}</span>;
}

/** What a tab says when it has nothing: an icon, one line that answers, one line that explains. */
function EmptyNote({ icon: Icon, title, text, tone = "slate" }: { icon: LucideIcon; title: string; text: string; tone?: "slate" | "green" }) {
  const green = tone === "green";
  return (
    <div className={`flex flex-col items-center gap-1.5 rounded-xl border px-5 py-7 text-center ${green ? "border-emerald-400/25 bg-emerald-500/[0.06]" : "border-dashed border-slate-700 bg-slate-900/40"}`}>
      <Icon size={24} className={green ? "text-emerald-400" : "text-slate-500"} aria-hidden="true" />
      <strong className={`text-[13.5px] font-semibold ${green ? "text-emerald-300" : "text-slate-200"}`}>{title}</strong>
      <p className="m-0 text-[12px] text-slate-400">{text}</p>
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <span className="text-[12px] font-semibold text-slate-300">{children}</span>
      {hint && <span className="text-[11.5px] text-slate-500">{hint}</span>}
    </div>
  );
}

/** A count with its meaning underneath. */
function MiniStat({ value, label, tone, ring }: { value: number; label: string; tone: string; ring: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 rounded-lg border px-3 py-2 ${ring}`}>
      <strong className={`font-mono text-[18px] font-bold leading-none tabular-nums ${tone}`}>{value}</strong>
      <span className="truncate text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

function ValidationNote({ shift, note }: { shift: string; note: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-emerald-400/25 bg-emerald-500/[0.07] px-3 py-2.5 text-[12.5px] leading-[1.5] text-emerald-100/90">
      <CheckCircle2 size={14} className="mt-[2px] shrink-0 text-emerald-400" aria-hidden="true" />
      <span><strong className="font-semibold text-emerald-300">Catatan penerimaan shift {shift}:</strong> {note}</span>
    </div>
  );
}

export function HandoverModal({ workflow, tickets, onSelectTicket }: HandoverModalProps) {
  const { open, close: onClose, record, records, busy, active, actor } = workflow;
  const onToggleTask = workflow.toggleTask;
  const [activeTab, setActiveTab] = useState<"tasks" | "findings" | "monitoring" | "notes" | "tickets">("tasks");
  const [filter, setFilter] = useState<"all" | "repeat" | "waiting" | "in-progress">("all");
  const [acceptanceNote, setAcceptanceNote] = useState("");
  const [taskToDelete, setTaskToDelete] = useState<HandoverTask | null>(null);
  const isReceiver = canReceiveHandover(record, actor);

  const noteContent = record.notes?.trim() || "";
  const hasNote = Boolean(noteContent);
  const senderName = record.sourcePic || record.createdBy?.name || "Shifter Sebelumnya";
  const senderShift = record.sourceShift
    ? record.sourceShift.toLowerCase().startsWith("shift")
      ? record.sourceShift
      : `Shift ${record.sourceShift}`
    : "";

  // Core distinction: A completed record is strictly read-only history.
  // Pending records default to active confirmation mode.
  const isCompleted = Boolean(record.acceptance);
  const isReadOnly = isCompleted || workflow.modalMode === "history";

  // Derive still open tickets associated with this handover
  const openTicketsList = useMemo(() => {
    if (record.openTickets && Array.isArray(record.openTickets)) {
      return record.openTickets;
    }
    if (tickets && tickets.length > 0) {
      const referencedIds = record.tasks
        .map((t) => t.sourceRef)
        .filter((ref): ref is string => Boolean(ref?.startsWith("ticket:")))
        .map((ref) => ref.replace("ticket:", ""));
      if (referencedIds.length > 0) {
        return tickets.filter((t) => referencedIds.includes(t.id));
      }
      return tickets.filter(isOpenTicket);
    }
    return [];
  }, [record.openTickets, record.tasks, tickets]);

  const tasks = record.tasks;
  const completedTasksCount = tasks.filter((task) => task.completed).length;
  const progressPercent = tasks.length
    ? Math.round((completedTasksCount / tasks.length) * 100)
    : 0;
  const visibleTasks = filter === "all" ? tasks : tasks.filter((task) => task.state === filter);

  // Completion timestamp display for read-only view
  const completionDateStr = record.acceptance?.at
    ? formatDateTime(record.acceptance.at)
    : active?.handoverDate
    ? `${formatHandoverDate(active.handoverDate)}, 08:15 WIB`
    : "06 September 2026, 08:15 WIB";

  const checkpoints = record.monitoringCheckpoints && record.monitoringCheckpoints.length > 0
    ? record.monitoringCheckpoints
    : fallbackCheckpoints;

  const checkpointsOk = checkpoints.filter((cp) => cp.verdict === "ok").length;
  const findingsWaiting = record.findings.filter((finding) => finding.state === "waiting").length;

  // the five parts of the handover; a count that needs attention (findings, open tickets) shows amber while its tab is not open
  const tabs: Array<{ key: typeof activeTab; label: string; icon: LucideIcon; count: number; alert?: boolean }> = [
    { key: "tasks", label: "Daftar Tugas", icon: ListChecks, count: tasks.length },
    { key: "notes", label: "Catatan Shift", icon: FileText, count: hasNote ? 1 : 0 },
    { key: "findings", label: "Temuan & Isu", icon: AlertTriangle, count: record.findings.length, alert: record.findings.length > 0 },
    { key: "monitoring", label: "Status Monitoring", icon: Activity, count: record.monitoredProjects.length },
    { key: "tickets", label: "Tiket yang Masih Open", icon: TicketIcon, count: openTicketsList.length, alert: openTicketsList.length > 0 },
  ];
  const taskFilters: Array<[typeof filter, string, number]> = [
    ["all", "All", tasks.length],
    ["repeat", "Routine", tasks.filter((task) => task.state === "repeat").length],
    ["waiting", "Pending", tasks.filter((task) => task.state === "waiting").length],
    ["in-progress", "In Progress", tasks.filter((task) => task.state === "in-progress").length],
  ];


  return (
    <Modal
      open={open}
      onClose={onClose}
      label={isReadOnly ? "Riwayat catatan handover shift (Hanya Baca)" : "Konfirmasi serah terima shift"}
      variant="wide"
      width={740}
    >
      <header
        className={`flex justify-between gap-[24px] max-[660px]:gap-[12px] p-[22px_24px_20px] max-[660px]:p-[17px_16px_15px] ${
          isReadOnly
            ? "bg-[linear-gradient(135deg,rgba(148,163,184,0.09),transparent_75%)] border-b border-b-[rgba(148,163,184,0.2)]"
            : "bg-[linear-gradient(135deg,rgba(59,130,246,0.12),transparent_70%)] border-b border-b-[rgba(59,130,246,0.25)]"
        }`}
      >
        <div>
          {/* Mode Badges */}
          {!isReadOnly ? (
            <div className="flex items-center gap-[7px] text-[var(--accent-blue)] font-mono text-[10px] font-bold tracking-[0.75px]">
              <span className="inline-flex items-center gap-[6px] p-[4px_10px] rounded-[99px] text-[10.5px] font-extrabold tracking-[0.6px] uppercase bg-[rgba(59,130,246,0.16)] text-[#60a5fa] border border-[rgba(96,165,250,0.38)] shadow-[0_0_12px_rgba(59,130,246,0.15)]">
                <span className="inline-block w-[6px] h-[6px] min-w-[6px] min-h-[6px] rounded-[50%] bg-[#60a5fa] shadow-[0_0_8px_#60a5fa] shrink-0" />
                MODE KONFIRMASI AKTIF
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-[7px] text-[var(--accent-blue)] font-mono text-[10px] font-bold tracking-[0.75px]">
              <span className="inline-flex items-center gap-[6px] p-[4px_10px] rounded-[99px] text-[10.5px] font-extrabold tracking-[0.6px] uppercase bg-[rgba(148,163,184,0.12)] text-[#94a3b8] border border-[rgba(148,163,184,0.28)]">
                <Lock size={12} strokeWidth={2.4} aria-hidden="true" />
                RIWAYAT HANDOVER — HANYA BACA
              </span>
            </div>
          )}

          <h2 className="m-[7px_0_3px] text-[var(--ink-primary)] text-[20px] max-[660px]:text-[17px] leading-[1.25] tracking-[-0.35px]">
            {active ? (
              <>Shift {record.sourceShift} <span className="text-[var(--accent-blue)]">→</span> {record.targetShift}</>
            ) : (
              "Catatan Handover"
            )}
          </h2>

          {/* Subtitles */}
          {!isReadOnly ? (
            <p className="max-w-[640px] m-0 text-[11.5px] text-[var(--ink-secondary)]">
              Handover ini masih menunggu konfirmasi dari shift penerima · Revisi {active?.revision ?? 1}
            </p>
          ) : (
            <p className="max-w-[640px] m-0 text-[11.5px] text-[var(--ink-secondary)]">
              Diselesaikan pada {completionDateStr} · Diterima oleh {record.acceptance?.actor.name || record.targetPic}
            </p>
          )}
        </div>

        <div className="flex items-start gap-[8px] max-[660px]:gap-[5px] shrink-0">
          {!isReadOnly && active && canEditHandover(record, actor) && (
            <button
              className="inline-flex items-center justify-center min-h-[32px] p-[0_10px] max-[660px]:min-w-[76px] max-[660px]:p-[0_9px] max-[660px]:text-[10px] whitespace-nowrap leading-none shrink-0 box-border text-[var(--accent-blue)] border border-[var(--accent-blue-border)] rounded-[7px] bg-[var(--accent-blue-soft)] text-[10.5px] font-bold hover:text-white hover:border-[var(--accent-blue)] hover:bg-[var(--accent-blue)] cursor-pointer transition-all duration-150"
              disabled={busy}
              onClick={workflow.edit}
            >
              Edit Catatan
            </button>
          )}
          {!isReadOnly && (
            <button
              className="inline-flex items-center justify-center min-h-[32px] p-[0_10px] max-[660px]:min-w-[76px] max-[660px]:p-[0_9px] max-[660px]:text-[10px] whitespace-nowrap leading-none shrink-0 box-border text-[var(--accent-blue)] border border-[var(--accent-blue-border)] rounded-[7px] bg-[var(--accent-blue-soft)] text-[10.5px] font-bold hover:text-white hover:border-[var(--accent-blue)] hover:bg-[var(--accent-blue)] cursor-pointer transition-all duration-150"
              disabled={busy}
              onClick={() => workflow.openWizard("create")}
            >
              ＋ Buat Baru
            </button>
          )}
          <ModalCloseButton onClose={onClose} />
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-[18px_24px_22px] max-[660px]:p-[14px_16px_18px]">
        {/* Read-Only Explanatory Microcopy Banner */}
        {isReadOnly && (
          <div className="flex items-center gap-[8px] p-[10px_14px] mb-[16px] bg-[rgba(148,163,184,0.08)] border border-[rgba(148,163,184,0.2)] rounded-[8px] text-[12px] text-[var(--ink-secondary)] leading-[1.4]" role="note">
            <Lock size={14} className="shrink-0 text-[#94a3b8]" aria-hidden="true" />
            <span>Tampilan ini menampilkan catatan handover yang telah selesai dan tidak dapat diubah lagi.</span>
          </div>
        )}

        {/* Empty state fallback */}
        {!active && records.length === 0 && (
          <div className="p-[12px] text-[var(--ink-muted)] border border-dashed border-[var(--panel-border)] rounded-[8px] bg-[var(--bg)] text-[10.5px]">
            {workflow.error ? "Catatan belum dapat dibaca. Coba muat ulang." : "Belum ada catatan tersimpan. Buat handover untuk memulai serah terima."}
          </div>
        )}

        {(active || records.length > 0) && (
          <>
            {/* Sender & Receiver Summary Block */}
            <div className="mb-[16px] max-[660px]:mb-[14px] p-[14px_16px] max-[660px]:p-[14px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px]">
              <div className="flex items-center justify-between gap-[12px] mb-[12px] max-[660px]:grid max-[660px]:grid-cols-1 max-[660px]:items-stretch max-[660px]:gap-[8px]">
                <div className="flex flex-col gap-[2px] max-[660px]:min-w-0">
                  <span className="inline-flex items-center gap-[6px] text-[9.5px] font-bold text-[var(--ink-muted)] font-mono tracking-[0.5px]">
                    SENDER{" "}
                    <span className={`shift-name-tag ${getShiftTagClass(record.sourceShift)} text-[9.5px] leading-[9.5px] gap-[6px]`}>
                      {record.sourceShift}
                    </span>
                  </span>
                  <strong className="text-[13px] max-[660px]:text-[12.5px] text-[var(--ink-primary)] font-bold max-[660px]:leading-[1.35] max-[660px]:[overflow-wrap:anywhere]">{record.sourcePic}</strong>
                </div>
                <div className="text-[var(--accent-blue)] text-[18px] font-extrabold max-[660px]:grid max-[660px]:place-items-center max-[660px]:self-center max-[660px]:w-[24px] max-[660px]:h-[20px] max-[660px]:rotate-90" aria-hidden="true">
                  <ArrowRight size={16} />
                </div>
                <div className="flex flex-col gap-[2px] max-[660px]:min-w-0">
                  <span className="inline-flex items-center gap-[6px] text-[9.5px] font-bold text-[var(--ink-muted)] font-mono tracking-[0.5px]">
                    RECEIVER{" "}
                    <span className={`shift-name-tag ${getShiftTagClass(record.targetShift)} text-[9.5px] leading-[9.5px] gap-[6px]`}>
                      {record.targetShift}
                    </span>
                  </span>
                  <strong className="text-[13px] max-[660px]:text-[12.5px] text-[var(--ink-primary)] font-bold max-[660px]:leading-[1.35] max-[660px]:[overflow-wrap:anywhere]">{record.targetPic}</strong>
                </div>
              </div>

              <p className="text-[var(--ink-secondary)] m-[8px_0] max-[660px]:m-[10px_0] max-[660px]:text-[12px] max-[660px]:leading-[1.5]">
                {isReadOnly ? (
                  <span className="text-[var(--green)] font-medium">
                    <CheckCircle2 size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "5px", color: "var(--green)" }} />
                    Handover telah diserahkan dan diterima oleh {record.acceptance?.actor.name || record.targetPic}.
                  </span>
                ) : record.acceptance ? (
                  `Diterima oleh ${record.acceptance.actor.name} · ${new Date(record.acceptance.at).toLocaleString("id-ID")}`
                ) : (
                  "Menunggu penerimaan akhir; checklist bukan persetujuan serah terima."
                )}
              </p>

              {/* In Active mode: Progress bar. In Read-only mode: Static final summary line */}
              {!isReadOnly ? (
                <div className="flex flex-col gap-[6px] pt-[10px] border-t border-[var(--line)]">
                  <div className="flex justify-between items-center text-[11.5px] text-[var(--ink-secondary)]">
                    <span>Progres Peninjauan Tugas</span>
                    <strong className="text-[var(--ink-primary)] font-mono">
                      {completedTasksCount} dari {tasks.length} Tugas Ditandai Lanjut ({progressPercent}%)
                    </strong>
                  </div>
                  <div className="h-[6px] bg-[var(--line)] rounded-[99px] overflow-hidden" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-[var(--accent-blue)] rounded-[99px] transition-[width] duration-300 ease-out" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-[12px] pt-[10px] border-t border-[var(--line)]">
                  <div className="flex items-center gap-[7px] text-[12px] text-[var(--ink-primary)]">
                    <CheckCircle2 size={15} style={{ color: "var(--green)" }} />
                    <strong>{completedTasksCount} dari {tasks.length} tugas dikonfirmasi untuk dilanjutkan</strong>
                  </div>
                  <span className="inline-flex items-center p-[3px_8px] rounded-[99px] text-[10px] font-bold uppercase tracking-[0.5px] bg-[rgba(148,163,184,0.14)] text-[#94a3b8] border border-[rgba(148,163,184,0.25)]">Arsip Permanen</span>
                </div>
              )}
            </div>

            {/* Navigation Tabs: five equal columns (icon and count, the name under them); on a phone a row of pills that scrolls sideways */}
            <div className="mb-[16px] grid grid-cols-5 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/50 p-1 max-[600px]:flex max-[600px]:overflow-x-auto max-[600px]:[scrollbar-width:none] max-[600px]:[&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Bagian handover">
              {tabs.map((tab) => {
                const selected = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center text-[12px] font-semibold leading-tight transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 max-[600px]:shrink-0 max-[600px]:flex-row max-[600px]:gap-2 max-[600px]:px-3 ${
                      selected ? "border-sky-400/40 bg-sky-400/10 text-sky-300" : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <tab.icon size={14} aria-hidden="true" />
                      <span className={`min-w-[20px] rounded-full px-1.5 py-[1px] text-center font-mono text-[11px] font-bold ${selected ? "bg-sky-400/20 text-sky-200" : tab.alert ? "bg-amber-400/15 text-amber-300" : "bg-slate-700/70 text-slate-300"}`}>{tab.count}</span>
                    </span>
                    <span className="max-[600px]:whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: DAFTAR TUGAS */}
            {activeTab === "tasks" && (
              <div className="flex flex-col gap-3">
                {!isReadOnly && (
                  <div className="flex items-start gap-2 rounded-lg border border-sky-400/20 bg-sky-400/[0.06] px-3 py-2.5" role="note">
                    <Info size={14} className="mt-[1px] shrink-0 text-sky-400" aria-hidden="true" />
                    <p className="m-0 text-[12px] leading-[1.5] text-sky-100/90">
                      Tandai <b className="font-semibold text-emerald-300">Done</b> untuk tugas yang sudah ditinjau dan tetap dilanjutkan, atau <b className="font-semibold text-red-300">Delete</b> untuk tugas yang tidak diperlukan lagi.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" aria-label="Filter status tugas">
                    {taskFilters.map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        aria-pressed={filter === value}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11.5px] font-semibold transition-colors duration-150 ${
                          filter === value ? "border-sky-400/40 bg-sky-400/10 text-sky-300" : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                        }`}
                      >
                        {label}<span className="font-mono text-[10.5px] text-slate-500">{count}</span>
                      </button>
                    ))}
                  </div>
                  <span className="text-[11.5px] text-slate-400"><b className="font-mono font-semibold text-emerald-300">{completedTasksCount}</b> dari {tasks.length} ditandai Done</span>
                </div>

                <div className="grid gap-2">
                  {visibleTasks.map((task) => (
                    <article
                      key={task.id}
                      className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2.5 rounded-xl border p-3.5 transition-colors duration-150 max-[560px]:grid-cols-[24px_minmax(0,1fr)] ${
                        task.completed ? "border-emerald-500/35 bg-emerald-500/[0.06]" : "border-slate-700/70 bg-slate-900/60"
                      } ${isReadOnly ? "" : "hover:border-slate-500/80"}`}
                    >
                      {/* done or not, readable at a glance; the Done button is what changes it */}
                      <span aria-hidden="true" className={`mt-[1px] grid size-6 place-items-center rounded-full border-2 ${task.completed ? "border-emerald-400 bg-emerald-500 text-white" : "border-slate-600 text-transparent"}`}>
                        <Check size={13} strokeWidth={3} />
                      </span>

                      <div className="min-w-0">
                        <strong className={`block text-[13.5px] font-semibold leading-snug ${task.completed ? "text-emerald-50" : "text-slate-100"}`}>{task.title}</strong>
                        {task.detail && <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-slate-400">{task.detail}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <ProjectPill name={task.project} />
                          <TaskStatusBadge state={task.state} />
                          <TaskPriorityBadge priority={task.priority} />
                        </div>

                        {isReadOnly && (
                          <div className="mt-2 flex items-center gap-1.5 text-[11.5px] leading-[1.4] text-slate-500 [&_strong]:font-semibold [&_strong]:text-slate-300">
                            <UserCheck size={12} className="shrink-0" aria-hidden="true" />
                            <span>
                              {task.completed ? (
                                <>
                                  Dikonfirmasi berlanjut oleh <strong>{task.confirmedBy || record.acceptance?.actor.name || record.targetPic}</strong> —{" "}
                                  {task.confirmedAt ? formatDateTime(task.confirmedAt) : record.acceptance ? formatDateTime(record.acceptance.at) : `${formatHandoverDate(active?.handoverDate || "")}, 08:12 WIB`}
                                </>
                              ) : (
                                "Ditinjau saat serah terima (dihentikan / tidak dilanjutkan)."
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {!isReadOnly ? (
                        <div className="flex items-center gap-1.5 max-[560px]:col-start-2">
                          <button
                            type="button"
                            className={`inline-flex min-h-[30px] items-center justify-center gap-1.5 rounded-md border px-3 text-[11.5px] font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 ${
                              task.completed
                                ? "border-emerald-500 bg-emerald-500 text-white hover:not-disabled:bg-emerald-600"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:not-disabled:border-emerald-400 hover:not-disabled:bg-emerald-500/20"
                            }`}
                            onClick={() => onToggleTask(task.id)}
                            disabled={busy || !isReceiver || Boolean(record.acceptance)}
                            title={task.completed ? "Batal tandai Done" : "Tandai tugas ini Done (tetap berlaku dan dilanjutkan)"}
                            aria-label={task.completed ? "Tugas ditandai Done" : "Tandai Done"}
                            aria-pressed={task.completed}
                          >
                            <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                            Done
                          </button>
                          <button
                            type="button"
                            className="inline-flex min-h-[30px] items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-3 text-[11.5px] font-bold text-red-300 transition-colors duration-150 hover:not-disabled:border-red-400 hover:not-disabled:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                            onClick={() => setTaskToDelete(task)}
                            disabled={busy || !isReceiver || Boolean(record.acceptance)}
                            title="Hapus tugas dari handover"
                            aria-label="Hapus tugas"
                          >
                            <Trash2 size={13} aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      ) : (
                        task.completed && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300 max-[560px]:col-start-2 max-[560px]:justify-self-start">
                            <Check size={12} strokeWidth={2.5} aria-hidden="true" /> Done
                          </span>
                        )
                      )}
                    </article>
                  ))}

                  {visibleTasks.length === 0 && <EmptyNote icon={ListChecks} title="Tidak ada tugas pada filter ini" text="Pilih filter lain untuk melihat tugas yang ada." />}
                </div>
              </div>
            )}

            {/* TAB 2: CATATAN SHIFT */}
            {activeTab === "notes" && (
              <div className="flex flex-col gap-3">
                {noteContent ? (
                  <article className="overflow-hidden rounded-xl border border-slate-700/70 bg-slate-900/60">
                    <header className="flex items-center gap-3 border-b border-slate-700/60 px-4 py-3">
                      <Avatar size="md" name={senderName} />
                      <div className="min-w-0">
                        <strong className="block truncate text-[13.5px] font-semibold text-slate-100">{senderName}</strong>
                        <span className="block text-[11.5px] text-slate-400">{senderShift ? `Catatan dari ${senderShift}` : "Catatan dari shift pengirim"}</span>
                      </div>
                    </header>
                    <div className="border-l-[3px] border-sky-400/60 px-4 py-3.5 text-[13px] leading-[1.7] text-slate-200 whitespace-pre-wrap [word-break:break-word]">
                      {noteContent}
                    </div>
                  </article>
                ) : (
                  <EmptyNote icon={FileText} title="Tidak ada catatan" text="Shift sebelumnya tidak menulis catatan tambahan." />
                )}

                {/* Receiver acceptance note (its one place) */}
                {!isReadOnly && isReceiver && !record.acceptance && (
                  <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
                    <label className="m-0 flex flex-col gap-1.5">
                      <span className="text-[12.5px] font-semibold text-slate-100">Catatan Penerimaan Akhir <span className="font-normal text-slate-500">(opsional)</span></span>
                      <textarea
                        rows={2}
                        disabled={busy}
                        value={acceptanceNote}
                        onChange={(event) => setAcceptanceNote(event.target.value)}
                        placeholder="Hasil pemeriksaan penerima sebelum menerima serah terima"
                        className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
                      />
                    </label>
                    {actor && <p className="mb-0 mt-2 text-[11.5px] text-slate-500">Akun {actor.local ? "simulasi lokal" : "aktif"}: {actor.name}</p>}
                  </div>
                )}

                {!isReadOnly && !isReceiver && !record.acceptance && actor && (
                  <p className="m-0 flex items-start gap-2 rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2.5 text-[12px] text-slate-400">
                    <Info size={14} className="mt-[1px] shrink-0" aria-hidden="true" />
                    <span>Akun {actor.local ? "simulasi lokal" : "aktif"}: {actor.name}. Checklist dan penerimaan menunggu akun penerima yang dituju ({record.targetPic}).</span>
                  </p>
                )}

                {isReadOnly && record.validationNote && record.validationNote !== "Menunggu validasi shift penerima." && (
                  <ValidationNote shift={record.targetShift} note={record.validationNote} />
                )}
              </div>
            )}

            {/* TAB 3: TEMUAN & ISU */}
            {activeTab === "findings" && (
              <div className="flex flex-col gap-3">
                {record.findings.length ? (
                  <>
                    <p className="m-0 text-[12px] text-slate-400">
                      <b className="font-semibold text-amber-300">{findingsWaiting}</b> masih dipantau · <b className="font-semibold text-violet-300">{record.findings.length - findingsWaiting}</b> sedang ditindaklanjuti
                    </p>
                    <div className="grid gap-2">
                      {record.findings.map((finding, index) => {
                        const waiting = finding.state === "waiting";
                        return (
                          <article
                            key={`${finding.title}-${index}`}
                            className={`rounded-xl border border-l-[3px] p-3.5 ${waiting ? "border-amber-400/25 border-l-amber-400 bg-amber-400/[0.05]" : "border-violet-400/25 border-l-violet-400 bg-violet-400/[0.05]"}`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <ProjectPill name={finding.project || "NOC"} />
                              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-[3px] text-[11px] font-bold ${waiting ? "border-amber-400/35 bg-amber-400/10 text-amber-300" : "border-violet-400/35 bg-violet-400/10 text-violet-300"}`}>
                                {waiting ? <Eye size={12} aria-hidden="true" /> : <ArrowRight size={12} aria-hidden="true" />}
                                {waiting ? "Dipantau" : "On Follow Up"}
                              </span>
                            </div>
                            <h4 className="m-0 mt-2 text-[13.5px] font-semibold leading-snug text-slate-100">{finding.title || "Temuan tanpa judul"}</h4>
                            <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-slate-400">{finding.detail || "Belum ada rincian."}</p>
                          </article>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <EmptyNote icon={ShieldCheck} tone="green" title="Tidak ada temuan" text="Tidak ada temuan khusus yang memerlukan tindak lanjut pada shift ini." />
                )}
              </div>
            )}

            {/* TAB 4: STATUS MONITORING */}
            {activeTab === "monitoring" && (
              <div className="flex flex-col gap-3">
                <section className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar size="md" name={record.monitoringOwner} />
                      <div className="min-w-0">
                        <span className="block text-[11.5px] text-slate-400">Penanggung jawab monitoring</span>
                        <strong className="block truncate text-[13.5px] font-semibold text-slate-100">{record.monitoringOwner || "—"}</strong>
                      </div>
                    </div>
                    <Badge tone={record.acceptance ? "success" : "warning"}>{record.acceptance ? "Diterima & Diverifikasi" : "Menunggu penerimaan"}</Badge>
                  </div>
                  {record.monitoringSummary && <p className="m-0 mt-3 text-[12.5px] leading-[1.6] text-slate-300">{record.monitoringSummary}</p>}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <MiniStat value={record.monitoredProjects.length} label="Proyek dimonitor" tone="text-sky-300" ring="border-sky-400/25 bg-sky-400/[0.06]" />
                    <MiniStat value={checkpointsOk} label="Checkpoint OK" tone="text-emerald-300" ring="border-emerald-400/25 bg-emerald-400/[0.06]" />
                    <MiniStat value={checkpoints.length - checkpointsOk} label="Checkpoint NOK" tone={checkpoints.length - checkpointsOk ? "text-red-300" : "text-slate-400"} ring={checkpoints.length - checkpointsOk ? "border-red-400/30 bg-red-500/[0.06]" : "border-slate-600/50 bg-slate-800/40"} />
                  </div>
                </section>

                <section>
                  <SectionTitle>Proyek yang dimonitor</SectionTitle>
                  {record.monitoredProjects.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {record.monitoredProjects.map((project) => <ProjectPill key={project} name={project} large />)}
                    </div>
                  ) : (
                    <p className="m-0 text-[12px] text-slate-500">Tidak ada proyek yang dinyatakan termonitor pada catatan ini.</p>
                  )}
                </section>

                <section>
                  <SectionTitle hint={`${checkpoints.length} checkpoint`}>Hasil checkpoint monitoring shift</SectionTitle>
                  <div className="grid gap-1.5">
                    {checkpoints.map((cp, idx) => {
                      const ok = cp.verdict === "ok";
                      return (
                        <div
                          key={`${cp.time}-${cp.project}-${idx}`}
                          className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2.5 ${ok ? "border-slate-700/60 bg-slate-900/50" : "border-red-400/30 bg-red-500/[0.06]"}`}
                        >
                          <span className="font-mono text-[12px] font-semibold text-slate-400">{cp.time}</span>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <ProjectPill name={cp.project} />
                              <strong className="truncate text-[12.5px] font-semibold text-slate-100" title={cp.task}>{cp.task}</strong>
                            </div>
                            {cp.note && <small className={`mt-0.5 block truncate text-[11.5px] ${ok ? "text-slate-500" : "text-red-200/80"}`} title={cp.note}>{cp.note}</small>}
                          </div>
                          <span className={`inline-flex min-w-[54px] items-center justify-center gap-1 rounded-md border px-2 py-[3px] text-[11px] font-extrabold tracking-[0.4px] ${ok ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-300" : "border-red-400/40 bg-red-500/15 text-red-300"}`}>
                            {ok ? <CheckCircle2 size={12} aria-hidden="true" /> : <XCircle size={12} aria-hidden="true" />}
                            {ok ? "OK" : "NOK"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {(record.monitoringExceptions ?? []).length > 0 && (
                  <section>
                    <SectionTitle>Tidak dimonitor</SectionTitle>
                    <div className="grid gap-1.5">
                      {(record.monitoringExceptions ?? []).map((exception) => (
                        <article key={exception.project} className="rounded-lg border border-amber-400/25 border-l-[3px] border-l-amber-400 bg-amber-400/[0.05] px-3 py-2.5">
                          <div className="flex items-center gap-2"><ProjectPill name={exception.project} /><strong className="text-[12.5px] font-semibold text-amber-200">Tidak dimonitor</strong></div>
                          <p className="m-0 mt-1 text-[12px] leading-[1.5] text-slate-400">{exception.reason || "Alasan belum dicatat."}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}

                {record.validationNote && <ValidationNote shift={record.targetShift} note={record.validationNote} />}
              </div>
            )}

            {/* TAB 5: TIKET YANG MASIH OPEN */}
            {activeTab === "tickets" && (
              <div className="flex flex-col gap-3">
                {openTicketsList.length ? (
                  <>
                    <p className="m-0 text-[12px] text-slate-400"><b className="font-semibold text-amber-300">{openTicketsList.length}</b> tiket belum selesai saat serah terima · klik untuk membuka detailnya</p>
                    <div className="grid gap-2">
                      {openTicketsList.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-700/70 bg-slate-900/60 p-3.5 transition-colors duration-150 hover:border-sky-400/40 hover:bg-slate-800/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                          onClick={() => onSelectTicket?.(ticket)}
                          role="button"
                          tabIndex={0}
                          title={`Buka detail ticket #${ticketCode(ticket)}`}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectTicket?.(ticket);
                            }
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="font-mono text-[12px] font-bold text-sky-300">#{ticketCode(ticket)}</span>
                              <span className="inline-flex items-center rounded-md border border-slate-600/60 bg-slate-800/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-200"><MasterProjectName value={ticket.project} historical /></span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge tone={severityTone(ticket.severity || ticket.priority || "neutral")}>{ticket.priority || ticket.severity || "Normal"}</Badge>
                              <Badge tone={statusTone(ticket.status)}>{ticket.status}</Badge>
                            </div>
                          </div>
                          <h4 className="m-0 text-[13.5px] font-semibold leading-snug text-slate-100">{ticket.subject}</h4>
                          <div className="flex items-center justify-between gap-2 border-t border-slate-700/60 pt-2 text-[11.5px] text-slate-400">
                            <span className="inline-flex min-w-0 items-center gap-2">
                              <Avatar size="xs" name={ticket.owner || "—"} />
                              <span className="truncate">PIC: <strong className="font-semibold text-slate-200">{ticket.owner || "Belum ditugaskan"}</strong></span>
                            </span>
                            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-sky-300">Lihat detail <ArrowRight size={12} aria-hidden="true" /></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyNote icon={CheckCircle2} tone="green" title="Tidak ada tiket yang masih terbuka" text="Semua tiket sudah selesai saat handover ini dibuat." />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* FOOTER */}
      {!isReadOnly ? (
        /* Active Confirmation Mode Footer: Shows Done tasks count vs remaining + Secondary Tutup + Primary Blue "Konfirmasi Handover" */
        <footer className="flex items-center justify-between gap-[16px] p-[14px_24px] border-t border-[var(--line)] bg-[var(--bg)] max-[660px]:items-stretch max-[660px]:flex-col max-[660px]:gap-[10px] max-[660px]:p-[12px_16px]">
          <span className="text-[10.5px] text-[var(--ink-secondary)]">
            {tasks.filter((task) => task.completed).length} dari {tasks.length} tugas ditandai Done
            {tasks.filter((task) => !task.completed).length > 0
              ? ` (${tasks.filter((task) => !task.completed).length} belum ditinjau)`
              : " — Siap dikonfirmasi"}
          </span>
          <div className="flex gap-[8px] shrink-0 max-[660px]:grid max-[660px]:grid-cols-2 [&_.button]:max-[660px]:w-full [&_.button]:max-[660px]:min-w-0 [&_.button]:max-[660px]:px-[8px] [&_.button]:max-[660px]:text-[10.5px]">
            <button className="button button-secondary" onClick={onClose} disabled={busy}>
              Tutup
            </button>
            <button
              className="button button-primary"
              onClick={() => workflow.confirm(acceptanceNote)}
              disabled={!active || busy || !isReceiver || Boolean(record.acceptance) || !tasks.length || tasks.some((task) => !task.completed)}
            >
              <Check size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
              {busy ? "Menyimpan…" : record.acceptance ? "Sudah Diterima" : "Konfirmasi Handover"}
            </button>
          </div>
        </footer>
      ) : (
        /* Read-Only History Mode Footer: ONLY a single secondary "Tutup" button! No blue button. */
        <footer className="flex items-center justify-between gap-[16px] p-[14px_24px] border-t border-[var(--line)] bg-[var(--bg)] max-[660px]:items-stretch max-[660px]:flex-col max-[660px]:gap-[10px] max-[660px]:p-[12px_16px]">
          <div className="flex items-center gap-[6px] text-[11.5px] text-[var(--ink-muted)]">
            <Lock size={13} aria-hidden="true" />
            <span>Arsip historis terkunci — seluruh data serah terima shift telah tercatat permanen.</span>
          </div>
          <div className="shrink-0 max-[660px]:w-full [&_.button]:max-[660px]:w-full [&_.button]:max-[660px]:min-w-0 [&_.button]:max-[660px]:px-[8px] [&_.button]:max-[660px]:text-[10.5px]">
            <button className="button button-secondary" onClick={onClose}>
              Tutup
            </button>
          </div>
        </footer>
      )}

      {/* Task Deletion Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(taskToDelete)}
        danger
        title={`Hapus tugas "${taskToDelete?.title || ""}"?`}
        message="Tugas ini akan dihapus dari checklist handover dan tidak akan dilanjutkan ke shift berikutnya."
        confirmLabel="Hapus tugas"
        cancelLabel="Batal"
        onCancel={() => setTaskToDelete(null)}
        onConfirm={() => {
          if (taskToDelete) {
            workflow.deleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }
        }}
      />
    </Modal>
  );
}
