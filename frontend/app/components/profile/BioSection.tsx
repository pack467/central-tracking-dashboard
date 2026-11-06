"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { useToast } from "@/app/components/ui/Toast";
import { BIO_MAX, readProfileBio, saveProfileBio, subscribeProfileBio } from "@/app/lib/profile-bio";

/** Reads as text, turns into a text box in place when edited. React escapes what it shows, so a bio can never be markup. */
export function BioSection({ userId }: { userId: string }) {
  const notify = useToast();
  const bio = useSyncExternalStore(subscribeProfileBio, () => readProfileBio(userId), () => "");
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const box = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) {
      box.current?.focus();
      box.current?.setSelectionRange(box.current.value.length, box.current.value.length);
    } else if (closing.current) {
      closing.current = false;
      opener.current?.focus();
    }
  }, [editing]);

  const close = () => { closing.current = true; setDraft(null); setError(""); };
  const save = () => {
    if (draft === null) return;
    try {
      saveProfileBio(userId, draft);
      notify.success("Bio diperbarui.", { id: "profile-bio" });
      close();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Bio tidak dapat disimpan."); }
  };
  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Escape") { event.preventDefault(); close(); } };

  return (
    <div className="border-t border-[var(--line)] px-6 py-4 max-[660px]:px-4" data-profile-bio>
      {editing ? (
        <div className="flex flex-col gap-2.5">
          <textarea
            ref={box}
            aria-label="Bio"
            rows={3}
            maxLength={BIO_MAX}
            value={draft}
            onChange={(event) => { setDraft(event.target.value); setError(""); }}
            onKeyDown={onKey}
            placeholder="Contoh: Operator NOC untuk layanan USIEM. Hubungi saya untuk eskalasi OpenSearch dan Pinot."
            className="w-full resize-y rounded-lg border border-[var(--panel-border)] bg-[var(--input-bg)] px-3 py-2.5 text-[13px] leading-[1.5] text-[var(--ink-primary)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)] focus:outline-none"
          />
          {error && <p role="alert" className="m-0 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <span className="text-[11.5px] leading-[1.45] text-[var(--ink-muted)]">Tersimpan di browser ini saja, dan hanya tampil untuk Anda. <span className="font-mono tabular-nums">{draft.length}/{BIO_MAX}</span></span>
            <div className="flex items-center gap-2">
              <button type="button" className="button button-secondary" onClick={close}>Batal</button>
              <button type="button" className="button button-primary" onClick={save}>Simpan Bio</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span className="block text-[11.5px] text-[var(--ink-muted)]">Bio</span>
            {bio
              ? <p className="m-0 mt-0.5 whitespace-pre-wrap text-[13px] leading-[1.55] text-[var(--ink-primary)] [overflow-wrap:anywhere]">{bio}</p>
              : <p className="m-0 mt-0.5 text-[13px] leading-[1.55] text-[var(--ink-muted)]">Belum ada bio. Ceritakan peran atau keahlian Anda secara singkat.</p>}
          </div>
          <button ref={opener} type="button" onClick={() => setDraft(bio)} className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] font-semibold leading-none text-[var(--accent-blue)] transition-colors duration-150 hover:bg-[var(--accent-blue-soft)]">
            {bio ? <Pencil size={13} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}{bio ? "Edit Bio" : "Tambah Bio"}
          </button>
        </div>
      )}
    </div>
  );
}
