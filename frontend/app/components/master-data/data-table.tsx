"use client";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

/**
 * The one table of Master Data. Header and rows are drawn from the same column list, so what a header says and where its cells sit can
 * never drift apart. Exactly one column has no width and takes what is left; every other column has a fixed width, so the same kind of
 * column (Status, Aksi, a count) is the same width on every tab. Low-priority columns drop out as the table gets narrower (container
 * queries, not viewport), and below 600 px the rows become cards.
 */
export interface Column<T> {
  key: string;
  label: string;
  /** Full Tailwind width class ("w-[132px]"); leave out for the single flexible column. */
  w?: string;
  align?: "right";
  /** An icon column: the header text lines up with the glyph of the last icon, not with the edge of its button. */
  glyph?: boolean;
  /** "lg": hidden under 1000 px of table width, "md": hidden under 760 px. The information stays in the drawer. */
  hide?: "md" | "lg";
  cell: (row: T) => ReactNode;
}

// every class is written out in full so Tailwind can see it
const HIDE = {
  md: { col: "hidden @[760px]:table-column", cell: "hidden @[760px]:table-cell" },
  lg: { col: "hidden @[1000px]:table-column", cell: "hidden @[1000px]:table-cell" },
} as const;
/** Same padding in header and cells; the first and last column get their own edge padding, the same on every tab. */
const CELL = "px-4 first:pl-5 last:pl-2 last:pr-5";
/** The header of an icon column: its text ends where the last icon's glyph ends (an icon button has about 9 px of air around the glyph). */
const CELL_GLYPH = "px-4 first:pl-5 last:pl-2 last:pr-[29px]";

/** Fixed widths shared by every tab. */
export const COL = { status: "w-[132px]", actions: "w-[136px] pointer-coarse:w-[172px]", count: "w-[120px]", usage: "w-[150px]", person: "w-[220px]", text: "w-[200px]", level: "w-[160px]" } as const;

interface Props<T> {
  label: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  rowId: (row: T) => string;
  highlighted?: string;
  onOpen: (row: T) => void;
  /** The row as a card, for narrow containers. */
  card: (row: T) => ReactNode;
  footer?: ReactNode;
}

export function DataTable<T>({ label, columns, rows, rowId, highlighted = "", onOpen, card, footer }: Props<T>) {
  const clicked = (event: MouseEvent<HTMLElement>, row: T) => {
    if ((event.target as HTMLElement).closest("button,a,input,select,textarea,[role=menu],[role=menuitem]")) return;
    onOpen(row);
  };
  const keyed = (event: KeyboardEvent<HTMLElement>, row: T) => {
    if (event.key === "Enter" && event.target === event.currentTarget) { event.preventDefault(); onOpen(row); }
  };
  return (
    <div className="@container rounded-2xl border border-[rgba(148,163,184,0.12)] bg-[#1e293b]">
      <div className="hidden @[600px]:block">
        <table className="w-full table-fixed border-collapse text-left" aria-label={label}>
          <colgroup>
            {columns.map(column => <col key={column.key} className={`${column.w ?? ""} ${column.hide ? HIDE[column.hide].col : ""}`} />)}
          </colgroup>
          <thead className="sticky top-[126px] z-10 bg-[#182234] text-[11px] uppercase tracking-[0.06em] text-slate-400">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  scope="col"
                  className={`h-10 border-b border-slate-700/70 font-semibold first:rounded-tl-2xl last:rounded-tr-2xl ${column.glyph ? CELL_GLYPH : CELL} ${column.align === "right" ? "text-right" : ""} ${column.hide ? HIDE[column.hide].cell : ""}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const id = rowId(row);
              return (
                <tr
                  key={id}
                  data-master-id={id}
                  tabIndex={0}
                  onClick={event => clicked(event, row)}
                  onKeyDown={event => keyed(event, row)}
                  className={`${highlighted === id ? "bg-sky-950/70" : "hover:bg-[#243044]/50 focus-within:bg-[#243044]/40"} group/row h-16 cursor-pointer border-t border-slate-700/60 transition-colors duration-150 motion-reduce:transition-none`}
                >
                  {columns.map(column => (
                    <td key={column.key} className={`${column.glyph ? "" : "overflow-hidden"} align-middle ${CELL} ${column.align === "right" ? "text-right" : ""} ${column.hide ? HIDE[column.hide].cell : ""}`}>
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-700/60 @[600px]:hidden">
        {rows.map(row => {
          const id = rowId(row);
          return <article key={id} data-master-id={id} className={`relative ${highlighted === id ? "bg-sky-950/60" : ""}`}>{card(row)}</article>;
        })}
      </div>
      {footer}
    </div>
  );
}

/** A number with its unit: "22 tiket", right aligned in a column of the same width on every tab. */
export function Count({ value, unit }: { value: number; unit: string }) {
  return <span className="font-dashboard-mono text-[13px] tabular-nums text-slate-100">{value} <span className="font-sans text-[12px] text-slate-400">{unit}</span></span>;
}

/** Two lines in a cell: the main text and a quieter line, both cut with an ellipsis so a row never grows. */
export function Stack({ title, sub, mono = false }: { title: ReactNode; sub?: ReactNode; mono?: boolean }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate text-[13px] font-medium leading-5 text-slate-100">{title}</span>
      {sub !== undefined && sub !== "" && <span className={`block truncate text-[12px] leading-4 text-slate-400 ${mono ? "font-dashboard-mono" : ""}`}>{sub}</span>}
    </span>
  );
}
