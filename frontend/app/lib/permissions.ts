import { apiModuleEnabled, isMockMode } from "@/app/lib/config";
import type { AnyMasterEntity, MasterActor } from "@/app/types/master-data";

export type MasterAction = "read" | "create" | "update" | "archive" | "delete";
export type MasterRole = "manager" | "lead" | "operator" | "viewer";
export type MasterPermission = `master.${"organization" | "project" | "system" | "ticketRef" | "person" | "role"}.${MasterAction}`;
export type MasterAccessPermission = "master.review.read" | "master.mapping.decide" | "master.backup.manage";
export type MasterCatalogPermission = MasterPermission | MasterAccessPermission;
export const MASTER_PERMISSION_ACTIONS: readonly MasterAction[] = ["read", "create", "update", "archive", "delete"];
export const MASTER_PERMISSION_RESOURCES = ["organization", "project", "system", "ticketRef", "person", "role"] as const;
export const MASTER_ACCESS_PERMISSIONS: readonly MasterAccessPermission[] = ["master.review.read", "master.mapping.decide", "master.backup.manage"];
export const MASTER_PERMISSION_CATALOG: readonly MasterCatalogPermission[] = [...MASTER_PERMISSION_RESOURCES.flatMap(resource => MASTER_PERMISSION_ACTIONS.map(action => `master.${resource}.${action}` as MasterPermission)), ...MASTER_ACCESS_PERMISSIONS];

function normalizedRole(value: string): MasterRole {
  const role = value.trim().toLowerCase();
  if (["manager", "admin", "super admin", "super_admin", "pengelola", "pengelola master data"].includes(role)) return "manager";
  if (["lead", "shift lead", "team_lead", "team lead", "lead operasional"].includes(role)) return "lead";
  if (["operator", "operator noc", "agent"].includes(role)) return "operator";
  return "viewer";
}
export function masterRole(actor?: MasterActor): MasterRole {
  // A partly connected app (mock data, backend login) is still mock mode, but who is logged in is real: their own role decides.
  if (isMockMode() && !apiModuleEnabled("auth")) {
    const configured = process.env.NEXT_PUBLIC_MOCK_ROLE;
    return configured ? normalizedRole(configured) : "manager";
  }
  return actor ? normalizedRole(actor.role) : "viewer";
}
export function masterPermission(entity: AnyMasterEntity, action: MasterAction): MasterPermission {
  // Jabatan and Departemen describe staff, so whoever manages people manages them
  const resource = entity === "category" || entity === "severity" ? "ticketRef" : entity === "position" || entity === "department" ? "person" : entity;
  return `master.${resource}.${action}`;
}
export function canMaster(role: MasterRole, entity: AnyMasterEntity, action: MasterAction): boolean {
  if (action === "read") return true;
  if (entity === "severity" && (action === "create" || action === "archive" || action === "delete")) return false;
  // Only the Master Data manager (Pengelola) writes; Lead, Operator and Viewer
  // are read-only. Production enforcement belongs to the server.
  return role === "manager";
}
export function actorCanMaster(actor: MasterActor | undefined, entity: AnyMasterEntity, action: MasterAction): boolean {
  return canMaster(masterRole(actor), entity, action);
}
export function canReviewRead(role: MasterRole): boolean {
  return MASTER_ACCESS_PERMISSIONS.includes("master.review.read") && !!role;
}
export function canMappingDecide(role: MasterRole): boolean {
  return role === "manager";
}
export function canBackupManage(role: MasterRole): boolean {
  return role === "manager";
}
export function actorCanMappingDecide(actor: MasterActor | undefined): boolean {
  return canMappingDecide(masterRole(actor));
}
export function actorCanBackupManage(actor: MasterActor | undefined): boolean {
  return canBackupManage(masterRole(actor));
}
