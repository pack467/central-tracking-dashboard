"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { segments, type ListEntry, type ListKind, type NoteDoc, type Run } from "@/app/lib/shift-notes-doc";

function Runs({ runs }: { runs: Run[] }) {
  return (
    <>
      {runs.map((run, i) => {
        const marks = run.m ?? [];
        let node: ReactNode = run.t;
        if (marks.includes("hl")) node = <mark className="rounded-sm bg-amber-400/30 px-0.5 text-amber-100">{node}</mark>;
        if (marks.includes("u")) node = <u className="underline underline-offset-2">{node}</u>;
        if (marks.includes("i")) node = <em>{node}</em>;
        if (marks.includes("b")) node = <strong className="font-bold text-slate-50">{node}</strong>;
        return <span key={i}>{node}</span>;
      })}
    </>
  );
}

interface Props {
  doc: NoteDoc;
  /** When given, checklist boxes are buttons; the caller saves straight away. */
  onToggleTodo?: (blockIndex: number) => void;
  className?: string;
}

function Item({ entry, kind, onToggleTodo }: { entry: ListEntry | { block: ListEntry["block"]; index: number; kids: [] }; kind: ListKind; onToggleTodo?: Props["onToggleTodo"] }) {
  const { block, index, kids } = entry;
  const checked = block.c === true;
  const text = block.r.length ? <Runs runs={block.r} /> : <span className="text-slate-500">(kosong)</span>;
  return (
    <li className={kind === "ol" ? "pl-1" : "relative pl-5"}>
      {kind === "ul" && <span aria-hidden="true" className="absolute top-[0.62em] left-1 size-1.5 rounded-full bg-amber-400" />}
      {kind === "todo" && (onToggleTodo
        ? (
          <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            aria-label={`Tandai selesai: ${block.r.map(run => run.t).join("").slice(0, 60) || "butir kosong"}`}
            onClick={() => onToggleTodo(index)}
            className={`absolute top-[0.35em] left-0 grid size-4 place-items-center rounded border text-slate-950 before:absolute before:-inset-3 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 ${checked ? "border-amber-400 bg-amber-400" : "border-slate-500 bg-transparent hover:border-amber-300"}`}
          >
            {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
          </button>
        )
        : (
          <span role="img" aria-label={checked ? "Selesai" : "Belum selesai"} className={`absolute top-[0.35em] left-0 grid size-4 place-items-center rounded border text-slate-950 ${checked ? "border-amber-400 bg-amber-400" : "border-slate-500"}`}>
            {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
          </span>
        ))}
      <span data-memo-copy className={kind === "todo" && checked ? "text-slate-400 line-through decoration-slate-500" : undefined}>{text}</span>
      {kids.length > 0 && <Lists entries={kids.map(kid => ({ block: kid.block, index: kid.index, kids: [] as [] }))} onToggleTodo={onToggleTodo} nested />}
    </li>
  );
}

/** One <ul>/<ol> for each run of items of the same kind. */
function Lists({ entries, onToggleTodo, nested = false }: { entries: ListEntry[] | { block: ListEntry["block"]; index: number; kids: [] }[]; onToggleTodo?: Props["onToggleTodo"]; nested?: boolean }) {
  const groups: { kind: ListKind; items: typeof entries }[] = [];
  for (const entry of entries) {
    const kind = entry.block.l, last = groups[groups.length - 1];
    if (last && last.kind === kind) last.items.push(entry as never); else groups.push({ kind, items: [entry] as never });
  }
  return (
    <>
      {groups.map((group, g) => {
        const Tag = group.kind === "ol" ? "ol" : "ul";
        return (
          <Tag key={g} className={`m-0 space-y-1.5 p-0 ${nested ? "mt-1.5 ml-3" : ""} ${group.kind === "ol" ? "list-decimal pl-5 marker:font-mono marker:text-amber-300" : "list-none"}`}>
            {group.items.map(entry => <Item key={entry.index} entry={entry} kind={group.kind} onToggleTodo={onToggleTodo} />)}
          </Tag>
        );
      })}
    </>
  );
}

/** A note as formatted text. Built from the model with React elements only; stored text is never treated as markup. */
export function NoteView({ doc, onToggleTodo, className = "" }: Props) {
  return (
    <div className={`space-y-2 whitespace-pre-wrap [overflow-wrap:anywhere] ${className}`}>
      {segments(doc).map((segment, i) => {
        if (segment.t === "list") return <Lists key={i} entries={segment.entries} onToggleTodo={onToggleTodo} />;
        const { block } = segment;
        if (block.k === "h") return <h3 key={i} className="m-0 text-[1.08em] font-bold text-slate-50"><Runs runs={block.r} /></h3>;
        return block.r.length ? <p key={i} className="m-0"><Runs runs={block.r} /></p> : <div key={i} aria-hidden="true" className="h-2" />;
      })}
    </div>
  );
}
