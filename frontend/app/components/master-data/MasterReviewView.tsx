"use client";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, ChevronLeft, ChevronRight, ListFilter, Search, X } from "lucide-react";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { Select } from "@/app/components/ui/Select";
import type { MasterRole } from "@/app/lib/permissions";
import { REFERENCE_STATUS_LABELS, REVIEW_TYPE_LABELS, SOURCE_LABELS, type ReviewResult } from "@/app/lib/master-review";
import type { MasterRoute } from "@/app/lib/master-data-route";
import type { LegacyReference, MasterEntity, MasterSnapshotV2, ReviewFinding } from "@/app/types/master-data";
import { MasterBadge, buttonClass, inputClass } from "./master-ui";
import { MasterMappingWorkspace } from "./MasterMappingWorkspace";

interface Props {
  route: MasterRoute;
  catalog: MasterSnapshotV2;
  role: MasterRole;
  review: ReviewResult;
  onClose: () => void;
  onOpenReference: (id: string) => void;
  onCloseReference: () => void;
  onOpenRecord: (entity: MasterEntity, id: string) => void;
  onReviewType: (type: MasterRoute["reviewType"]) => void;
}
const RECORD_LABELS: Record<string, string> = { organization: "Organisasi", project: "Proyek", system: "Sistem", reference: "Referensi" };
const ENTITY_OPTIONS = [{ value: "all", label: "Semua jenis" }, ...Object.entries(RECORD_LABELS).map(([value, label]) => ({ value, label }))];

