"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, CheckCircle2, FileText, Info, Lock, Ticket as TicketIcon, Trash2, UserCheck } from "lucide-react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { IconFindings, IconMonitoring, IconTasks } from "@/app/components/ui/Icons";
import { Avatar } from "@/app/components/ui/Avatar";
import { formatHandoverDate, isOpenTicket } from "@/app/lib/data";
import { canEditHandover, canReceiveHandover } from "@/app/lib/handover";
import { getShiftTagClass } from "@/app/lib/shifts";
import { severityTone, statusTone } from "@/app/components/tickets/TicketTable";
import { TaskStatusBadge } from "./TaskStatusBadge";
import { TaskPriorityBadge } from "./TaskPriorityBadge";
import type { useHandoverWorkflow } from "@/app/hooks/useHandoverWorkflow";
import type { HandoverTask, Ticket } from "@/app/lib/types";

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
  const noteAttribution = senderShift
    ? `Catatan dari ${senderName} (${senderShift})`
    : `Catatan dari ${senderName}`;

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

  const getTabButtonClass = (tabKey: "tasks" | "findings" | "monitoring" | "notes" | "tickets") =>
    `p-[7px_12px] rounded-[6px] text-[12px] transition-all duration-150 ease-in-out cursor-pointer border ${
      activeTab === tabKey
        ? "text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] border-[var(--accent-blue-border)] font-bold"
        : "text-[var(--ink-muted)] bg-transparent border-transparent font-semibold hover:text-[var(--ink-primary)] hover:bg-[var(--panel-bg-hover)]"
    }`;


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

            {/* Navigation Tabs */}
            <div className="flex gap-[4px] mb-[14px] border-b border-[var(--line)] pb-[8px]" role="tablist">
              <button
                className={getTabButtonClass("tasks")}
                onClick={() => setActiveTab("tasks")}
                role="tab"
                aria-selected={activeTab === "tasks"}
              >
                <IconTasks /> Daftar Tugas ({tasks.length})
              </button>
              <button
                className={getTabButtonClass("notes")}
                onClick={() => setActiveTab("notes")}
                role="tab"
                aria-selected={activeTab === "notes"}
              >
                <FileText size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
                Catatan Shift {hasNote ? "(1)" : ""}
              </button>
              <button
                className={getTabButtonClass("findings")}
                onClick={() => setActiveTab("findings")}
                role="tab"
                aria-selected={activeTab === "findings"}
              >
                <IconFindings /> Temuan &amp; Isu ({record.findings.length})
              </button>
              <button
                className={getTabButtonClass("monitoring")}
                onClick={() => setActiveTab("monitoring")}
                role="tab"
                aria-selected={activeTab === "monitoring"}
              >
                <IconMonitoring /> Status Monitoring ({record.monitoredProjects.length})
              </button>
              <button
                className={getTabButtonClass("tickets")}
                onClick={() => setActiveTab("tickets")}
                role="tab"
                aria-selected={activeTab === "tickets"}
              >
                <TicketIcon size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }} />
                Tiket yang Masih Open ({openTicketsList.length})
              </button>
            </div>

            {/* TAB 1: DAFTAR TUGAS */}
            {activeTab === "tasks" && (
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center gap-[8px] p-[8px_12px] mb-[12px] rounded-[var(--radius-sm,_6px)] bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)]" role="note">
                  <Info size={14} style={{ color: "#60a5fa", flexShrink: 0 }} aria-hidden="true" />
                  <p className="m-0 text-[11.5px] leading-[1.45] text-[#93c5fd] font-medium">
                    Tandai &quot;Done&quot; untuk tugas yang sudah ditinjau dan tetap berlaku, atau &quot;Delete&quot; untuk tugas yang sudah tidak diperlukan.
                  </p>
                </div>

                <div className="flex gap-[5px] overflow-x-auto mb-[9px] pb-[1px]" aria-label="Filter status tugas">
                  {([
                    ["all", "All"],
                    ["repeat", "Routine"],
                    ["waiting", "Pending"],
                    ["in-progress", "In Progress"],
                  ] as Array<["all" | typeof filter, string]>).map(([value, label]) => (
                    <button
                      key={value}
                      className={`shrink-0 p-[5px_8px] rounded-[5px] text-[10px] font-semibold border transition-all duration-150 cursor-pointer ${
                        filter === value
                          ? "text-[var(--accent-blue)] border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)]"
                          : "text-[var(--ink-secondary)] border-[var(--panel-border)] bg-[var(--panel-bg)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)] hover:bg-[var(--accent-blue-soft)]"
                      }`}
                      onClick={() => setFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-[7px]">
                  {visibleTasks.map((task) => (
                    <article
                      className={`flex items-start gap-[12px] p-[12px_14px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px] transition-all duration-150 ${
                        isReadOnly
                          ? "cursor-default hover:bg-[var(--panel-bg)] hover:border-[var(--panel-border)]"
                          : "hover:border-[rgba(255,255,255,0.16)] hover:bg-[var(--panel-bg-hover)]"
                      }`}
                      key={task.id}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[8px] mb-[2px]">
                          <ProjectMark name={task.project} />
                          <strong className="text-[12.5px] text-[var(--ink-primary)] font-bold">{task.title}</strong>
                        </div>
                        <p className="m-[3px_0_0] text-[11.5px] text-[var(--ink-secondary)] leading-[1.4]">{task.detail}</p>

                        {/* Read-Only: Rich Historical Confirmation Details */}
                        {isReadOnly && (
                          <div className="flex items-center gap-[5px] mt-[6px] text-[11px] text-[var(--ink-muted)] leading-[1.3] [&_strong]:text-[var(--ink-secondary)] [&_strong]:font-semibold">
                            <UserCheck size={12} />
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

                      <div className="flex flex-col items-end gap-[8px] shrink-0">
                        <div className="flex items-center gap-[6px] flex-wrap justify-end">
                          <TaskStatusBadge state={task.state} />
                          <TaskPriorityBadge priority={task.priority} />
                        </div>

                        {!isReadOnly ? (
                          <div className="flex items-center gap-[6px]">
                            <button
                              type="button"
                              className={`inline-flex items-center justify-center gap-[5px] min-h-[28px] p-[4px_11px] rounded-[6px] text-[11px] font-bold tracking-[0.2px] cursor-pointer transition-all duration-150 select-none box-border disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none border ${
                                task.completed
                                  ? "bg-[#10b981] border-[#10b981] text-white shadow-[0_0_10px_rgba(16,185,129,0.45)] hover:not-disabled:bg-[#059669] hover:not-disabled:border-[#059669]"
                                  : "bg-[rgba(16,185,129,0.12)] border-[rgba(16,185,129,0.4)] text-[#34d399] hover:not-disabled:bg-[rgba(16,185,129,0.25)] hover:not-disabled:border-[#10b981] hover:not-disabled:text-white"
                              }`}
                              onClick={() => onToggleTask(task.id)}
                              disabled={busy || !isReceiver || Boolean(record.acceptance)}
                              title={task.completed ? "Batal tandai Done" : "Tandai tugas ini Done (tetap berlaku dan dilanjutkan)"}
                              aria-label={task.completed ? "Tugas ditandai Done" : "Tandai Done"}
                              aria-pressed={task.completed}
                            >
                              <Check size={13} strokeWidth={2.5} />
                              <span>Done</span>
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center gap-[5px] min-h-[28px] p-[4px_11px] rounded-[6px] text-[11px] font-bold tracking-[0.2px] cursor-pointer transition-all duration-150 select-none box-border disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none border bg-[rgba(239,68,68,0.1)] border-[rgba(239,68,68,0.3)] text-[#f87171] hover:not-disabled:bg-[rgba(239,68,68,0.25)] hover:not-disabled:border-[#ef4444] hover:not-disabled:text-white"
                              onClick={() => setTaskToDelete(task)}
                              disabled={busy || !isReceiver || Boolean(record.acceptance)}
                              title="Hapus tugas dari handover"
                              aria-label="Hapus tugas"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        ) : (
                          task.completed && (
                            <span className="inline-flex items-center gap-[4px] p-[3px_9px] rounded-[99px] text-[11px] font-bold bg-[rgba(16,185,129,0.16)] border border-[rgba(16,185,129,0.35)] text-[#4ade80] cursor-default select-none">
                              <Check size={12} strokeWidth={2.5} /> Done
                            </span>
                          )
                        )}
                      </div>
                    </article>
                  ))}

                  {visibleTasks.length === 0 && (
                    <div className="p-[12px] text-[var(--ink-muted)] border border-dashed border-[var(--panel-border)] rounded-[8px] bg-[var(--bg)] text-[10.5px]">
                      Tidak ada tugas pada filter ini.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CATATAN SHIFT */}
            {activeTab === "notes" && (
              <div className="flex flex-col gap-[10px]">
                {/* 1. Outgoing Shift Note (Sender) */}
                {noteContent ? (
                  <div className="p-[16px_18px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] flex flex-col gap-[12px]">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-[12px]">
                      <div className="flex items-center gap-[12px]">
                        <Avatar
                          size="md"
                          name={senderName}
                          shape="rounded"
                          className="w-[36px] h-[36px] rounded-[8px] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border border-[var(--accent-blue-border)] grid place-items-center text-[13px] font-bold shrink-0"
                        />
                        <div>
                          <strong className="block text-[13px] font-bold text-[var(--ink-primary)]">{noteAttribution}</strong>
                          <span className="block text-[11px] text-[var(--ink-muted)] mt-[1px]">Pesan dari shift pengirim</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-[13px] leading-[1.65] text-[var(--ink-secondary)] whitespace-pre-wrap [word-break:break-word] bg-[var(--bg)] border border-[var(--line)] rounded-[8px] p-[14px_16px]">
                      {noteContent}
                    </div>
                  </div>
                ) : (
                  <div className="p-[12px] text-[var(--ink-muted)] border border-dashed border-[var(--panel-border)] rounded-[8px] bg-[var(--bg)] text-[10.5px]">
                    Tidak ada catatan tambahan dari shift sebelumnya.
                  </div>
                )}

                {/* 2. Receiver Acceptance Note (Canonical single location) */}
                {!isReadOnly && isReceiver && !record.acceptance && (
                  <div className="mt-[10px] p-[14px_16px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px]">
                    <label className="flex flex-col gap-[8px] m-0">
                      <span className="font-semibold text-[12px] text-[var(--ink-primary)] block mb-[6px]">
                        Catatan Penerimaan Akhir (Opsional)
                      </span>
                      <textarea
                        rows={2}
                        disabled={busy}
                        value={acceptanceNote}
                        onChange={(event) => setAcceptanceNote(event.target.value)}
                        placeholder="Hasil pemeriksaan penerima sebelum menerima serah terima"
                        className="w-full bg-[var(--panel-bg)] text-[var(--ink-primary)] border border-[var(--line)] rounded-[6px] p-[8px_12px] text-[13px] focus:outline-none focus:border-[var(--accent-blue)] resize-y"
                      />
                    </label>
                    {actor && (
                      <p className="text-[var(--ink-secondary)] text-[11px] mt-[6px] mb-0">
                        Akun {actor.local ? "simulasi lokal" : "aktif"}: {actor.name}
                      </p>
                    )}
                  </div>
                )}

                {/* When in active mode but viewer is not the designated receiver */}
                {!isReadOnly && !isReceiver && !record.acceptance && actor && (
                  <p className="text-[var(--ink-secondary)] mt-[8px] mb-0">
                    Akun {actor.local ? "simulasi lokal" : "aktif"}: {actor.name}. Checklist dan penerimaan menunggu akun penerima yang dituju ({record.targetPic}).
                  </p>
                )}

                {/* In Read-Only Mode: Display confirmed acceptance note if exists */}
                {isReadOnly && record.validationNote && record.validationNote !== "Menunggu validasi shift penerima." && (
                  <div className="p-[10px_12px] bg-[var(--green-soft)] border border-[var(--green-border)] rounded-[6px] text-[12px] text-[var(--green)] mt-[6px]">
                    <strong>
                      <Check size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "3px" }} />
                      Catatan Penerimaan Shift {record.targetShift}:
                    </strong>{" "}
                    {record.validationNote}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: TEMUAN & ISU */}
            {activeTab === "findings" && (
              <div className="flex flex-col gap-[10px]">
                {record.findings.length ? (
                  <div className="grid gap-[10px]">
                    {record.findings.map((finding, index) => (
                      <article className="p-[12px_14px] bg-[var(--orange-soft)] border border-[var(--orange-border)] rounded-[8px]" key={`${finding.title}-${index}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-[6px]">
                            <ProjectMark name={finding.project || "NOC"} />
                            <strong className="text-[12.5px] font-bold text-[var(--ink-primary)]">{finding.project || "NOC"}</strong>
                          </div>
                          <span
                            className={`inline-flex items-center justify-center shrink-0 min-h-[21px] p-[3px_7px] border border-transparent rounded-[5px] font-mono text-[8.5px] font-bold leading-[1.1] text-center ${
                              finding.state === "waiting"
                                ? "text-[var(--orange)] border-[var(--orange-border)] bg-[var(--orange-soft)]"
                                : "text-[var(--purple)] border-[var(--purple-border)] bg-[var(--purple-soft)]"
                            }`}
                          >
                            {finding.state === "waiting" ? "Dipantau" : "On Follow Up"}
                          </span>
                        </div>
                        <h4 className="m-[8px_0_4px] text-[13px] text-[var(--ink-primary)] font-semibold">
                          {finding.title || "Temuan tanpa judul"}
                        </h4>
                        <p className="m-0 text-[11.5px] text-[var(--ink-secondary)] leading-[1.4]">
                          {finding.detail || "Belum ada rincian."}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="p-[12px] text-[var(--ink-muted)] border border-dashed border-[var(--panel-border)] rounded-[8px] bg-[var(--bg)] text-[10.5px]">
                    Tidak ada temuan khusus yang memerlukan tindak lanjut pada shift ini.
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: STATUS MONITORING */}
            {activeTab === "monitoring" && (
              <div className="flex flex-col gap-[10px]">
                <div className="p-[14px_16px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px]">
                  <div className="flex justify-between items-center mb-[8px]">
                    <strong className="text-[12.5px] font-bold text-[var(--ink-primary)]">Penanggung Jawab: {record.monitoringOwner}</strong>
                    <Badge tone={record.acceptance ? "success" : "warning"}>
                      {record.acceptance ? "Diterima & Diverifikasi" : "Menunggu penerimaan"}
                    </Badge>
                  </div>
                  <p className="m-[0_0_12px] text-[12px] text-[var(--ink-secondary)]">
                    {record.monitoringSummary}
                  </p>

                  <span className="text-[11px] font-bold text-[var(--ink-muted)] uppercase block mb-[6px]">
                    Proyek yang Dimonitor ({record.monitoredProjects.length})
                  </span>
                  <div className="flex flex-wrap gap-[6px] mb-[12px]">
                    {record.monitoredProjects.map((project) => (
                      <span key={project} className="inline-flex items-center gap-[5px] p-[3px_8px] rounded-[6px] bg-[var(--bg)] border border-[var(--line)] text-[11px] font-semibold text-[var(--ink-primary)]">
                        <ProjectMark name={project} /> {project}
                      </span>
                    ))}
                  </div>
                  {!record.monitoredProjects.length && (
                    <p className="text-[11.5px] text-[var(--ink-muted)]">
                      Tidak ada proyek yang dinyatakan termonitor pada catatan ini.
                    </p>
                  )}

                  {/* Monitored Checkpoints Results with Plain Static OK/NOK Badges in Read-Only Mode */}
                  <div className="mt-[16px] mb-[12px]">
                    <span className="text-[11px] font-bold text-[var(--ink-muted)] uppercase block mb-[8px]">
                      Hasil Checkpoint Monitoring Shift ({checkpoints.length})
                    </span>

                    <div className="flex flex-col gap-[6px]">
                      {checkpoints.map((cp, idx) => (
                        <div className="flex items-center justify-between gap-[12px] p-[8px_12px] bg-[var(--bg)] border border-[var(--line)] rounded-[6px]" key={`${cp.time}-${cp.project}-${idx}`}>
                          <div className="flex items-center gap-[10px] min-w-0">
                            <span className="font-mono text-[11px] font-bold text-[var(--ink-muted)]">{cp.time}</span>
                            <ProjectMark name={cp.project} />
                            <div className="flex flex-col min-w-0">
                              <strong className="text-[12px] text-[var(--ink-primary)] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{cp.task}</strong>
                              {cp.note && <small className="text-[11px] text-[var(--ink-muted)]">{cp.note}</small>}
                            </div>
                          </div>

                          {/* Static non-clickable status label in Read-Only mode */}
                          <span
                            className={`inline-flex items-center justify-center min-w-[44px] p-[3px_8px] rounded-[4px] text-[10.5px] font-extrabold tracking-[0.5px] cursor-default select-none pointer-events-none shrink-0 border ${
                              cp.verdict === "ok"
                                ? "bg-[rgba(34,197,94,0.16)] text-[#4ade80] border-[rgba(74,222,128,0.32)]"
                                : "bg-[rgba(239,68,68,0.16)] text-[#f87171] border-[rgba(248,113,113,0.32)]"
                            }`}
                          >
                            {cp.verdict.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exceptions */}
                  <div className="grid gap-[12px] my-[16px]">
                    {(record.monitoringExceptions ?? []).map((exception) => (
                      <article className="p-[12px_14px] bg-[var(--orange-soft)] border border-[var(--orange-border)] rounded-[8px]" key={exception.project}>
                        <strong className="text-[12.5px] font-bold text-[var(--ink-primary)] block">{exception.project} — Tidak Dimonitor</strong>
                        <p className="mt-[4px] mb-0 text-[11.5px] text-[var(--ink-secondary)] leading-[1.4]">{exception.reason || "Alasan belum dicatat."}</p>
                      </article>
                    ))}
                  </div>

                  {record.validationNote && (
                    <div className="p-[10px_12px] bg-[var(--green-soft)] border border-[var(--green-border)] rounded-[6px] text-[12px] text-[var(--green)]">
                      <strong>
                        <Check size={13} style={{ display: "inline-block", verticalAlign: "middle", marginRight: "3px" }} />
                        Catatan Shift {record.targetShift}:
                      </strong>{" "}
                      {record.validationNote}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: TIKET YANG MASIH OPEN */}
            {activeTab === "tickets" && (
              <div className="flex flex-col gap-[10px]">
                {openTicketsList.length ? (
                  <div className="flex flex-col gap-[8px]">
                    {openTicketsList.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex flex-col gap-[8px] p-[12px_14px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px] cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] hover:border-[var(--accent-blue-border)] hover:-translate-y-[1px]"
                        onClick={() => onSelectTicket?.(ticket)}
                        role="button"
                        tabIndex={0}
                        title={`Buka detail ticket #${ticket.id}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectTicket?.(ticket);
                          }
                        }}
                      >
                        <div className="flex justify-between items-center gap-[8px]">
                          <div className="flex items-center gap-[8px]">
                            <span className="font-mono text-[11px] font-bold text-[var(--accent-blue)]">#{ticket.id}</span>
                            <span className="inline-flex items-center gap-[4px] text-[11px] font-semibold text-[var(--ink-muted)]">
                              <ProjectMark name={ticket.project} />
                              <span>{ticket.project}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-[6px]">
                            <Badge tone={severityTone(ticket.severity || ticket.priority || "neutral")}>
                              {ticket.priority || ticket.severity || "Normal"}
                            </Badge>
                            <Badge tone={statusTone(ticket.status)}>
                              {ticket.status}
                            </Badge>
                          </div>
                        </div>
                        <h4 className="text-[13px] font-semibold text-[var(--ink-primary)] leading-[1.4] m-0">
                          {ticket.subject}
                        </h4>
                        <div className="flex justify-between items-center text-[11px] text-[var(--ink-muted)] border-t border-[var(--line)] pt-[8px] mt-[2px]">
                          <span className="text-[11px] text-[var(--ink-muted)] [&_strong]:text-[var(--ink-secondary)]">
                            PIC: <strong>{ticket.owner || "Belum ditugaskan"}</strong>
                          </span>
                          <span className="text-[var(--accent-blue)] font-semibold inline-flex items-center gap-[3px] text-[11px]">
                            Lihat detail ticket <span>→</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-[28px_20px] bg-[var(--green-soft)] border border-[var(--green-border)] rounded-[10px] text-center flex flex-col items-center gap-[6px] [&_strong]:text-[14px] [&_strong]:text-[var(--green)] [&_p]:m-0 [&_p]:text-[12px] [&_p]:text-[var(--ink-secondary)]">
                    <CheckCircle2 size={26} style={{ color: "var(--green)", marginBottom: "4px" }} />
                    <strong>Tidak ada tiket yang masih terbuka</strong>
                    <p>Tidak ada tiket yang masih terbuka pada saat handover ini diselesaikan.</p>
                  </div>
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
