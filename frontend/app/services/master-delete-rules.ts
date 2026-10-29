/** Rules that decide whether a record may be deleted or deactivated, and the tombstone it leaves. */
import { peopleOf, rolesOf } from "./master-transaction";
import { norm } from "@/app/lib/master-people";
import { CATEGORY_KEYS } from "@/app/lib/master-data-model";
import type {
  AnyMasterEntity,
  MasterActor,
  MasterDeleteCheck,
  MasterEntity,
  MasterImpact,
  MasterSnapshotV2,
  Person
} from "@/app/types/master-data";

/** True when the record was never edited after creation (seed records have no entries at all). */
export function untouched(data: MasterSnapshotV2, entityType: AnyMasterEntity, id: string): boolean {
  const entries = data.audit.filter(entry => entry.entityType === entityType && entry.entityId === id);
  return entries.every((entry, index) => entry.kind === "create" || index === entries.length - 1 && entry.changes.every(change => change.from === null));
}

export const countText = (count: number, label: string) => `${count} ${label}`;

export function usedSentence(parts: string[], edited: boolean, action: string): string {
  const used = parts.length ? `Sudah dipakai di ${parts.join(", ")}.` : "";
  return `${[used, edited ? "Sudah pernah diubah." : ""].filter(Boolean).join(" ")} Gunakan ${action}.`.trim();
}

export function matchesActor(person: Person, actor: MasterActor): boolean {
  return actor.id === person.id ||
    !!actor.employeeId && norm(actor.employeeId) === norm(person.employeeId) ||
    !!actor.email && norm(actor.email) === norm(person.email) ||
    norm(actor.name) === norm(person.fullName);
}

/** Role display name when this person is the only active holder of a protected role. */
export function onlyHolderOf(data: MasterSnapshotV2, person: Person): string | undefined {
  const role = rolesOf(data).find(item => item.key === person.roleKey);
  if (!role?.protected || person.status !== "active") return undefined;
  return peopleOf(data).some(other => other.id !== person.id && other.roleKey === role.key && other.status === "active") ? undefined : role.name;
}

export function catalogDeleteCheck(entity: MasterEntity, id: string, data: MasterSnapshotV2, usage: MasterImpact): MasterDeleteCheck {
  const action = entity === "category" ? "Nonaktifkan" : "Arsipkan", parts: string[] = [];
  if (entity === "severity") return { canDelete: false, reason: "Severity tidak dapat dihapus." };
  if (entity === "organization") {
    if (data.organizations.length <= 1) return { canDelete: false, reason: "Organisasi terakhir tidak dapat dihapus." };
    const projects = data.projects.filter(project => project.organizationId === id).length;
    const related = data.projects.filter(project => project.relatedClientIds?.includes(id)).length;
    if (projects) parts.push(countText(projects, "proyek"));
    if (related) parts.push(countText(related, "proyek (klien terkait)"));
  }
  if (entity === "project") {
    const systems = data.systems.filter(system => system.projectId === id).length;
    if (systems) parts.push(countText(systems, "sistem"));
    if (data.mappingDecisions?.some(decision => decision.projectId === id)) parts.push("pemetaan referensi");
  }
  if (entity === "system" && data.mappingDecisions?.some(decision => decision.systemMappings?.some(mapping => mapping.systemId === id)))
    parts.push("pemetaan referensi");
  if (entity === "category") {
    const category = data.categories.find(item => item.id === id);
    if (category && (CATEGORY_KEYS as readonly string[]).includes(category.key))
      return { canDelete: false, reason: "Kategori bawaan dipakai aplikasi. Gunakan Nonaktifkan." };
  }
  if (usage.tickets) parts.push(countText(usage.tickets, "tiket"));
  if (usage.checkpoints) parts.push(countText(usage.checkpoints, "checkpoint"));
  if (usage.handovers) parts.push(countText(usage.handovers, "handover"));
  const edited = !untouched(data, entity, id);
  return parts.length || edited ? { canDelete: false, reason: usedSentence(parts, edited, action) } : { canDelete: true };
}

export function tombstone(next: MasterSnapshotV2, type: AnyMasterEntity, id: string, nameSnapshot: string, at: string, actor: MasterActor): void {
  next.tombstones = [{ type, id, nameSnapshot, at, by: actor.id }, ...(next.tombstones || [])];
}
