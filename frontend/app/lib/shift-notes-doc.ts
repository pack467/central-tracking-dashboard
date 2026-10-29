/**
 * The document model of a Memo note, and everything that converts it: plain text in and out, a strict validator for stored data,
 * the escaped HTML the editor is filled with, and a sanitising reader that turns editor or pasted DOM back into the model.
 * Nothing here ever hands raw HTML to the page: the editor is built from `docToHtml`, which escapes every character itself.
 */

export type Mark = "b" | "i" | "u" | "hl";
export interface Run { t: string; m?: Mark[] }
export type ListKind = "ul" | "ol" | "todo";
export type Block =
  | { k: "p" | "h"; r: Run[] }
  | { k: "li"; l: ListKind; d: 0 | 1; c?: boolean; r: Run[] };
/** v1: flat blocks; a list is a run of consecutive "li" blocks, depth 0 or 1. */
export interface NoteDoc { v: 1; blocks: Block[] }

export const MAX_BLOCKS = 500;
export const MAX_DOC_CHARS = 20000;
const MARKS: readonly Mark[] = ["b", "i", "u", "hl"];
/** The highlight colour the editor writes with execCommand("hiliteColor"); any amber background on pasted content maps to the same mark. */
export const HIGHLIGHT_CSS = "rgba(251, 191, 36, 0.3)";

export const emptyDoc = (): NoteDoc => ({ v: 1, blocks: [] });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const sameMarks = (a?: Mark[], b?: Mark[]) => (a?.join() ?? "") === (b?.join() ?? "");

function mergeRuns(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const run of runs) {
    if (!run.t) continue;
    const last = out[out.length - 1];
    if (last && sameMarks(last.m, run.m)) last.t += run.t; else out.push(run.m && run.m.length ? { t: run.t, m: [...run.m] } : { t: run.t });
  }
  return out;
}
const plain = (runs: Run[]) => runs.map(run => run.t).join("");
export const blockText = (block: Block) => plain(block.r);

/** Strict check of stored data: anything that is not a well formed v1 document is refused, never repaired silently. */
export function cleanDoc(value: unknown): NoteDoc | null {
  if (!isRecord(value) || value.v !== 1 || !Array.isArray(value.blocks)) return null;
  const blocks: Block[] = [];
  let chars = 0;
  for (const raw of value.blocks.slice(0, MAX_BLOCKS)) {
    if (!isRecord(raw) || !Array.isArray(raw.r)) return null;
    const runs: Run[] = [];
    for (const item of raw.r) {
      if (!isRecord(item) || typeof item.t !== "string") return null;
      let marks: Mark[] | undefined;
      if (item.m !== undefined) {
        if (!Array.isArray(item.m) || !item.m.every(mark => MARKS.includes(mark as Mark))) return null;
        marks = MARKS.filter(mark => (item.m as Mark[]).includes(mark));
      }
      const text = item.t.slice(0, Math.max(0, MAX_DOC_CHARS - chars));
      chars += text.length;
      runs.push(marks && marks.length ? { t: text, m: marks } : { t: text });
    }
    const r = mergeRuns(runs);
    if (raw.k === "p" || raw.k === "h") blocks.push({ k: raw.k, r });
    else if (raw.k === "li") {
      if (raw.l !== "ul" && raw.l !== "ol" && raw.l !== "todo") return null;
      if (raw.d !== 0 && raw.d !== 1) return null;
      const previous = blocks[blocks.length - 1];
      blocks.push({ k: "li", l: raw.l, d: raw.d === 1 && previous?.k === "li" ? 1 : 0, ...(raw.l === "todo" && raw.c === true ? { c: true } : {}), r });
    } else return null;
  }
  return { v: 1, blocks };
}

export const isEmptyDoc = (doc: NoteDoc) => doc.blocks.every(block => blockText(block).trim() === "");
export const docKey = (doc: NoteDoc) => JSON.stringify(doc);

/** "N butir": list items and non-empty lines, the same meaning the old memo counter had. */
export function countItems(doc: NoteDoc): number {
  return doc.blocks.filter(block => block.k === "li" || blockText(block).trim() !== "").length;
}

// ---------------------------------------------------------------- plain text

const BULLET = /^(\s*)(?:[•*\-–])\s+(.*)$/;
const NUMBER = /^(\s*)\d+[.)]\s+(.*)$/;
const CHECK = /^(\s*)(?:[•*\-–]\s*)?\[( |x|X)\]\s+(.*)$/;

