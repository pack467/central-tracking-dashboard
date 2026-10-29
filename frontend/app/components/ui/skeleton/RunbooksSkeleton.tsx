"use client";

import React from "react";
import { Skeleton } from "./Skeleton";

const RUNBOOK_TABS = [
  "Standard Operating Procedures",
  "Kredensial & Akses",
  "Tautan Cepat",
  "Direktori Eskalasi",
];

const DETERMINISTIC_RUNBOOK_TITLES = [
  "SOP Failover B2B Sekunder & Gateway Check",
  "Penanganan Antrean ActiveMQ Broker 228",
  "Prosedur Investigasi Graylog Pipeline Buffer",
  "Validasi Worker FMC & Healthcheck API",
  "Penanganan Latensi Payment Webhook MB",
  "Prosedur Restart Service Core DC Cikarang",
];

/**
 * RunbooksSkeleton:
 * Kerangka halaman Runbooks & SOP Operasional
 * (Tabs Header + Search & Filter Bar + 6 Kartu SOP: Judul + Chip + 2 Garis Deskripsi + Footer)
 */
export function RunbooksSkeleton() {
  return (
    <div role="status" aria-busy="true" className="w-full flex flex-col gap-5 py-2">
      <span className="sr-only" aria-live="polite">Memuat panduan operasional...</span>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl border border-[#334155] bg-[#1e293b] flex-wrap">
        {RUNBOOK_TABS.map((tab, idx) => (
          <Skeleton
            key={tab}
            width={idx === 0 ? 190 : 130}
            height={34}
            borderRadius={8}
            tone={idx === 0 ? "card" : "subtle"}
            staggerIndex={idx}
          />
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="p-3.5 rounded-xl border border-[#334155] bg-[#1e293b] flex items-center justify-between gap-4 flex-wrap">
        <Skeleton width={280} height={36} borderRadius={8} tone="card" />
        <Skeleton width={120} height={36} borderRadius={8} tone="subtle" />
      </div>

      {/* SOP Cards Grid (6 Kartu: Judul + Chip + 2 Garis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-[#334155] bg-[#1e293b] flex flex-col gap-3 min-h-[165px] justify-between"
          >
            {/* Header: Project Badge + Title + Severity/Type Chip */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <Skeleton width={54} height={12} borderRadius={3} tone="accent" staggerIndex={i} />
                <Skeleton width="88%" height={16} borderRadius={4} tone="card" staggerIndex={i + 1} />
              </div>
              <Skeleton width={52} height={20} borderRadius={99} tone="subtle" staggerIndex={i + 2} />
            </div>

            {/* 2 Garis Deskripsi */}
            <div className="flex flex-col gap-1.5">
              <Skeleton width="94%" height={11} borderRadius={3} tone="subtle" staggerIndex={i + 3} />
              <Skeleton width="68%" height={11} borderRadius={3} tone="subtle" staggerIndex={i + 3} />
            </div>

            {/* Footer: Kategori + Tombol Buka */}
            <div className="flex items-center justify-between pt-2 border-t border-[#334155]/40 mt-1">
              <Skeleton width={80} height={10} borderRadius={3} tone="subtle" staggerIndex={i + 4} />
              <Skeleton width={55} height={14} borderRadius={4} tone="card" staggerIndex={i + 4} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
