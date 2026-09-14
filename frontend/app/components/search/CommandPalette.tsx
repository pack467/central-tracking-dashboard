"use client";

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
        hint: `#${ticket.id} · Ditugaskan kepada ${ticket.owner}`,
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
        className="command-modal modal-pop"
        role="dialog"
        aria-modal="true"
        aria-label="Cari dashboard atau lompat ke halaman"
      >
        <div className="command-input">
          <span className="command-input-icon" aria-hidden="true">⌕</span>
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
          />
          <kbd
            className="command-esc-badge"
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

        <div className="command-body" ref={scrollContainerRef}>
          {navResults.length > 0 && (
            <div className="command-section">
              <div className="command-section-label">LOMPAT KE WORKSPACE</div>
              <div className="command-results-list">
                {navResults.map((result) => {
                  const globalIndex = results.indexOf(result);
                  const isActive = cursor === globalIndex;
                  return (
                    <button
                      key={result.key}
                      className={`command-item command-item-nav ${isActive ? "cursor-active" : ""}`}
                      onClick={() => activate(result)}
                      onMouseEnter={() => setCursor(globalIndex)}
                      type="button"
                      >
                      <span className="command-nav-icon-box" aria-hidden="true">
                        <PaletteIcon icon={result.icon} />
                      </span>
                      <div className="command-item-content">
                        <strong className="command-item-title">{result.label}</strong>
                        <small className="command-item-subtitle">{result.hint}</small>
                      </div>
                      <span className="command-enter-indicator" aria-hidden="true">
                        <kbd>↵</kbd>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {ticketResults.length > 0 && (
            <div className="command-section">
              <div className="command-section-label">
                {search ? "TICKET TERBARU YANG COCOK" : "TICKET TERBARU"}
              </div>
              <div className="command-results-list">
                {ticketResults.map((result) => {
                  if (!result.ticket) return null;
                  const globalIndex = results.indexOf(result);
                  const isActive = cursor === globalIndex;
                  return (
                    <button
                      key={result.key}
                      className={`command-item command-item-ticket ${isActive ? "cursor-active" : ""}`}
                      onClick={() => activate(result)}
                      onMouseEnter={() => setCursor(globalIndex)}
                      type="button"
                    >
                      <div className="command-ticket-mark-wrapper">
                        <ProjectMark name={result.ticket.project} />
                      </div>
                      <div className="command-item-content">
                        <strong className="command-item-title">{result.label}</strong>
                        <small className="command-item-subtitle">{result.hint}</small>
                      </div>
                      <div className="command-item-end">
                        <Badge tone={statusTone(result.ticket.status)}>
                          {result.ticket.status}
                        </Badge>
                        <span className="command-enter-indicator" aria-hidden="true">
                          <kbd>↵</kbd>
                        </span>
                      </div>
                    </button>
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

        <div className="command-footer">
          <div className="command-footer-left">
            <span>Pusat Navigasi Cepat</span>
          </div>
          <div className="command-footer-shortcuts">
            <span className="command-footer-shortcut">
              <kbd>↵</kbd> Buka
            </span>
            <span className="command-footer-shortcut">
              <kbd>↑</kbd><kbd>↓</kbd> Navigasi
            </span>
            <span className="command-footer-shortcut">
              <kbd>ESC</kbd> Tutup
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
