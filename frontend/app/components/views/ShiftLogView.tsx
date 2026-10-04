"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ArrowRight,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckSquare,
  TicketCheck,
  ClipboardList,
  Ticket as TicketIcon,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { ConfirmDialog } from "@/app/components/ui/ConfirmDialog";
import { PaginationBar } from "@/app/components/ui/PaginationBar";
import { useToast } from "@/app/components/ui/Toast";
import { Avatar } from "@/app/components/ui/Avatar";
import { formatHandoverDate, initials, isOpenTicket } from "@/app/lib/data";
import type { HandoverRecordData, StoredHandoverRecord } from "@/app/lib/types";
import { canEditHandover, getTaskIdentity, isNewlyAddedTask, parseHandoverContent } from "@/app/lib/handover";
import {
  HandoverHistoryControls,
  type HandoverWorkflow,
} from "@/app/components/handover/HandoverHistoryControls";

import { getShiftType } from "@/app/lib/shifts";

const SHIFT_TAG_STYLES: Record<string, string> = {
  pagi: "text-[#fb923c] bg-[rgba(249,115,22,0.15)] border border-[rgba(249,115,22,0.35)] shadow-[0_1px_2px_rgba(249,115,22,0.08)]",
  malam: "text-[#c084fc] bg-[rgba(192,132,252,0.15)] border border-[rgba(192,132,252,0.35)] shadow-[0_1px_2px_rgba(192,132,252,0.08)]",
  subuh: "text-[#38bdf8] bg-[rgba(56,189,248,0.15)] border border-[rgba(56,189,248,0.35)] shadow-[0_1px_2px_rgba(56,189,248,0.08)]",
};

export function getShiftTagMeta(shiftName: string) {
  const type = getShiftType(shiftName);
  let icon = null;
  if (type === "pagi") icon = Sun;
  else if (type === "malam") icon = Sunset;
  else if (type === "subuh") icon = Moon;

  return {
    key: type,
    className: SHIFT_TAG_STYLES[type] || "text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)]",
    icon,
  };
}

function parseContent(record: StoredHandoverRecord): HandoverRecordData | null {
  try {
    return parseHandoverContent(record.content);
  } catch {
    return null;
  }
}

/**
 * Builds a lookup map linking each shift record to the previous shift's total task count
 * along its rotation/lineage chain.
 */
function buildShiftLineageMap(records: StoredHandoverRecord[]): Map<number, number> {
  const map = new Map<number, number>();
  const chronological = [...records].sort((a, b) => {
    const dateComp = a.handoverDate.localeCompare(b.handoverDate);
    if (dateComp !== 0) return dateComp;
    return a.id - b.id;
  });

  for (let i = 0; i < chronological.length; i++) {
    const current = chronological[i];
    const currentContent = parseContent(current);
    const currentTasks = currentContent?.tasks.length ?? 0;
    const currentNewTasks = currentContent?.tasks.filter(isNewlyAddedTask).length ?? 0;

    // Look back for preceding shift transition (candidate.targetShift === current.sourceShift)
    let prevRecord: StoredHandoverRecord | null = null;
    for (let j = i - 1; j >= 0; j--) {
      const candidate = chronological[j];
      const candContent = parseContent(candidate);
      if (candContent && candContent.targetShift === currentContent?.sourceShift) {
        prevRecord = candidate;
        break;
      }
    }

    // Fallback to chronologically preceding record if no exact rotation match
    if (!prevRecord && i > 0) {
      prevRecord = chronological[i - 1];
    }

    if (prevRecord) {
      const prevContent = parseContent(prevRecord);
      map.set(current.id, prevContent?.tasks.length ?? Math.max(0, currentTasks - currentNewTasks));
    } else {
      // Starting baseline for the very first record in history
      const baseline = Math.max(0, currentTasks - currentNewTasks);
      map.set(current.id, baseline);
    }
  }

  return map;
}

