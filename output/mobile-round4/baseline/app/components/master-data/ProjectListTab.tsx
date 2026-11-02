"use client";

import { Select } from "@/app/components/ui/Select";

import { useMemo } from "react";
import { Search, Plus, Layers, Edit3, Archive, RefreshCw, Eye, Building2, User, ShieldCheck } from "lucide-react";
import type { ClientOrganization, ProjectMaster, SystemMaster } from "@/app/types/master-data";
import type { MonitoringEntry } from "@/app/lib/types";

interface ProjectListTabProps {
  projects: readonly ProjectMaster[];
  clients: readonly ClientOrganization[];
  systems: readonly SystemMaster[];
  schedules?: MonitoringEntry[];
  selectedClientId: string;
  onSelectedClientIdChange: (id: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onAddProject: () => void;
  onEditProject: (project: ProjectMaster) => void;
  onViewProjectDetail: (project: ProjectMaster) => void;
  onToggleArchive: (project: ProjectMaster) => void;
}

export function ProjectListTab({
  projects,
  clients,
  systems,
  schedules = [],
  selectedClientId,
  onSelectedClientIdChange,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddProject,
  onEditProject,
  onViewProjectDetail,
  onToggleArchive,
}: ProjectListTabProps) {
  // Clients map for quick lookup
  const clientsMap = useMemo(() => {
    return new Map(clients.map((c) => [c.id, c]));
  }, [clients]);

  // Compute checkpoints count per project
  const checkpointCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of schedules) {
      const current = map.get(item.project) || 0;
      map.set(item.project, current + 1);
    }
    return map;
  }, [schedules]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Client filter
      if (selectedClientId && selectedClientId !== "all" && p.clientId !== selectedClientId) {
        return false;
      }
      // Status filter
      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesDetail = p.detail.toLowerCase().includes(q);
        const matchesLead = (p.leadEngineer || "").toLowerCase().includes(q);
        return matchesName || matchesCode || matchesDetail || matchesLead;
      }
      return true;
    });
  }, [projects, selectedClientId, statusFilter, search]);

  const selectedClient = selectedClientId && selectedClientId !== "all" ? clientsMap.get(selectedClientId) : null;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px] max-w-[500px]">
          {/* Client Filter */}
          <div className="w-[180px] shrink-0">
            <Select
              value={selectedClientId || "all"}
              onChange={(e) => onSelectedClientIdChange(e.target.value)}
              aria-label="Filter berdasarkan klien"
              className="w-full h-[36px] px-3 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer font-medium"
            >
              <option value="all">Semua Klien ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortName || c.name} ({c.code})
                </option>
              ))}
            </Select>
          </div>

          {/* Search */}
          <div className="relative w-full">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari kode, nama proyek, lingkup..."
              aria-label="Cari proyek"
              className="w-full h-[36px] pl-9 pr-3 rounded-lg text-[12.5px] bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter status proyek"
            className="h-[36px] px-3 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="all">Semua Status ({projects.length})</option>
            <option value="active">Aktif ({projects.filter((p) => p.status === "active").length})</option>
            <option value="archived">Arsip ({projects.filter((p) => p.status === "archived").length})</option>
          </Select>

          {/* Add Project Button */}
          <button
            type="button"
            onClick={onAddProject}
            className="inline-flex items-center gap-1.5 h-[36px] px-3.5 rounded-lg text-[12px] font-bold text-white bg-sky-500 hover:bg-sky-400 transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] cursor-pointer"
          >
            <Plus size={15} />
            <span>Proyek Baru</span>
          </button>
        </div>
      </div>

      {/* ── Table & Cards View ── */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center gap-3">
          <span className="p-3 rounded-full bg-slate-800 text-slate-400">
            <Layers size={24} />
          </span>
          <p className="text-[14px] font-bold text-slate-200">
            {selectedClient ? `Belum ada proyek untuk ${selectedClient.name}` : "Tidak ada proyek ditemukan"}
          </p>
          <p className="text-[12px] text-slate-400 max-w-sm">
            {search || statusFilter !== "all"
              ? "Coba ubah kata kunci pencarian atau sesuaikan filter status."
              : selectedClient
              ? "Mulai dengan membuat proyek pertama untuk klien ini agar muncul pada monitoring dashboard."
              : "Belum ada data proyek terdaftar."}
          </p>
          {selectedClient && !search && statusFilter === "all" ? (
            <button
              type="button"
              onClick={onAddProject}
              className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-bold text-white bg-sky-500 hover:bg-sky-400 transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] cursor-pointer"
            >
              <Plus size={14} />
              <span>Buat Proyek Pertama</span>
            </button>
          ) : (
            (search || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange("");
                  onStatusFilterChange("all");
                }}
                className="mt-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/20 transition-colors cursor-pointer"
              >
                Reset Filter
              </button>
            )
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden shadow-lg">
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/90 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Kode &amp; Proyek</th>
                  <th className="p-3.5">Klien Terkait</th>
                  <th className="p-3.5">Lead / PIC</th>
                  <th className="p-3.5">Lingkup Layanan</th>
                  <th className="p-3.5 text-center">Checkpoint</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredProjects.map((project) => {
                  const client = clientsMap.get(project.clientId);
                  const isArchived = project.status === "archived";
                  const checkpoints = checkpointCounts.get(project.name) || 0;

                  return (
                    <tr key={project.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {project.code}
                          </span>
                          <span className="font-bold text-slate-100">{project.name}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {client ? (
                          <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-300 font-medium">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span>{client.shortName || client.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="text-slate-300 font-medium flex items-center gap-1.5">
                          <User size={12} className="text-sky-400 shrink-0" />
                          <span>{project.leadEngineer || "NOC Specialist"}</span>
                        </span>
                      </td>

                      <td className="p-3.5 max-w-[280px]">
                        <span className="text-slate-300 line-clamp-1 text-[12px]" title={project.detail}>
                          {project.detail}
                        </span>
                      </td>

                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono font-medium">
                          <ShieldCheck size={11} className="text-emerald-400" />
                          <span>{checkpoints}</span>
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            isArchived
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {project.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => onViewProjectDetail(project)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Rincian Proyek"
                            aria-label={`Rincian proyek ${project.name}`}
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditProject(project)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ubah Proyek"
                            aria-label={`Ubah proyek ${project.name}`}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleArchive(project)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isArchived
                                ? "text-emerald-400 hover:bg-emerald-500/10"
                                : "text-rose-400 hover:bg-rose-500/10"
                            }`}
                            title={isArchived ? "Pulihkan proyek" : "Arsipkan proyek"}
                            aria-label={isArchived ? "Pulihkan proyek" : "Arsipkan proyek"}
                          >
                            {isArchived ? <RefreshCw size={14} /> : <Archive size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
