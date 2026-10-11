"use client";
import Link from "next/link";
import { DetailNotFound } from "@/app/components/routing/RouteEffects";

import { useRouter, useSearchParams } from "next/navigation";
import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { runbooksSchema } from "@/app/lib/query-state";
import { paths, routes, withQuery, detailId } from "@/app/lib/routes";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  Clock,
  User,
  FileText,
  Video,
  BarChart2,
  FileSpreadsheet,
  Link2,
  Plus,
  Trash2,
  Copy,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import type { SopCategory, SopEntry, SopAttachment, SopAttachmentType } from "@/app/lib/types";
import { seedSopEntries } from "@/app/lib/runbooksData";
import { useToast } from "@/app/components/ui/Toast";

const CATEGORIES: SopCategory[] = ["Monitoring", "Incident", "Handover", "Maintenance", "General"];

const CAT_STYLES: Record<SopCategory, { label: string; dotColor: string; badgeClass: string }> = {
  Monitoring: { label: "Monitoring", dotColor: "var(--accent-blue)", badgeClass: "cat-monitoring" },
  Incident: { label: "Incident P1", dotColor: "var(--red)", badgeClass: "cat-incident" },
  Handover: { label: "Handover", dotColor: "var(--purple)", badgeClass: "cat-handover" },
  Maintenance: { label: "Maintenance", dotColor: "var(--orange)", badgeClass: "cat-maintenance" },
  General: { label: "General", dotColor: "var(--green)", badgeClass: "cat-general" },
};

const ATTACHMENT_TYPE_CONFIG: Record<
  SopAttachmentType,
  { label: string; icon: LucideIcon; badgeClass: string; color: string }
> = {
  pdf: { label: "PDF Document", icon: FileText, badgeClass: "att-pdf", color: "#f87171" },
  word: { label: "Word / Docs", icon: FileText, badgeClass: "att-word", color: "#38bdf8" },
  video: { label: "Video Walkthrough", icon: Video, badgeClass: "att-video", color: "#c084fc" },
  report: { label: "Monthly Report", icon: BarChart2, badgeClass: "att-report", color: "#4ade80" },
  sheet: { label: "Spreadsheet", icon: FileSpreadsheet, badgeClass: "att-sheet", color: "#fbbf24" },
  doc: { label: "Dokumen", icon: FileText, badgeClass: "att-doc", color: "#94a3b8" },
  link: { label: "Web Link", icon: Link2, badgeClass: "att-link", color: "#94a3b8" },
};

interface SopSectionProps {
  dataReady?: boolean;
  entries: SopEntry[];
  search: string;
  onAddAttachment?: (sopId: string, attachment: SopAttachment) => void;
  onDeleteAttachment?: (sopId: string, attachmentId: string) => void;
}

