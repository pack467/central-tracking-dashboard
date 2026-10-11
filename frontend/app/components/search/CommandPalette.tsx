"use client";
import Link from "next/link";
import { routes, pathForLabel } from "@/app/lib/routes";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/app/components/ui/Badge";
import { ProjectMark } from "@/app/components/ui/ProjectMark";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { navItems } from "@/app/components/layout/Sidebar";
import { statusTone } from "@/app/components/tickets/TicketTable";
import type { Ticket } from "@/app/lib/types";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onNavigate: (label: string) => void;
}

import type { LucideIcon } from "lucide-react";

interface PaletteResult {
  key: string;
  kind: "nav" | "ticket";
  label: string;
  hint: string;
  icon?: LucideIcon | string;
  ticket?: Ticket;
  navLabel?: string;
}

function PaletteIcon({ icon }: { icon?: LucideIcon | string }) {
  if (typeof icon === "string") return <>{icon}</>;
  if (!icon) return null;
  const Icon = icon;
  return <Icon size={16} strokeWidth={1.8} aria-hidden="true" />;
}

export function CommandPalette({ open, onClose, tickets, onSelectTicket, onNavigate }: CommandPaletteProps) {
  if (!open) return null;
  return (
    <PaletteOverlay
      onClose={onClose}
      tickets={tickets}
      onSelectTicket={onSelectTicket}
      onNavigate={onNavigate}
    />
  );
}

