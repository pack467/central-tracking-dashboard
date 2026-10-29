"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useToast } from "@/app/components/ui/Toast";
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
  ClientStatus,
  ProjectStatus,
  SystemStatus,
} from "@/app/types/master-data";
import { masterDataService } from "@/app/services/master-data";
import { masterRepository } from "@/app/services/master-data-repository";
import { isMockMode } from "@/app/lib/config";
import { useAuth } from "@/app/lib/auth";
import { masterDataV2 } from "@/app/services/master-data-v2";
import {
  SEED_MASTER_CLIENTS,
  SEED_MASTER_PROJECTS,
  SEED_MASTER_SYSTEMS,
} from "@/app/lib/masterDataSeeds";

export type { ClientOrganization } from "@/app/types/master-data";

export const CLIENT_ORGANIZATIONS: readonly ClientOrganization[] = SEED_MASTER_CLIENTS;

export type ClientId = string;

export interface ClientContextValue {
  activeClient: ClientOrganization;
  activeClientId: ClientId;
  /** Active (non-archived, non-inactive) clients for selectors */
  clients: readonly ClientOrganization[];
  /** All clients including archived & inactive */
  allClients: readonly ClientOrganization[];
  projects: readonly ProjectMaster[];
  systems: readonly SystemMaster[];
  setActiveClientId: (id: ClientId) => void;
  isClientReady: boolean;

  // Master Data Mutators
  addClient: (data: CreateClientInput) => Promise<ClientOrganization>;
  updateClient: (id: string, updates: UpdateClientInput) => Promise<ClientOrganization>;
  archiveClient: (id: string) => Promise<ClientOrganization>;
  restoreClient: (id: string) => Promise<ClientOrganization>;
  setClientStatus: (id: string, status: ClientStatus) => Promise<ClientOrganization>;

  addProject: (data: CreateProjectInput) => Promise<ProjectMaster>;
  updateProject: (id: string, updates: UpdateProjectInput) => Promise<ProjectMaster>;
  archiveProject: (id: string) => Promise<ProjectMaster>;
  restoreProject: (id: string) => Promise<ProjectMaster>;
  setProjectStatus: (id: string, status: ProjectStatus) => Promise<ProjectMaster>;

  addSystem: (data: CreateSystemInput) => Promise<SystemMaster>;
  updateSystem: (id: string, updates: UpdateSystemInput) => Promise<SystemMaster>;
  setSystemStatus: (id: string, status: SystemStatus) => Promise<SystemMaster>;

  refreshMasterData: () => Promise<void>;
  getProjectsForClient: (clientId?: string, includeArchived?: boolean) => ProjectMaster[];
  getSystemsForClient: (clientId?: string, projectId?: string, includeArchived?: boolean) => SystemMaster[];
}

const ClientContext = createContext<ClientContextValue | null>(null);

