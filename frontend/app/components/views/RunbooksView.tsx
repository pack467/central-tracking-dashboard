"use client";

import { lazy, startTransition, Suspense, useCallback, useMemo, useState } from "react";
import {
  FileText,
  KeyRound,
  Wrench,
  Users,
  Search,
  X,
  Terminal,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useLocalStorage } from "@/app/hooks/useLocalStorage";
import {
  seedSopEntries,
  seedCredentials,
  seedQuickLinks,
  seedEscalationContacts,
} from "@/app/lib/runbooksData";
import type { SopEntry, CredentialEntry, QuickLink, SopAttachment } from "@/app/lib/types";
import { DashboardViewSkeleton } from "@/app/components/ui/LoadingSkeleton";

const SopSection = lazy(() =>
  import("@/app/components/runbooks/SopSection").then((m) => ({ default: m.SopSection })),
);
const CredentialsSection = lazy(() =>
  import("@/app/components/runbooks/CredentialsSection").then((m) => ({ default: m.CredentialsSection })),
);
const LinksToolsSection = lazy(() =>
  import("@/app/components/runbooks/LinksToolsSection").then((m) => ({ default: m.LinksToolsSection })),
);
const EscalationSection = lazy(() =>
  import("@/app/components/runbooks/EscalationSection").then((m) => ({ default: m.EscalationSection })),
);

type RunbookTab = "sop" | "credentials" | "links" | "escalation";

interface TabItemConfig {
  key: RunbookTab;
  label: string;
  icon: LucideIcon;
  count: number;
}