export function SopSection({
  entries,
  dataReady = true,
  search,
  onAddAttachment,
  onDeleteAttachment,
}: SopSectionProps) {
  const url = useUrlQuery(runbooksSchema, paths.runbooks);
  const router = useRouter();
  const routeId = detailId(url.pathname, paths.runbooks, ["credentials", "links", "escalation"]);
  const expandedId = entries.find(e => e.id.toLowerCase() === routeId?.toLowerCase())?.id ?? null;
  const setExpandedId = (next: string | null | ((old: string | null) => string | null)) => { const id = typeof next === "function" ? next(expandedId) : next; router.push(id ? routes.runbook(id, url.query) : withQuery(paths.runbooks, url.query), { scroll: false }); };
  const catFilter = url.values.category;
  const setCatFilter = url.field("category", "replace");

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: entries.length };
    for (const cat of CATEGORIES) {
      counts[cat] = entries.filter((e) => e.category === cat).length;
    }
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    let result = entries;
    if (catFilter !== "All") {
      result = result.filter((e) => e.category === catFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.attachments &&
            e.attachments.some(
              (a) =>
                a.title.toLowerCase().includes(q) ||
                (a.description && a.description.toLowerCase().includes(q)) ||
                a.type.toLowerCase().includes(q),
            )) ||
          (e.project && e.project.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [entries, catFilter, search]);

  const toggle = (id: string) => setExpandedId(expandedId === id ? null : id);

  return (
    <div className="anim-tab-fade">
      {dataReady && routeId && !expandedId && <DetailNotFound title="Runbook tidak ditemukan" href={withQuery(paths.runbooks, url.query)} />}
      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-[6px] mb-[14px]">
        <button
          className={`inline-flex items-center gap-[5px] px-[12px] py-[5px] rounded-[6px] border text-[11.5px] font-semibold cursor-pointer transition-all duration-150 ${
            catFilter === "All"
              ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue-border)] text-[var(--accent-blue)]"
              : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-muted)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-muted)]"
          }`}
          onClick={() => setCatFilter("All")}
        >
          Semua ({categoryCounts["All"]})
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`inline-flex items-center gap-[5px] px-[12px] py-[5px] rounded-[6px] border text-[11.5px] font-semibold cursor-pointer transition-all duration-150 ${
              catFilter === cat
                ? "bg-[var(--accent-blue-soft)] border-[var(--accent-blue-border)] text-[var(--accent-blue)]"
                : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--ink-muted)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--ink-muted)]"
            }`}
            onClick={() => setCatFilter(cat)}
          >
            {cat} ({categoryCounts[cat] ?? 0})
          </button>
        ))}
      </div>

      {/* SOP Cards List */}
      {filtered.length === 0 ? (
        <div className="empty-state flex flex-col items-center gap-[4px] p-[36px_20px] text-center">
          <span className="text-[var(--ink-muted)] text-[13px]">
            Tidak ada SOP ditemukan{search ? ` untuk "${search}"` : ""}.
          </span>
        </div>
      ) : (
        filtered.map((sop) => {
          // If stored SOP doesn't have attachments yet, merge from seed so user sees the examples
          const attachments =
            sop.attachments && sop.attachments.length > 0
              ? sop.attachments
              : seedSopEntries.find((s) => s.id === sop.id)?.attachments || [];

          return (
            <SopCard
              key={sop.id}
              sop={sop}
              attachments={attachments}
              expanded={expandedId === sop.id}
              onToggle={() => toggle(sop.id)}
              onAddAttachment={onAddAttachment}
              onDeleteAttachment={onDeleteAttachment}
            />
          );
        })
      )}
    </div>
  );
}

/* ── Individual SOP Card (Documents & Files Only) ── */

