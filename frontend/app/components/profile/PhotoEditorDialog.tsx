"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type PointerEvent } from "react";
import { ImagePlus, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { Modal } from "@/app/components/ui/Modal";
import { ModalCloseButton } from "@/app/components/ui/ModalCloseButton";
import { useToast } from "@/app/components/ui/Toast";
import { clampOffset, coverScale, cropRect, PHOTO_ACCEPT, PHOTO_MAX_ZOOM, photoFileProblem, removeProfilePhoto, renderCrop, saveProfilePhoto, type CropOffset } from "@/app/lib/profile-photo";

const FRAME = 240;
const ARROW_STEP = 8;

interface Loaded { url: string; width: number; height: number; element: HTMLImageElement }

/** Choose a picture, then drag and zoom it inside the circle. Only the square shown is kept, made small: never the original file. */
export function PhotoEditorDialog({ userId, hasPhoto, onClose }: { userId: string; hasPhoto: boolean; onClose: () => void }) {
  const notify = useToast();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<CropOffset>({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dragging = useRef<{ pointer: number; x: number; y: number; from: CropOffset } | null>(null);
  const currentUrl = useRef<string | null>(null);

  useEffect(() => () => { if (currentUrl.current) URL.revokeObjectURL(currentUrl.current); }, []);

  const load = async (file: File | undefined) => {
    if (!file) return;
    const problem = photoFileProblem(file);
    if (problem) { setError(problem); return; }
    const url = URL.createObjectURL(file);
    const element = new Image();
    try {
      element.src = url;
      await element.decode();
      if (!element.naturalWidth || !element.naturalHeight) throw new Error("empty");
    } catch {
      URL.revokeObjectURL(url);
      setError("Gambar tidak dapat dibaca. Pastikan file tidak rusak.");
      return;
    }
    if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    currentUrl.current = url;
    setError("");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setLoaded({ url, width: element.naturalWidth, height: element.naturalHeight, element });
  };

  const moveTo = (next: CropOffset, nextZoom = zoom) => { if (loaded) setOffset(clampOffset(next, loaded.width, loaded.height, FRAME, nextZoom)); };
  const changeZoom = (next: number) => { setZoom(next); moveTo(offset, next); };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, from: offset };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragging.current;
    if (drag?.pointer === event.pointerId) moveTo({ x: drag.from.x + event.clientX - drag.x, y: drag.from.y + event.clientY - drag.y });
  };
  const onPointerEnd = () => { dragging.current = null; };
  const onFrameKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: [-ARROW_STEP, 0], ArrowRight: [ARROW_STEP, 0], ArrowUp: [0, -ARROW_STEP], ArrowDown: [0, ARROW_STEP] }[event.key];
    if (!step) return;
    event.preventDefault();
    moveTo({ x: offset.x + step[0], y: offset.y + step[1] });
  };
  const onDrop = (event: DragEvent<HTMLElement>) => { event.preventDefault(); setDragOver(false); void load(event.dataTransfer.files[0]); };
  const onChoose = (event: ChangeEvent<HTMLInputElement>) => { void load(event.target.files?.[0]); event.target.value = ""; };

  const save = () => {
    if (!loaded) return;
    try {
      saveProfilePhoto(userId, renderCrop(loaded.element, cropRect(loaded.width, loaded.height, FRAME, zoom, offset)));
      notify.success("Foto profil diperbarui.", { id: "profile-photo" });
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Foto tidak dapat disimpan."); }
  };
  const remove = () => {
    removeProfilePhoto(userId);
    notify.success("Foto profil dihapus.", { id: "profile-photo" });
    onClose();
  };

  const scale = loaded ? coverScale(loaded.width, loaded.height, FRAME) * zoom : 1;

  return (
    <Modal open onClose={onClose} label={hasPhoto ? "Edit foto profil" : "Tambah foto profil"} width={460}>
      <div className="modal-title">
        <div>
          <strong>{hasPhoto ? "Edit foto profil" : "Tambah foto profil"}</strong>
          <small>{loaded ? "Geser gambar dan atur zoom agar pas di dalam lingkaran." : "PNG, JPG, atau WebP, maksimal 5 MB."}</small>
        </div>
        <ModalCloseButton onClose={onClose} />
      </div>

      <input ref={input} type="file" accept={PHOTO_ACCEPT} className="sr-only" tabIndex={-1} aria-label="Pilih file foto" onChange={onChoose} />

      {loaded ? (
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- dragged with the pointer or moved with the arrow keys: no standard control does this */}
          <div data-photo-frame role="application" tabIndex={0}
            aria-label="Area potong foto. Gunakan tombol panah untuk menggeser."
            className="relative shrink-0 cursor-grab touch-none select-none overflow-hidden rounded-xl bg-[var(--bg)] outline-offset-2 focus-visible:outline-2 focus-visible:outline-sky-400 active:cursor-grabbing"
            style={{ width: FRAME, height: FRAME }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onFrameKey}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a picture from this device that was never uploaded */}
            <img
              src={loaded.url}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{ width: loaded.width * scale, height: loaded.height * scale, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_200px_rgba(2,6,23,0.62)] ring-2 ring-white/70" />
          </div>

          <div className="flex w-full max-w-[280px] items-center gap-2.5">
            <ZoomOut size={15} className="shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
            <input type="range" aria-label="Zoom" min={1} max={PHOTO_MAX_ZOOM} step={0.01} value={zoom} onChange={(event) => changeZoom(Number(event.target.value))} className="h-1.5 min-w-0 flex-1 cursor-pointer accent-sky-400" />
            <ZoomIn size={15} className="shrink-0 text-[var(--ink-muted)]" aria-hidden="true" />
          </div>

          <button type="button" className="text-[12px] font-semibold text-[var(--accent-blue)] hover:underline" onClick={() => input.current?.click()}>Pilih gambar lain</button>
        </div>
      ) : (
        <button
          type="button"
          data-photo-drop
          onClick={() => input.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex w-full flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-dashed px-6 py-9 text-center transition-colors duration-150 ${dragOver ? "border-sky-400 bg-sky-400/10" : "border-[var(--line)] bg-[var(--bg)] hover:border-slate-500"}`}
        >
          <span className="grid size-12 place-items-center rounded-full border border-[var(--accent-blue-border)] bg-[var(--accent-blue-soft)] text-[var(--accent-blue)]"><ImagePlus size={22} aria-hidden="true" /></span>
          <strong className="text-[13.5px] font-semibold text-[var(--ink-primary)]">Pilih foto</strong>
          <span className="text-[12px] text-[var(--ink-muted)]">atau seret gambar ke sini</span>
        </button>
      )}

      {error && <p role="alert" className="m-0 mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-300">{error}</p>}

      <p className="m-0 mt-3 text-center text-[11.5px] leading-[1.45] text-[var(--ink-muted)]">Foto tersimpan di browser ini saja, dan hanya tampil untuk Anda.</p>

      <div className="modal-actions max-[420px]:flex-wrap">
        {hasPhoto && (
          <button type="button" className="mr-auto inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--red)] hover:underline" onClick={remove}>
            <Trash2 size={13} aria-hidden="true" /> Hapus foto
          </button>
        )}
        <button type="button" className="button button-secondary" onClick={onClose}>Batal</button>
        <button type="button" className="button button-primary" onClick={save} disabled={!loaded}>Simpan Foto</button>
      </div>
    </Modal>
  );
}
