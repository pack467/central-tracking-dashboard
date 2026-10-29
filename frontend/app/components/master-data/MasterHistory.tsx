"use client";
import { useState } from "react";
import { History } from "lucide-react";
import {
  auditEntryMatches,
  auditFieldLabel,
  auditFiltersFor,
  auditNameContext,
  auditRawValue,
  auditValueLabel,
  currentRecordName,
  type AuditFilter
} from "@/app/lib/master-audit";
import type { AnyMasterEntity, AuditEntry, MasterSnapshotV2 } from "@/app/types/master-data";
import { Avatar, buttonClass, type MasterUsers } from "./master-ui";

export const formatDateTime = (value: string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
export const relativeTime = (value: string) => {
  const diff = Date.now() - Date.parse(value);
  if (!Number.isFinite(diff)) return "—";
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "baru saja";
  const formatter = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  if (Math.abs(minutes) < 60) return formatter.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return formatter.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 31) return formatter.format(-days, "day");
  const months = Math.round(days / 30);
  if (Math.abs(months) < 12) return formatter.format(-months, "month");
  return formatter.format(-Math.round(months / 12), "year");
};
const KIND_TEXT = { create: "membuat data", delete: "menghapus data" } as const;

/** Readable history: labels instead of field names, ids as "code - name", stored vs current name, filter chips. Old entries are never rewritten. */
export function HistoryPanel({ entity, id, entries, catalog, users, hasMore, moreBusy, onMore }: { entity: AnyMasterEntity; id: string; entries: AuditEntry[]; catalog: MasterSnapshotV2; users: MasterUsers; hasMore: boolean; moreBusy: boolean; onMore: () => void }) {
  const [filter, setFilter] = useState<AuditFilter>("all"), filters = auditFiltersFor(entity);
  const visible = entries.filter(entry => auditEntryMatches(entry, filter)), currentName = currentRecordName(entity, id, catalog);
  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-wrap gap-1.5" aria-label="Filter riwayat">
        {filters.map(item => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={filter === item.value
              ? "min-h-11 rounded-lg bg-sky-400/[0.14] px-3 text-[11px] font-semibold text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:min-h-9"
              : "min-h-11 rounded-lg border border-slate-700 px-3 text-[11px] text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:min-h-9"}
          >
            {item.label}
          </button>
        ))}
      </div>
      {!visible.length && (
        <div
          className="flex min-h-[360px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-700/80 bg-[#0f172a]/25 px-5 py-10 text-center"
        >
          <span className="inline-grid size-10 place-items-center rounded-xl border border-slate-700 bg-slate-800/70 text-slate-400">
            <History size={18} aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold text-slate-200">{entries.length ? "Tidak ada perubahan untuk filter ini" : "Belum ada perubahan"}</p>
          <p className="max-w-[300px] text-xs leading-5 text-slate-400">Riwayat perubahan akan muncul di sini setelah data disunting.</p>
        </div>
      )}
      {visible.length > 0 && (
        <ol className="relative ml-3 flex flex-1 flex-col gap-3 border-l border-slate-700/70 pl-5">
          {visible.map(entry => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[32px] top-0"><Avatar name={entry.byName} size="xs" shape="circle" /></span>
              <article className="rounded-xl border border-slate-700/70 bg-[#182234]/60 p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <p className="text-[12px] font-semibold text-slate-100">{entry.byName} <span className="font-normal text-slate-400">{entry.kind ? KIND_TEXT[entry.kind] : `mengubah ${entry.changes.length} data`}</span></p>
                  <time dateTime={entry.at} title={formatDateTime(entry.at)} className="text-[11px] text-slate-400">{relativeTime(entry.at)}</time>
                </div>
                <dl className="mt-2.5 space-y-2.5">
                  {entry.changes.map(change => {
                    const context = auditNameContext(entity, id, change.field, change.from, catalog);
                    return (
                      <div key={change.field}>
                        <dt className="text-[11px] font-semibold text-sky-300">{auditFieldLabel(change.field, entity)}</dt>
                        <dd className="mt-0.5 break-words text-[11.5px] leading-5 text-slate-300">
                          <span className="text-slate-400">{auditValueLabel(change.field, change.from, catalog, users)}</span>
                          <span aria-label="menjadi" className="mx-2 text-sky-300">→</span>
                          {auditValueLabel(change.field, change.to, catalog, users)}
                        </dd>
                        {context && <dd className="mt-0.5 text-[11px] text-amber-200">{context}</dd>}
                        {currentName && ["name", "fullName"].includes(change.field) && !context && currentName !== change.to && currentName !== change.from && (
                          <dd className="mt-0.5 text-[11px] text-slate-400">Nama kini: {currentName}</dd>
                        )}
                        <details className="mt-1">
                          <summary className="inline-flex min-h-11 cursor-pointer items-center text-[11px] text-slate-400 hover:text-slate-300 lg:min-h-8">Nilai asli</summary>
                          <pre
                            className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#0f172a] p-2 font-dashboard-mono text-[11px] text-slate-400"
                          >
                            {auditRawValue(change.from)}
                            {"\n→\n"}
                            {auditRawValue(change.to)}
                          </pre>
                        </details>
                      </div>
                    );
                  })}
                </dl>
              </article>
            </li>
          ))}
          <li className="relative mt-auto flex min-h-6 items-center">
            <span aria-hidden="true" className="absolute -left-[23px] size-1.5 rounded-full bg-slate-600" />
            <span className="text-[11px] text-slate-400">Awal riwayat</span>
          </li>
        </ol>
      )}
      {hasMore && (
        <button type="button" className={`${buttonClass} w-full`} disabled={moreBusy} onClick={onMore}>{moreBusy ? "Memuat…" : "Muat lagi"}</button>
      )}
    </div>
  );
}