function PaletteOverlay({
  onClose,
  tickets,
  onSelectTicket,
  onNavigate,
}: Omit<CommandPaletteProps, "open">) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, []);

  const results = useMemo<PaletteResult[]>(() => {
    const needle = search.trim().toLowerCase();
    const allNav = navItems;
    const navMatches = allNav
      .filter(
        (item) =>
          item.label.toLowerCase().includes(needle) ||
          (item.label === "Team Roster" && "tim jadwal shift operator".includes(needle)) ||
          (item.label === "Notifikasi" && "notifikasi alert pemberitahuan pesan".includes(needle))
      )
      .map((item) => ({
        key: `nav-${item.label}`,
        kind: "nav" as const,
        label: item.label,
        hint: `Lompat ke halaman ${item.label.toLowerCase()}`,
        icon: item.icon,
        navLabel: item.label,
      }));
    const ticketMatches = tickets
      .filter((ticket) =>
        needle
          ? Object.values(ticket).some(
              (value) => typeof value === "string" && value.toLowerCase().includes(needle),
            )
          : true,
      )
      .slice(0, 5)
      .map((ticket) => ({
        key: `ticket-${ticket.id}`,
        kind: "ticket" as const,
        label: ticket.subject,
        hint: `#${ticket.id} · Pemilik: ${ticket.owner}`,
        ticket,
      }));
    return [...navMatches, ...ticketMatches];
  }, [search, tickets]);

  const activate = (result: PaletteResult) => {
    if (result.kind === "nav" && result.navLabel) onNavigate(result.navLabel);
    else if (result.ticket) onSelectTicket(result.ticket);
    onClose();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((previous) => Math.min(previous + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((previous) => Math.max(previous - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[cursor];
      if (target) activate(target);
    }
  };

  // Scroll active cursor into view if needed
  useEffect(() => {
    const activeEl = scrollContainerRef.current?.querySelector(".cursor-active");
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [cursor]);

  const navResults = results.filter((r) => r.kind === "nav");
  const ticketResults = results.filter((r) => r.kind === "ticket");

  return (
    <div
      className="modal-backdrop anim-fade"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="command-modal modal-pop [width:min(640px,_calc(100vw_-_32px))] [max-height:calc(100vh_-_64px)] [display:flex] [flex-direction:column] [overflow:hidden] [border:1px_solid_var(--panel-border)] [border-radius:14px] [background:var(--modal-bg)] [box-shadow:var(--shadow-elevated)] [color:var(--ink-primary)]"
        role="dialog"
        aria-modal="true"
        aria-label="Cari dashboard atau lompat ke halaman"
      >
        <div className="command-input [display:flex] [align-items:center] [gap:12px] [padding:16px_20px] [border-bottom:1px_solid_var(--line)] [background:var(--panel-bg)]">
          <span className="command-input-icon [color:var(--accent-blue)] [font-size:20px] [line-height:1] [display:grid] [place-items:center] [flex-shrink:0]" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Cari tiket, pemeriksaan sistem, atau lompat ke halaman…"
            aria-label="Kolom pencarian command palette"
            className="[flex:1] [min-width:0] [color:var(--ink-primary)] [background:transparent] [border:0] [outline:0] [font-size:14px]! [font-family:var(--font-sans)]! [font-weight:500]"
          />
          <kbd
            className="command-esc-badge [padding:3px_6px] [color:var(--ink-muted)] [border:1px_solid_var(--line)] [border-radius:5px] [background:var(--bg)] [font-size:10px] [font-family:var(--font-mono)] [font-weight:700] [line-height:1] [cursor:pointer] [transition:all_0.15s_ease] [user-select:none] [flex-shrink:0]"
            onClick={onClose}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onClose();
            }}
            role="button"
            tabIndex={0}
            title="Tutup modal (ESC)"
          >
            ESC
          </kbd>
        </div>

        <div className="command-body [flex:1] [min-height:0] [overflow-y:auto] [padding:14px_16px_16px] [display:flex] [flex-direction:column] [gap:16px]" ref={scrollContainerRef}>
          {navResults.length > 0 && (
            <div className="command-section [display:flex] [flex-direction:column] [gap:4px]">
              <div className="command-section-label [padding:2px_8px_6px] [color:var(--ink-muted)] [font-size:10px] [font-weight:700] [letter-spacing:1.1px] [font-family:var(--font-mono)] [text-transform:uppercase]">LOMPAT KE WORKSPACE</div>
              <div className="command-results-list [display:flex] [flex-direction:column] [gap:3px]">
                {navResults.map((result) => {
                  const globalIndex = results.indexOf(result);
                  const isActive = cursor === globalIndex;
                  return (
                    <Link href={pathForLabel(result.navLabel ?? result.label)}
                      key={result.key}
                      className={`command-item command-item-nav [display:flex] [align-items:center] [gap:12px] [padding:9px_12px] [width:100%] [border-radius:8px] [border:1px_solid_transparent] [background:transparent] [text-align:left] [color:var(--ink-primary)] [cursor:pointer] [transition:background_0.15s_ease,_border-color_0.15s_ease,_transform_0.1s_ease] ${isActive ? "cursor-active" : ""}`}
                      onClick={onClose}
                      onMouseEnter={() => setCursor(globalIndex)}
                      
                      >
                      <span className="command-nav-icon-box [width:32px] [height:32px] [flex-shrink:0] [display:grid] [place-items:center] [border-radius:8px] [background:var(--accent-blue-soft)] [border:1px_solid_var(--accent-blue-border)] [color:var(--accent-blue)] [font-size:14px] [font-weight:600] [line-height:1] [transition:all_0.15s_ease]" aria-hidden="true">
                        <PaletteIcon icon={result.icon} />
                      </span>
                      <div className="command-item-content [flex:1] [min-width:0] [display:flex] [flex-direction:column] [gap:2px]">
                        <strong className="command-item-title [display:block] [overflow:hidden] [color:var(--ink-primary)] [font-size:12.5px] [font-weight:600] [line-height:1.35] [text-overflow:ellipsis] [white-space:nowrap]">{result.label}</strong>
                        <small className="command-item-subtitle [display:block] [overflow:hidden] [color:var(--ink-muted)] [font-size:11px] [font-family:var(--font-mono)] [font-weight:500] [text-overflow:ellipsis] [white-space:nowrap]">{result.hint}</small>
                      </div>
                      <span className="command-enter-indicator [opacity:0] [transform:translateX(-4px)] [transition:opacity_0.15s_ease,_transform_0.15s_ease] [flex-shrink:0]" aria-hidden="true">
                        <kbd className="[padding:2px_5px] [color:var(--accent-blue)] [border:1px_solid_var(--accent-blue-border)] [border-radius:4px] [background:var(--panel-bg)] [font-size:9.5px] [font-family:var(--font-mono)] [font-weight:700]">↵</kbd>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {ticketResults.length > 0 && (
            <div className="command-section [display:flex] [flex-direction:column] [gap:4px]">
              <div className="command-section-label [padding:2px_8px_6px] [color:var(--ink-muted)] [font-size:10px] [font-weight:700] [letter-spacing:1.1px] [font-family:var(--font-mono)] [text-transform:uppercase]">
                {search ? "TICKET TERBARU YANG COCOK" : "TICKET TERBARU"}
              </div>
              <div className="command-results-list [display:flex] [flex-direction:column] [gap:3px]">
                {ticketResults.map((result) => {
                  if (!result.ticket) return null;
                  const globalIndex = results.indexOf(result);
                  const isActive = cursor === globalIndex;
                  return (
                    <Link href={routes.ticket(result.ticket.id)}
                      key={result.key}
                      className={`command-item command-item-ticket [display:flex] [align-items:center] [gap:12px] [padding:9px_12px] [width:100%] [border-radius:8px] [border:1px_solid_transparent] [background:transparent] [text-align:left] [color:var(--ink-primary)] [cursor:pointer] [transition:background_0.15s_ease,_border-color_0.15s_ease,_transform_0.1s_ease] ${isActive ? "cursor-active" : ""}`}
                      onClick={onClose}
                      onMouseEnter={() => setCursor(globalIndex)}
                      
                    >
                      <div className="command-ticket-mark-wrapper">
                        <ProjectMark name={result.ticket.project} />
                      </div>
                      <div className="command-item-content [flex:1] [min-width:0] [display:flex] [flex-direction:column] [gap:2px]">
                        <strong className="command-item-title [display:block] [overflow:hidden] [color:var(--ink-primary)] [font-size:12.5px] [font-weight:600] [line-height:1.35] [text-overflow:ellipsis] [white-space:nowrap]">{result.label}</strong>
                        <small className="command-item-subtitle [display:block] [overflow:hidden] [color:var(--ink-muted)] [font-size:11px] [font-family:var(--font-mono)] [font-weight:500] [text-overflow:ellipsis] [white-space:nowrap]">{result.hint}</small>
                      </div>
                      <div className="command-item-end [display:flex] [align-items:center] [gap:8px] [flex-shrink:0]">
                        <Badge tone={statusTone(result.ticket.status)}>
                          {result.ticket.status}
                        </Badge>
                        <span className="command-enter-indicator [opacity:0] [transform:translateX(-4px)] [transition:opacity_0.15s_ease,_transform_0.15s_ease] [flex-shrink:0]" aria-hidden="true">
                          <kbd className="[padding:2px_5px] [color:var(--accent-blue)] [border:1px_solid_var(--accent-blue-border)] [border-radius:4px] [background:var(--panel-bg)] [font-size:9.5px] [font-family:var(--font-mono)] [font-weight:700]">↵</kbd>
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {results.length === 0 && (
            <EmptyState
              icon="⌕"
              title="Tidak ada hasil yang cocok"
              message={`Tidak ada tiket atau menu yang sesuai dengan "${search}". Coba kata kunci lain.`}
            />
          )}
        </div>

        <div className="command-footer [display:flex] [align-items:center] [justify-content:space-between] [gap:16px] [padding:11px_20px] [color:var(--ink-muted)] [border-top:1px_solid_var(--line)] [background:var(--bg)] [font-size:11px] [flex-shrink:0]">
          <div className="command-footer-left [font-size:11px] [font-weight:600] [color:var(--ink-muted)] [font-family:var(--font-mono)] [letter-spacing:0.2px]">
            <span>Pusat Navigasi Cepat</span>
          </div>
          <div className="command-footer-shortcuts [display:flex] [align-items:center] [gap:14px]">
            <span className="command-footer-shortcut [display:inline-flex] [align-items:center] [gap:5px] [color:var(--ink-secondary)] [font-size:11px] [font-weight:500]">
              <kbd className="[padding:2px_5px] [color:var(--ink-secondary)] [border:1px_solid_var(--line)] [border-radius:4px] [background:var(--panel-bg)] [font-size:9.5px] [font-family:var(--font-mono)] [font-weight:700] [line-height:1] [box-shadow:0_1px_1px_rgba(0,_0,_0,_0.04)]">↵</kbd> Buka
            </span>
            <span className="command-footer-shortcut [display:inline-flex] [align-items:center] [gap:5px] [color:var(--ink-secondary)] [font-size:11px] [font-weight:500]">
              <kbd className="[padding:2px_5px] [color:var(--ink-secondary)] [border:1px_solid_var(--line)] [border-radius:4px] [background:var(--panel-bg)] [font-size:9.5px] [font-family:var(--font-mono)] [font-weight:700] [line-height:1] [box-shadow:0_1px_1px_rgba(0,_0,_0,_0.04)]">↑</kbd><kbd className="[padding:2px_5px] [color:var(--ink-secondary)] [border:1px_solid_var(--line)] [border-radius:4px] [background:var(--panel-bg)] [font-size:9.5px] [font-family:var(--font-mono)] [font-weight:700] [line-height:1] [box-shadow:0_1px_1px_rgba(0,_0,_0,_0.04)]">↓</kbd> Navigasi
            </span>
            <span className="command-footer-shortcut [display:inline-flex] [align-items:center] [gap:5px] [color:var(--ink-secondary)] [font-size:11px] [font-weight:500]">
              <kbd className="[padding:2px_5px] [color:var(--ink-secondary)] [border:1px_solid_var(--line)] [border-radius:4px] [background:var(--panel-bg)] [font-size:9.5px] [font-family:var(--font-mono)] [font-weight:700] [line-height:1] [box-shadow:0_1px_1px_rgba(0,_0,_0,_0.04)]">ESC</kbd> Tutup
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
