"use client";

import { useMemo, useState } from "react";
import { Phone, Mail, MessageSquare, AlertCircle, ShieldAlert } from "lucide-react";
import type { EscalationContact, EscalationLevel } from "@/app/lib/types";

interface EscalationSectionProps {
  contacts: EscalationContact[];
  search: string;
}

const LEVEL_CONFIG: Record<EscalationLevel, { label: string; badgeClasses: string; dotColor: string }> = {
  L1: { label: "L1 NOC", badgeClasses: "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green-border)]", dotColor: "var(--green)" },
  L2: { label: "L2 Specialist", badgeClasses: "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border-[var(--accent-blue-border)]", dotColor: "var(--accent-blue)" },
  L3: { label: "L3 Infra/Lead", badgeClasses: "bg-[var(--orange-soft)] text-[var(--orange)] border-[var(--orange-border)]", dotColor: "var(--orange)" },
  Vendor: { label: "Vendor Partner", badgeClasses: "bg-[var(--purple-soft)] text-[var(--purple)] border-[var(--purple-border)]", dotColor: "var(--purple)" },
};

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function EscalationSection({ contacts, search }: EscalationSectionProps) {
  const [projectFilter, setProjectFilter] = useState<string>("All");

  const projects = useMemo(
    () => [...new Set(contacts.map((c) => c.project))].sort(),
    [contacts],
  );

  const filtered = useMemo(() => {
    let result = contacts;
    if (projectFilter !== "All") {
      result = result.filter((c) => c.project === projectFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q) ||
          c.project.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.phone && c.phone.toLowerCase().includes(q)) ||
          (c.channel && c.channel.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [contacts, projectFilter, search]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, EscalationContact[]>();
    for (const c of filtered) {
      const group = map.get(c.project) || [];
      group.push(c);
      map.set(c.project, group);
    }
    const levelOrder: Record<EscalationLevel, number> = { L1: 0, L2: 1, L3: 2, Vendor: 3 };
    for (const [, group] of map) {
      group.sort((a, b) => (levelOrder[a.level] ?? 9) - (levelOrder[b.level] ?? 9));
    }
    return map;
  }, [filtered]);

  return (
    <div className="anim-tab-fade">
      {/* Project Filter Chips */}
      <div className="flex flex-wrap gap-[6px] mb-[14px]">
        <button
          className={`inline-flex items-center gap-[5px] px-[12px] py-[5px] rounded-[6px] border text-[11.5px] font-semibold cursor-pointer transition-all duration-150 ${
            projectFilter === "All"
              ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue-border)] text-[var(--accent-blue)]"
              : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-muted)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-muted)]"
          }`}
          onClick={() => setProjectFilter("All")}
        >
          Semua Proyek ({contacts.length})
        </button>
        {projects.map((proj) => {
          const count = contacts.filter((c) => c.project === proj).length;
          return (
            <button
              key={proj}
              className={`inline-flex items-center gap-[5px] px-[12px] py-[5px] rounded-[6px] border text-[11.5px] font-semibold cursor-pointer transition-all duration-150 ${
                projectFilter === proj
                  ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue-border)] text-[var(--accent-blue)]"
                  : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-muted)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-muted)]"
              }`}
              onClick={() => setProjectFilter(proj)}
            >
              {proj} ({count})
            </button>
          );
        })}
      </div>

      {/* Escalation Policy Alert Banner */}
      <div className="flex items-start gap-[12px] p-[12px_16px] rounded-[8px] border border-[var(--orange-border)] bg-[rgba(251,191,36,0.06)] mb-[16px]">
        <ShieldAlert size={16} className="text-[var(--orange)] mt-[2px] shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-[2px]">
          <strong className="text-[var(--orange)] text-[11px] font-mono tracking-[0.4px]">PROTOKOL ESKALASI INSIDEN</strong>
          <span className="text-[var(--ink-secondary)] text-[11.5px] leading-[1.5]">
            Jika alert P1 / Critical belum terkonfirmasi mitigasi dalam 15 menit pertama, operator wajib menghubungi PIC L2 melalui sambungan telepon &amp; Teams.
          </span>
        </div>
      </div>

      {grouped.size === 0 ? (
        <div className="empty-state flex flex-col items-center gap-[4px] p-[36px_20px] text-center">
          <span className="text-[var(--ink-muted)] text-[13px]">
            Tidak ada kontak eskalasi ditemukan{search ? ` untuk "${search}"` : ""}.
          </span>
        </div>
      ) : (
        [...grouped.entries()].map(([project, group]) => (
          <div key={project} className="mb-[18px]">
            <div className="flex items-center gap-[8px] mb-[8px]">
              <span className="w-[8px] h-[8px] rounded-full bg-[var(--accent-blue)]" aria-hidden="true" />
              <h3 className="m-0 text-[var(--ink-primary)] text-[13.5px] font-bold">{project}</h3>
              <span className="text-[var(--ink-muted)] text-[11px] font-mono">{group.length} kontak</span>
            </div>

            <div className="rounded-[8px] border border-[var(--panel-border)] overflow-x-auto bg-[var(--panel-bg)]">
              <table className="w-full border-collapse border-spacing-0 max-[860px]:min-w-[680px]">
                <thead>
                  <tr>
                    <th style={{ width: 110 }} className="px-[14px] py-[10px] bg-[var(--bg)] text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-[0.5px] font-mono text-left border-b border-[var(--panel-border)]">Tier</th>
                    <th style={{ width: 200 }} className="px-[14px] py-[10px] bg-[var(--bg)] text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-[0.5px] font-mono text-left border-b border-[var(--panel-border)]">PIC / On-Call</th>
                    <th className="px-[14px] py-[10px] bg-[var(--bg)] text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-[0.5px] font-mono text-left border-b border-[var(--panel-border)]">Peran &amp; Spesialisasi</th>
                    <th className="px-[14px] py-[10px] bg-[var(--bg)] text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-[0.5px] font-mono text-left border-b border-[var(--panel-border)]">Kanal Komunikasi</th>
                    <th style={{ width: 130 }} className="px-[14px] py-[10px] bg-[var(--bg)] text-[var(--ink-muted)] text-[10px] font-bold uppercase tracking-[0.5px] font-mono text-left border-b border-[var(--panel-border)]">Target SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((contact, idx) => {
                    const cfg = LEVEL_CONFIG[contact.level] || {
                      label: contact.level,
                      badgeClasses: "bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] border-[var(--accent-blue-border)]",
                      dotColor: "var(--accent-blue)",
                    };
                    const initials = getInitials(contact.name);
                    const isLast = idx === group.length - 1;

                    return (
                      <tr key={contact.id} className="hover:bg-[var(--panel-bg-hover)]">
                        <td className={`px-[14px] py-[11px] text-[var(--ink-secondary)] text-[12px] align-middle ${isLast ? "border-b-0" : "border-b border-[var(--line)]"}`}>
                          <span className={`inline-flex items-center gap-[6px] px-[9px] py-[3px] rounded-[4px] border text-[10.5px] font-mono font-bold whitespace-nowrap ${cfg.badgeClasses}`}>
                            <span
                              className="w-[6px] h-[6px] rounded-full"
                              style={{ backgroundColor: cfg.dotColor }}
                            />
                            {cfg.label}
                          </span>
                        </td>
                        <td className={`px-[14px] py-[11px] text-[var(--ink-secondary)] text-[12px] align-middle ${isLast ? "border-b-0" : "border-b border-[var(--line)]"}`}>
                          <div className="flex items-center gap-[10px]">
                            <span className="shrink-0 grid place-items-center w-[28px] h-[28px] rounded-[6px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-secondary)] text-[11px] font-bold font-mono" aria-hidden="true">
                              {initials}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[var(--ink-primary)] font-semibold text-[12.5px]">{contact.name}</span>
                              {contact.notes && (
                                <span className="text-[var(--ink-muted)] text-[10.5px] leading-[1.3]">{contact.notes}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className={`px-[14px] py-[11px] text-[var(--ink-secondary)] text-[12px] align-middle ${isLast ? "border-b-0" : "border-b border-[var(--line)]"}`}>
                          <span className="text-[var(--ink-secondary)] text-[12px]">{contact.role}</span>
                        </td>
                        <td className={`px-[14px] py-[11px] text-[var(--ink-secondary)] text-[12px] align-middle ${isLast ? "border-b-0" : "border-b border-[var(--line)]"}`}>
                          <div className="flex flex-col gap-[4px]">
                            {contact.phone && (
                              <a
                                href={`tel:${contact.phone.replace(/[\s-]/g, "")}`}
                                className="inline-flex items-center gap-[6px] text-[var(--ink-secondary)] no-underline text-[11.5px] transition-colors duration-150 hover:text-[var(--accent-blue)] [&_code]:font-mono [&_code]:text-[11px]"
                                title={`Panggil ${contact.phone}`}
                              >
                                <Phone size={11} aria-hidden="true" />
                                <code>{contact.phone}</code>
                              </a>
                            )}
                            {contact.email && (
                              <a
                                href={`mailto:${contact.email}`}
                                className="inline-flex items-center gap-[6px] text-[var(--ink-secondary)] no-underline text-[11.5px] transition-colors duration-150 hover:text-[var(--accent-blue)]"
                                title={`Kirim email ke ${contact.email}`}
                              >
                                <Mail size={11} aria-hidden="true" />
                                <span>{contact.email}</span>
                              </a>
                            )}
                            {contact.channel && (
                              <span className="inline-flex items-center gap-[6px] text-[var(--ink-muted)] text-[11px]">
                                <MessageSquare size={11} aria-hidden="true" />
                                <span>{contact.channel}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={`px-[14px] py-[11px] text-[var(--ink-secondary)] text-[12px] align-middle ${isLast ? "border-b-0" : "border-b border-[var(--line)]"}`}>
                          <span className="inline-block px-[8px] py-[3px] rounded-[4px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-mono text-[11px] font-bold">
                            {contact.responseTarget}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
