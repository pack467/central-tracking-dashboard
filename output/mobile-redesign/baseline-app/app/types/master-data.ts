/**
 * Central Tracking Dashboard - Master Data Types
 *
 * Mendefinisikan kontrak tipe untuk Master Data:
 * - ClientOrganization (Organisasi Klien)
 * - ProjectMaster (Proyek / Layanan di bawah Klien)
 * - SystemMaster (Modul / Sub-Layanan di bawah Proyek)
 *
 * Kompatibel dengan DTO NestJS nanti:
 * - GET /api/master/clients, POST, PUT /:id, PATCH /:id/status
 * - GET /api/master/projects, POST, PUT /:id, PATCH /:id/status
 * - GET /api/master/systems, POST, PUT /:id, PATCH /:id/status
 */

export type ClientTier =
  | "Enterprise"
  | "Standard"
  | "Internal"
  | "Enterprise NOC"
  | "Mission Critical"
  | "Dedicated SLA";

export type ClientStatus = "active" | "inactive" | "archived";

export interface ClientOrganization {
  id: string; // slug unik: "tritronik", "bni", "telkomsel", dll.
  name: string; // Nama organisasi: "PT Tritronik Teknologi Indonesia"
  shortName: string; // Nama ringkas: "Tritronik"
  code: string; // Kode unik: "TTN", "BNI", "TSEL" (case-insensitive)
  tagline: string; // Deskripsi singkat / spesialisasi
  avatarBg?: string;
  avatarColor?: string;
  borderColor?: string;
  tier: ClientTier;
  status: ClientStatus;
  picName: string; // Person In Charge
  picEmail: string; // Email PIC valid
  picPhone?: string; // Kontak PIC opsional
  description?: string;
  logoUrl?: string;
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
  systemsCount?: number; // legacy backward-compatibility
}

export type ProjectStatus = "active" | "archived";
export type ProjectHealthDefault = "healthy" | "degraded" | "critical";

export interface ProjectMaster {
  id: string; // Format: "proj-{clientId}-{code/slug}"
  clientId: string; // Relasi ke ClientOrganization.id
  name: string; // Nama ringkas proyek: "SM", "EPC Core", "B2B"
  fullName: string; // Nama lengkap proyek: "Service Management & Middleware"
  code: string; // Kode unik dalam klien: "SM", "EPC"
  detail: string; // Deskripsi lingkup layanan / health detail default
  leadEngineer?: string; // Lead Engineer / PIC teknis proyek
  healthDefault?: ProjectHealthDefault;
  status: ProjectStatus;
  createdAt: string; // ISO 8601 UTC
  updatedAt?: string; // ISO 8601 UTC
}

export type SystemCriticality = "critical" | "high" | "medium" | "low";
export type SystemEnvironment = "Production" | "Staging" | "DRC";
export type SystemStatus = "active" | "maintenance" | "deprecated";

export interface SystemMaster {
  id: string; // Format: "sys-{clientId}-{projectId}-{slug}"
  clientId: string; // Relasi ke ClientOrganization.id
  projectId: string; // Relasi ke ProjectMaster.id
  name: string; // Nama sistem: "OCS Billing", "Switching ATM"
  criticality: SystemCriticality;
  environment: SystemEnvironment;
  status: SystemStatus;
  createdAt?: string; // ISO 8601 UTC
  updatedAt?: string; // ISO 8601 UTC
}

export interface MasterDataPayload {
  version: number;
  clients: ClientOrganization[];
  projects: ProjectMaster[];
  systems: SystemMaster[];
  lastSaved: string;
}

export interface CreateClientInput {
  name: string;
  shortName?: string;
  code: string;
  tier: ClientTier;
  picName: string;
  picEmail: string;
  picPhone?: string;
  description?: string;
}

export interface UpdateClientInput {
  name?: string;
  shortName?: string;
  code?: string;
  tier?: ClientTier;
  status?: ClientStatus;
  picName?: string;
  picEmail?: string;
  picPhone?: string;
  description?: string;
}

export interface CreateProjectInput {
  clientId: string;
  name: string;
  fullName: string;
  code: string;
  detail: string;
  leadEngineer?: string;
  healthDefault?: ProjectHealthDefault;
}

export interface UpdateProjectInput {
  name?: string;
  fullName?: string;
  code?: string;
  detail?: string;
  leadEngineer?: string;
  healthDefault?: ProjectHealthDefault;
  status?: ProjectStatus;
}

export interface CreateSystemInput {
  clientId: string;
  projectId: string;
  name: string;
  criticality: SystemCriticality;
  environment: SystemEnvironment;
  status?: SystemStatus;
}

export interface UpdateSystemInput {
  name?: string;
  projectId?: string;
  criticality?: SystemCriticality;
  environment?: SystemEnvironment;
  status?: SystemStatus;
}
