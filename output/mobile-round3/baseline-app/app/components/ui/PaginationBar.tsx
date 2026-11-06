"use client";

import React from "react";

export interface PaginationBarProps {
  pageSize: number;
  onPageSizeChange: (newPageSize: number) => void;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  totalCount: number;
  startIdx: number;
  endIdx: number;
  totalPages: number;
  pageNumbers: (number | "...")[];
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
  selectAriaLabel?: string;
}

export function PaginationBar({
  pageSize,
  onPageSizeChange,
  currentPage,
  onPageChange,
  totalCount,
  startIdx,
  endIdx,
  totalPages,
  pageNumbers,
  pageSizeOptions = [10, 30, 50, 100],
  itemLabel = "entri",
  className = "",
  selectAriaLabel = "Jumlah entri per halaman",
}: PaginationBarProps) {
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  return (
    <div
      className={`flex items-center justify-between gap-[16px] p-[12px_18px] border-t border-[var(--line)] bg-[var(--panel-bg)] flex-wrap ${className}`.trim()}
    >
      <div className="flex items-center gap-[16px] flex-wrap">
        <div className="flex items-center gap-[8px]">
          <span className="text-[11.5px] text-[var(--ink-muted)] font-medium whitespace-nowrap">
            Rows per page:
          </span>
          <select
            className="h-[30px] px-[8px] text-[11.5px] rounded-[6px] bg-[var(--input-bg,#0f172a)] [color-scheme:dark] border border-[var(--panel-border)] text-[var(--ink-primary)] font-medium cursor-pointer transition-colors duration-150 hover:border-[rgba(148,163,184,0.35)] focus:border-[var(--accent-blue)] focus:outline-none"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label={selectAriaLabel}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-[#0f172a] text-[#f8fafc]">
                {opt}
              </option>
            ))}
          </select>
        </div>

        <span className="text-[11.5px] text-[var(--ink-muted)] font-sans whitespace-nowrap [&_strong]:text-[var(--ink-primary)] [&_strong]:font-mono">
          Menampilkan <strong>{totalCount === 0 ? 0 : startIdx + 1}–{endIdx}</strong> dari{" "}
          <strong>{totalCount}</strong> {itemLabel}
        </span>
      </div>

      <div className="flex items-center gap-[5px]">
        <button
          type="button"
          className="inline-flex items-center justify-center p-[4px_10px] rounded-[6px] text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] cursor-pointer select-none transition-all duration-150 hover:not(:disabled):bg-[rgba(56,189,248,0.12)] hover:not(:disabled):border-[rgba(56,189,248,0.35)] hover:not(:disabled):text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[var(--ink-muted)]"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage <= 1}
          aria-label="Halaman sebelumnya"
        >
          Prev
        </button>

        <div className="flex items-center gap-[3px]">
          {pageNumbers.map((p, idx) =>
            p === "..." ? (
              <span key={`ellipsis-${idx}`} className="px-[4px] text-[var(--ink-muted)] text-[12px]">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`inline-flex items-center justify-center min-w-[26px] h-[26px] p-0 rounded-[6px] text-[11px] font-mono cursor-pointer select-none transition-all duration-150 ${
                  p === safeCurrentPage
                    ? "bg-[rgba(56,189,248,0.18)] border border-[rgba(56,189,248,0.5)] text-[#38bdf8] font-bold"
                    : "bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] font-semibold hover:bg-[rgba(56,189,248,0.12)] hover:border-[rgba(56,189,248,0.35)] hover:text-[#38bdf8]"
                }`}
                onClick={() => onPageChange(Number(p))}
                aria-label={`Halaman ${p}`}
                aria-current={p === safeCurrentPage ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center p-[4px_10px] rounded-[6px] text-[11px] font-semibold font-mono bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.15)] text-[var(--ink-secondary)] cursor-pointer select-none transition-all duration-150 hover:not(:disabled):bg-[rgba(56,189,248,0.12)] hover:not(:disabled):border-[rgba(56,189,248,0.35)] hover:not(:disabled):text-[#38bdf8] disabled:opacity-35 disabled:cursor-not-allowed disabled:bg-[rgba(148,163,184,0.03)] disabled:border-[rgba(148,163,184,0.08)] disabled:text-[var(--ink-muted)]"
          onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage >= totalPages || totalPages <= 1}
          aria-label="Halaman berikutnya"
        >
          Next
        </button>
      </div>
    </div>
  );
}
