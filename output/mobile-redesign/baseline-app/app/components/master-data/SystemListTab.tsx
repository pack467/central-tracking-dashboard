"use client";

import { useMemo } from "react";
import {
  Search,
  Plus,
  Cpu,
  Edit3,
  Building2,
  Layers,
  Power,
} from "lucide-react";
import type {
  ClientOrganization,
  ProjectMaster,
  SystemMaster,
  SystemCriticality,
} from "@/app/types/master-data";

interface SystemListTabProps {
  systems: readonly SystemMaster[];
  projects: readonly ProjectMaster[];
  clients: readonly ClientOrganization[];
  selectedClientId: string;
  onSelectedClientIdChange: (id: string) => void;
  selectedProjectId: string;
  onSelectedProjectIdChange: (id: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  criticalityFilter: string;
  onCriticalityFilterChange: (val: string) => void;
  environmentFilter: string;
  onEnvironmentFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onAddSystem: () => void;
  onEditSystem: (system: SystemMaster) => void;
  onToggleStatus: (system: SystemMaster) => void;
}

const CRITICALITY_BADGES: Record<SystemCriticality, string> = {
  critical: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
  high: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  medium: "bg-sky-500/20 text-sky-300 border border-sky-500/40",
  low: "bg-slate-500/20 text-slate-300 border border-slate-500/40",
};

export function SystemListTab({
  systems,
  projects,
  clients,
  selectedClientId,
  onSelectedClientIdChange,
  selectedProjectId,
  onSelectedProjectIdChange,
  search,
  onSearchChange,
  criticalityFilter,
  onCriticalityFilterChange,
  environmentFilter,
  onEnvironmentFilterChange,
  statusFilter,
  onStatusFilterChange,
  onAddSystem,
  onEditSystem,
  onToggleStatus,
}: SystemListTabProps) {
  // Lookups
  const clientsMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const projectsMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // Available projects for the currently selected client
  const availableProjects = useMemo(() => {
    if (!selectedClientId || selectedClientId === "all") return projects;
    return projects.filter((p) => p.clientId === selectedClientId);
  }, [projects, selectedClientId]);

  // Filtered systems
  const filteredSystems = useMemo(() => {
    return systems.filter((s) => {
      if (selectedClientId && selectedClientId !== "all" && s.clientId !== selectedClientId) {
        return false;
      }
      if (selectedProjectId && selectedProjectId !== "all" && s.projectId !== selectedProjectId) {
        return false;
      }
      if (criticalityFilter !== "all" && s.criticality !== criticalityFilter) {
        return false;
      }
      if (environmentFilter !== "all" && s.environment !== environmentFilter) {
        return false;
      }
      if (statusFilter !== "all" && s.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const p = projectsMap.get(s.projectId);
        const c = clientsMap.get(s.clientId);
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesProj = p ? p.name.toLowerCase().includes(q) : false;
        const matchesClient = c ? c.name.toLowerCase().includes(q) : false;
        return matchesName || matchesProj || matchesClient;
      }
      return true;
    });
  }, [
    systems,
    selectedClientId,
    selectedProjectId,
    criticalityFilter,
    environmentFilter,
    statusFilter,
    search,
    projectsMap,
    clientsMap,
  ]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-2.5 flex-wrap p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
          {/* Client Filter */}
          <select
            value={selectedClientId || "all"}
            onChange={(e) => {
              onSelectedClientIdChange(e.target.value);
              onSelectedProjectIdChange("all");
            }}
            aria-label="Filter berdasarkan klien"
            className="h-[36px] px-2.5 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer font-medium"
          >
            <option value="all">Semua Klien ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.shortName || c.name}
              </option>
            ))}
          </select>

          {/* Project Filter */}
          <select
            value={selectedProjectId || "all"}
            onChange={(e) => onSelectedProjectIdChange(e.target.value)}
            aria-label="Filter berdasarkan proyek"
            className="h-[36px] px-2.5 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer font-medium"
          >
            <option value="all">Semua Proyek ({availableProjects.length})</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-[180px] max-w-[280px] flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari nama sistem..."
              aria-label="Cari sistem"
              className="w-full h-[36px] pl-8 pr-3 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Criticality */}
          <select
            value={criticalityFilter}
            onChange={(e) => onCriticalityFilterChange(e.target.value)}
            aria-label="Filter kriticalitas"
            className="h-[36px] px-2.5 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="all">Kriticalitas: Semua</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Environment */}
          <select
            value={environmentFilter}
            onChange={(e) => onEnvironmentFilterChange(e.target.value)}
            aria-label="Filter environment"
            className="h-[36px] px-2.5 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="all">Env: Semua</option>
            <option value="Production">Production</option>
            <option value="Staging">Staging</option>
            <option value="DRC">DRC</option>
          </select>

          {/* Add System */}
          <button
            type="button"
            onClick={onAddSystem}
            className="inline-flex items-center gap-1.5 h-[36px] px-3.5 rounded-lg text-[12px] font-bold text-white bg-sky-500 hover:bg-sky-400 transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] cursor-pointer"
          >
            <Plus size={15} />
            <span>Sistem Baru</span>
          </button>
        </div>
      </div>

      {/* ── Table View ── */}
      {filteredSystems.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center gap-3">
          <span className="p-3 rounded-full bg-slate-800 text-slate-400">
            <Cpu size={24} />
          </span>
          <p className="text-[14px] font-bold text-slate-200">Tidak ada sistem ditemukan</p>
          <p className="text-[12px] text-slate-400 max-w-sm">
            Coba sesuaikan kombinasi filter klien, proyek, atau kriticalitas di atas.
          </p>
          <button
            type="button"
            onClick={() => {
              onSelectedClientIdChange("all");
              onSelectedProjectIdChange("all");
              onSearchChange("");
              onCriticalityFilterChange("all");
              onEnvironmentFilterChange("all");
              onStatusFilterChange("all");
            }}
            className="mt-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-sky-400 bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/20 transition-colors cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden shadow-lg">
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/90 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Nama Sistem</th>
                  <th className="p-3.5">Proyek Layanan</th>
                  <th className="p-3.5">Klien</th>
                  <th className="p-3.5">Kriticalitas</th>
                  <th className="p-3.5">Environment</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSystems.map((sys) => {
                  const client = clientsMap.get(sys.clientId);
                  const project = projectsMap.get(sys.projectId);

                  return (
                    <tr key={sys.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                        <Cpu size={14} className="text-slate-400 shrink-0" />
                        <span>{sys.name}</span>
                      </td>

                      <td className="p-3.5">
                        {project ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
                            <Layers size={12} className="text-sky-400 shrink-0" />
                            <span>{project.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {client ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-300">
                            <Building2 size={12} className="text-slate-400 shrink-0" />
                            <span>{client.shortName || client.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            CRITICALITY_BADGES[sys.criticality] || CRITICALITY_BADGES.high
                          }`}
                        >
                          {sys.criticality}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {sys.environment}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            sys.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : sys.status === "maintenance"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-slate-500/20 text-slate-400 border border-slate-500/40"
                          }`}
                        >
                          {sys.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => onEditSystem(sys)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ubah sistem"
                            aria-label={`Ubah sistem ${sys.name}`}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(sys)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title={`Ubah status (saat ini: ${sys.status})`}
                            aria-label={`Ubah status sistem ${sys.name}`}
                          >
                            <Power size={14} />
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
