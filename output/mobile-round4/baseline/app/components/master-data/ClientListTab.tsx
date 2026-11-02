"use client";

import { Select } from "@/app/components/ui/Select";

import { useState, useMemo, useEffect } from "react";
import { Search, Plus, LayoutGrid, Table as TableIcon, Building2, Mail, Phone, Edit3, Layers, Archive, RefreshCw, Copy, Check, User } from "lucide-react";
import type { ClientOrganization, ProjectMaster, SystemMaster } from "@/app/types/master-data";
import { useToast } from "@/app/components/ui/Toast";

interface ClientListTabProps {
  clients: readonly ClientOrganization[];
  projects: readonly ProjectMaster[];
  systems: readonly SystemMaster[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onAddClient: () => void;
  onEditClient: (client: ClientOrganization) => void;
  onManageProjects: (clientId: string) => void;
  onToggleArchive: (client: ClientOrganization) => void;
}

const STORAGE_VIEW_KEY = "ctd.masterData.clientViewMode";

export function ClientListTab({
  clients,
  projects,
  systems,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onAddClient,
  onEditClient,
  onManageProjects,
  onToggleArchive,
}: ClientListTabProps) {
  const notify = useToast();
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Restore preferred view mode from localStorage
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_VIEW_KEY);
      if (saved === "table" || saved === "card") {
        setViewMode(saved);
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleToggleView = (mode: "card" | "table") => {
    setViewMode(mode);
    try {
      window.localStorage.setItem(STORAGE_VIEW_KEY, mode);
    } catch {
      // Ignore
    }
  };

  const handleCopy = (text: string, id: string, label: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify.info(`${label} disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Status filter
      if (statusFilter !== "all") {
        if (c.status !== statusFilter) return false;
      }
      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q);
        const matchesCode = c.code.toLowerCase().includes(q);
        const matchesPic = c.picName.toLowerCase().includes(q) || c.picEmail.toLowerCase().includes(q);
        return matchesName || matchesCode || matchesPic;
      }
      return true;
    });
  }, [clients, search, statusFilter]);

  // Counts map for projects and systems per client
  const clientStats = useMemo(() => {
    const stats: Record<string, { projectsCount: number; systemsCount: number }> = {};
    for (const c of clients) {
      const pCount = projects.filter((p) => p.clientId === c.id && p.status === "active").length;
      const sCount = systems.filter((s) => s.clientId === c.id && s.status !== "deprecated").length;
      stats[c.id] = { projectsCount: pCount, systemsCount: sCount };
    }
    return stats;
  }, [clients, projects, systems]);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-xl bg-slate-900/60 border border-slate-700/60">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px] max-w-[480px]">
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
              placeholder="Cari nama klien, kode (BNI), PIC, email..."
              aria-label="Cari klien"
              className="w-full h-[36px] pl-9 pr-3 rounded-lg text-[12.5px] bg-slate-800/80 border border-slate-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            aria-label="Filter status klien"
            className="h-[36px] px-3 rounded-lg text-[12px] bg-slate-800/80 border border-slate-700/80 text-slate-200 focus:outline-none focus:border-sky-400 cursor-pointer"
          >
            <option value="all">Semua Status ({clients.length})</option>
            <option value="active">Aktif ({clients.filter((c) => c.status === "active").length})</option>
            <option value="inactive">Nonaktif ({clients.filter((c) => c.status === "inactive").length})</option>
            <option value="archived">Arsip ({clients.filter((c) => c.status === "archived").length})</option>
          </Select>

          {/* View Toggle */}
          <div
            className="inline-flex items-center p-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80"
            role="group"
            aria-label="Tampilan kartu atau tabel"
          >
            <button
              type="button"
              onClick={() => handleToggleView("card")}
              className={`p-1.5 rounded-md text-[12px] transition-colors cursor-pointer ${
                viewMode === "card"
                  ? "bg-sky-500/20 text-sky-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Tampilan Kartu"
              aria-pressed={viewMode === "card"}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleToggleView("table")}
              className={`p-1.5 rounded-md text-[12px] transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-sky-500/20 text-sky-400 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Tampilan Tabel"
              aria-pressed={viewMode === "table"}
            >
              <TableIcon size={15} />
            </button>
          </div>

          {/* Add Client Button */}
          <button
            type="button"
            onClick={onAddClient}
            className="inline-flex items-center gap-1.5 h-[36px] px-3.5 rounded-lg text-[12px] font-bold text-white bg-sky-500 hover:bg-sky-400 transition-all shadow-[0_0_12px_rgba(56,189,248,0.25)] cursor-pointer"
          >
            <Plus size={15} />
            <span>Klien Baru</span>
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      {filteredClients.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800 flex flex-col items-center justify-center gap-3">
          <span className="p-3 rounded-full bg-slate-800 text-slate-400">
            <Building2 size={24} />
          </span>
          <p className="text-[14px] font-bold text-slate-200">Tidak ada klien ditemukan</p>
          <p className="text-[12px] text-slate-400 max-w-sm">
            {search || statusFilter !== "all"
              ? "Coba ubah kata kunci pencarian atau reset filter status."
              : "Belum ada organisasi klien yang terdaftar."}
          </p>
          {(search || statusFilter !== "all") && (
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
          )}
        </div>
      ) : viewMode === "card" ? (
        /* ── Cards View ── */
        <div className="grid grid-cols-3 max-[1200px]:grid-cols-2 max-[700px]:grid-cols-1 gap-4">
          {filteredClients.map((client) => {
            const isArchived = client.status === "archived";
            const isInactive = client.status === "inactive";
            const stats = clientStats[client.id] || { projectsCount: 0, systemsCount: 0 };

            return (
              <div
                key={client.id}
                className="flex flex-col justify-between p-4 rounded-xl bg-[#1e293b]/90 border border-[#334155] shadow-lg hover:border-slate-600 transition-all text-slate-100"
              >
                <div>
                  {/* Card Top: Code badge, Tier & Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400">
                        {client.code}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {client.tier}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        client.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : isArchived
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  {/* Name & Description */}
                  <h3 className="text-[15px] font-bold text-slate-100 leading-snug line-clamp-1" title={client.name}>
                    {client.name}
                  </h3>
                  <p className="text-[12px] text-slate-400 line-clamp-2 mt-1 mb-3.5 leading-relaxed">
                    {client.description || client.tagline || "Enterprise Managed Service"}
                  </p>

                  {/* PIC Info Box */}
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11.5px] flex flex-col gap-1.5 mb-3.5">
                    <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                      <User size={12} className="text-sky-400 shrink-0" />
                      <span className="truncate">{client.picName}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-slate-400">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Mail size={12} className="shrink-0" />
                        <span className="truncate">{client.picEmail}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(client.picEmail, `email-${client.id}`, "Email PIC")}
                        className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                        title="Salin email"
                        aria-label="Salin email PIC"
                      >
                        {copiedId === `email-${client.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>

                    {client.picPhone && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Phone size={12} className="shrink-0" />
                        <span className="truncate">{client.picPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Statistics Counters */}
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-900/30 border border-slate-800/80 text-[11.5px] text-center mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Proyek Aktif</span>
                      <strong className="text-[14px] font-mono text-slate-100">{stats.projectsCount}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Sistem Monitored</span>
                      <strong className="text-[14px] font-mono text-slate-100">{stats.systemsCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-700/60 mt-auto">
                  <button
                    type="button"
                    onClick={() => onManageProjects(client.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                    title={`Lihat proyek untuk ${client.name}`}
                  >
                    <Layers size={13} />
                    <span>Kelola Proyek</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditClient(client)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Ubah info klien"
                      aria-label="Ubah info klien"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleArchive(client)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isArchived
                          ? "text-emerald-400 hover:bg-emerald-500/15"
                          : "text-rose-400 hover:bg-rose-500/15"
                      }`}
                      title={isArchived ? "Pulihkan klien" : "Arsipkan klien"}
                      aria-label={isArchived ? "Pulihkan klien" : "Arsipkan klien"}
                    >
                      {isArchived ? <RefreshCw size={14} /> : <Archive size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table View ── */
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden shadow-lg">
          <div className="overflow-x-auto [scrollbar-width:thin]">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-slate-700/80 bg-slate-900/90 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="p-3.5">Kode &amp; Nama</th>
                  <th className="p-3.5">Tier</th>
                  <th className="p-3.5">PIC / Kontak</th>
                  <th className="p-3.5 text-center">Proyek</th>
                  <th className="p-3.5 text-center">Sistem</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredClients.map((client) => {
                  const isArchived = client.status === "archived";
                  const stats = clientStats[client.id] || { projectsCount: 0, systemsCount: 0 };

                  return (
                    <tr key={client.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                            {client.code}
                          </span>
                          <span className="font-semibold text-slate-100">{client.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-300">{client.tier}</td>
                      <td className="p-3.5">
                        <div className="flex flex-col leading-tight">
                          <span className="font-medium text-slate-200">{client.picName}</span>
                          <span className="text-[11px] text-slate-400">{client.picEmail}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-200">
                        {stats.projectsCount}
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-200">
                        {stats.systemsCount}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            client.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : isArchived
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {client.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => onManageProjects(client.id)}
                            className="p-1.5 rounded-md text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                            title="Kelola Proyek"
                            aria-label={`Kelola proyek untuk ${client.name}`}
                          >
                            <Layers size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditClient(client)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Ubah Klien"
                            aria-label={`Ubah klien ${client.name}`}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleArchive(client)}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isArchived
                                ? "text-emerald-400 hover:bg-emerald-500/10"
                                : "text-rose-400 hover:bg-rose-500/10"
                            }`}
                            title={isArchived ? "Pulihkan klien" : "Arsipkan klien"}
                            aria-label={isArchived ? "Pulihkan klien" : "Arsipkan klien"}
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