const STORAGE_ACTIVE_CLIENT_KEY = "ctd.activeClientId";
const MASTER_DATA_STORAGE_KEY = "ctd.masterData.v2";
const DEFAULT_CLIENT_ID: ClientId = "tritronik";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const notify = useToast();
  const { user } = useAuth();
  useEffect(() => { if (user) masterRepository.setActor(user); }, [user]);
  const [activeClientId, setActiveClientIdState] = useState<ClientId>(DEFAULT_CLIENT_ID);
  const [allClients, setAllClients] = useState<ClientOrganization[]>([...SEED_MASTER_CLIENTS]);
  const [projects, setProjects] = useState<ProjectMaster[]>([...SEED_MASTER_PROJECTS]);
  const [systems, setSystems] = useState<SystemMaster[]>([...SEED_MASTER_SYSTEMS]);
  const [isClientReady, setIsClientReady] = useState(false);
  const isHydratedRef = useRef(false);

  // Load initial master data from service
  const loadMasterData = useCallback(async (isInitial = false) => {
    try {
      if (!isMockMode()) {
        await masterDataV2.catalog();
        setAllClients(masterRepository.legacyClients());
        setProjects(masterRepository.legacyProjects());
        setSystems(masterRepository.legacySystems());
        return;
      }
      const [fetchedClients, fetchedProjects, fetchedSystems] = await Promise.all([
        masterDataService.listClients(),
        masterDataService.listProjects(),
        masterDataService.listSystems(),
      ]);

      if (fetchedClients) {
        setAllClients(fetchedClients);
      }
      if (fetchedProjects) {
        setProjects(fetchedProjects);
      }
      if (fetchedSystems) {
        setSystems(fetchedSystems);
      }
    } catch (err) {
      if (!isMockMode()) masterRepository.failed(err);
      console.error("Gagal memuat master data:", err);
    } finally {
      if (isInitial) {
        setIsClientReady(true);
      }
    }
  }, []);

  useEffect(() => {
    const update = () => {
      setAllClients(masterRepository.legacyClients());
      setProjects(masterRepository.legacyProjects());
      setSystems(masterRepository.legacySystems());
    };
    const unsubscribe = masterRepository.subscribe(update);
    masterRepository.bootstrap();
    update();
    return unsubscribe;
  }, []);

  // Client-safe hydration: load localStorage after initial mount
  useEffect(() => {
    try {
      const savedActive = window.localStorage.getItem(STORAGE_ACTIVE_CLIENT_KEY);
      if (savedActive) {
        setActiveClientIdState(savedActive as ClientId);
      }
    } catch {
      // Ignore storage errors
    }

    void loadMasterData(true);
    isHydratedRef.current = true;

    // Cross-tab synchronization via storage event
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === MASTER_DATA_STORAGE_KEY) {
        void loadMasterData(false);
      } else if (event.key === STORAGE_ACTIVE_CLIENT_KEY && event.newValue) {
        setActiveClientIdState(event.newValue as ClientId);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadMasterData]);

  const setActiveClientId = useCallback((id: ClientId) => {
    setActiveClientIdState(id);
    try {
      window.localStorage.setItem(STORAGE_ACTIVE_CLIENT_KEY, id);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Active clients for selectors (only "active")
  const activeClients = useMemo(() => {
    const list = allClients.filter((c) => c.status === "active");
    return list;
  }, [allClients]);

  const activeClient = useMemo(() => {
    const found = allClients.find((c) => c.id === activeClientId);
    if (found && found.status === "active") return found;
    // Fallback to first active client if current is archived or missing
    return activeClients[0] || allClients[0] || SEED_MASTER_CLIENTS[0];
  }, [activeClientId, allClients, activeClients]);

  // Auto-switch client if active client becomes archived
  useEffect(() => {
    if (!isClientReady) return;
    const current = allClients.find((c) => c.id === activeClientId);
    if (current && current.status !== "active") {
      const fallback = activeClients[0];
      if (fallback && fallback.id !== activeClientId) {
        setActiveClientId(fallback.id);
        notify.warning(
          `Klien "${current.shortName || current.name}" telah diarsipkan/dinonaktifkan. Otomatis beralih ke: ${
            fallback.shortName || fallback.name
          }.`,
          { id: "active-client-switched", duration: 5000 },
        );
      }
    }
  }, [activeClientId, allClients, activeClients, setActiveClientId, isClientReady, notify]);

  // Filter helpers
  const getProjectsForClient = useCallback(
    (clientId?: string, includeArchived = false) => {
      const targetId = clientId && clientId !== "all" ? clientId : undefined;
      return projects.filter((p) => {
        if (targetId && p.clientId !== targetId) return false;
        if (!includeArchived && p.status === "archived") return false;
        if (!includeArchived && !allClients.some(c => c.id === p.clientId && c.status === "active")) return false;
        return true;
      });
    },
    [projects, allClients],
  );

  const getSystemsForClient = useCallback(
    (clientId?: string, projectId?: string, includeArchived = false) => {
      const targetClientId = clientId && clientId !== "all" ? clientId : undefined;
      const targetProjectId = projectId && projectId !== "all" ? projectId : undefined;
      return systems.filter((s) => {
        if (targetClientId && s.clientId !== targetClientId) return false;
        if (targetProjectId && s.projectId !== targetProjectId) return false;
        if (!includeArchived && s.status === "deprecated") return false;
        if (!includeArchived && (!projects.some(p => p.id === s.projectId && p.status === "active") || !allClients.some(c => c.id === s.clientId && c.status === "active"))) return false;
        return true;
      });
    },
    [systems, projects, allClients],
  );

  // ── Mutasi: Clients ──
  const addClient = useCallback(
    async (data: CreateClientInput): Promise<ClientOrganization> => {
      try {
        const created = await masterDataService.createClient(data);
        setAllClients((prev) => [created, ...prev]);
        notify.success(`Klien "${created.shortName || created.name}" berhasil ditambahkan.`);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menambahkan klien";
        notify.critical(msg);
        throw err;
      }
    },
    [notify],
  );

  const updateClient = useCallback(
    async (id: string, updates: UpdateClientInput): Promise<ClientOrganization> => {
      const previous = allClients;
      // Optimistic update
      setAllClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c)),
      );
      try {
        const updated = await masterDataService.updateClient(id, updates);
        setAllClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
        notify.success(`Klien "${updated.shortName || updated.name}" berhasil diperbarui.`);
        return updated;
      } catch (err: unknown) {
        // Rollback
        setAllClients(previous);
        const msg = err instanceof Error ? err.message : "Gagal memperbarui klien";
        notify.critical(msg);
        throw err;
      }
    },
    [allClients, notify],
  );

  const setClientStatus = useCallback(
    async (id: string, status: ClientStatus): Promise<ClientOrganization> => {
      const previous = allClients;
      // Optimistic
      setAllClients((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c)),
      );
      try {
        const updated = await masterDataService.setClientStatus(id, status);
        setAllClients((prev) => prev.map((c) => (c.id === id ? updated : c)));
        const label = status === "archived" ? "diarsipkan" : status === "active" ? "diaktifkan" : "dinonaktifkan";
        notify.success(`Klien "${updated.shortName || updated.name}" berhasil ${label}.`);
        return updated;
      } catch (err: unknown) {
        setAllClients(previous);
        const msg = err instanceof Error ? err.message : "Gagal mengubah status klien";
        notify.critical(msg);
        throw err;
      }
    },
    [allClients, notify],
  );

  const archiveClient = useCallback((id: string) => setClientStatus(id, "archived"), [setClientStatus]);
  const restoreClient = useCallback((id: string) => setClientStatus(id, "active"), [setClientStatus]);

  // ── Mutasi: Projects ──
  const addProject = useCallback(
    async (data: CreateProjectInput): Promise<ProjectMaster> => {
      try {
        const created = await masterDataService.createProject(data);
        setProjects((prev) => [created, ...prev]);
        notify.success(`Proyek "${created.name}" berhasil ditambahkan.`);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menambahkan proyek";
        notify.critical(msg);
        throw err;
      }
    },
    [notify],
  );

  const updateProject = useCallback(
    async (id: string, updates: UpdateProjectInput): Promise<ProjectMaster> => {
      const previous = projects;
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)),
      );
      try {
        const updated = await masterDataService.updateProject(id, updates);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        notify.success(`Proyek "${updated.name}" berhasil diperbarui.`);
        return updated;
      } catch (err: unknown) {
        setProjects(previous);
        const msg = err instanceof Error ? err.message : "Gagal memperbarui proyek";
        notify.critical(msg);
        throw err;
      }
    },
    [projects, notify],
  );

  const setProjectStatus = useCallback(
    async (id: string, status: ProjectStatus): Promise<ProjectMaster> => {
      const previous = projects;
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p)),
      );
      try {
        const updated = await masterDataService.setProjectStatus(id, status);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        const label = status === "archived" ? "diarsipkan" : "diaktifkan";
        notify.success(`Proyek "${updated.name}" berhasil ${label}.`);
        return updated;
      } catch (err: unknown) {
        setProjects(previous);
        const msg = err instanceof Error ? err.message : "Gagal mengubah status proyek";
        notify.critical(msg);
        throw err;
      }
    },
    [projects, notify],
  );

  const archiveProject = useCallback((id: string) => setProjectStatus(id, "archived"), [setProjectStatus]);
  const restoreProject = useCallback((id: string) => setProjectStatus(id, "active"), [setProjectStatus]);

  // ── Mutasi: Systems ──
  const addSystem = useCallback(
    async (data: CreateSystemInput): Promise<SystemMaster> => {
      try {
        const created = await masterDataService.createSystem(data);
        setSystems((prev) => [created, ...prev]);
        notify.success(`Sistem "${created.name}" berhasil ditambahkan.`);
        return created;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal menambahkan sistem";
        notify.critical(msg);
        throw err;
      }
    },
    [notify],
  );

  const updateSystem = useCallback(
    async (id: string, updates: UpdateSystemInput): Promise<SystemMaster> => {
      const previous = systems;
      setSystems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s)),
      );
      try {
        const updated = await masterDataService.updateSystem(id, updates);
        setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
        notify.success(`Sistem "${updated.name}" berhasil diperbarui.`);
        return updated;
      } catch (err: unknown) {
        setSystems(previous);
        const msg = err instanceof Error ? err.message : "Gagal memperbarui sistem";
        notify.critical(msg);
        throw err;
      }
    },
    [systems, notify],
  );

  const setSystemStatus = useCallback(
    async (id: string, status: SystemStatus): Promise<SystemMaster> => {
      const previous = systems;
      setSystems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s)),
      );
      try {
        const updated = await masterDataService.setSystemStatus(id, status);
        setSystems((prev) => prev.map((s) => (s.id === id ? updated : s)));
        notify.success(`Status sistem "${updated.name}" diubah ke ${status}.`);
        return updated;
      } catch (err: unknown) {
        setSystems(previous);
        const msg = err instanceof Error ? err.message : "Gagal mengubah status sistem";
        notify.critical(msg);
        throw err;
      }
    },
    [systems, notify],
  );

  const refreshMasterData = useCallback(async () => {
    await loadMasterData(false);
  }, [loadMasterData]);

  const value = useMemo<ClientContextValue>(
    () => ({
      activeClient,
      activeClientId,
      clients: activeClients,
      allClients,
      projects,
      systems,
      setActiveClientId,
      isClientReady,
      addClient,
      updateClient,
      archiveClient,
      restoreClient,
      setClientStatus,
      addProject,
      updateProject,
      archiveProject,
      restoreProject,
      setProjectStatus,
      addSystem,
      updateSystem,
      setSystemStatus,
      refreshMasterData,
      getProjectsForClient,
      getSystemsForClient,
    }),
    [
      activeClient,
      activeClientId,
      activeClients,
      allClients,
      projects,
      systems,
      setActiveClientId,
      isClientReady,
      addClient,
      updateClient,
      archiveClient,
      restoreClient,
      setClientStatus,
      addProject,
      updateProject,
      archiveProject,
      restoreProject,
      setProjectStatus,
      addSystem,
      updateSystem,
      setSystemStatus,
      refreshMasterData,
      getProjectsForClient,
      getSystemsForClient,
    ],
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error("useClient must be used within a ClientProvider");
  }
  return context;
}