function parsePicNames(picString: string): string[] {
  if (!picString) return [];
  return picString
    .split(/[,;&]|\s+dan\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function ShiftLogView({ workflow }: { workflow: HandoverWorkflow }) {
  const { records, loading, openStored: onOpenRecord, remove: onDeleteRecord } = workflow;
  const visibleRecords = records;
  const notify = useToast();
  const [pendingDelete, setPendingDelete] = useState<StoredHandoverRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Pagination state (default: 10 rows per page)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [workflow.filters.date, workflow.filters.shift, workflow.filters.pic]);

  const lineageMap = useMemo(() => buildShiftLineageMap(visibleRecords), [visibleRecords]);

  const totalCount = visibleRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalCount);
  const paginatedRecords = visibleRecords.slice(startIdx, endIdx);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
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

  const stats = useMemo(() => {
    let completedShiftsCount = 0; // "Total Shift Selesai"
    let totalFindings = 0;        // "Jumlah Temuan"
    let closedTicketsCount = 0;   // "Total Tiket Selesai"
    const uniqueTaskSet = new Set<string>(); // "Total Tugas Dikerjakan" (deduplicated)

    for (const record of visibleRecords) {
      const content = parseContent(record);
      if (!content) continue;

      // a. "Total Shift Selesai": count of handover records where status = fully completed/received
      if (content.acceptance) {
        completedShiftsCount++;
      }

      // b. "Jumlah Temuan": sum of findings across all logged handovers
      totalFindings += content.findings?.length ?? 0;

      // c. "Total Tiket Selesai": total count of tickets closed/resolved during logged shifts,
      // explicitly EXCLUDING any tickets still marked "Open".
      const shiftClosedTicketIds = new Set<string>();
      if (content.closedTickets && Array.isArray(content.closedTickets)) {
        for (const ticket of content.closedTickets) {
          if (!isOpenTicket(ticket) || ["closed", "selesai", "resolved"].includes(ticket.status?.toLowerCase())) {
            shiftClosedTicketIds.add(ticket.id);
          }
        }
      }
      if (content.openTickets && Array.isArray(content.openTickets)) {
        for (const ticket of content.openTickets) {
          if (!isOpenTicket(ticket) || ["closed", "selesai", "resolved"].includes(ticket.status?.toLowerCase())) {
            shiftClosedTicketIds.add(ticket.id);
          }
        }
      }
      if (content.tasks && Array.isArray(content.tasks)) {
        for (const task of content.tasks) {
          if (task.completed && task.sourceRef?.startsWith("ticket:")) {
            shiftClosedTicketIds.add(task.sourceRef.replace("ticket:", ""));
          }
        }
      }
      closedTicketsCount += shiftClosedTicketIds.size;

      // d. "Total Tugas Dikerjakan": count of DISTINCT/UNIQUE tasks worked on across all shifts
      if (content.tasks && Array.isArray(content.tasks)) {
        for (const task of content.tasks) {
          const taskKey = getTaskIdentity(task);
          uniqueTaskSet.add(taskKey);
        }
      }
    }

    return {
      totalRecords: workflow.total || visibleRecords.length,
      completedShiftsCount,
      totalFindings,
      closedTicketsCount,
      totalUniqueTasks: uniqueTaskSet.size,
    };
  }, [visibleRecords, workflow.total]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDeleteRecord(pendingDelete.id);
      notify.success("Catatan handover dihapus.", { id: `handover-delete-${pendingDelete.id}` });
      setPendingDelete(null);
    } catch {
      notify.critical("Catatan belum dapat dihapus. Coba lagi.", { id: `handover-delete-${pendingDelete.id}` });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="page-heading flex justify-between items-end mb-[22px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div>
          <div className="flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] tracking-[1px] font-bold font-mono uppercase">
            <span className="live-dot live-dot-pulse" /> SHIFT LOG
          </div>
          <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] leading-[1.2] tracking-[-0.4px] font-bold">Shift Log</h1>
        </div>
      </section>

      {/* Top summary stat cards */}
      <section className="grid grid-cols-4 gap-[12px] w-full mb-[18px] max-[960px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="Ringkasan statistik log shift">
        {/* Card a: Total Shift Selesai */}
        <div className="group flex items-center gap-[12px] p-[10px_14px] min-h-[54px] h-full box-border bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px] transition-[border-color,background-color] duration-150 ease-out hover:border-[var(--line)] hover:bg-[rgba(30,41,59,0.45)]">
          <span className="inline-grid place-items-center w-[34px] h-[34px] rounded-[8px] shrink-0 transition-transform duration-150 ease-out group-hover:scale-[1.06] bg-[rgba(16,185,129,0.12)] text-[#34d399] border border-[rgba(16,185,129,0.3)]">
            <CheckCircle2 size={17} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[17px] font-extrabold leading-[1.2] text-[var(--ink-primary)] font-mono">{stats.completedShiftsCount}</span>
            <span className="text-[11px] text-[var(--ink-muted)] font-medium whitespace-nowrap overflow-hidden text-ellipsis">Total Shift Selesai</span>
          </div>
        </div>

        {/* Card b: Jumlah Temuan */}
        <div className="group flex items-center gap-[12px] p-[10px_14px] min-h-[54px] h-full box-border bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px] transition-[border-color,background-color] duration-150 ease-out hover:border-[var(--line)] hover:bg-[rgba(30,41,59,0.45)]">
          <span className="inline-grid place-items-center w-[34px] h-[34px] rounded-[8px] shrink-0 transition-transform duration-150 ease-out group-hover:scale-[1.06] bg-[rgba(245,158,11,0.12)] text-[#fbbf24] border border-[rgba(245,158,11,0.3)]">
            <AlertTriangle size={17} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[17px] font-extrabold leading-[1.2] text-[var(--ink-primary)] font-mono">{stats.totalFindings}</span>
            <span className="text-[11px] text-[var(--ink-muted)] font-medium whitespace-nowrap overflow-hidden text-ellipsis">Jumlah Temuan</span>
          </div>
        </div>

        {/* Card c: Total Tiket Selesai */}
        <div className="group flex items-center gap-[12px] p-[10px_14px] min-h-[54px] h-full box-border bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px] transition-[border-color,background-color] duration-150 ease-out hover:border-[var(--line)] hover:bg-[rgba(30,41,59,0.45)]">
          <span className="inline-grid place-items-center w-[34px] h-[34px] rounded-[8px] shrink-0 transition-transform duration-150 ease-out group-hover:scale-[1.06] bg-[rgba(56,189,248,0.12)] text-[#38bdf8] border border-[rgba(56,189,248,0.3)]">
            <TicketCheck size={17} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[17px] font-extrabold leading-[1.2] text-[var(--ink-primary)] font-mono">{stats.closedTicketsCount}</span>
            <span className="text-[11px] text-[var(--ink-muted)] font-medium whitespace-nowrap overflow-hidden text-ellipsis">Total Tiket Selesai</span>
          </div>
        </div>

        {/* Card d: Total Tugas Dikerjakan */}
        <div className="group flex items-center gap-[12px] p-[10px_14px] min-h-[54px] h-full box-border bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[8px] transition-[border-color,background-color] duration-150 ease-out hover:border-[var(--line)] hover:bg-[rgba(30,41,59,0.45)]">
          <span className="inline-grid place-items-center w-[34px] h-[34px] rounded-[8px] shrink-0 transition-transform duration-150 ease-out group-hover:scale-[1.06] bg-[rgba(168,85,247,0.12)] text-[#c084fc] border border-[rgba(168,85,247,0.3)]">
            <ClipboardList size={17} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-[17px] font-extrabold leading-[1.2] text-[var(--ink-primary)] font-mono">{stats.totalUniqueTasks}</span>
            <span className="text-[11px] text-[var(--ink-muted)] font-medium whitespace-nowrap overflow-hidden text-ellipsis">Total Tugas Dikerjakan</span>
          </div>
        </div>
      </section>

      <article className="panel view-panel overflow-visible mb-[20px] bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-[10px] shadow-[var(--shadow-panel)]">
        <HandoverHistoryControls workflow={workflow} />

        <div className="p-[16px_18px_20px]">
          {loading ? (
            <div className="p-[48px_16px] text-center text-[var(--ink-muted)] text-[13px]">Memuat riwayat handover…</div>
          ) : visibleRecords.length ? (
            <ol className="relative m-0 p-[20px_20px_24px_36px] list-none before:content-[''] before:absolute before:top-[14px] before:bottom-[14px] before:left-[13px] before:w-[2px] before:rounded-[99px] before:bg-[linear-gradient(180deg,rgba(56,189,248,0.5),rgba(148,163,184,0.2)_90%)]">
              {paginatedRecords.map((record) => {
                const content = parseContent(record);
                const total = content?.tasks.length ?? 0;
                const done = content?.tasks.filter((task) => task.completed).length ?? 0;
                const newCount = content?.tasks.filter((task) => isNewlyAddedTask(task)).length ?? 0;
                const prevTasks = lineageMap.get(record.id) ?? Math.max(0, total - newCount);
                const currTasks = total;
                const isAccepted = Boolean(content?.acceptance);
                const isEditable = Boolean(content && canEditHandover(content, workflow.actor));

                return (
                  <li className="relative mb-[16px] last:mb-0" key={record.id}>
                    {/* Polished timeline marker node */}
                    <span
                      className={`absolute top-[12px] left-[-36px] grid place-items-center w-[28px] h-[28px] rounded-[50%] transition-all duration-200 ease-out z-[2] max-[640px]:top-[10px] max-[640px]:left-[-28px] max-[640px]:w-[24px] max-[640px]:h-[24px] ${
                        isAccepted
                          ? "border-2 border-[#10b981] text-[#34d399] bg-[rgba(16,185,129,0.12)] shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          : "border-2 border-[#f59e0b] text-[#fbbf24] bg-[rgba(245,158,11,0.12)] shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                      }`}
                      title={isAccepted ? "Handover Selesai Diterima" : "Menunggu Penerimaan"}
                    >
                      {isAccepted ? <CheckCircle2 size={15} /> : <Clock size={15} />}
                    </span>

                    <article className="p-[16px] border border-[var(--panel-border)] rounded-[10px] bg-[var(--panel-bg)] shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-[border-color,background-color] duration-180 ease-out hover:border-[var(--accent-blue-border)] hover:bg-[var(--panel-bg-hover)]">
                      <header className="flex justify-between items-start gap-[12px] mb-[8px] pb-[8px] border-b border-[rgba(255,255,255,0.06)] max-[640px]:flex-col max-[640px]:items-start">
                        <div className="flex flex-col gap-[4px] min-w-0">
                          <div className="flex items-center gap-[8px] flex-wrap">
                            <span
                              className={`inline-flex items-center gap-[4px] p-[2px_8px] rounded-[99px] text-[10.5px] font-bold tracking-[0.2px] select-none ${
                                isAccepted
                                  ? "bg-[rgba(16,185,129,0.16)] border border-[rgba(16,185,129,0.35)] text-[#4ade80]"
                                  : "bg-[rgba(245,158,11,0.16)] border border-[rgba(245,158,11,0.35)] text-[#fbbf24]"
                              }`}
                            >
                              {isAccepted ? (
                                <>
                                  <CheckCircle2 size={12} />
                                  Selesai Diterima
                                </>
                              ) : (
                                <>
                                  <Clock size={12} />
                                  Menunggu Penerimaan
                                </>
                              )}
                            </span>
                            <span className="inline-flex items-center gap-[4px] text-[11px] text-[var(--ink-muted)] font-mono font-medium">
                              <Calendar size={12} />
                              {formatHandoverDate(record.handoverDate)}
                            </span>
                          </div>
                          <h3 className="m-[2px_0_0] text-[13.5px] font-bold text-[var(--ink-primary)] leading-[1.3]">{record.title}</h3>
                        </div>

                        <div className="flex items-center gap-[6px] shrink-0 max-[640px]:self-start">
                          <button
                            type="button"
                            className="inline-flex items-center gap-[5px] p-[5px_10px] rounded-[6px] text-[11px] font-semibold cursor-pointer border border-[rgba(56,189,248,0.35)] bg-[rgba(56,189,248,0.12)] text-[#38bdf8] transition-all duration-150 ease-out select-none hover:bg-[rgba(56,189,248,0.22)] hover:border-[#38bdf8] hover:text-white hover:shadow-[0_0_10px_rgba(56,189,248,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={workflow.busy}
                            onClick={() => void onOpenRecord(record)}
                          >
                            <Eye size={13} />
                            Buka detail
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-[5px] p-[5px_10px] rounded-[6px] text-[11px] font-semibold cursor-pointer border border-[rgba(239,68,68,0.28)] bg-[rgba(239,68,68,0.08)] text-[#f87171] transition-all duration-150 ease-out select-none enabled:hover:bg-[rgba(239,68,68,0.18)] enabled:hover:border-[rgba(239,68,68,0.5)] enabled:hover:text-[#ef4444] enabled:hover:shadow-[0_0_8px_rgba(239,68,68,0.25)] disabled:opacity-35 disabled:cursor-not-allowed disabled:bg-transparent disabled:border-transparent disabled:text-[var(--ink-muted)]"
                            disabled={workflow.busy || !isEditable}
                            title={
                              !isEditable
                                ? "Hanya pembuat atau personil terkait yang dapat menghapus"
                                : "Hapus catatan handover"
                            }
                            onClick={() => setPendingDelete(record)}
                          >
                            <Trash2 size={13} />
                            Hapus
                          </button>
                        </div>
                      </header>

                      {content ? (
                        <>
                          {/* Sender → Receiver Flow with Avatars & Color-Coded Shift Badges */}
                          {(() => {
                            const sourceShiftMeta = getShiftTagMeta(content.sourceShift);
                            const SourceShiftIcon = sourceShiftMeta.icon;
                            const targetShiftMeta = getShiftTagMeta(content.targetShift);
                            const TargetShiftIcon = targetShiftMeta.icon;

                            return (
                              <div className="flex items-center flex-wrap gap-[8px_10px] m-[6px_0_10px] p-0 bg-transparent border-0 max-[640px]:flex-col max-[640px]:items-stretch max-[640px]:gap-[6px]">
                                <div className="inline-flex items-center gap-[8px] flex-[0_0_auto] min-w-0 max-[640px]:w-full max-[640px]:flex-wrap max-[640px]:gap-[6px]">
                                  <div className="inline-flex items-center gap-[6px] shrink-0">
                                    <span className="inline-flex items-center h-[26px] text-[9.5px] font-extrabold font-mono tracking-[0.6px] text-[var(--ink-muted)] leading-none select-none">DARI</span>
                                    <span
                                      className={`inline-flex items-center justify-center gap-[5px] h-[26px] box-border text-[11.5px] font-bold p-[0_10px] rounded-[999px] leading-none transition-all duration-150 ease-out select-none ${sourceShiftMeta.className}`}
                                      data-shift={sourceShiftMeta.key}
                                      title={`Shift asal: ${content.sourceShift}`}
                                    >
                                      {SourceShiftIcon && (
                                        <SourceShiftIcon size={12} className="shrink-0" aria-hidden="true" />
                                      )}
                                      <span className="whitespace-nowrap">{content.sourceShift}</span>
                                    </span>
                                  </div>
                                  <div className="inline-flex items-center gap-[6px] flex-wrap min-w-0">
                                    {parsePicNames(content.sourcePic).map((person) => (
                                      <span className="inline-flex items-center h-[26px] box-border gap-[6px] p-[0_9px_0_2px] rounded-[999px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] leading-none" key={person} title={person}>
                                        <Avatar size="sm" name={person} className="shrink-0" />
                                        <span className="inline-flex items-center text-[11.5px] font-semibold text-[var(--ink-primary)] leading-none whitespace-nowrap">{person}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="inline-flex items-center justify-center w-[26px] h-[26px] box-border rounded-[50%] bg-[rgba(56,189,248,0.1)] text-[#38bdf8] border border-[rgba(56,189,248,0.25)] shrink-0 m-[0_2px] max-[640px]:self-center max-[640px]:m-0 max-[640px]:rotate-90" title="Diserahkan kepada">
                                  <ArrowRight size={13} />
                                </div>

                                <div className="inline-flex items-center gap-[8px] flex-[0_0_auto] min-w-0 max-[640px]:w-full max-[640px]:flex-wrap max-[640px]:gap-[6px]">
                                  <div className="inline-flex items-center gap-[6px] shrink-0">
                                    <span className="inline-flex items-center h-[26px] text-[9.5px] font-extrabold font-mono tracking-[0.6px] text-[var(--ink-muted)] leading-none select-none">KEPADA</span>
                                    <span
                                      className={`inline-flex items-center justify-center gap-[5px] h-[26px] box-border text-[11.5px] font-bold p-[0_10px] rounded-[999px] leading-none transition-all duration-150 ease-out select-none ${targetShiftMeta.className}`}
                                      data-shift={targetShiftMeta.key}
                                      title={`Shift penerima: ${content.targetShift}`}
                                    >
                                      {TargetShiftIcon && (
                                        <TargetShiftIcon size={12} className="shrink-0" aria-hidden="true" />
                                      )}
                                      <span className="whitespace-nowrap">{content.targetShift}</span>
                                    </span>
                                  </div>
                                  <div className="inline-flex items-center gap-[6px] flex-wrap min-w-0">
                                    {parsePicNames(content.targetPic).map((person) => (
                                      <span className="inline-flex items-center h-[26px] box-border gap-[6px] p-[0_9px_0_2px] rounded-[999px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] leading-none" key={person} title={person}>
                                        <Avatar size="sm" name={person} className="shrink-0" />
                                        <span className="inline-flex items-center text-[11.5px] font-semibold text-[var(--ink-primary)] leading-none whitespace-nowrap">{person}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Bottom Progress & Stat Badges */}
                          <div className="flex items-center justify-between gap-[12px] flex-wrap pt-[8px] border-t border-[rgba(255,255,255,0.05)] max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-[8px]">
                            <div className="inline-flex items-center gap-[8px] flex-wrap flex-[0_1_auto] max-[640px]:w-full max-[640px]:items-start">
                              <div className="inline-flex items-center gap-[6px] text-[11.5px] whitespace-nowrap max-[640px]:w-full max-[640px]:flex-wrap max-[640px]:gap-[4px_6px] max-[640px]:whitespace-normal max-[640px]:leading-[1.35]">
                                <span className="inline-flex items-center gap-[3px]" title="Tugas selesai pada shift ini">
                                  <strong className="font-bold text-[#34d399]">{done}</strong> Selesai
                                </span>
                                <span className="text-[var(--ink-muted)] text-[12px] select-none max-[640px]:hidden">·</span>
                                <span className="inline-flex items-center gap-[3px]" title="Tugas baru ditambahkan pada shift ini">
                                  <strong className="font-bold text-[#38bdf8]">{newCount}</strong> Baru Ditambahkan
                                </span>
                                <span className="text-[var(--ink-muted)] text-[12px] select-none max-[640px]:hidden">·</span>
                                <span className="inline-flex items-center gap-[3px] max-[640px]:basis-full" title="Transisi jumlah tugas dari shift sebelumnya ke shift ini">
                                  <strong className="font-bold text-[var(--ink-primary)]">{prevTasks}</strong> Tugas Sebelumnya
                                  <span className="inline-block mx-[2px] text-[var(--ink-muted)] text-[10px]">→</span>
                                  <strong className="font-bold text-[var(--ink-primary)]">{currTasks}</strong> Tugas Selanjutnya
                                </span>
                              </div>
                              {content.acceptance && (
                                <span className="text-[10.5px] text-[#34d399] font-medium whitespace-nowrap inline-flex items-center gap-[3px]">
                                  ✓ Diterima oleh {content.acceptance.actor.name}
                                </span>
                              )}
                            </div>

                            <div className="inline-flex items-center gap-[6px] flex-wrap ml-auto max-[640px]:ml-0">
                              <span
                                className={`inline-flex items-center gap-[4px] p-[2.5px_7px] rounded-[5px] text-[10.5px] font-semibold select-none border ${
                                  content.findings.length > 0
                                    ? "bg-[rgba(245,158,11,0.12)] border-[rgba(245,158,11,0.3)] text-[#fbbf24]"
                                    : "bg-[rgba(148,163,184,0.08)] border-[rgba(148,163,184,0.2)] text-[#94a3b8]"
                                }`}
                              >
                                <AlertTriangle size={12} />
                                {content.findings.length} Temuan
                              </span>

                              <span className="inline-flex items-center gap-[4px] p-[2.5px_7px] rounded-[5px] text-[10.5px] font-semibold select-none bg-[rgba(56,189,248,0.12)] border border-[rgba(56,189,248,0.3)] text-[#38bdf8]">
                                <CheckSquare size={12} />
                                {total} Tugas
                              </span>

                              {Boolean(content.openTickets && content.openTickets.length > 0) && (
                                <span className="inline-flex items-center gap-[4px] p-[2.5px_7px] rounded-[5px] text-[10.5px] font-semibold select-none bg-[rgba(168,85,247,0.12)] border border-[rgba(168,85,247,0.3)] text-[#c084fc]">
                                  <TicketIcon size={12} />
                                  {content.openTickets!.length} Tiket Open
                                </span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <p className="flex flex-wrap justify-between gap-[8px] my-[8px_0] text-[var(--red)] text-[11px]">
                          Konten catatan tidak dapat dibaca atau rusak.
                        </p>
                      )}
                    </article>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              icon="≡"
              title={
                workflow.error
                  ? "Catatan belum dapat dimuat"
                  : workflow.filters.date || workflow.filters.shift || workflow.filters.pic
                  ? "Tidak ada catatan yang cocok"
                  : "Belum ada catatan handover"
              }
              message="Buat catatan handover pertama dari dashboard untuk mulai mengisi riwayat serah-terima shift."
            />
          )}

          {/* Pagination Bar */}
          {visibleRecords.length > 0 && (
            <PaginationBar
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              currentPage={safeCurrentPage}
              onPageChange={setCurrentPage}
              totalCount={totalCount}
              startIdx={startIdx}
              endIdx={endIdx}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              pageSizeOptions={[10, 30, 50, 100]}
              itemLabel="catatan"
              className="rounded-b-[10px] mt-[12px]"
              selectAriaLabel="Jumlah catatan per halaman"
            />
          )}
        </div>
      </article>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        danger
        title="Hapus catatan handover ini?"
        message={
          pendingDelete
            ? `${pendingDelete.title} · ${formatHandoverDate(pendingDelete.handoverDate)} akan dihapus permanen dari database.`
            : ""
        }
        confirmLabel={deleting ? "Menghapus…" : "Ya, hapus"}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