/** Legacy memo text and pasted plain text: "• ", "- ", "1. " and "[ ] " lines become lists, every other line a paragraph. */
export function docFromText(text: string): NoteDoc {
  const blocks: Block[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    let match: RegExpMatchArray | null;
    const previous = blocks[blocks.length - 1];
    const depth = (indent: string): 0 | 1 => indent.length >= 2 && previous?.k === "li" ? 1 : 0;
    if ((match = line.match(CHECK))) blocks.push({ k: "li", l: "todo", d: depth(match[1]), ...(match[2] !== " " ? { c: true } : {}), r: mergeRuns([{ t: match[3] }]) });
    else if ((match = line.match(BULLET))) blocks.push({ k: "li", l: "ul", d: depth(match[1]), r: mergeRuns([{ t: match[2] }]) });
    else if ((match = line.match(NUMBER))) blocks.push({ k: "li", l: "ol", d: depth(match[1]), r: mergeRuns([{ t: match[2] }]) });
    else blocks.push({ k: "p", r: mergeRuns([{ t: line }]) });
  }
  while (blocks.length && blocks[blocks.length - 1].k === "p" && blockText(blocks[blocks.length - 1]) === "") blocks.pop();
  return cleanDoc({ v: 1, blocks }) ?? emptyDoc();
}

/** Tidy plain text for the clipboard: "•" points, "1." numbers, "[ ]"/"[x]" checks, two spaces per level. */
export function docToText(doc: NoteDoc): string {
  const last: (ListKind | null)[] = [null, null];
  const count = [0, 0];
  const lines: string[] = [];
  for (const block of doc.blocks) {
    if (block.k !== "li") { last[0] = last[1] = null; lines.push(blockText(block)); continue; }
    if (block.d === 0) { if (last[0] !== block.l) count[0] = 0; count[1] = 0; last[1] = null; } else if (last[1] !== block.l) count[1] = 0;
    last[block.d] = block.l;
    count[block.d]++;
    const marker = block.l === "ol" ? `${count[block.d]}.` : block.l === "todo" ? (block.c ? "[x]" : "[ ]") : "•";
    lines.push(`${"  ".repeat(block.d)}${marker} ${blockText(block)}`);
  }
  return lines.join("\n").replace(/\n+$/, "");
}

// ---------------------------------------------------------------- doc -> HTML (for the editor only)

const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function runsHtml(runs: Run[]): string {
  return runs.map(run => {
    let html = esc(run.t).replace(/\n/g, "<br>");
    const marks = run.m ?? [];
    if (marks.includes("hl")) html = `<span style="background-color: ${HIGHLIGHT_CSS}">${html}</span>`;
    if (marks.includes("u")) html = `<u>${html}</u>`;
    if (marks.includes("i")) html = `<i>${html}</i>`;
    if (marks.includes("b")) html = `<b>${html}</b>`;
    return html;
  }).join("");
}

type ListBlock = Extract<Block, { k: "li" }>;
interface ListItem { block: ListBlock; kids: ListBlock[] }

/** A list element for each run of items of the same kind: ul, ol or a ul marked data-todo. */
function listsHtml<T>(items: T[], kindOf: (item: T) => ListKind, itemHtml: (item: T) => string): string {
  let html = "";
  for (let i = 0; i < items.length;) {
    const kind = kindOf(items[i]);
    let j = i;
    while (j < items.length && kindOf(items[j]) === kind) j++;
    const tag = kind === "ol" ? "ol" : "ul";
    html += `<${tag}${kind === "todo" ? " data-todo" : ""}>${items.slice(i, j).map(itemHtml).join("")}</${tag}>`;
    i = j;
  }
  return html;
}
const liHtml = (block: ListBlock, inner = "") => `<li${block.c ? " data-checked" : ""}>${runsHtml(block.r) || "<br>"}${inner}</li>`;

/** Escaped, allow-listed markup: div (a paragraph; a <p> would not hold a list in the editor), h3, ul/ol (a todo list is a ul with data-todo), li, b, i, u, br and one highlight span. */
export function docToHtml(doc: NoteDoc): string {
  let html = "";
  const blocks = doc.blocks;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.k !== "li") { html += block.k === "h" ? `<h3>${runsHtml(block.r) || "<br>"}</h3>` : `<div>${runsHtml(block.r) || "<br>"}</div>`; continue; }
    const items: ListItem[] = [];
    for (; i < blocks.length; i++) {
      const item = blocks[i];
      if (item.k !== "li") break;
      if (item.d === 0 || !items.length) items.push({ block: item, kids: [] }); else items[items.length - 1].kids.push(item);
    }
    i--;
    html += listsHtml(items, item => item.block.l, item => liHtml(item.block, item.kids.length ? listsHtml(item.kids, kid => kid.l, kid => liHtml(kid)) : ""));
  }
  return html;
}

