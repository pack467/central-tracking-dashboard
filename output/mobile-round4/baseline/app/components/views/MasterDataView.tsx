"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Database,
  Building2,
  Layers,
  Cpu,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { useClient } from "@/app/context/ClientContext";
import { useAppData } from "@/app/components/routing/AppShell";
import { paths, routes, type MasterDataTab } from "@/app/lib/routes";
import { getClientMonitoringSchedule } from "@/app/lib/clientData";
import { isOpenTicket } from "@/app/lib/data";
import type {
  ClientOrganization,
  ProjectMaster,
  SystemMaster,
  CreateClientInput,
  UpdateClientInput,
  CreateProjectInput,
  UpdateProjectInput,
  CreateSystemInput,
  UpdateSystemInput,
} from "@/app/types/master-data";

// Subcomponents
import { ClientListTab } from "@/app/components/master-data/ClientListTab";
import { ProjectListTab } from "@/app/components/master-data/ProjectListTab";
import { SystemListTab } from "@/app/components/master-data/SystemListTab";
import { ClientFormModal } from "@/app/components/master-data/ClientFormModal";
import { ProjectFormModal } from "@/app/components/master-data/ProjectFormModal";
import { SystemFormModal } from "@/app/components/master-data/SystemFormModal";
import { ProjectDetailDrawer } from "@/app/components/master-data/ProjectDetailDrawer";
import { ConfirmArchiveDialog } from "@/app/components/master-data/ConfirmArchiveDialog";

