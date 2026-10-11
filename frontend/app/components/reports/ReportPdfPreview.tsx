"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, ZoomIn } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { reportButtonClass, reportSelectClass } from "./report-styles";

/** Canvas preview works in browsers without an installed native PDF viewer. */
export function ReportPdfPreview({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [containerWidth, setContainerWidth] = useState(760);
  const [zoom, setZoom] = useState("fit");
  const [rendering, setRendering] = useState(true);
  const [error, setError] = useState("");
  const currentPage = Math.min(pageNumber, document?.numPages || 1);

  useEffect(() => {
    let cancelled = false;
    let loadedDocument: PDFDocumentProxy | null = null;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    async function load() {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = "/reports/pdf.worker.min.mjs";
        const task = pdfjs.getDocument({ url });
        loadingTask = task;
        const result = await task.promise;
        loadedDocument = result;
        if (!cancelled) {
          setDocument(result);
          setPageNumber(1);
          setError("");
        }
      } catch {
        if (!cancelled) {
          setError("Pratinjau belum dapat ditampilkan. Anda tetap bisa mengunduh atau membuka file PDF.");
          setRendering(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
      if (loadedDocument) void loadedDocument.destroy();
      else if (loadingTask) void loadingTask.destroy();
    };
  }, [url]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => setContainerWidth(entries[0].contentRect.width));
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    let task: { cancel: () => void } | null = null;
    async function render() {
      try {
        setRendering(true);
        const page = await document!.getPage(currentPage);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const base = page.getViewport({ scale: 1 });
        const scale = zoom === "fit" ? Math.min(1.55, Math.max(0.25, (containerWidth - 32) / base.width)) : Number(zoom);
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * density });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const renderingTask = page.render({ canvas, viewport });
        task = renderingTask;
        await renderingTask.promise;
        if (!cancelled) {
          setRendering(false);
          setError("");
        }
      } catch (cause) {
        if (!cancelled && !(cause instanceof Error && cause.name === "RenderingCancelledException")) {
          setError("Halaman PDF belum dapat dirender. Coba halaman lain atau unduh PDF.");
          setRendering(false);
        }
      }
    }
    void render();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [document, currentPage, containerWidth, zoom]);

  return (
    <div ref={containerRef} className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#334155] bg-[rgba(15,23,42,0.45)] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            className={`${reportButtonClass} h-[34px] px-2.5`}
            aria-label="Halaman PDF sebelumnya"
            disabled={!document || currentPage === 1}
            onClick={() => setPageNumber(currentPage - 1)}
          >
            <ArrowLeft size={14} />
          </button>
          <span className="min-w-24 text-center font-mono text-xs font-bold text-[#38bdf8]">
            {document ? `${currentPage} / ${document.numPages}` : "Memuat…"}
          </span>
          <button
            className={`${reportButtonClass} h-[34px] px-2.5`}
            aria-label="Halaman PDF berikutnya"
            disabled={!document || currentPage === document.numPages}
            onClick={() => setPageNumber(currentPage + 1)}
          >
            <ArrowRight size={14} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ZoomIn size={14} className="text-[#94a3b8]" />
          <select
            className={`${reportSelectClass} h-[34px] w-auto text-xs`}
            aria-label="Zoom pratinjau PDF"
            value={zoom}
            onChange={(event) => setZoom(event.target.value)}
          >
            <option value="fit">Sesuaikan lebar</option>
            <option value="1">100%</option>
            <option value="1.5">150%</option>
          </select>
        </div>
      </div>
      {error && <p role="alert" className="px-5 py-4 text-xs font-medium text-[#f87171]">{error}</p>}
      <div className="relative max-h-[78vh] min-h-72 overflow-auto overscroll-contain bg-[#0a0f1d] p-4 sm:p-6">
        {rendering && (
          <div
            role="status"
            className="sticky top-2 z-10 mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-[#334155] bg-[#1e293b]/95 px-4 py-2 text-xs font-semibold text-[#f8fafc] shadow-lg backdrop-blur-sm"
          >
            <LoaderCircle size={14} className="animate-spin text-[#38bdf8]" />
            Memuat halaman PDF…
          </div>
        )}
        <canvas
          ref={canvasRef}
          aria-label={`Pratinjau halaman ${currentPage} laporan mingguan`}
          className={`mx-auto h-auto rounded-sm bg-white shadow-2xl transition-transform ${
            zoom === "fit" ? "w-full max-w-[923px]" : zoom === "1" ? "w-[595px] max-w-none" : "w-[893px] max-w-none"
          }`}
        />
      </div>
    </div>
  );
}
