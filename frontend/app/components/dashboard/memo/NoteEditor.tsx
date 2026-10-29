"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from "react";
import { HIGHLIGHT_CSS, docFromText, docToHtml, docToInlineHtml, emptyDoc, htmlToDoc, isEmptyDoc, readDom, type NoteDoc } from "@/app/lib/shift-notes-doc";

export type EditorCommand = "bold" | "italic" | "underline" | "heading" | "ul" | "ol" | "todo" | "highlight" | "clear" | "undo" | "redo";
export interface Formats { bold: boolean; italic: boolean; underline: boolean; heading: boolean; ul: boolean; ol: boolean; todo: boolean; highlight: boolean }
export const NO_FORMATS: Formats = { bold: false, italic: false, underline: false, heading: false, ul: false, ol: false, todo: false, highlight: false };
export interface NoteEditorHandle { run: (command: EditorCommand) => void; focus: () => void }

interface Props {
  /** Loaded once; to show a different note, mount the editor again with a new key. */
  initial: NoteDoc;
  label: string;
  onChange: (doc: NoteDoc) => void;
  onFormats: (formats: Formats) => void;
}

const exec = (command: string, value?: string) => { try { return document.execCommand(command, false, value); } catch { return false; } };
const HIGHLIGHT_RGB = /251,\s*191,\s*36/;

// every class is written out in full so Tailwind can see it
const EDITOR_CLASS = [
  "relative min-h-full whitespace-pre-wrap [overflow-wrap:anywhere] text-[15px] leading-[1.7] text-slate-50 outline-none focus:outline-none",
  "data-[empty=true]:before:pointer-events-none data-[empty=true]:before:absolute data-[empty=true]:before:text-slate-500 data-[empty=true]:before:italic data-[empty=true]:before:content-[attr(data-placeholder)]",
  "[&_p]:m-0 [&_p]:min-h-[1.7em] [&_div]:min-h-[1.7em] [&_h3]:m-0 [&_h3]:text-[1.15em] [&_h3]:font-bold [&_h3]:leading-[1.5] [&_h3]:text-white",
  "[&_b]:font-bold [&_b]:text-slate-50 [&_i]:italic [&_u]:underline [&_u]:underline-offset-2 [&_[style*='background-color']]:rounded-sm [&_[style*='background-color']]:text-amber-100",
  "[&_ul]:m-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:marker:text-amber-400 [&_ol]:m-0 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:marker:font-mono [&_ol]:marker:text-amber-300 [&_li]:pl-0.5 [&_li_ul]:mt-0.5 [&_li_ol]:mt-0.5",
  "[&_ul[data-todo]]:list-none [&_ul[data-todo]]:pl-0 [&_ul[data-todo]>li]:relative [&_ul[data-todo]>li]:pl-7 [&_ul[data-todo]>li]:before:absolute [&_ul[data-todo]>li]:before:left-1 [&_ul[data-todo]>li]:before:top-[0.3em] [&_ul[data-todo]>li]:before:grid [&_ul[data-todo]>li]:before:size-4 [&_ul[data-todo]>li]:before:place-items-center [&_ul[data-todo]>li]:before:rounded [&_ul[data-todo]>li]:before:border [&_ul[data-todo]>li]:before:border-slate-500 [&_ul[data-todo]>li]:before:text-[11px] [&_ul[data-todo]>li]:before:font-bold [&_ul[data-todo]>li]:before:leading-none [&_ul[data-todo]>li]:before:content-['']",
  "[&_ul[data-todo]>li[data-checked]]:text-slate-400 [&_ul[data-todo]>li[data-checked]]:line-through [&_ul[data-todo]>li[data-checked]]:decoration-slate-500 [&_ul[data-todo]>li[data-checked]]:before:border-amber-400 [&_ul[data-todo]>li[data-checked]]:before:bg-amber-400 [&_ul[data-todo]>li[data-checked]]:before:text-slate-950 [&_ul[data-todo]>li[data-checked]]:before:content-['✓']",
].join(" ");

function caretElement(root: HTMLElement): Element | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.anchorNode || !root.contains(selection.anchorNode)) return null;
  const node = selection.anchorNode;
  return node.nodeType === 1 ? (node as Element) : node.parentElement;
}

