"use client";
import { paths } from "@/app/lib/routes";
import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { runbooksSchema } from "@/app/lib/query-state";

import { useCallback, useMemo, useState } from "react";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertTriangle,
  Globe,
  Network,
  Terminal,
  KeyRound,
  Lock,
} from "lucide-react";
import type { CredentialCategory, CredentialEntry } from "@/app/lib/types";

const CATEGORIES: CredentialCategory[] = ["Website", "VPN", "SSH", "API"];

const CATEGORY_ICONS: Record<CredentialCategory, typeof Globe> = {
  Website: Globe,
  VPN: Network,
  SSH: Terminal,
  API: KeyRound,
};

interface CredentialsSectionProps {
  entries: CredentialEntry[];
  search: string;
}

export function CredentialsSection({ entries, search }: CredentialsSectionProps) {
  const url = useUrlQuery(runbooksSchema, paths.runbooks);
  const catFilter = url.values.category;
  const setCatFilter = url.field("category");

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
          e.username.toLowerCase().includes(q) ||
          (e.url && e.url.toLowerCase().includes(q)) ||
          (e.host && e.host.toLowerCase().includes(q)) ||
          (e.project && e.project.toLowerCase().includes(q)) ||
          (e.notes && e.notes.toLowerCase().includes(q)),
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

      {/* Security Notice Banner */}
      <div className="flex items-start gap-[12px] p-[12px_16px] rounded-[8px] border border-[var(--accent-blue-border)] bg-[rgba(56,189,248,0.06)] mb-[16px]">
        <div className="text-[var(--accent-blue)] mt-[2px] shrink-0">
          <ShieldCheck size={16} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-[2px]">
          <strong className="text-[var(--accent-blue)] text-[11px] font-mono tracking-[0.4px]">NOC VAULT · AKSES KREDENSIAL OPERASIONAL</strong>
          <span className="text-[var(--ink-secondary)] text-[11.5px] leading-[1.5]">
            Kredensial bersifat rahasia untuk operator aktif. Rahasia ter-masking secara default, dengan reveal otomatis ditutup setelah 10 detik.
          </span>
        </div>
      </div>

      {/* Credential Cards Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state flex flex-col items-center gap-[4px] p-[36px_20px] text-center">
          <span className="text-[var(--ink-muted)] text-[13px]">
            Tidak ada kredensial ditemukan{search ? ` untuk "${search}"` : ""}.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(330px,1fr))] gap-[12px] max-[860px]:grid-cols-1">
          {filtered.map((cred) => (
            <CredentialCard key={cred.id} cred={cred} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual Credential Card ── */

function CredentialCard({ cred }: { cred: CredentialEntry }) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = useCallback((value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Auto-hide password after 10 seconds
  const handleReveal = useCallback(() => {
    setShowPassword(true);
    setTimeout(() => setShowPassword(false), 10000);
  }, []);

  const expiryStatus = useMemo(() => {
    if (!cred.expiresAt) return null;
    const now = new Date();
    const exp = new Date(cred.expiresAt);
    const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: "Expired", className: "bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red-border)]" };
    if (daysLeft <= 30) return { label: `${daysLeft} hari lagi`, className: "bg-[var(--orange-soft)] text-[var(--orange)] border border-[var(--orange-border)]" };
    return { label: `Berlaku hingga ${cred.expiresAt}`, className: "bg-[var(--green-soft)] text-[var(--green)] border border-[var(--green-border)]" };
  }, [cred.expiresAt]);

  const hostField = cred.url || (cred.host ? `${cred.host}${cred.port ? `:${cred.port}` : ""}` : null);
  const hostLabel = cred.category === "SSH" ? "HOST" : cred.category === "VPN" ? "SERVER" : "ENDPOINT";
  const CatIcon = CATEGORY_ICONS[cred.category] || Lock;

  return (
    <div className="rounded-[8px] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-[16px] flex flex-col gap-[10px] transition-[border-color] duration-150 hover:border-[var(--accent-blue-border)]">
      <div className="flex items-center justify-between gap-[8px] pb-[10px] border-b border-[var(--line)]">
        <div className="flex items-center gap-[8px] min-w-0 flex-1">
          <span className="shrink-0 grid place-items-center w-[26px] h-[26px] rounded-[5px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--accent-blue)]">
            <CatIcon size={14} aria-hidden="true" />
          </span>
          <h4 className="m-0 text-[var(--ink-primary)] text-[13px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">{cred.label}</h4>
        </div>
        <div className="flex items-center gap-[6px] shrink-0">
          {cred.project && (
            <span className="px-[7px] py-[2px] rounded-[4px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-muted)] text-[10px] font-semibold font-mono">
              {cred.project}
            </span>
          )}
          <span className="px-[8px] py-[2px] rounded-[4px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-secondary)] text-[10px] font-bold font-mono">
            {cred.category}
          </span>
        </div>
      </div>

      {/* Connection Info */}
      {hostField && (
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-[var(--ink-muted)] text-[10.5px] font-bold font-mono shrink-0 min-w-[76px]">{hostLabel}</span>
          <div className="flex items-center gap-[6px] flex-1 min-w-0">
            <code className="flex-1 px-[8px] py-[5px] rounded-[5px] bg-[var(--sidebar-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-mono text-[11.5px] overflow-hidden text-ellipsis whitespace-nowrap">
              {hostField}
            </code>
            <button
              className={`shrink-0 grid place-items-center w-[26px] h-[26px] rounded-[5px] border cursor-pointer transition-all duration-150 ${
                copiedField === "host"
                  ? "text-[var(--green)] border-[var(--green-border)] bg-[var(--green-soft)]"
                  : "border-[var(--panel-border)] bg-transparent text-[var(--ink-muted)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--accent-blue-border)]"
              }`}
              onClick={() => handleCopy(hostField, "host")}
              title="Salin Host / Endpoint"
              aria-label="Salin Host"
            >
              {copiedField === "host" ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}

      {cred.protocol && (
        <div className="flex items-center justify-between gap-[8px]">
          <span className="text-[var(--ink-muted)] text-[10.5px] font-bold font-mono shrink-0 min-w-[76px]">PROTOCOL</span>
          <div className="flex items-center gap-[6px] flex-1 min-w-0">
            <code className="flex-1 px-[8px] py-[5px] rounded-[5px] bg-[var(--sidebar-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-mono text-[11.5px] overflow-hidden text-ellipsis whitespace-nowrap">
              {cred.protocol}
            </code>
          </div>
        </div>
      )}

      {/* Username */}
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[var(--ink-muted)] text-[10.5px] font-bold font-mono shrink-0 min-w-[76px]">USERNAME</span>
        <div className="flex items-center gap-[6px] flex-1 min-w-0">
          <code className="flex-1 px-[8px] py-[5px] rounded-[5px] bg-[var(--sidebar-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-mono text-[11.5px] overflow-hidden text-ellipsis whitespace-nowrap">
            {cred.username}
          </code>
          <button
            className={`shrink-0 grid place-items-center w-[26px] h-[26px] rounded-[5px] border cursor-pointer transition-all duration-150 ${
              copiedField === "user"
                ? "text-[var(--green)] border-[var(--green-border)] bg-[var(--green-soft)]"
                : "border-[var(--panel-border)] bg-transparent text-[var(--ink-muted)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--accent-blue-border)]"
            }`}
            onClick={() => handleCopy(cred.username, "user")}
            title="Salin Username"
            aria-label="Salin Username"
          >
            {copiedField === "user" ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Password / Secret */}
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[var(--ink-muted)] text-[10.5px] font-bold font-mono shrink-0 min-w-[76px]">SECRET</span>
        <div className="flex items-center gap-[6px] flex-1 min-w-0">
          <code
            className={`flex-1 px-[8px] py-[5px] rounded-[5px] bg-[var(--sidebar-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] font-mono text-[11.5px] overflow-hidden text-ellipsis whitespace-nowrap ${
              showPassword ? "" : "text-[var(--ink-muted)] tracking-[2px]"
            }`}
          >
            {showPassword ? cred.password : "••••••••••••"}
          </code>
          <button
            className="shrink-0 grid place-items-center w-[26px] h-[26px] rounded-[5px] border border-[var(--panel-border)] bg-transparent text-[var(--ink-muted)] cursor-pointer transition-all duration-150 hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--accent-blue-border)]"
            onClick={showPassword ? () => setShowPassword(false) : handleReveal}
            title={showPassword ? "Sembunyikan" : "Tampilkan rahasia (10s)"}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            className={`shrink-0 grid place-items-center w-[26px] h-[26px] rounded-[5px] border cursor-pointer transition-all duration-150 ${
              copiedField === "pass"
                ? "text-[var(--green)] border-[var(--green-border)] bg-[var(--green-soft)]"
                : "border-[var(--panel-border)] bg-transparent text-[var(--ink-muted)] hover:bg-[var(--panel-bg-hover)] hover:text-[var(--ink-primary)] hover:border-[var(--accent-blue-border)]"
            }`}
            onClick={() => handleCopy(cred.password, "pass")}
            title="Salin Password"
            aria-label="Salin Password"
          >
            {copiedField === "pass" ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Notes */}
      {cred.notes && (
        <div className="p-[8px_10px] rounded-[5px] bg-[var(--bg)] border border-[var(--panel-border)] text-[var(--ink-muted)] text-[11px] leading-[1.45] font-mono">
          <span className="text-[var(--orange)] font-bold">NOTE:</span> {cred.notes}
        </div>
      )}

      {/* Expiry Badge */}
      {expiryStatus && (
        <span className={`inline-flex items-center gap-[5px] self-start px-[8px] py-[3px] rounded-[4px] text-[10.5px] font-mono font-semibold ${expiryStatus.className}`}>
          <AlertTriangle size={11} aria-hidden="true" /> {expiryStatus.label}
        </span>
      )}
    </div>
  );
}