function SopCard({
  sop,
  attachments,
  expanded,
  onToggle,
  onAddAttachment,
  onDeleteAttachment,
}: {
  sop: SopEntry;
  attachments: SopAttachment[];
  expanded: boolean;
  onToggle: () => void;
  onAddAttachment?: (sopId: string, attachment: SopAttachment) => void;
  onDeleteAttachment?: (sopId: string, attachmentId: string) => void;
}) {
  const detailQuery = useSearchParams().toString();
  const [showAddForm, setShowAddForm] = useState(false);
  const notify = useToast();

  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formType, setFormType] = useState<SopAttachmentType>("pdf");
  const [formFormat, setFormFormat] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const catConfig = CAT_STYLES[sop.category] || {
    label: sop.category,
    dotColor: "var(--accent-blue)",
    badgeClass: "cat-general",
  };

  const sopCode = sop.id.toUpperCase();

  const handleSaveAttachment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formUrl.trim()) {
      notify.warning("Judul dokumen dan URL link wajib diisi.");
      return;
    }

    const newAtt: SopAttachment = {
      id: `att-${Date.now()}`,
      title: formTitle.trim(),
      url: formUrl.trim(),
      type: formType,
      format: formFormat.trim() || undefined,
      description: formDesc.trim() || undefined,
    };

    if (onAddAttachment) {
      onAddAttachment(sop.id, newAtt);
    }
    notify.success(`Dokumen "${newAtt.title}" berhasil ditambahkan ke SOP.`);

    // Reset form
    setFormTitle("");
    setFormUrl("");
    setFormFormat("");
    setFormDesc("");
    setShowAddForm(false);
  };

  return (
    <div className={`rounded-[8px] border bg-[var(--panel-bg)] mb-[10px] overflow-hidden transition-[border-color] duration-150 ${expanded ? "border-[var(--accent-blue-border)]" : "border-[var(--panel-border)] hover:border-[var(--accent-blue-border)]"}`}>
      <Link href={expanded ? withQuery(paths.runbooks, detailQuery) : routes.runbook(sop.id, detailQuery)} scroll={false}
        className="flex items-center justify-between gap-[12px] p-[13px_16px] cursor-pointer select-none hover:bg-[var(--panel-bg-hover)]"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-center gap-[10px] min-w-0 flex-1">
          <span className="shrink-0 px-[7px] py-[2px] rounded-[4px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-secondary)] text-[10.5px] font-mono font-bold">{sopCode}</span>
          <span className="inline-flex items-center gap-[6px] px-[9px] py-[2px] rounded-[4px] border border-[var(--panel-border)] bg-[var(--bg)] text-[var(--ink-secondary)] text-[11px] font-semibold whitespace-nowrap">
            <span
              className="w-[6px] h-[6px] rounded-full"
              style={{ backgroundColor: catConfig.dotColor }}
            />
            {catConfig.label}
          </span>
          {sop.project && <span className="px-[7px] py-[2px] rounded-[4px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-muted)] text-[10px] font-semibold font-mono">{sop.project}</span>}
          <h4 className="m-0 text-[var(--ink-primary)] text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis max-[860px]:whitespace-normal">{sop.title}</h4>
        </div>

        <div className="flex items-center gap-[12px] shrink-0">
          <span className="inline-flex items-center gap-[5px] px-[7px] py-[2px] rounded-[4px] bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.2)] text-[var(--accent-blue)] text-[10.5px] font-mono font-semibold" title={`${attachments.length} Dokumen / Berkas Terlampir`}>
            <FileText size={11} aria-hidden="true" />
            {attachments.length} berkas
          </span>
          <ChevronDown
            size={16}
            className={`text-[var(--ink-muted)] transition-transform duration-200 ${expanded ? "rotate-180 text-[var(--accent-blue)]" : ""}`}
            aria-hidden="true"
          />
        </div>
      </Link>

      {expanded && (
        <div className="p-[16px] border-t border-[var(--line)] bg-[rgba(15,23,42,0.3)]">
          {/* ── Berkas Dokumen SOP (PDF, Word, Video, Monthly Report) ── */}
          <div className="mb-[12px]">
            <div className="flex items-start justify-between gap-[12px] mb-[12px]">
              <div>
                <span className="block text-[var(--ink-primary)] text-[11px] font-bold tracking-[0.4px] font-mono">
                  BERKAS &amp; DOKUMEN SOP ({attachments.length})
                </span>
                <span className="block text-[var(--ink-muted)] text-[11px] mt-[2px]">
                  Tautan berkas resmi SOP, video panduan, template dokumen, dan laporan bulanan.
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-[5px] px-[10px] py-[5px] rounded-[5px] border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] text-[11px] font-semibold cursor-pointer whitespace-nowrap transition-all duration-150 shrink-0 hover:bg-[var(--accent-blue)] hover:text-[#090d16]"
                onClick={() => setShowAddForm((prev) => !prev)}
                title="Tambah link dokumen baru"
              >
                <Plus size={13} aria-hidden="true" />
                <span>{showAddForm ? "Batal" : "Tambah Dokumen"}</span>
              </button>
            </div>

            {/* Inline Add Attachment Form */}
            {showAddForm && (
              <form className="mb-[14px] p-[12px] rounded-[6px] bg-[var(--panel-bg)] border border-[var(--accent-blue-border)]" onSubmit={handleSaveAttachment}>
                <div className="flex items-center justify-between mb-[10px] text-[var(--accent-blue)] text-[10.5px] font-bold font-mono">
                  <span>TAMBAH LINK DOKUMEN / LAPORAN / VIDEO BARU</span>
                  <button
                    type="button"
                    className="grid place-items-center w-[22px] h-[22px] rounded-[4px] border-none bg-transparent text-[var(--ink-muted)] cursor-pointer hover:text-[var(--ink-primary)]"
                    onClick={() => setShowAddForm(false)}
                    aria-label="Tutup form"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-[10px] mb-[12px] max-[860px]:grid-cols-1">
                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[var(--ink-muted)] text-[10px] font-bold font-mono">TIPE DOKUMEN</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as SopAttachmentType)}
                      className="h-[32px] px-[8px] rounded-[5px] border border-[var(--panel-border)] bg-[var(--input-bg)] text-[var(--ink-primary)] text-[11.5px] focus:outline-none focus:border-[var(--accent-blue)]"
                    >
                      <option value="pdf">PDF Document (.pdf)</option>
                      <option value="word">Word / Docs (.docx / G-Docs)</option>
                      <option value="video">Video Walkthrough / SOP (.mp4 / Stream)</option>
                      <option value="report">Monthly Report (.xlsx / Rekap)</option>
                      <option value="sheet">Spreadsheet / Excel</option>
                      <option value="link">Web Link / Reference</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[var(--ink-muted)] text-[10px] font-bold font-mono">JUDUL DOKUMEN *</label>
                    <input
                      type="text"
                      placeholder="e.g. SOP-P1-Incident-Response.pdf"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      required
                      className="h-[32px] px-[8px] rounded-[5px] border border-[var(--panel-border)] bg-[var(--input-bg)] text-[var(--ink-primary)] text-[11.5px] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                  </div>

                  <div className="flex flex-col gap-[4px] col-span-2 max-[860px]:col-auto">
                    <label className="text-[var(--ink-muted)] text-[10px] font-bold font-mono">URL LINK / TAUTAN *</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/... atau https://sharepoint.com/..."
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      required
                      className="h-[32px] px-[8px] rounded-[5px] border border-[var(--panel-border)] bg-[var(--input-bg)] text-[var(--ink-primary)] text-[11.5px] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                  </div>

                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[var(--ink-muted)] text-[10px] font-bold font-mono">FORMAT / UKURAN (OPSIONAL)</label>
                    <input
                      type="text"
                      placeholder="e.g. PDF (2.4 MB) atau Video (15 min)"
                      value={formFormat}
                      onChange={(e) => setFormFormat(e.target.value)}
                      className="h-[32px] px-[8px] rounded-[5px] border border-[var(--panel-border)] bg-[var(--input-bg)] text-[var(--ink-primary)] text-[11.5px] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                  </div>

                  <div className="flex flex-col gap-[4px]">
                    <label className="text-[var(--ink-muted)] text-[10px] font-bold font-mono">KETERANGAN SINGKAT (OPSIONAL)</label>
                    <input
                      type="text"
                      placeholder="e.g. Laporan bulanan insiden periode berjalan"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      className="h-[32px] px-[8px] rounded-[5px] border border-[var(--panel-border)] bg-[var(--input-bg)] text-[var(--ink-primary)] text-[11.5px] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-[8px]">
                  <button
                    type="button"
                    className="px-[12px] py-[5px] rounded-[5px] border border-[var(--panel-border)] bg-transparent text-[var(--ink-muted)] text-[11px] font-semibold cursor-pointer hover:text-[var(--ink-primary)]"
                    onClick={() => setShowAddForm(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="px-[14px] py-[5px] rounded-[5px] border-none bg-[var(--accent-blue)] text-[#090d16] text-[11px] font-bold cursor-pointer transition-opacity duration-150 hover:opacity-90">
                    Simpan Link Dokumen
                  </button>
                </div>
              </form>
            )}

            {/* List of Attachments */}
            {attachments.length === 0 ? (
              <div className="p-[16px_12px] rounded-[5px] border border-dashed border-[var(--panel-border)] text-[var(--ink-muted)] text-[11.5px] text-center">
                Belum ada lampiran file/video/report. Klik &quot;Tambah Dokumen&quot; untuk meletakkan link SOP.
              </div>
            ) : (
              <div className="flex flex-col gap-[8px]">
                {attachments.map((att) => (
                  <AttachmentItem
                    key={att.id}
                    attachment={att}
                    onDelete={
                      onDeleteAttachment
                        ? () => onDeleteAttachment(sop.id, att.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Legacy External Links (if any remain) */}
          {sop.externalLinks && sop.externalLinks.length > 0 && (
            <div className="mb-[16px]">
              <span className="block text-[var(--ink-muted)] text-[10.5px] font-bold tracking-[0.5px] font-mono mb-[8px]">TAUTAN TAMBAHAN</span>
              <div className="flex flex-wrap gap-[8px]">
                {sop.externalLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-[6px] px-[12px] py-[6px] rounded-[6px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--accent-blue)] text-[11.5px] font-semibold no-underline transition-all duration-150 hover:bg-[var(--accent-blue-soft)] hover:border-[var(--accent-blue-border)]"
                  >
                    <ExternalLink size={12} aria-hidden="true" />
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Card Meta Footer */}
          <div className="flex items-center gap-[10px] pt-[12px] border-t border-[var(--line)] text-[var(--ink-muted)] text-[11px] font-mono">
            <span className="inline-flex items-center gap-[5px]">
              <Clock size={12} aria-hidden="true" />
              <span>Diperbarui: {sop.updatedAt}</span>
            </span>
            <span className="text-[var(--ink-muted)]">·</span>
            <span className="inline-flex items-center gap-[5px]">
              <User size={12} aria-hidden="true" />
              <span>Verifikator: {sop.updatedBy}</span>
            </span>
            <span className="ml-auto px-[6px] py-[1px] rounded-[4px] bg-[var(--green-soft)] text-[var(--green)] font-bold text-[10px]">Active</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Individual Attachment Item with Copy Link & Open ── */

function AttachmentItem({
  attachment,
  onDelete,
}: {
  attachment: SopAttachment;
  onDelete?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const notify = useToast();

  const typeConfig = ATTACHMENT_TYPE_CONFIG[attachment.type] || ATTACHMENT_TYPE_CONFIG.link;
  const TypeIcon = typeConfig.icon;

  const handleCopyLink = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(attachment.url);
      setCopied(true);
      notify.success(`Link disalin: ${attachment.title}`, {
        id: `att-copy-${attachment.id}`,
        duration: 2500,
      });
      setTimeout(() => setCopied(false), 2000);
    },
    [attachment.url, attachment.title, notify],
  );

  return (
    <div className="flex items-center justify-between gap-[12px] p-[9px_12px] rounded-[6px] bg-[var(--panel-bg)] border border-[var(--panel-border)] transition-[border-color] duration-150 hover:border-[var(--accent-blue-border)] max-[520px]:flex-col max-[520px]:items-start max-[520px]:gap-[8px]">
      <div
        className="shrink-0 grid place-items-center w-[32px] h-[32px] rounded-[6px] bg-[var(--bg)] border border-[var(--panel-border)]"
        style={{ color: typeConfig.color }}
        aria-hidden="true"
      >
        <TypeIcon size={16} strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px] flex-wrap">
          <span className="text-[var(--ink-primary)] text-[12.5px] font-semibold">{attachment.title}</span>
          <span
            className="inline-block px-[6px] py-[1px] rounded-[4px] bg-[var(--bg)] border text-[9.5px] font-bold font-mono"
            style={{ color: typeConfig.color, borderColor: `${typeConfig.color}40` }}
          >
            {typeConfig.label}
          </span>
          {attachment.format && (
            <span className="text-[var(--ink-muted)] text-[10px] font-mono">{attachment.format}</span>
          )}
        </div>
        {attachment.description && (
          <p className="m-[3px_0_2px] text-[var(--ink-secondary)] text-[11px] leading-[1.4]">{attachment.description}</p>
        )}
        <code className="block text-[var(--ink-muted)] text-[10px] font-mono overflow-hidden text-ellipsis whitespace-nowrap" title={attachment.url}>
          {attachment.url}
        </code>
      </div>

      <div className="flex items-center gap-[6px] shrink-0 max-[520px]:w-full max-[520px]:justify-end">
        <button
          type="button"
          className={`inline-flex items-center gap-[5px] px-[9px] py-[4px] rounded-[5px] border text-[11px] font-semibold cursor-pointer transition-all duration-150 ${
            copied
              ? "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green-border)]"
              : "border-[var(--panel-border)] bg-[var(--bg)] text-[var(--ink-secondary)] hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)]"
          }`}
          onClick={handleCopyLink}
          title="Salin Link Dokumen"
          aria-label={`Salin link ${attachment.title}`}
        >
          {copied ? (
            <>
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
              <span>Tersalin!</span>
            </>
          ) : (
            <>
              <Copy size={12} aria-hidden="true" />
              <span>Copy Link</span>
            </>
          )}
        </button>

        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-[5px] px-[9px] py-[4px] rounded-[5px] border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)] text-[11px] font-semibold no-underline cursor-pointer transition-all duration-150 hover:bg-[var(--accent-blue)] hover:text-[#090d16]"
          title={`Buka ${attachment.title} di tab baru`}
        >
          <ExternalLink size={12} aria-hidden="true" />
          <span>Buka</span>
        </a>

        {onDelete && (
          <button
            type="button"
            className="inline-flex items-center gap-[5px] px-[6px] py-[4px] rounded-[5px] border border-[var(--panel-border)] bg-[var(--bg)] text-[var(--ink-muted)] text-[11px] font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--red-soft)] hover:text-[var(--red)] hover:border-[var(--red-border)]"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Hapus lampiran"
            aria-label="Hapus lampiran"
          >
            <Trash2 size={12} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

