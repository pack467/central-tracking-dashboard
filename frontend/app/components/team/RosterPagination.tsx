"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { Select } from "@/app/components/ui/Select";
import { useUrlQuery } from "@/app/hooks/useUrlQuery";
import { rosterSchema } from "@/app/lib/query-state";
import { paths } from "@/app/lib/routes";
import type { RosterMember } from "@/app/lib/types";

/** Page slice of the roster driven by the `page` and `size` URL params, shared by the table and the weekly calendar. */
export function useRosterPage(members: RosterMember[]) {
  const url = useUrlQuery(rosterSchema, paths.teamRoster);
  const pageSize = url.values.size;
  const total = members.length;
  const size = pageSize === "all" ? Math.max(1, total) : pageSize;
  const pages = pageSize === "all" ? 1 : Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, url.values.page), pages);
  const start = (page - 1) * size;
  const items = useMemo(() => members.slice(start, start + size), [members, start, size]);
  return {
    items,
    page,
    pages,
    total,
    start,
    end: total === 0 ? 0 : start + items.length,
    pageSize,
    setPage: url.field("page", "push"),
    setPageSize: url.field("size", "replace"),
  };
}

function pageList(pages: number, page: number): (number | "gap")[] {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "gap")[] = [1];
  if (page > 3) out.push("gap");
  for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) out.push(i);
  if (page < pages - 2) out.push("gap");
  out.push(pages);
  return out;
}

const pagerButton =
  "inline-flex h-8 min-w-8 items-center justify-center rounded-[7px] border px-2 font-mono text-[11.5px] font-semibold transition-colors cursor-pointer select-none max-sm:h-10 max-sm:min-w-10 disabled:cursor-not-allowed disabled:opacity-35";

export function RosterPagination({ roster }: { roster: ReturnType<typeof useRosterPage> }) {
  const { page, pages, total, start, end, pageSize, setPage, setPageSize } = roster;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#334155] bg-[rgba(15,23,42,0.35)] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] text-[#94a3b8] max-sm:hidden">Baris</span>
          <Select
            className="w-[76px]"
            value={pageSize === "all" ? "all" : String(pageSize)}
            onChange={(event) => setPageSize(event.target.value === "all" ? "all" : Number(event.target.value))}
            aria-label="Jumlah baris per halaman"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="all">Semua</option>
          </Select>
        </div>
        <span className="whitespace-nowrap text-[11.5px] text-[#94a3b8]">
          <strong className="font-mono text-[#f8fafc]">{total === 0 ? 0 : start + 1}–{end}</strong> dari{" "}
          <strong className="font-mono text-[#f8fafc]">{total}</strong>
          <span className="max-sm:hidden"> anggota</span>
        </span>
      </div>

      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Halaman roster">
          <button
            type="button"
            className={`${pagerButton} border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:not-disabled:bg-[#243044]`}
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeft size={14} />
          </button>
          {pageList(pages, page).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} className="px-1 text-[12px] text-[#64748b]">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={`${pagerButton} ${
                  item === page ? "border-[#38bdf8]/50 bg-[#0c2a3d] text-[#38bdf8]" : "border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:bg-[#243044]"
                }`}
                onClick={() => setPage(item)}
                aria-label={`Halaman ${item}`}
                aria-current={item === page ? "page" : undefined}
              >
                {item}
              </button>
            )
          )}
          <button
            type="button"
            className={`${pagerButton} border-[#334155] bg-[#0f172a] text-[#cbd5e1] hover:not-disabled:bg-[#243044]`}
            onClick={() => setPage(page + 1)}
            disabled={page >= pages}
            aria-label="Halaman berikutnya"
          >
            <ChevronRight size={14} />
          </button>
        </nav>
      )}
    </div>
  );
}