export function RunbooksView() {
  const [activeTab, setActiveTab] = useState<RunbookTab>("sop");
  const [search, setSearch] = useState("");

  // Persisted data via localStorage
  const [sopEntries, setSopEntries] = useLocalStorage<SopEntry[]>("ctd.runbooks.sop", seedSopEntries);
  const [credentials] = useLocalStorage<CredentialEntry[]>("ctd.runbooks.creds", seedCredentials);
  const [quickLinks] = useLocalStorage<QuickLink[]>("ctd.runbooks.links", seedQuickLinks);

  // Tab switching with transition
  const switchTab = useCallback((tab: RunbookTab) => {
    startTransition(() => setActiveTab(tab));
  }, []);

  const handleAddAttachment = useCallback(
    (sopId: string, attachment: SopAttachment) => {
      setSopEntries((prev) =>
        prev.map((s) => {
          if (s.id !== sopId) return s;
          const baseAttachments =
            s.attachments && s.attachments.length > 0
              ? s.attachments
              : seedSopEntries.find((seed) => seed.id === s.id)?.attachments || [];
          return {
            ...s,
            attachments: [...baseAttachments, attachment],
          };
        }),
      );
    },
    [setSopEntries],
  );

  const handleDeleteAttachment = useCallback(
    (sopId: string, attachmentId: string) => {
      setSopEntries((prev) =>
        prev.map((s) => {
          if (s.id !== sopId) return s;
          const baseAttachments =
            s.attachments && s.attachments.length > 0
              ? s.attachments
              : seedSopEntries.find((seed) => seed.id === s.id)?.attachments || [];
          return {
            ...s,
            attachments: baseAttachments.filter((a) => a.id !== attachmentId),
          };
        }),
      );
    },
    [setSopEntries],
  );

  const tabConfigs: TabItemConfig[] = useMemo(
    () => [
      { key: "sop", label: "SOP & Prosedur", icon: FileText, count: sopEntries.length },
      { key: "credentials", label: "Akses & Kredensial", icon: KeyRound, count: credentials.length },
      { key: "links", label: "Link & Tools", icon: Wrench, count: quickLinks.length },
      { key: "escalation", label: "Kontak Eskalasi", icon: Users, count: seedEscalationContacts.length },
    ],
    [sopEntries.length, credentials.length, quickLinks.length],
  );

  return (
    <>
      {/* ── Page Header ── */}
      <section className="page-heading flex justify-between items-end mb-[22px] max-[660px]:flex-col max-[660px]:items-start max-[660px]:gap-[12px] max-[640px]:mb-0">
        <div className="flex items-start justify-between gap-[16px] w-full max-[860px]:flex-col max-[860px]:gap-[12px]">
          <div className="flex-1 min-w-0">
            <div className="eyebrow flex items-center gap-[8px] text-[var(--ink-muted)] text-[10px] tracking-[1px] font-bold font-mono uppercase">
              <Terminal size={12} aria-hidden="true" />
              <span>NOC REPOSITORY &amp; RUNBOOKS</span>
            </div>
            <h1 className="m-[6px_0_4px] text-[var(--ink-primary)] text-[24px] leading-[1.2] tracking-[-0.4px] font-bold">Runbooks &amp; Knowledge Base</h1>
            <p className="m-0 text-[var(--ink-secondary)] text-[13px]">Panduan standar operasional, brankas kredensial, konsol monitoring, serta direktori eskalasi on-call.</p>
          </div>

          <div className="flex items-center flex-wrap gap-[8px] shrink-0 mt-[4px]" aria-label="Ringkasan Runbooks">
            <div className="inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] text-[11px] font-semibold font-mono">
              <ShieldCheck size={13} className="text-[var(--accent-blue)]" aria-hidden="true" />
              <span>L1 / L2 Access</span>
            </div>
            <div className="inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] text-[11px] font-semibold font-mono">
              <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green-soft)]" />
              <span>{sopEntries.length} SOP</span>
            </div>
            <div className="inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] text-[11px] font-semibold font-mono">
              <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green-soft)]" />
              <span>{credentials.length} Kredensial</span>
            </div>
            <div className="inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-[6px] border border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-secondary)] text-[11px] font-semibold font-mono">
              <span className="w-[6px] h-[6px] rounded-full bg-[var(--green)] shadow-[0_0_6px_var(--green-soft)]" />
              <span>{quickLinks.length} Tools</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Search Bar ── */}
      <div className="relative mb-[16px]">
        <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          placeholder="Cari SOP, ID server, kredensial, tools, atau PIC eskalasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Cari di runbooks"
          className="w-full h-[42px] pl-[38px] pr-[85px] py-0 rounded-[8px] border border-[var(--panel-border)] bg-[var(--input-bg)] text-[var(--ink-primary)] text-[13px] transition-[border-color] duration-150 focus:outline-none focus:border-[var(--accent-blue)]"
        />
        {search ? (
          <button
            className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[var(--ink-muted)] cursor-pointer p-[4px] rounded-[4px] border-none bg-transparent transition-colors duration-150 hover:text-[var(--ink-primary)]"
            onClick={() => setSearch("")}
            title="Hapus pencarian"
            aria-label="Hapus pencarian"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : (
          <span className="absolute right-[12px] top-1/2 -translate-y-1/2 px-[7px] py-[2px] rounded-[4px] border border-[var(--panel-border)] bg-[var(--bg)] text-[var(--ink-muted)] text-[9.5px] font-mono font-semibold tracking-[0.5px] pointer-events-none select-none" aria-hidden="true">
            NOC DOCS
          </span>
        )}
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-[6px] mb-[18px] border-b border-[var(--line)] pb-[10px] overflow-x-auto max-[520px]:gap-[4px]" role="tablist" aria-label="Navigasi Runbooks">
        {tabConfigs.map(({ key, label, icon: Icon, count }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`inline-flex items-center gap-[8px] px-[14px] py-[8px] rounded-[6px] border text-[12.5px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-150 max-[520px]:px-[10px] max-[520px]:py-[6px] max-[520px]:text-[11.5px] ${
                isActive
                  ? "text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] border-[var(--accent-blue-border)]"
                  : "border-transparent bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--panel-bg-hover)]"
              }`}
              onClick={() => switchTab(key)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
              <span
                className={`inline-block px-[6px] py-[1px] rounded-[4px] text-[10px] font-mono font-bold transition-colors duration-150 ${
                  isActive
                    ? "bg-[var(--accent-blue)] text-[#090d16]"
                    : "bg-[rgba(255,255,255,0.06)] text-[var(--ink-secondary)]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <Suspense fallback={<DashboardViewSkeleton />}>
        {activeTab === "sop" && (
          <SopSection
            entries={sopEntries}
            search={search}
            onAddAttachment={handleAddAttachment}
            onDeleteAttachment={handleDeleteAttachment}
          />
        )}
        {activeTab === "credentials" && <CredentialsSection entries={credentials} search={search} />}
        {activeTab === "links" && <LinksToolsSection entries={quickLinks} search={search} />}
        {activeTab === "escalation" && (
          <EscalationSection contacts={seedEscalationContacts} search={search} />
        )}
      </Suspense>
    </>
  );
}
