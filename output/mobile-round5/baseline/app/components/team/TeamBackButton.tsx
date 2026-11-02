"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { paths, safeNext } from "@/app/lib/routes";
import { ArrowLeft } from "lucide-react";

interface TeamBackButtonProps {
  className?: string;
}

export function TeamBackButton({ className = "" }: TeamBackButtonProps) {
  const router = useRouter();
  const [fromParam, setFromParam] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const from = params.get("from");
      if (from) {
        setFromParam(from);
      }
    }
  }, []);

  const handleBack = () => {
    // 1. Prioritaskan query param ?from= jika eksplisit disediakan (misal dari /login)
    if (fromParam) {
      router.push(safeNext(fromParam, true));
      return;
    }

    // 2. Jika ada referrer dari origin yang sama, kembali via router.back()
    if (typeof window !== "undefined") {
      if (document.referrer) {
        try {
          const refUrl = new URL(document.referrer);
          if (refUrl.origin === window.location.origin) {
            router.back();
            return;
          }
        } catch {
          // ignore parsing error
        }
      }

      // 3. Jika terdapat riwayat navigasi di tab ini, gunakan router.back()
      if (window.history.length > 1) {
        router.back();
        return;
      }
    }

    // 4. Fallback default ke dashboard utama jika dibuka langsung di tab baru
    router.push(paths.dashboard);
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:text-white hover:border-slate-700 transition-all duration-150 cursor-pointer shadow-sm ${className}`}
      title="Kembali ke halaman sebelumnya"
      aria-label="Kembali ke halaman sebelumnya"
    >
      <ArrowLeft size={14} className="text-slate-400" />
      <span>Kembali</span>
    </button>
  );
}