export function MasterDataView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // App shell data (for ticket impact checks)
  const appData = useAppData();
  const appDataTickets = appData?.tickets || [];

  // ClientContext
  const {
    allClients,
    clients: activeClients,
    projects,
    systems,
    activeClientId,
    addClient,
    updateClient,
    archiveClient,
    restoreClient,
    addProject,
    updateProject,
    archiveProject,
    restoreProject,
    addSystem,
    updateSystem,
    setSystemStatus,
  } = useClient();

  // URL state
  const rawTab = searchParams.get("tab");
  const activeTab: MasterDataTab =
    rawTab === "projects" || rawTab === "systems" ? rawTab : "clients";
  const urlClientFilter = searchParams.get("client") || "";

  // Filter & Search states
  const [clientSearch, setClientSearch] = useState("");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");

  const [projectSearch, setProjectSearch] = useState("");
  const [internalProjectClient, setInternalProjectClient] = useState<string>("");
  const projectClientFilter = internalProjectClient || urlClientFilter || activeClientId || "all";
  const [projectStatusFilter, setProjectStatusFilter] = useState("all");

  const [systemSearch, setSystemSearch] = useState("");
  const [internalSystemClient, setInternalSystemClient] = useState<string>("");
  const systemClientFilter = internalSystemClient || urlClientFilter || activeClientId || "all";
  const [systemProjectFilter, setSystemProjectFilter] = useState("all");
  const [systemCritFilter, setSystemCritFilter] = useState("all");
  const [systemEnvFilter, setSystemEnvFilter] = useState("all");
  const [systemStatusFilter, setSystemStatusFilter] = useState("all");

  // Tab navigation with keyboard support
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const switchTab = useCallback(
    (tab: MasterDataTab, clientParam?: string) => {
      const url = routes.masterData(tab, clientParam !== undefined ? clientParam : urlClientFilter);
      router.replace(url, { scroll: false });
    },
    [router, urlClientFilter],
  );

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    const tabs: MasterDataTab[] = ["clients", "projects", "systems"];
    let nextIndex = index;

    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabButtonRefs.current[nextIndex]?.focus();
    switchTab(tabs[nextIndex]);
  };

  // Modals & Drawers state
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientOrganization | null>(null);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectMaster | null>(null);
  const [projectDefaultClient, setProjectDefaultClient] = useState("");

  const [systemModalOpen, setSystemModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<SystemMaster | null>(null);

  const [detailProject, setDetailProject] = useState<ProjectMaster | null>(null);

  // Archive confirmation state
  const [archiveDialogConfig, setArchiveDialogConfig] = useState<{
    open: boolean;
    title: string;
    itemName: string;
    itemType: "klien" | "proyek" | "sistem";
    action: "archive" | "restore" | "deactivate";
    activeTicketsCount: number;
    activeCheckpointsCount: number;
    subItemsCount: number;
    subItemLabel: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: "",
    itemName: "",
    itemType: "klien",
    action: "archive",
    activeTicketsCount: 0,
    activeCheckpointsCount: 0,
    subItemsCount: 0,
    subItemLabel: "",
    onConfirm: () => {},
  });

  // Client actions
  const handleOpenAddClient = () => {
    setEditingClient(null);
    setClientModalOpen(true);
  };

  const handleOpenEditClient = (client: ClientOrganization) => {
    setEditingClient(client);
    setClientModalOpen(true);
  };

  const handleToggleArchiveClient = (client: ClientOrganization) => {
    const isArchive = client.status === "active";
    const clientProjects = projects.filter((p) => p.clientId === client.id);
    const activeClientTickets = appDataTickets.filter(
      (t) => t.clientId === client.id && isOpenTicket(t),
    ).length;
    const clientSchedule = getClientMonitoringSchedule(client.id);

    setArchiveDialogConfig({
      open: true,
      title: isArchive ? `Arsipkan Klien: ${client.name}` : `Aktifkan Klien: ${client.name}`,
      itemName: client.name,
      itemType: "klien",
      action: isArchive ? "archive" : "restore",
      activeTicketsCount: activeClientTickets,
      activeCheckpointsCount: clientSchedule.length,
      subItemsCount: clientProjects.length,
      subItemLabel: "proyek layanan",
      onConfirm: async () => {
        if (isArchive) {
          await archiveClient(client.id);
        } else {
          await restoreClient(client.id);
        }
        setArchiveDialogConfig((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const handleManageProjectsForClient = (clientId: string) => {
    setInternalProjectClient(clientId);
    switchTab("projects", clientId);
  };

  // Project actions
  const handleOpenAddProject = (preselectedClient?: string) => {
    setEditingProject(null);
    setProjectDefaultClient(
      preselectedClient || (projectClientFilter !== "all" ? projectClientFilter : activeClientId),
    );
    setProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: ProjectMaster) => {
    setEditingProject(project);
    setProjectDefaultClient(project.clientId);
    setProjectModalOpen(true);
  };

  const handleToggleArchiveProject = (project: ProjectMaster) => {
    const isArchive = project.status === "active";
    const activeProjectTickets = appDataTickets.filter(
      (t) => t.project === project.name && isOpenTicket(t),
    ).length;
    const clientSchedule = getClientMonitoringSchedule(project.clientId);
    const projectCheckpoints = clientSchedule.filter((s) => s.project === project.name).length;
    const projectSystems = systems.filter((s) => s.projectId === project.id);

    setArchiveDialogConfig({
      open: true,
      title: isArchive ? `Arsipkan Proyek: ${project.name}` : `Aktifkan Proyek: ${project.name}`,
      itemName: project.name,
      itemType: "proyek",
      action: isArchive ? "archive" : "restore",
      activeTicketsCount: activeProjectTickets,
      activeCheckpointsCount: projectCheckpoints,
      subItemsCount: projectSystems.length,
      subItemLabel: "sistem terkait",
      onConfirm: async () => {
        if (isArchive) {
          await archiveProject(project.id);
        } else {
          await restoreProject(project.id);
        }
        if (detailProject?.id === project.id) {
          setDetailProject(null);
        }
        setArchiveDialogConfig((prev) => ({ ...prev, open: false }));
      },
    });
  };

  // System actions
  const handleOpenAddSystem = () => {
    setEditingSystem(null);
    setSystemModalOpen(true);
  };

  const handleOpenEditSystem = (system: SystemMaster) => {
    setEditingSystem(system);
    setSystemModalOpen(true);
  };

  const handleToggleSystemStatus = async (system: SystemMaster) => {
    const nextStatus =
      system.status === "active" ? "maintenance" : system.status === "maintenance" ? "deprecated" : "active";
    await setSystemStatus(system.id, nextStatus);
  };

  // Current time for sync card
  const syncTime = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }, []);

  const tabLabel = activeTab === "clients" ? "Klien" : activeTab === "projects" ? "Proyek" : "Sistem";

  return (
    <div className="flex flex-col gap-6 w-full text-slate-100 pb-12">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col gap-2">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
          <Link href={paths.dashboard} className="hover:text-slate-200 transition-colors">
            Dashboard
          </Link>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="text-slate-300 font-semibold">Master Data</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="text-sky-400 font-bold">{tabLabel}</span>
        </nav>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[22px] font-extrabold text-white tracking-tight leading-snug flex items-center gap-2.5">
              <Database size={22} className="text-sky-400" />
              <span>Master Data</span>
            </h1>
            <p className="text-[12.5px] text-slate-400 mt-0.5">
              Klien, proyek, dan sistem
            </p>
          </div>
        </div>
      </div>

      {/* ── 4 Quick Metrics Cards ── */}
      <div className="grid grid-cols-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1 gap-3.5">
        <div className="p-3.5 rounded-xl bg-[#1e293b]/90 border border-[#334155] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Klien Aktif</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-[22px] font-mono font-extrabold text-slate-100">
                {activeClients.length}
              </strong>
              <span className="text-[11px] text-slate-400">/ {allClients.length} total</span>
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 grid place-items-center">
            <Building2 size={18} />
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1e293b]/90 border border-[#334155] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Proyek Layanan</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-[22px] font-mono font-extrabold text-slate-100">
                {projects.filter((p) => p.status === "active").length}
              </strong>
              <span className="text-[11px] text-slate-400">/ {projects.length} total</span>
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center">
            <Layers size={18} />
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1e293b]/90 border border-[#334155] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sistem Terpantau</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-[22px] font-mono font-extrabold text-slate-100">
                {systems.filter((s) => s.status === "active").length}
              </strong>
              <span className="text-[11px] text-slate-400">/ {systems.length} total</span>
            </div>
          </div>
          <span className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 grid place-items-center">
            <Cpu size={18} />
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1e293b]/90 border border-[#334155] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sinkronisasi</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <strong className="text-[14px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                <span>Tersimpan {syncTime}</span>
              </strong>
            </div>
            <span className="text-[10px] text-slate-400">Lokal &amp; Multi-tab aktif</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 grid place-items-center">
            <CheckCircle2 size={18} />
          </span>
        </div>
      </div>

      {/* ── Tab Bar Navigation ── */}
      <div
        className="flex items-center gap-2 border-b border-slate-700/80 pb-0 overflow-x-auto [scrollbar-width:none] shrink-0"
        role="tablist"
        aria-label="Navigasi kategori master data"
      >
        <button
          ref={(el) => {
            tabButtonRefs.current[0] = el;
          }}
          type="button"
          role="tab"
          id="tab-clients"
          aria-selected={activeTab === "clients"}
          aria-controls="tabpanel-clients"
          tabIndex={activeTab === "clients" ? 0 : -1}
          onClick={() => switchTab("clients")}
          onKeyDown={(e) => handleTabKeyDown(e, 0)}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold transition-all border-b-2 cursor-pointer select-none whitespace-nowrap ${
            activeTab === "clients"
              ? "border-sky-400 text-sky-400 bg-sky-500/10 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Building2 size={16} />
          <span>Klien / Organisasi</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-mono bg-slate-800 text-slate-300">
            {allClients.length}
          </span>
        </button>

        <button
          ref={(el) => {
            tabButtonRefs.current[1] = el;
          }}
          type="button"
          role="tab"
          id="tab-projects"
          aria-selected={activeTab === "projects"}
          aria-controls="tabpanel-projects"
          tabIndex={activeTab === "projects" ? 0 : -1}
          onClick={() => switchTab("projects")}
          onKeyDown={(e) => handleTabKeyDown(e, 1)}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold transition-all border-b-2 cursor-pointer select-none whitespace-nowrap ${
            activeTab === "projects"
              ? "border-sky-400 text-sky-400 bg-sky-500/10 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Layers size={16} />
          <span>Proyek &amp; Layanan</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-mono bg-slate-800 text-slate-300">
            {projects.length}
          </span>
        </button>

        <button
          ref={(el) => {
            tabButtonRefs.current[2] = el;
          }}
          type="button"
          role="tab"
          id="tab-systems"
          aria-selected={activeTab === "systems"}
          aria-controls="tabpanel-systems"
          tabIndex={activeTab === "systems" ? 0 : -1}
          onClick={() => switchTab("systems")}
          onKeyDown={(e) => handleTabKeyDown(e, 2)}
          className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold transition-all border-b-2 cursor-pointer select-none whitespace-nowrap ${
            activeTab === "systems"
              ? "border-sky-400 text-sky-400 bg-sky-500/10 rounded-t-lg"
              : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
        >
          <Cpu size={16} />
          <span>Sistem &amp; Sub-Layanan</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-mono bg-slate-800 text-slate-300">
            {systems.length}
          </span>
        </button>
      </div>

      {/* ── Active Tab Panel ── */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="w-full focus:outline-none"
        tabIndex={0}
      >
        {activeTab === "clients" && (
          <ClientListTab
            clients={allClients}
            projects={projects}
            systems={systems}
            search={clientSearch}
            onSearchChange={setClientSearch}
            statusFilter={clientStatusFilter}
            onStatusFilterChange={setClientStatusFilter}
            onAddClient={handleOpenAddClient}
            onEditClient={handleOpenEditClient}
            onManageProjects={handleManageProjectsForClient}
            onToggleArchive={handleToggleArchiveClient}
          />
        )}

        {activeTab === "projects" && (
          <ProjectListTab
            projects={projects}
            clients={allClients}
            systems={systems}
            schedules={getClientMonitoringSchedule(projectClientFilter !== "all" ? projectClientFilter : activeClientId)}
            selectedClientId={projectClientFilter}
            onSelectedClientIdChange={(id) => {
              setInternalProjectClient(id);
              switchTab("projects", id);
            }}
            search={projectSearch}
            onSearchChange={setProjectSearch}
            statusFilter={projectStatusFilter}
            onStatusFilterChange={setProjectStatusFilter}
            onAddProject={() => handleOpenAddProject()}
            onEditProject={handleOpenEditProject}
            onViewProjectDetail={(p) => setDetailProject(p)}
            onToggleArchive={handleToggleArchiveProject}
          />
        )}

        {activeTab === "systems" && (
          <SystemListTab
            systems={systems}
            projects={projects}
            clients={allClients}
            selectedClientId={systemClientFilter}
            onSelectedClientIdChange={(id) => {
              setInternalSystemClient(id);
              switchTab("systems", id);
            }}
            selectedProjectId={systemProjectFilter}
            onSelectedProjectIdChange={setSystemProjectFilter}
            search={systemSearch}
            onSearchChange={setSystemSearch}
            criticalityFilter={systemCritFilter}
            onCriticalityFilterChange={setSystemCritFilter}
            environmentFilter={systemEnvFilter}
            onEnvironmentFilterChange={setSystemEnvFilter}
            statusFilter={systemStatusFilter}
            onStatusFilterChange={setSystemStatusFilter}
            onAddSystem={handleOpenAddSystem}
            onEditSystem={handleOpenEditSystem}
            onToggleStatus={handleToggleSystemStatus}
          />
        )}
      </div>

      {/* ── Modal Dialogs ── */}
      {clientModalOpen && (
        <ClientFormModal
          open={clientModalOpen}
          initialData={editingClient}
          existingClients={allClients}
          onSave={async (data) => {
            if (editingClient) {
              await updateClient(editingClient.id, data as UpdateClientInput);
            } else {
              await addClient(data as CreateClientInput);
            }
          }}
          onClose={() => setClientModalOpen(false)}
        />
      )}

      {projectModalOpen && (
        <ProjectFormModal
          open={projectModalOpen}
          initialData={editingProject}
          defaultClientId={projectDefaultClient}
          clients={activeClients}
          existingProjects={projects}
          onSave={async (data) => {
            if (editingProject) {
              await updateProject(editingProject.id, data as UpdateProjectInput);
            } else {
              await addProject(data as CreateProjectInput);
            }
          }}
          onClose={() => setProjectModalOpen(false)}
        />
      )}

      {systemModalOpen && (
        <SystemFormModal
          open={systemModalOpen}
          initialData={editingSystem}
          defaultClientId={systemClientFilter !== "all" ? systemClientFilter : activeClientId}
          defaultProjectId={systemProjectFilter !== "all" ? systemProjectFilter : ""}
          clients={activeClients}
          projects={projects}
          onSave={async (data) => {
            if (editingSystem) {
              await updateSystem(editingSystem.id, data as UpdateSystemInput);
            } else {
              await addSystem(data as CreateSystemInput);
            }
          }}
          onClose={() => setSystemModalOpen(false)}
        />
      )}

      {/* ── Project Detail Slide-Out Drawer ── */}
      {detailProject && (
        <ProjectDetailDrawer
          project={detailProject}
          client={allClients.find((c) => c.id === detailProject.clientId)}
          systems={systems.filter((s) => s.projectId === detailProject.id)}
          checkpointCount={
            getClientMonitoringSchedule(detailProject.clientId).filter(
              (s) => s.project === detailProject.name,
            ).length
          }
          onClose={() => setDetailProject(null)}
          onEdit={(p) => {
            setDetailProject(null);
            handleOpenEditProject(p);
          }}
          onToggleArchive={(p) => {
            handleToggleArchiveProject(p);
          }}
        />
      )}

      {/* ── Confirm Archive Dialog ── */}
      {archiveDialogConfig.open && (
        <ConfirmArchiveDialog
          open={archiveDialogConfig.open}
          title={archiveDialogConfig.title}
          itemName={archiveDialogConfig.itemName}
          itemType={archiveDialogConfig.itemType}
          action={archiveDialogConfig.action}
          activeTicketsCount={archiveDialogConfig.activeTicketsCount}
          activeCheckpointsCount={archiveDialogConfig.activeCheckpointsCount}
          subItemsCount={archiveDialogConfig.subItemsCount}
          subItemLabel={archiveDialogConfig.subItemLabel}
          onConfirm={archiveDialogConfig.onConfirm}
          onClose={() => setArchiveDialogConfig((prev) => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
}
