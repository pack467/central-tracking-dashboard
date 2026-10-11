"use client";
import { paths } from "@/app/lib/routes";

import { useEffect, useState } from "react";

export function AppSplash() {
  const [visible, setVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [statusText, setStatusText] = useState("Menyiapkan dashboard");
  const [isFadingText, setIsFadingText] = useState(false);

  useEffect(() => {
    // Tandai container konten agar tidak dapat difokuskan (inert) selama splash tampil
    const appRoot = document.getElementById("app-root");
    if (appRoot) {
      appRoot.setAttribute("inert", "");
    }

    const startTime = performance.now();
    let isTerminated = false;
    let minDisplayTime = 700;

    try {
      if (sessionStorage.getItem("ctd_splash_seen") === "1") {
        minDisplayTime = 300;
      } else {
        sessionStorage.setItem("ctd_splash_seen", "1");
      }
    } catch {
      minDisplayTime = 700;
    }

    // Status text timer: transisi cross-fade 200ms setelah 2.5 detik
    const statusTimer = setTimeout(() => {
      if (!isTerminated) {
        setIsFadingText(true);
        setTimeout(() => {
          if (!isTerminated) {
            setStatusText("Masih memuat, mohon tunggu");
            setIsFadingText(false);
          }
        }, 200);
      }
    }, 2500);

    let closeTimer: ReturnType<typeof setTimeout> | null = null;
    let unmountTimer: ReturnType<typeof setTimeout> | null = null;

    const performClose = () => {
      if (isTerminated) return;
      isTerminated = true;
      setIsExiting(true);

      const root = document.getElementById("app-root");
      if (root) {
        root.removeAttribute("inert");
      }

      // Exit sequence: isi memudar dalam 280ms, latar memudar 120ms kemudian (total 400ms), lalu unmount
      unmountTimer = setTimeout(() => {
        setVisible(false);
      }, 420);
    };

    // Sinyal siap: document.fonts.ready dengan batas waktu 1.5 detik
    const fontReadyPromise = typeof document !== "undefined" && document.fonts?.ready
      ? Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ])
      : Promise.resolve();

    fontReadyPromise.then(() => {
      const elapsed = performance.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);
      closeTimer = setTimeout(performClose, remaining);
    });

    // Batas waktu maksimal mutlak: 6 detik
    const maxSafetyTimer = setTimeout(() => {
      if (!isTerminated) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[AppSplash] Batas waktu 6 detik tercapai, menutup splash secara otomatis.");
        }
        performClose();
      }
    }, 6000);

    return () => {
      isTerminated = true;
      clearTimeout(statusTimer);
      clearTimeout(maxSafetyTimer);
      if (closeTimer) clearTimeout(closeTimer);
      if (unmountTimer) clearTimeout(unmountTimer);
      const root = document.getElementById("app-root");
      if (root) {
        root.removeAttribute("inert");
      }
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Jika JavaScript dinonaktifkan di browser, sembunyikan splash agar konten SSR terlihat */}
      <noscript>
        <style>{`#ctd-app-splash { display: none !important; }`}</style>
      </noscript>

      {/* Root Splash Container: inset-0 overflow-hidden (tanpa w-screen / h-screen / 100vw / 100vh) */}
      <div
        id="ctd-app-splash"
        role="status"
        aria-live="polite"
        className={`fixed inset-0 z-[999999] overflow-hidden flex flex-col items-center justify-center select-none bg-[#0f172a] transition-opacity duration-[400ms] ease-out ${
          isExiting ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
        }`}
      >
        <span className="sr-only">Memuat Central Tracking Dashboard</span>

        {/* ─── A. Latar Berlapis Dekoratif (aria-hidden & pointer-events-none) ─── */}

        {/* Layer 2: Grid halus statis 48px x 48px dengan offset y agar tidak menyentuh garis y=0 */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[2px] bottom-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184, 0.045) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184, 0.045) 1px, transparent 1px)
            `,
            backgroundPosition: "0 24px, 0 24px",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 48%, #000 15%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 48%, #000 15%, transparent 70%)",
          }}
        />

        {/* Layer 3: Cahaya lembut bernapas di belakang logo (560px desktop, 360px mobile) */}
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] sm:w-[560px] sm:h-[560px] rounded-full pointer-events-none animate-boot-glow-breathe"
          style={{
            background: "radial-gradient(circle, rgba(56, 189, 248, 0.10) 0%, rgba(56, 189, 248, 0) 70%)",
          }}
        />

        {/* Layer 4: Vignette tepi viewport */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(2, 6, 23, 0.55) 100%)",
          }}
        />

        {/* ─── Kontainer Isi (Pusat optik sedikit di atas tengah: pb-[6vh]) ─── */}
        <div
          className={`relative z-10 flex flex-col items-center justify-center text-center px-4 pb-[6vh] w-full max-w-lg transition-[opacity,transform] duration-[280ms] ease-out ${
            isExiting ? "opacity-0 scale-[1.02]" : "opacity-100 scale-100"
          }`}
        >
          {/* ─── B. Blok Logo Tanpa Kotak / Tile (Cincin 120px sm / 100px mobile) ─── */}
          <div
            className="relative flex items-center justify-center w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] animate-boot-fade-up shrink-0"
            style={{ animationDelay: "0ms" }}
          >
            {/* Trek cincin penuh: lingkaran 1.5px #334155 alpha 0.5 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-[1.5px] border-[#334155]/50 pointer-events-none"
            />

            {/* Cahaya lembut di dalam cincin di belakang logo (membantu kontras biru tua logo di latar gelap) */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full pointer-events-none animate-boot-logo-breathe"
              style={{
                background: "radial-gradient(circle, rgba(56, 189, 248, 0.10) 0%, transparent 70%)",
              }}
            />

            {/* Cincin putar aktif: conic-gradient komet lebih terang + head dot 6px #7dd3fc */}
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-full pointer-events-none animate-boot-spin drop-shadow-[0_0_8px_rgba(56,189,248,0.4)]"
              style={{
                background: "conic-gradient(from 0deg, transparent 0 20%, rgba(56, 189, 248, 0.2) 35%, rgba(56, 189, 248, 0.5) 60%, rgba(56, 189, 248, 0.85) 85%, #38bdf8 100%)",
                maskImage: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
                WebkitMaskImage: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px))",
              }}
            >
              {/* Titik bulat 6px #7dd3fc di kepala busur (posisi jam 12 / atas) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#7dd3fc] shadow-[0_0_8px_#7dd3fc]" />
            </div>

            {/* Logo tampil LANGSUNG tanpa tile/kotak: 68px (sm) / 56px (mobile), bernapas pelan scale 1->1.04 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hutabyte_icon_transparent.png"
              alt="Central Tracking Dashboard Logo"
              width={68}
              height={68}
              className="w-[56px] h-[56px] sm:w-[68px] sm:h-[68px] object-contain shrink-0 select-none animate-boot-logo-breathe drop-shadow-[0_4px_14px_rgba(2,6,23,0.55)] drop-shadow-[0_0_12px_rgba(56,189,248,0.18)] z-10"
              fetchPriority="high"
            />
          </div>

          {/* ─── C. Teks Hierarki: Judul & Baris Merek ─── */}
          {/* Judul: 19px mobile / 26px desktop, font-bold, tracking-[-0.01em], jarak 28px ke cincin logo */}
          <h1
            className="mt-[28px] text-[19px] sm:text-[26px] font-bold tracking-[-0.01em] text-[#f8fafc] leading-snug select-none animate-boot-fade-up max-w-[260px] sm:max-w-none text-center"
            style={{ animationDelay: "80ms" }}
          >
            Central Tracking Dashboard
          </h1>

          {/* Baris merek: "HUTABYTE", 11.5px mono, uppercase, tracking-[0.32em], jarak 8px dari judul */}
          <div
            className="mt-[8px] flex items-center justify-center gap-3 animate-boot-fade-up select-none"
            style={{ animationDelay: "160ms" }}
          >
            <div
              aria-hidden="true"
              className="w-6 sm:w-8 h-[1px] bg-gradient-to-l from-[#334155] to-transparent shrink-0"
            />
            <span className="text-[11.5px] font-mono uppercase tracking-[0.32em] text-[#38bdf8]/80 font-semibold leading-none">
              HUTABYTE
            </span>
            <div
              aria-hidden="true"
              className="w-6 sm:w-8 h-[1px] bg-gradient-to-r from-[#334155] to-transparent shrink-0"
            />
          </div>

          {/* ─── D. Bar Progres & Status Text ─── */}
          {/* Bar Progres: lebar min(70vw, 240px), tinggi 4px, rounded-full, trek #1e293b, jarak 36px dari merek */}
          <div
            className="mt-[36px] flex flex-col items-center animate-boot-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            <div
              aria-hidden="true"
              className="w-[min(70vw,240px)] h-[4px] rounded-full bg-[#1e293b] ring-1 ring-inset ring-white/5 overflow-hidden relative"
            >
              {/* Segmen 38% meluncur translateX -100% ke 263% 1.5s cubic-bezier(.65,0,.35,1) */}
              <div
                className="w-[38%] h-full rounded-full animate-boot-progress shadow-[0_0_12px_rgba(56,189,248,0.35)]"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, #38bdf8 45%, #7dd3fc 100%)",
                }}
              />
            </div>

            {/* Teks Status: 13px #94a3b8, tinggi pasti 20px, jarak 16px dari bar, cross-fade 200ms, animated 3 dots */}
            <p className="mt-[16px] min-h-[20px] h-[20px] text-[13px] text-[#94a3b8] font-sans flex items-center justify-center leading-[20px] select-none m-0">
              <span
                className={`transition-opacity duration-200 ${
                  isFadingText ? "opacity-0" : "opacity-100"
                }`}
              >
                {statusText}
              </span>
              <span className="inline-flex tracking-[0.1em] ml-0.5" aria-hidden="true">
                <span className="status-dot-1">.</span>
                <span className="status-dot-2">.</span>
                <span className="status-dot-3">.</span>
              </span>
            </p>
          </div>
        </div>

        {/* ─── E. Anti-Macet CSS-Only Fallback (muncul setelah 10 detik jika JS macet) ─── */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 opacity-0 pointer-events-none animate-[bootEmergencyFade_0.4s_ease-out_10s_forwards] text-center">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href={paths.dashboard}
            className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-lg bg-[#1e293b] border border-[#334155] text-[12px] font-medium text-[#f8fafc] hover:bg-[#243044] hover:border-[#38bdf8] transition-colors pointer-events-auto select-auto shadow-md"
          >
            Memuat terlalu lama. Muat ulang
          </a>
        </div>
      </div>
    </>
  );
}