function ReferenceList({ references, catalog, activeId, onSelect }: { references: LegacyReference[]; catalog: MasterSnapshotV2; activeId?: string; onSelect: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [organizationId, setOrganizationId] = useState("all");
  const filtered = useMemo(
    () => references.filter(reference => (source === "all" || reference.sourceType === source) &&
      (status === "all" || reference.status === status) &&
      (organizationId === "all" || reference.organizationId === organizationId) &&
      (!q.trim() || `${reference.rawValue} ${reference.organizationId || ""}`.toLowerCase().includes(q.trim().toLowerCase()))),
    [references, source, status, organizationId, q]
  );
  return (
    <div className="min-w-0 space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={q}
          onChange={event => setQ(event.target.value)}
          placeholder="Cari nilai lama…"
          aria-label="Cari referensi lama"
          className={`${inputClass} pl-9`}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select
          aria-label="Jenis sumber"
          className="w-full"
          value={source}
          options={[
            { value: "all", label: "Semua sumber" },
            { value: "ticket", label: "Tiket" },
            { value: "checkpoint", label: "Checkpoint" },
            { value: "handover", label: "Handover" }
          ]}
          onValueChange={setSource}
        />
        <Select
          aria-label="Status referensi"
          className="w-full"
          value={status}
          options={[{ value: "all", label: "Semua status" }, ...Object.entries(REFERENCE_STATUS_LABELS).map(([value, label]) => ({ value, label }))]}
          onValueChange={setStatus}
        />
        <Select
          aria-label="Organisasi referensi"
          className="w-full"
          value={organizationId}
          options={[{ value: "all", label: "Semua organisasi" }, ...catalog.organizations.map(org => ({ value: org.id, label: org.shortName || org.name }))]}
          onValueChange={setOrganizationId}
        />
      </div>
      <div
        className="max-h-[560px] space-y-1 overflow-y-auto overscroll-contain pr-1 lg:max-h-[calc(100dvh-280px)]"
        aria-label="Daftar referensi lama"
      >
        {!filtered.length && <p className="py-6 text-center text-sm text-slate-400">Tidak ada referensi yang cocok.</p>}
        {filtered.map(reference => (
          <button
            key={reference.id}
            type="button"
            onClick={() => onSelect(reference.id)}
            className={reference.id === activeId
              ? "block min-h-11 w-full rounded-lg border border-sky-600 bg-sky-950 px-3 py-2 text-left"
              : "block min-h-11 w-full rounded-lg border border-transparent px-3 py-2 text-left hover:border-slate-600 hover:bg-slate-800"}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="min-w-0 flex-1 truncate font-dashboard-mono text-xs text-slate-100">{reference.rawValue}</span>
              <MasterBadge value={reference.status} />
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span>{SOURCE_LABELS[reference.sourceType]}</span>
              <span>·</span>
              <span>{reference.count} record</span>
              <span>·</span>
              <span className="truncate">
                {reference.organizationId
                  ? catalog.organizations.find(org => org.id === reference.organizationId)?.shortName || reference.organizationId
                  : "Tanpa organisasi"}
              </span>
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">{filtered.length} referensi · {references.length} total</p>
    </div>
  );
}

function FindingCard({ finding, catalog, onOpen }: { finding: ReviewFinding; catalog: MasterSnapshotV2; onOpen: () => void }) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{RECORD_LABELS[finding.entityType] || finding.entityType} · {finding.recordName}</p>
          <p className="mt-1 text-sm font-semibold text-slate-50">{finding.summary}</p>
        </div>
        <MasterBadge value={finding.severity} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
        <span>{REVIEW_TYPE_LABELS[finding.type]}</span>
        <span>·</span>
        <span>{finding.referenceCount} referensi</span>
        {finding.organizationId && (
          <><span>·</span><span>{catalog.organizations.find(org => org.id === finding.organizationId)?.shortName || finding.organizationId}</span></>
        )}
      </div>
      <button type="button" onClick={onOpen} className={`${buttonClass} mt-3 w-full`}>
        {finding.action === "mapping" ? "Tinjau referensi" : "Buka detail"}
      </button>
    </article>
  );
}

export function MasterReviewView(props: Props) {
  const { route, catalog, role, review, onClose, onOpenReference, onCloseReference, onOpenRecord, onReviewType } = props;
  const [entityType, setEntityType] = useState("all");
  const [organizationId, setOrganizationId] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 25 | 50>(10);
  const [sheet, setSheet] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState("");
  const reference = route.referenceId ? review.references.find(item => item.id === route.referenceId) : undefined;
  const selectedType = route.reviewType;
  const findings = useMemo(
    () => review.findings.filter(finding => (selectedType === "all" || finding.type === selectedType) &&
      (entityType === "all" || finding.entityType === entityType) &&
      (organizationId === "all" || finding.organizationId === organizationId) &&
      (!referenceQuery.trim() || `${finding.recordName} ${finding.summary}`.toLowerCase().includes(referenceQuery.trim().toLowerCase()))),
    [review.findings, selectedType, entityType, organizationId, referenceQuery]
  );
  const totalPages = Math.max(1, Math.ceil(findings.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = findings.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters = (selectedType !== "all" ? 1 : 0) + (entityType !== "all" ? 1 : 0) + (organizationId !== "all" ? 1 : 0);
  const resetPage = () => setPage(1);
  const openFinding = (finding: ReviewFinding) => finding.action === "mapping" && finding.referenceId
    ? onOpenReference(finding.referenceId)
    : onOpenRecord(finding.entityType as MasterEntity, finding.entityId);
  const filters = <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
    <div>
      <label htmlFor="review-type" className="mb-1.5 block text-xs text-slate-300">Jenis temuan</label>
      <Select
        id="review-type"
        className="w-full"
        value={selectedType}
        options={[{ value: "all", label: "Semua temuan" }, ...Object.entries(REVIEW_TYPE_LABELS).map(([value, label]) => ({ value, label }))]}
        onValueChange={value => { onReviewType(value as MasterRoute["reviewType"]); resetPage(); }}
      />
    </div>
    <div>
      <label htmlFor="review-entity" className="mb-1.5 block text-xs text-slate-300">Jenis record</label>
      <Select
        id="review-entity"
        className="w-full"
        value={entityType}
        options={ENTITY_OPTIONS}
        onValueChange={value => { setEntityType(value); resetPage(); }}
      />
    </div>
    <div>
      <label htmlFor="review-org" className="mb-1.5 block text-xs text-slate-300">Organisasi</label>
      <Select
        id="review-org"
        className="w-full"
        value={organizationId}
        options={[{ value: "all", label: "Semua organisasi" }, ...catalog.organizations.map(org => ({ value: org.id, label: org.shortName || org.name }))]}
        onValueChange={value => { setOrganizationId(value); resetPage(); }}
      />
    </div>
  </div>;
  if (reference)
    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 rounded-xl border border-slate-700 bg-slate-900/40 p-3 lg:block">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">Referensi lama</h2>
            <button type="button" className="min-h-11 rounded-lg px-2 text-xs text-sky-300 hover:bg-slate-800 lg:min-h-8" onClick={onCloseReference}>Tutup</button>
          </div>
          <ReferenceList references={review.references} catalog={catalog} activeId={reference.id} onSelect={onOpenReference} />
        </aside>
        <MasterMappingWorkspace
          key={reference.id}
          reference={reference}
          catalog={catalog}
          role={role}
          onClose={onCloseReference}
          onSaved={() => { /* repository revision refreshes the workspace */ }}
        />
      </div>
    );
  if (showReferences)
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <button
              type="button"
              onClick={() => setShowReferences(false)}
              className="mb-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-sky-300 lg:min-h-8"
            ><ChevronLeft size={15} />Kembali ke temuan</button>
            <h2 className="text-lg font-bold text-slate-50">Referensi lama</h2>
            <p className="mt-1 text-xs text-slate-400">Pilih referensi untuk membaca contoh dan memutuskan pemetaan.</p>
          </div>
          <button type="button" className={buttonClass} onClick={() => setShowReferences(false)}>Tutup</button>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
          <ReferenceList references={review.references} catalog={catalog} onSelect={onOpenReference} />
        </div>
      </div>
    );
  return (
    <section aria-label="Perlu ditinjau" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="mb-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-sky-300 hover:text-sky-200 lg:min-h-8"
          ><ChevronLeft size={15} />Kembali ke daftar</button>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold text-slate-50"><AlertTriangle size={19} className="text-amber-300" />Perlu ditinjau<span className="rounded-md border border-amber-700 bg-amber-950 px-2 py-0.5 font-dashboard-mono text-sm text-amber-200">{review.findings.length}</span></h2>
          <p className="mt-1 text-xs text-slate-400">Dihitung dari seluruh dataset. PIC kosong bersifat informatif dan boleh dibiarkan.</p>
        </div>
        <button type="button" className={buttonClass} onClick={() => { setShowReferences(true); }}>Referensi lama ({review.references.length})</button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={referenceQuery}
            onChange={event => { setReferenceQuery(event.target.value); resetPage(); }}
            placeholder="Cari record atau temuan…"
            aria-label="Cari temuan"
            className={`${inputClass} pl-9`}
          />
        </div>
        <button type="button" className={`${buttonClass} lg:hidden`} onClick={() => setSheet(true)} aria-haspopup="dialog"><ListFilter size={16} />Filter{activeFilters ? ` (${activeFilters})` : ""}</button>
      </div>
      <div className="hidden lg:block">{filters}</div>
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedType !== "all" && (
            <button
              type="button"
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 text-xs text-slate-200 lg:min-h-8"
              onClick={() => onReviewType("all")}
            >
              <span>{REVIEW_TYPE_LABELS[selectedType]}</span>
              <X size={13} />
            </button>
          )}
          {entityType !== "all" && (
            <button
              type="button"
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 text-xs text-slate-200 lg:min-h-8"
              onClick={() => { setEntityType("all"); resetPage(); }}
            >
              <span>{RECORD_LABELS[entityType]}</span>
              <X size={13} />
            </button>
          )}
          {organizationId !== "all" && (
            <button
              type="button"
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 text-xs text-slate-200 lg:min-h-8"
              onClick={() => { setOrganizationId("all"); resetPage(); }}
            >
              <span className="truncate">{catalog.organizations.find(org => org.id === organizationId)?.shortName || "Organisasi"}</span>
              <X size={13} />
            </button>
          )}
        </div>
      )}
      <BottomSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filter temuan"
        dataSheetId="master-review-filters"
        footer={<button type="button" className={`${buttonClass} w-full`} onClick={() => setSheet(false)}>Tampilkan hasil</button>}
      >
        {filters}
      </BottomSheet>
      <div className="hidden rounded-xl border border-slate-700 bg-slate-800/50 lg:block">
        <table className="w-full table-fixed border-collapse text-left" aria-label="Daftar temuan kelengkapan">
          <thead className="bg-slate-900 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="w-[16%] px-4 py-3 font-semibold">Jenis</th>
              <th className="w-[26%] px-3 py-3 font-semibold">Record</th>
              <th className="w-[30%] px-3 py-3 font-semibold">Temuan</th>
              <th className="w-[10%] px-3 py-3 font-semibold">Pemakaian</th>
              <th className="w-[18%] px-3 py-3 text-right font-semibold">Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(finding => (
              <tr key={finding.id} className="border-t border-slate-700">
                <td className="px-4 py-2">
                  <span className="block text-[11px] text-slate-300">{RECORD_LABELS[finding.entityType] || finding.entityType}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{REVIEW_TYPE_LABELS[finding.type]}</span>
                </td>
                <td className="px-3 py-2">
                  <span className="block truncate text-sm font-semibold text-slate-50" title={finding.recordName}>{finding.recordName}</span>
                  {finding.organizationId && (
                    <span className="block truncate text-[11px] text-slate-400">
                      {catalog.organizations.find(org => org.id === finding.organizationId)?.shortName || finding.organizationId}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-start gap-2">
                    <MasterBadge value={finding.severity} />
                    <span className="min-w-0 text-xs text-slate-300">{finding.summary}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs tabular-nums text-slate-300">{finding.referenceCount}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => openFinding(finding)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-sky-300 hover:bg-slate-700"
                  >
                    {finding.action === "mapping" ? "Tinjau" : "Buka"}
                    <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-8 text-center text-sm text-slate-400">Tidak ada temuan untuk filter ini.</p>}
      </div>
      <div className="space-y-2 lg:hidden">
        {rows.map(finding => <FindingCard key={finding.id} finding={finding} catalog={catalog} onOpen={() => openFinding(finding)} />)}
        {!rows.length && <p className="py-8 text-center text-sm text-slate-400">Tidak ada temuan untuk filter ini.</p>}
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <p>{findings.length} temuan · Halaman {currentPage}/{totalPages}</p>
        <div className="flex items-center gap-2">
          <label htmlFor="review-page-size" className="sr-only">Jumlah per halaman</label>
          <Select
            id="review-page-size"
            className="w-20"
            value={pageSize}
            options={[10, 25, 50].map(size => ({ value: size, label: String(size) }))}
            onValueChange={value => { setPageSize(Number(value) as 10 | 25 | 50); resetPage(); }}
          />
          <button
            type="button"
            className={buttonClass}
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </footer>
      <p className="text-[11px] text-slate-400">Keputusan pemetaan hanya mengubah hitungan dan detail di Master Data; halaman operasional tidak berubah.</p>
    </section>
  );
}


