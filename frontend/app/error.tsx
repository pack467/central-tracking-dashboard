"use client";

import { useEffect } from "react";
import Link from "next/link";
import { paths } from "@/app/lib/routes";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error secara internal tanpa mengekspos detail stack trace ke UI pengguna
    console.error("[Central Tracking Dashboard] Caught runtime error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center p-4">
      <div className="max-w-[460px] w-full p-8 rounded-2xl bg-[#1e293b] border border-[#334155] shadow-[0_20px_40px_rgba(0,0,0,0.45)] flex flex-col items-center text-center">
        {/* Logo tampil langsung tanpa tile */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hutabyte_icon_transparent.png"
          alt="Central Tracking Dashboard"
          width={56}
          height={69}
          className="w-[56px] h-auto object-contain mb-5 drop-shadow-[0_4px_14px_rgba(2,6,23,0.55)] select-none"
        />

        <h1 className="text-[18px] font-bold text-[#f8fafc] m-0 mb-2">
          Terjadi kesalahan
        </h1>

        <p className="text-[13px] text-[#94a3b8] leading-relaxed m-0 mb-5">
          Aplikasi mengalami kendala teknis tak terduga. Silakan coba lagi atau muat ulang halaman.
        </p>

        {error.digest && (
          <p className="text-[11px] font-mono text-[#64748b] m-0 mb-5">
            Kode: {error.digest}
          </p>
        )}

        <div className="flex gap-2.5 flex-wrap justify-center w-full">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 min-w-[120px] min-h-[40px] px-4 py-2 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-[13px] font-semibold transition-colors cursor-pointer"
          >
            Coba lagi
          </button>
          <Link
            href={paths.dashboard}
            className="flex-1 min-w-[120px] min-h-[40px] px-4 py-2 rounded-lg bg-[#0f172a] hover:bg-[#243044] text-[#cbd5e1] border border-[#334155] text-[13px] font-semibold transition-colors inline-flex items-center justify-center text-center"
          >
            Muat ulang
          </Link>
        </div>
      </div>
    </div>
  );
}
