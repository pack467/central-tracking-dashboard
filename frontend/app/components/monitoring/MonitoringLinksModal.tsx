"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useIsClient } from "@/app/hooks/useIsClient";
import { createPortal } from "react-dom";
import { X, ExternalLink, Copy, Check, Globe } from "lucide-react";
import { ProjectTile } from "@/app/components/monitoring/ProjectTile";
import { useToast } from "@/app/components/ui/Toast";
import { copyTextToClipboard } from "@/app/lib/copy-text";
import { getMonitoringLinks, type MonitoringLinkItem } from "@/app/lib/monitoring-links";

export interface MonitoringLinksModalProps {
  open: boolean;
  onClose: () => void;
  project: string;
  task?: string;
  clientId?: string;
  explicitUrl?: string;
}

const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 h-10 sm:h-8 px-3 rounded-lg border border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:text-[#f8fafc] hover:bg-[#243044] hover:border-[#475569] text-[12px] font-semibold transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]";

/** The monitoring websites of one project, opened from a checkpoint row or a project card on /monitoring. A bottom sheet on phones, a centred dialog from `sm` up. */
export function MonitoringLinksModal({ open, onClose, project, task, clientId, explicitUrl }: MonitoringLinksModalProps) {
  const notify = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isClient = useIsClient();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const links: MonitoringLinkItem[] = useMemo(() => {
    if (!open) return [];
    return getMonitoringLinks(project, task, clientId, explicitUrl);
  }, [open, project, task, clientId, explicitUrl]);

  // Trap focus and handle escape key
  useEffect(() => {
    if (!open) return;

    triggerRef.current = (document.activeElement as HTMLElement) || null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !isClient) return null;

  const handleCopySingle = (link: MonitoringLinkItem) => {
    void copyTextToClipboard(link.url).then((copied) => {
      if (copied) {
        setCopiedId(link.id);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => {
          setCopiedId((prev) => (prev === link.id ? null : prev));
        }, 1800);
        notify.success(`Link "${link.title}" disalin.`, { id: `copy-link-${link.id}` });
      } else {
        notify.info("Gagal menyalin link ke clipboard.", { id: `copy-link-${link.id}` });
      }
    });
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/75 sm:p-5 anim-fade"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="monitoring-links-modal-title"
        tabIndex={-1}
        className="w-full sm:max-w-[600px] max-h-[88dvh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-[#334155] max-sm:border-b-0 bg-[#0f172a] text-[#f8fafc] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden outline-none"
      >
        {/* Grab handle on phones */}
        <span className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-[#475569]" aria-hidden="true" />

        {/* ── Header ── */}
        <div className="flex items-start gap-3 p-4 sm:p-5 border-b border-[#334155] bg-[#1e293b] shrink-0">
          <ProjectTile name={project} clientId={clientId} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono font-bold tracking-[0.08em] uppercase text-[#94a3b8]">
              <span>Link Monitoring</span>
              {clientId && (
                <>
                  <span className="text-[#475569]">·</span>
                  <span>{clientId}</span>
                </>
              )}
              <span className="text-[#475569]">·</span>
              <span>{links.length} link</span>
            </div>
            <h3 id="monitoring-links-modal-title" className="text-[17px] sm:text-[18px] font-bold text-[#f8fafc] truncate mt-0.5 tracking-tight">
              {project}
            </h3>
            {task && (
              <p className="text-[12px] text-[#94a3b8] mt-0.5 line-clamp-2" title={task}>
                {task}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup daftar link"
            className="inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 -mr-1 rounded-lg border border-[#334155] bg-[#0f172a] text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#243044] hover:border-[#475569] transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Links ── */}
        <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4 flex flex-col gap-2.5 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] pb-[max(12px,env(safe-area-inset-bottom))]">
          {links.length === 0 && (
            <li className="p-6 text-center text-[12px] text-[#94a3b8]">Belum ada link monitoring untuk proyek ini.</li>
          )}
          {links.map((item, idx) => {
            const isItemCopied = copiedId === item.id;
            return (
              <li key={item.id || idx} className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-[#334155] bg-[#1e293b]">
                <div className="min-w-0">
                  <h4 className="text-[13.5px] font-semibold text-[#f8fafc] leading-snug">{item.title}</h4>
                  {item.description && <p className="text-[12px] text-[#94a3b8] mt-0.5 leading-relaxed">{item.description}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${item.url} (buka di tab baru)`}
                    aria-label={`Buka ${item.title} di tab baru`}
                    className="group/url flex items-center gap-2 min-w-0 flex-1 h-10 sm:h-8 px-2.5 rounded-lg bg-[#0b1220] border border-[#334155]/70 text-[11.5px] font-mono text-[#7dd3fc] hover:border-[#38bdf8]/60 hover:text-[#bae6fd] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
                  >
                    <Globe size={13} className="text-[#64748b] shrink-0" aria-hidden="true" />
                    <span className="truncate flex-1 min-w-0">{item.url.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink size={12} className="shrink-0 text-[#64748b] group-hover/url:text-[#38bdf8]" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopySingle(item)}
                    aria-label={`Salin link ${item.title}`}
                    className={`${secondaryButton} shrink-0 ${isItemCopied ? "!text-[#4ade80] !border-[#4ade80]/50" : ""}`}
                  >
                    {isItemCopied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
                    <span>{isItemCopied ? "Tersalin" : "Salin"}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