/** A pasted single line goes into the sentence being typed; anything longer is pasted as blocks. */
export function docToInlineHtml(doc: NoteDoc): string | null {
  return doc.blocks.length === 1 && doc.blocks[0].k === "p" ? runsHtml(doc.blocks[0].r) : null;
}

export interface ListEntry { block: ListBlock; index: number; kids: { block: ListBlock; index: number }[] }
export type Segment = { t: "block"; block: Block; index: number } | { t: "list"; entries: ListEntry[] };
/** The document as plain blocks and whole lists (items with their nested items), for rendering. `index` is the position in doc.blocks. */
export function segments(doc: NoteDoc): Segment[] {
  const out: Segment[] = [];
  doc.blocks.forEach((block, index) => {
    if (block.k !== "li") { out.push({ t: "block", block, index }); return; }
    let last = out[out.length - 1];
    if (!last || last.t !== "list") { last = { t: "list", entries: [] }; out.push(last); }
    if (block.d === 0 || !last.entries.length) last.entries.push({ block, index, kids: [] });
    else last.entries[last.entries.length - 1].kids.push({ block, index });
  });
  return out;
}

// ---------------------------------------------------------------- DOM -> doc (sanitising reader)

const SKIP = new Set(["SCRIPT", "STYLE", "HEAD", "TITLE", "META", "LINK", "NOSCRIPT", "IFRAME", "OBJECT", "EMBED", "SVG", "TEMPLATE", "CANVAS", "VIDEO", "AUDIO", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "FORM"]);
const BLOCKS = new Set(["P", "DIV", "BLOCKQUOTE", "PRE", "SECTION", "ARTICLE", "HEADER", "FOOTER", "TABLE", "TBODY", "THEAD", "TR", "TD", "TH", "DL", "DT", "DD", "FIGURE", "LI", "ADDRESS", "MAIN", "NAV", "ASIDE"]);
const HEADINGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6"]);

interface Ctx { out: Block[]; inline: Run[]; collapse: boolean }

