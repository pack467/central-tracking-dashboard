"use client";

import React, { useEffect } from "react";
import { X, Layers, Building2, User, Cpu, ShieldCheck, Edit3, Archive, RefreshCw } from "lucide-react";
import type {
  ClientOrganization,
  ProjectMaster,
  SystemMaster,
} from "@/app/types/master-data";

interface ProjectDetailDrawerProps {
  project: ProjectMaster | null;
  client?: ClientOrganization;
  systems: SystemMaster[];
  checkpointCount?: number;
  onClose: () => void;
  onEdit: (project: ProjectMaster) => void;
  onToggleArchive: (project: ProjectMaster) => void;
}

export function ProjectDetailDrawer({
  project,
  client,
  systems,
  checkpointCount = 0,
  onClose,
  onEdit,
  onToggleArchive,
}: ProjectDetailDrawerProps) {
  useEffect(() => {
    if (!project) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [project, onClose]);

  if (!project) return null;

  const isArchived = project.status === "archived";

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end bg-black/60 backdrop-blur-[3px] animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Detail Proyek: ${project.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[min(480px,calc(100vw-24px))] h-full bg-[#1e293b] border-l border-slate-700/80 shadow-2xl flex flex-col animate-slide-left text-slate-100 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-700/70 bg-slate-900/60 flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-400">
              <Layers size={18} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                  {project.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isArchived
                      ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {isArchived ? "Archived" : "Active"}
                </span>
              </div>
              <h2 className="text-[16px] font-bold text-slate-100 mt-1">{project.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup panel detail"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 [scrollbar-width:thin]">
          {/* Client Reference Card */}
          {client && (
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-8 h-8 rounded-lg grid place-items-center bg-slate-800 text-slate-300 shrink-0">
                  <Building2 size={16} />
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Klien</span>
                  <span className="text-[12.5px] font-bold text-slate-200 truncate block">
                    {client.name}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 shrink-0">
                {client.code}
              </span>
            </div>
          )}

          {/* Key Properties */}
          <div className="grid grid-cols-2 gap-3 text-[12.5px]">
            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Lead Engineer
              </span>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <User size={13} className="text-sky-400 shrink-0" />
                <span className="truncate">{project.leadEngineer || "NOC Specialist"}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Checkpoints Shift
              </span>
              <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
                <span>{checkpointCount} Checkpoint Terjadwal</span>
              </div>
            </div>
          </div>

          {/* Scope & Description */}
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Lingkup Layanan &amp; Deskripsi
            </h3>
            <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-700/60 text-[12.5px] text-slate-300 leading-relaxed">
              <p className="font-semibold text-slate-200 mb-1">{project.fullName}</p>
              <p>{project.detail || "Tidak ada rincian tambahan untuk proyek ini."}</p>
            </div>
          </div>

          {/* Linked Systems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Sistem Terkait ({systems.length})
              </h3>
            </div>
            {systems.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-slate-700 text-center text-[12px] text-slate-400">
                Belum ada sub-layanan/sistem yang didaftarkan untuk proyek ini.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {systems.map((sys) => {
                  const critBadge =
                    sys.criticality === "critical"
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                      : sys.criticality === "high"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                      : "text-sky-400 bg-sky-500/10 border-sky-500/30";

                  return (
                    <div
                      key={sys.id}
                      className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-700/50 flex items-center justify-between gap-3 text-[12px]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Cpu size={14} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-200 truncate">{sys.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {sys.environment}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${critBadge}`}>
                          {sys.criticality}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-700/70 bg-slate-900/60 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleArchive(project)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer border ${
              isArchived
                ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                : "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            }`}
          >
            {isArchived ? <RefreshCw size={13} /> : <Archive size={13} />}
            <span>{isArchived ? "Pulihkan Proyek" : "Arsipkan Proyek"}</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(project)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-bold text-white bg-sky-500 hover:bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)] transition-all cursor-pointer"
          >
            <Edit3 size={13} />
            <span>Ubah Proyek</span>
          </button>
        </div>
      </div>
    </div>
  );
}