/** The selection as character offsets in the editor's text, which stay valid when a command rebuilds the blocks around it. */
function saveSelection(root: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !root.contains(selection.anchorNode)) return null;
  const range = selection.getRangeAt(0);
  // on an empty line there is no text to count from, and the browser already keeps the caret there
  if (range.startContainer.nodeType !== 3 || range.endContainer.nodeType !== 3) return null;
  const measure = (node: Node, offset: number) => { const before = document.createRange(); before.selectNodeContents(root); before.setEnd(node, offset); return before.toString().length; };
  return { start: measure(range.startContainer, range.startOffset), end: measure(range.endContainer, range.endOffset) };
}
function restoreSelection(root: HTMLElement, saved: { start: number; end: number }) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const locate = (target: number): [Node, number] | null => {
    let seen = 0, last: Text | null = null;
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (seen + node.length >= target) return [node, target - seen];
      seen += node.length;
      last = node;
    }
    return last ? [last, last.length] : null;
  };
  walker.currentNode = root;
  const from = locate(saved.start);
  walker.currentNode = root;
  const to = locate(saved.end);
  if (!from || !to) return;
  const range = document.createRange();
  range.setStart(from[0], from[1]);
  range.setEnd(to[0], to[1]);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function formatsAt(root: HTMLElement): Formats | null {
  const element = caretElement(root);
  if (!element) return null;
  const list = element.closest("li")?.parentElement ?? null;
  const todo = !!list?.matches("ul[data-todo]");
  let highlight = false;
  try { highlight = HIGHLIGHT_RGB.test(document.queryCommandValue("hiliteColor") || document.queryCommandValue("backColor")); } catch { /* not supported */ }
  return {
    bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), underline: document.queryCommandState("underline"),
    heading: !!element.closest("h1,h2,h3,h4,h5,h6"), ul: !!list?.matches("ul") && !todo, ol: !!list?.matches("ol"), todo, highlight,
  };
}
const sameFormats = (a: Formats, b: Formats) => (Object.keys(a) as (keyof Formats)[]).every(key => a[key] === b[key]);

/**
 * A small WYSIWYG editor on contenteditable. It is filled from escaped markup built out of the document model and is read back
 * through a sanitising walker, so nothing the browser puts in the DOM (or the clipboard) reaches storage unless the model can express it.
 */
