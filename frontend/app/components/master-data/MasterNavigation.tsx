"use client";
import { useState, type KeyboardEvent } from "react";
import { Building2, Check, ChevronDown, Clock, Layers, Ticket, Users } from "lucide-react";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { MASTER_LABELS, MASTER_GROUPS } from "@/app/lib/master-data-route";
import type { AnyMasterEntity } from "@/app/types/master-data";
const groups: { key: keyof typeof MASTER_GROUPS; icon: typeof Building2; entities: AnyMasterEntity[] }[] = [
  { key: "services", icon: Building2, entities: ["organization", "project", "system"] },
  { key: "tickets", icon: Ticket, entities: ["category", "severity"] },
  { key: "team", icon: Users, entities: ["person", "role"] }
];
function keyboard(event: KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="tab"]:not(:disabled)')];
  const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "Home"
    ? 0
    : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  event.preventDefault(); tabs[next]?.focus(); tabs[next]?.click();
}
export function MasterNavigation({ entity, onSelect, counts = {} }: { entity: AnyMasterEntity; onSelect: (entity: AnyMasterEntity) => void; counts?: Partial<Record<AnyMasterEntity, number>> }) {
  const [open, setOpen] = useState(false);
  const group = groups.find(g => g.entities.includes(entity))!;
  return (
    <>
      <div
        className="hidden min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#1e293b] p-1 lg:flex"
      >
        <div role="tablist" tabIndex={-1} aria-label="Kelompok Master Data" onKeyDown={keyboard} className="flex shrink-0 items-center gap-0.5">
          {groups.map(g => {
            const Icon = g.icon, active = group.key === g.key;
            return (
              <button
                key={g.key}
                type="button"
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelect(g.entities[0])}
                className={active
                  ? "inline-flex h-9 items-center gap-2 rounded-lg bg-sky-400/[0.14] px-3 text-[12px] font-semibold text-sky-300 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none"
                  : "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] text-slate-300 transition-colors duration-150 hover:bg-slate-700/50 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none"}
              >
                <Icon size={15} aria-hidden="true" className={active ? "text-sky-300" : "text-slate-400"} />
                {MASTER_GROUPS[g.key]}
              </button>
            );
          })}
          <button
            type="button"
            role="tab"
            disabled
            aria-disabled="true"
            aria-selected="false"
            tabIndex={-1}
            className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-lg px-3 text-[12px] text-slate-400"
          ><Clock size={15} aria-hidden="true" />Operasional <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-400">Segera</span></button>
        </div>
        <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-slate-700 xl:block" />
        <div
          role="tablist"
          tabIndex={-1}
          aria-label="Jenis Master Data"
          onKeyDown={keyboard}
          className="flex min-w-0 basis-full items-center gap-1 overflow-x-auto max-xl:border-t max-xl:border-slate-700/60 max-xl:pt-1 xl:basis-0 xl:flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {group.entities.map(key => {
            const active = key === entity;
            return (
              <button
                type="button"
                key={key}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={() => onSelect(key)}
                className={active
                  ? "relative inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-sky-400/[0.14] px-3 text-[12px] font-semibold text-sky-300 after:absolute after:inset-x-3 after:bottom-1 after:h-px after:rounded-full after:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
                  : "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[12px] text-slate-300 transition-colors duration-150 hover:bg-slate-700/50 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 motion-reduce:transition-none"}
              >
                {MASTER_LABELS[key]}
                <span
                  className={active ? "font-dashboard-mono text-[11px] tabular-nums text-sky-300/80" : "font-dashboard-mono text-[11px] tabular-nums text-slate-400"}
                >
                  {counts[key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-3 py-1.5 text-left text-sm font-semibold text-slate-50 transition-colors duration-150 hover:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 lg:hidden"
      >
        <Layers size={17} className="shrink-0 text-sky-300" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-normal leading-4 text-slate-400">{MASTER_GROUPS[group.key]}</span>
          <span className="block truncate leading-5">{MASTER_LABELS[entity]}</span>
        </span>
        <span className="font-dashboard-mono text-[11px] text-slate-400">{counts[entity] ?? 0}</span>
        <ChevronDown size={17} />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Kategori Master Data" dataSheetId="master-category">
        <div className="space-y-5 px-1 pb-4">
          {groups.map(g => {
            const Icon = g.icon;
            return (
              <section key={g.key}>
                <h2 className="mb-2 flex items-center gap-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
                  <Icon size={13} aria-hidden="true" />
                  {MASTER_GROUPS[g.key]}
                </h2>
                {g.entities.map(key => (
                  <button
                    key={key}
                    type="button"
                    aria-current={entity === key ? "true" : undefined}
                    onClick={() => { setOpen(false); onSelect(key); }}
                    className={entity === key
                      ? "flex min-h-12 w-full items-center justify-between rounded-lg bg-sky-400/[0.14] px-3 text-sm font-semibold text-sky-300"
                      : "flex min-h-12 w-full items-center justify-between rounded-lg px-3 text-sm text-slate-100 hover:bg-slate-700"}
                  >
                    <span className="flex items-center gap-2">
                      {MASTER_LABELS[key]}
                      <span className="font-dashboard-mono text-[11px] text-slate-400">{counts[key] ?? 0}</span>
                    </span>
                    {entity === key && <Check size={18} className="text-sky-300" />}
                  </button>
                ))}
              </section>
            );
          })}
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex min-h-11 w-full items-center justify-between px-3 text-sm text-slate-400"
          >
            <span className="flex items-center gap-2"><Clock size={15} aria-hidden="true" />Operasional</span>
            <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-[11px] font-semibold">Segera</span>
          </button>
        </div>
      </BottomSheet>
    </>
  );
}


