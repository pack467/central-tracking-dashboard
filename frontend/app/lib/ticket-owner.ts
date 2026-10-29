import { norm } from "@/app/lib/master-people";
import type { Person } from "@/app/types/master-data";

interface OwnerFields { owner?: string; owners?: string[]; ownerIds?: string[] }

/** Person ids for the names typed or picked on a NEW ticket. Only exact matches with an active person; stored name text is never rewritten. */
export function ownerIdsFor(names: readonly string[], people: readonly Person[]): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const person = people.find(item => item.status === "active" && norm(item.fullName) === norm(name));
    if (person && !ids.includes(person.id)) ids.push(person.id);
  }
  return ids;
}
/**
 * Display names of a ticket's owners: the current name when the person id is known, the stored text otherwise.
 * Old tickets carry no ids and always show their stored text.
 */
export function ownerNames(ticket: OwnerFields, people: readonly Person[]): string[] {
  const stored = ticket.owners?.length ? ticket.owners : ticket.owner ? [ticket.owner] : [];
  if (!ticket.ownerIds?.length) return [...stored];
  const known = ticket.ownerIds.map(id => people.find(person => person.id === id)?.fullName);
  if (known.some(name => !name)) return [...stored];
  return known as string[];
}
export function ownerLabel(ticket: OwnerFields, people: readonly Person[]): string {
  const names = ownerNames(ticket, people);
  return ticket.ownerIds?.length && names.length ? names.join(", ") : ticket.owner || "";
}
