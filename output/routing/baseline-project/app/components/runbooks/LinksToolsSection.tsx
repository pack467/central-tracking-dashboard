"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Check,
  Activity,
  BarChart3,
  Search,
  Ticket,
  Radio,
  Layers,
  BookOpen,
  MessageSquare,
  Bot,
  Building2,
  FolderGit2,
  Server,
  Globe,
  type LucideIcon,
} from "lucide-react";
import type { LinkCategory, QuickLink } from "@/app/lib/types";
import { useToast } from "@/app/components/ui/Toast";

const CATEGORIES: LinkCategory[] = ["Dashboard", "Ticketing", "Internal", "Vendor"];

const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  "bar-chart": BarChart3,
  search: Search,
  ticket: Ticket,
  radio: Radio,
  layers: Layers,
  "book-open": BookOpen,
  "message-square": MessageSquare,
  bot: Bot,
  building: Building2,
  folder: FolderGit2,
  server: Server,
};

function renderLinkIcon(iconKey?: string) {
  const IconComponent = (iconKey && ICON_MAP[iconKey]) || Globe;
  return <IconComponent size={20} strokeWidth={1.8} aria-hidden="true" />;
}

function extractHostname(urlString: string): string {
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return urlString;
  }
}

interface LinksToolsSectionProps {
  entries: QuickLink[];
  search: string;
}

export function LinksToolsSection({ entries, search }: LinksToolsSectionProps) {
  const [catFilter, setCatFilter] = useState<LinkCategory | "All">("All");

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
          e.label.toLowerCase().includes(q) ||
          e.url.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q)) ||
          (e.project && e.project.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [entries, catFilter, search]);

  return (
    <div className="anim-tab-fade">
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

      {/* Tools Catalog Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state flex flex-col items-center gap-[4px] p-[36px_20px] text-center">
          <span className="text-[var(--ink-muted)] text-[13px]">
            Tidak ada tools ditemukan{search ? ` untuk "${search}"` : ""}.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-[12px] max-[860px]:grid-cols-2 max-[520px]:grid-cols-1">
          {filtered.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual Tool / Link Card with Copy Link Button ── */

function LinkCard({ link }: { link: QuickLink }) {
  const [copied, setCopied] = useState(false);
  const notify = useToast();
  const host = extractHostname(link.url);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(link.url);
    setCopied(true);
    notify.success(`Link disalin: ${link.url}`, {
      id: `copy-link-${link.id}`,
      duration: 2500,
    });
    setTimeout(() => setCopied(false), 2000);
  }, [link.url, link.id, notify]);

  return (
    <div
      className="flex flex-col p-[16px] rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-bg)] cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] hover:border-[var(--accent-blue-border)] hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
      onClick={handleCopyLink}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCopyLink();
        }
      }}
    >
      <div className="flex items-center justify-between gap-[8px] mb-[12px]">
        <span className="grid place-items-center w-[38px] h-[38px] rounded-[7px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--accent-blue)] shrink-0">
          {renderLinkIcon(link.icon)}
        </span>
        <div className="flex items-center gap-[6px]">
          {link.project && (
            <span className="px-[7px] py-[2px] rounded-[4px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-muted)] text-[10px] font-semibold font-mono">
              {link.project}
            </span>
          )}
          <span className="px-[7px] py-[2px] rounded-[4px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-secondary)] text-[10px] font-bold font-mono">
            {link.category}
          </span>
        </div>
      </div>

      <div className="flex-1 mb-[12px]">
        <h4 className="m-[0_0_6px] flex items-center justify-between text-[var(--ink-primary)] text-[13.5px] font-semibold">
          <span>{link.label}</span>
        </h4>
        {link.description && <p className="m-0 text-[var(--ink-muted)] text-[11.5px] leading-[1.5]">{link.description}</p>}
      </div>

      <div className="flex items-center justify-between gap-[8px] pt-[10px] border-t border-[var(--line)]">
        <code className="text-[var(--ink-muted)] text-[10.5px] font-mono overflow-hidden text-ellipsis whitespace-nowrap flex-1" title={link.url}>
          {host}
        </code>
        <button
          type="button"
          className={`inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[5px] border text-[11px] font-semibold cursor-pointer transition-all duration-150 shrink-0 ${
            copied
              ? "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green-border)]"
              : "border-[var(--panel-border)] bg-[var(--bg)] text-[var(--ink-secondary)] hover:bg-[var(--accent-blue-soft)] hover:text-[var(--accent-blue)] hover:border-[var(--accent-blue-border)]"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleCopyLink();
          }}
          title="Salin Link ke Clipboard"
          aria-label={`Salin link ${link.label}`}
        >
          {copied ? (
            <>
              <Check size={12} strokeWidth={2.5} aria-hidden="true" />
              <span>Tersalin!</span>
            </>
          ) : (
            <>
              <Copy size={12} strokeWidth={2} aria-hidden="true" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