function marksOf(element: Element): Mark[] {
  const tag = element.tagName.toUpperCase();
  const found: Mark[] = [];
  if (tag === "B" || tag === "STRONG") found.push("b");
  if (tag === "I" || tag === "EM") found.push("i");
  if (tag === "U") found.push("u");
  const style = (element.getAttribute("style") || "").toLowerCase();
  if (/font-weight\s*:\s*(bold|[6-9]00)/.test(style)) found.push("b");
  if (/font-style\s*:\s*italic/.test(style)) found.push("i");
  if (/text-decoration[^;]*underline/.test(style)) found.push("u");
  if (tag === "MARK" || /background(?:-color)?\s*:\s*rgba?\(\s*(?:25[01]|24\d)\s*,\s*(?:1[6-9]\d|20\d)\s*,\s*(?:\d{1,2})\b/.test(style) || /background(?:-color)?\s*:\s*#(?:fbbf24|fcd34d|facc15|ffeb3b|fde047)\b/.test(style)) found.push("hl");
  return found;
}

function addText(ctx: Ctx, text: string, marks: Mark[]) {
  let value = text.replace(/\u00a0/g, " ").replace(/[\u200b\ufeff]/g, "");
  if (ctx.collapse) value = value.replace(/\s+/g, " ");
  if (!value) return;
  const unique = MARKS.filter(mark => marks.includes(mark));
  ctx.inline.push(unique.length ? { t: value, m: unique } : { t: value });
}

function flush(ctx: Ctx, kind: "p" | "h" | "li" = "p", extra?: { l: ListKind; d: 0 | 1; c: boolean }) {
  // nothing was read since the last block: there is no block to close (a list item is the exception, it may be empty)
  if (kind !== "li" && ctx.inline.length === 0) return;
  let runs = mergeRuns(ctx.inline);
  ctx.inline = [];
  if (runs.length && runs[runs.length - 1].t.endsWith("\n")) { const last = runs[runs.length - 1]; runs = mergeRuns([...runs.slice(0, -1), { t: last.t.replace(/\n+$/, ""), m: last.m }]); }
  if (ctx.collapse && runs.length) {
    runs = mergeRuns(runs.map((run, i) => ({ t: i === 0 ? run.t.replace(/^\s+/, "") : run.t, m: run.m })));
    const tail = runs[runs.length - 1];
    if (tail) runs = mergeRuns([...runs.slice(0, -1), { t: tail.t.replace(/\s+$/, ""), m: tail.m }]);
  }
  if (kind === "li" && extra) { ctx.out.push({ k: "li", l: extra.l, d: extra.d, ...(extra.l === "todo" && extra.c ? { c: true } : {}), r: runs }); return; }
  // pasted markup drops empty blocks; the editor keeps them as blank lines
  if (!runs.length && ctx.collapse) return;
  ctx.out.push({ k: kind === "h" ? "h" : "p", r: runs });
}

function walk(parent: Node, marks: Mark[], ctx: Ctx, depth: number, parentKind?: ListKind) {
  parent.childNodes.forEach(child => {
    if (child.nodeType === 3) { addText(ctx, child.textContent || "", marks); return; }
    if (child.nodeType !== 1) return;
    const element = child as Element, tag = element.tagName.toUpperCase();
    if (SKIP.has(tag)) return;
    if (tag === "BR") { addText({ ...ctx, collapse: false, inline: ctx.inline }, "\n", marks); return; }
    if (tag === "UL" || tag === "OL") { flush(ctx); readList(element, ctx, depth, parentKind); return; }
    const own = [...marks, ...marksOf(element)];
    if (HEADINGS.has(tag)) { flush(ctx); walk(element, [], ctx, depth); flush(ctx, "h"); return; }
    if (BLOCKS.has(tag)) { flush(ctx); walk(element, own, ctx, depth, parentKind); flush(ctx); return; }
    walk(element, own, ctx, depth, parentKind);
  });
}

function readList(list: Element, ctx: Ctx, depth: number, parentKind?: ListKind) {
  const tag = list.tagName.toUpperCase();
  const kind: ListKind = tag === "OL" ? "ol" : list.hasAttribute("data-todo") || (parentKind === "todo" && depth > 0) ? "todo" : "ul";
  const d: 0 | 1 = depth > 0 ? 1 : 0;
  list.childNodes.forEach(node => {
    // browsers sometimes put a nested list straight inside its parent list; it belongs to the item before it
    if (node.nodeType === 1 && /^(UL|OL)$/i.test((node as Element).tagName)) { readList(node as Element, ctx, depth + 1, kind); return; }
    if (node.nodeType !== 1 || (node as Element).tagName.toUpperCase() !== "LI") return;
    const li = node as Element;
    const nested: Element[] = [];
    const checked = li.hasAttribute("data-checked") || !!li.querySelector('input[type="checkbox"]:checked');
    ctx.inline = [];
    li.childNodes.forEach(c => {
      if (c.nodeType === 1 && /^(UL|OL)$/i.test((c as Element).tagName)) { nested.push(c as Element); return; }
      if (c.nodeType === 3) { addText(ctx, c.textContent || "", []); return; }
      if (c.nodeType !== 1) return;
      const element = c as Element, name = element.tagName.toUpperCase();
      if (SKIP.has(name)) return;
      if (name === "BR") { addText({ ...ctx, collapse: false, inline: ctx.inline }, "\n", []); return; }
      const holder: Ctx = { out: [], inline: ctx.inline, collapse: ctx.collapse };
      walk({ childNodes: [element] } as unknown as Node, [], holder, depth, kind);
      ctx.inline = holder.inline;
      // a block inside an item (a pasted <li><p>…) is folded into the item's own text
      for (const block of holder.out) ctx.inline.push(...block.r, { t: " " });
    });
    flush(ctx, "li", { l: kind, d, c: checked });
    nested.forEach(inner => readList(inner, ctx, depth + 1, kind));
  });
}

/**
 * Blank lines the browser leaves behind carry no content: none at the top or the end, one at most in a row, and none right next to a
 * list or a heading (those space themselves). A deliberate blank line between two paragraphs stays.
 */
function tidy(blocks: Block[]): Block[] {
  const blank = (block?: Block) => !!block && block.k === "p" && block.r.length === 0;
  const out: Block[] = [];
  blocks.forEach((block, i) => {
    if (blank(block)) {
      const previous = out[out.length - 1], next = blocks[i + 1];
      if (!previous || blank(previous) || previous.k !== "p" || (next && next.k !== "p")) return;
    }
    out.push(block);
  });
  while (blank(out[out.length - 1])) out.pop();
  return out;
}

function finish(ctx: Ctx): NoteDoc {
  flush(ctx);
  return cleanDoc({ v: 1, blocks: tidy(ctx.out) }) ?? emptyDoc();
}

/** Reads the editor's live DOM back into the model. Only what the model can express survives. */
export function readDom(root: Node): NoteDoc {
  const ctx: Ctx = { out: [], inline: [], collapse: false };
  walk(root, [], ctx, 0);
  return finish(ctx);
}

/** Pasted HTML is parsed into an inert document and read with the same rules; scripts, handlers and styles never reach the page. */
export function htmlToDoc(html: string): NoteDoc {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const ctx: Ctx = { out: [], inline: [], collapse: true };
  walk(parsed.body, [], ctx, 0);
  return finish(ctx);
}