export const NoteEditor = forwardRef<NoteEditorHandle, Props>(function NoteEditor({ initial, label, onChange, onFormats }, ref) {
  const root = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const lastFormats = useRef<Formats>(NO_FORMATS);
  const callbacks = useRef({ onChange, onFormats });
  useEffect(() => { callbacks.current = { onChange, onFormats }; });

  const announce = useCallback(() => {
    const element = root.current;
    if (!element) return;
    const next = formatsAt(element);
    if (next && !sameFormats(next, lastFormats.current)) { lastFormats.current = next; callbacks.current.onFormats(next); }
  }, []);
  const emit = useCallback(() => {
    const element = root.current;
    if (!element) return;
    const doc = readDom(element);
    element.dataset.empty = isEmptyDoc(doc) && !element.querySelector("li") ? "true" : "false";
    callbacks.current.onChange(doc);
    announce();
  }, [announce]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    element.innerHTML = docToHtml(initial) || "<div><br></div>";
    element.dataset.empty = isEmptyDoc(initial) && initial.blocks.every(block => block.k !== "li") ? "true" : "false";
    // only the first document is loaded; a new note mounts a new editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const listen = () => announce();
    document.addEventListener("selectionchange", listen);
    return () => document.removeEventListener("selectionchange", listen);
  }, [announce]);

  const currentList = () => { const element = root.current && caretElement(root.current); return element?.closest("li")?.parentElement ?? null; };

  const run = useCallback((command: EditorCommand) => {
    const element = root.current;
    if (!element) return;
    if (document.activeElement !== element) element.focus({ preventScroll: true });
    const list = currentList();
    const keep = (command === "ul" || command === "ol" || command === "todo" || command === "heading" || command === "clear") ? saveSelection(element) : null;
    switch (command) {
      case "bold": exec("bold"); break;
      case "italic": exec("italic"); break;
      case "underline": exec("underline"); break;
      case "heading": exec("formatBlock", caretElement(element)?.closest("h1,h2,h3,h4,h5,h6") ? "div" : "h3"); break;
      case "ul":
        if (list?.matches("ul[data-todo]")) { list.removeAttribute("data-todo"); list.querySelectorAll("li[data-checked]").forEach(li => li.removeAttribute("data-checked")); } else exec("insertUnorderedList");
        break;
      case "ol": exec("insertOrderedList"); break;
      case "todo":
        if (list?.matches("ul[data-todo]")) exec("insertUnorderedList");
        else if (list?.matches("ul")) list.setAttribute("data-todo", "");
        else { exec("insertUnorderedList"); const created = currentList(); if (created?.matches("ul")) created.setAttribute("data-todo", ""); }
        break;
      case "highlight": {
        exec("styleWithCSS", "true");
        exec("hiliteColor", formatsAt(element)?.highlight ? "transparent" : HIGHLIGHT_CSS);
        exec("styleWithCSS", "false");
        break;
      }
      case "clear":
        exec("removeFormat");
        exec("styleWithCSS", "true"); exec("hiliteColor", "transparent"); exec("styleWithCSS", "false");
        if (caretElement(element)?.closest("h1,h2,h3,h4,h5,h6")) exec("formatBlock", "div");
        break;
      case "undo": exec("undo"); break;
      case "redo": exec("redo"); break;
    }
    if (keep) restoreSelection(element, keep);
    emit();
  }, [emit]);

  useImperativeHandle(ref, () => ({
    run,
    // focus with the caret after the last character, where a person carries on writing
    focus: () => {
      const element = root.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    },
  }), [run]);

  const toggleCheck = (item: Element) => { if (item.hasAttribute("data-checked")) item.removeAttribute("data-checked"); else item.setAttribute("data-checked", ""); emit(); };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const element = root.current;
    if (!element || composing.current) return;
    const item = caretElement(element)?.closest("li") ?? null;
    if (event.key === "Tab" && item) {
      event.preventDefault();
      const nested = !!item.parentElement?.parentElement?.closest("ul, ol");
      if (event.shiftKey) { if (nested) { exec("outdent"); emit(); } } else if (!nested && item.previousElementSibling) { exec("indent"); emit(); }
      return;
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && item?.parentElement?.matches("ul[data-todo]")) { event.preventDefault(); toggleCheck(item); }
  };

  const onInput = (event: { nativeEvent: Event }) => {
    if (composing.current) return;
    // a new checklist line must not inherit the ticked state of the line it was split from
    if ((event.nativeEvent as InputEvent).inputType === "insertParagraph" && root.current) caretElement(root.current)?.closest("li[data-checked]")?.removeAttribute("data-checked");
    emit();
  };

  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html"), text = event.clipboardData.getData("text/plain");
    let doc = html ? htmlToDoc(html) : emptyDoc();
    if (isEmptyDoc(doc) && doc.blocks.every(block => block.k !== "li")) doc = docFromText(text);
    if (!doc.blocks.length) return;
    exec("insertHTML", docToInlineHtml(doc) ?? docToHtml(doc));
    emit();
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const item = (event.target as Element).closest?.("li");
    if (!item || !item.parentElement?.matches("ul[data-todo]")) return;
    const box = item.getBoundingClientRect();
    if (event.clientX - box.left > 28 || event.clientY - box.top > 30) return;
    event.preventDefault();
    toggleCheck(item);
  };

  return (
    <div
      ref={root}
      role="textbox"
      aria-multiline="true"
      aria-label={label}
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-focus-ring="none"
      data-placeholder="Tulis catatan operasional shift, instruksi serah terima, atau pengingat di sini..."
      className={EDITOR_CLASS}
      onKeyDown={onKeyDown}
      onInput={onInput}
      onPaste={onPaste}
      onClick={onClick}
      onDrop={event => event.preventDefault()}
      onCompositionStart={() => { composing.current = true; }}
      onCompositionEnd={() => { composing.current = false; emit(); }}
    />
  );
});
