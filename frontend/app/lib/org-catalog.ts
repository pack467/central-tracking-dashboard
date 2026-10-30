/**
 * Jabatan (office position: Junior Engineer, IT Lead, ...) and Departemen (NOC, SOC, ...), next to Peran (the operational role in the app).
 *
 * The backend and its database have neither yet, so both live in this browser for now: the list itself and which person holds which
 * (a person has at most one of each). Each is a store of its own (ctd.positions.v1, ctd.departments.v1), outside the Master Data snapshot,
 * so the catalog checks and backups are not affected. When the backend gets them, this is the one module to point at it.
 *
 * The functions on OrgCatalogState are pure (and tested); the stores below wrap them with localStorage and change listeners.
 */

export type OrgKind = "position" | "department";

export interface OrgItem {
  id: string;
  name: string;
  description: string;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrgCatalogState {
  version: 1;
  items: OrgItem[];
  /** person id -> item id */
  assignments: Record<string, string>;
}

export interface OrgItemInput { name: string; description?: string; active?: boolean }

export class OrgCatalogError extends Error {
  readonly field: "name" | "description" | "form";
  constructor(message: string, field: "name" | "description" | "form" = "form") { super(message); this.field = field; }
}

export interface OrgKindConfig {
  kind: OrgKind;
  /** "Jabatan" / "Departemen" */
  label: string;
  /** lower-case, for sentences */
  noun: string;
  storageKey: string;
  idPrefix: string;
  seeds: [string, string][];
}

export const ORG_KINDS: Record<OrgKind, OrgKindConfig> = {
  position: {
    kind: "position", label: "Jabatan", noun: "jabatan", storageKey: "ctd.positions.v1", idPrefix: "pos",
    seeds: [
      ["Junior Engineer", "Engineer tingkat awal; bekerja dengan arahan engineer senior."],
      ["Engineer", "Menangani tiket dan pemantauan secara mandiri."],
      ["Senior Engineer", "Menangani kasus kompleks dan membimbing engineer lain."],
      ["Lead Engineer", "Memimpin tim engineer dalam satu shift atau layanan."],
      ["IT Lead", "Bertanggung jawab atas operasional TI dan koordinasi tim."],
      ["IT Manager", "Mengelola tim TI, prioritas, dan hubungan dengan klien."],
    ],
  },
  department: {
    kind: "department", label: "Departemen", noun: "departemen", storageKey: "ctd.departments.v1", idPrefix: "dept",
    seeds: [
      ["Network Operations Center", "Pemantauan jaringan dan layanan 24 jam."],
      ["Security Operations Center", "Pemantauan dan penanganan insiden keamanan."],
      ["Infrastruktur", "Server, jaringan, dan platform pendukung."],
      ["Aplikasi & Integrasi", "Dukungan aplikasi klien dan integrasi sistem."],
      ["Service Desk", "Penerimaan dan penyaluran permintaan pengguna."],
      ["Manajemen", "Pimpinan dan koordinasi antardepartemen."],
    ],
  },
};

const NAME_MAX = 60, DESCRIPTION_MAX = 200;
const slug = (text: string) => text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
const norm = (text: string) => text.trim().replace(/\s+/g, " ").toLowerCase();

export function seedCatalog(config: OrgKindConfig, now: string): OrgCatalogState {
  return {
    version: 1,
    items: config.seeds.map(([name, description], order) => ({ id: `${config.idPrefix}-${slug(name)}`, name, description, active: true, order, createdAt: now, updatedAt: now })),
    assignments: {},
  };
}

/** Items in their display order. */
export const ordered = (state: OrgCatalogState) => [...state.items].sort((a, b) => a.order - b.order);

/** How many people hold each item. */
export function usage(state: OrgCatalogState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of Object.values(state.assignments)) counts[id] = (counts[id] || 0) + 1;
  return counts;
}

function checked(config: OrgKindConfig, state: OrgCatalogState, input: OrgItemInput, exceptId?: string): { name: string; description: string } {
  const name = (input.name || "").trim().replace(/\s+/g, " ");
  const description = (input.description || "").trim();
  if (!name) throw new OrgCatalogError(`Nama ${config.noun} wajib diisi.`, "name");
  if (name.length > NAME_MAX) throw new OrgCatalogError(`Nama ${config.noun} paling panjang ${NAME_MAX} karakter.`, "name");
  if (description.length > DESCRIPTION_MAX) throw new OrgCatalogError(`Deskripsi paling panjang ${DESCRIPTION_MAX} karakter.`, "description");
  if (state.items.some((p) => p.id !== exceptId && norm(p.name) === norm(name))) throw new OrgCatalogError(`${config.label} "${name}" sudah ada.`, "name");
  return { name, description };
}

export function addItem(config: OrgKindConfig, state: OrgCatalogState, input: OrgItemInput, now: string): { state: OrgCatalogState; item: OrgItem } {
  const { name, description } = checked(config, state, input);
  let id = `${config.idPrefix}-${slug(name)}`;
  for (let n = 2; state.items.some((p) => p.id === id); n++) id = `${config.idPrefix}-${slug(name)}-${n}`;
  const item: OrgItem = { id, name, description, active: input.active ?? true, order: Math.max(-1, ...state.items.map((p) => p.order)) + 1, createdAt: now, updatedAt: now };
  return { state: { ...state, items: [...state.items, item] }, item };
}

export function editItem(config: OrgKindConfig, state: OrgCatalogState, id: string, input: OrgItemInput, now: string): { state: OrgCatalogState; item: OrgItem } {
  const current = state.items.find((p) => p.id === id);
  if (!current) throw new OrgCatalogError(`${config.label} tidak ditemukan.`);
  const { name, description } = checked(config, state, input, id);
  const item = { ...current, name, description, active: input.active ?? current.active, updatedAt: now };
  return { state: { ...state, items: state.items.map((p) => (p.id === id ? item : p)) }, item };
}

/** An item somebody holds cannot be deleted (deactivate it instead); the order closes up behind it. */
export function removeItem(config: OrgKindConfig, state: OrgCatalogState, id: string): OrgCatalogState {
  if (!state.items.some((p) => p.id === id)) throw new OrgCatalogError(`${config.label} tidak ditemukan.`);
  const holders = usage(state)[id] || 0;
  if (holders) throw new OrgCatalogError(`${config.label} ini dipakai ${holders} personel. Pindahkan mereka dulu, atau nonaktifkan ${config.noun}nya.`);
  return { ...state, items: ordered(state).filter((p) => p.id !== id).map((p, order) => ({ ...p, order })) };
}

export function moveItem(state: OrgCatalogState, id: string, direction: -1 | 1): OrgCatalogState {
  const list = ordered(state);
  const index = list.findIndex((p) => p.id === id), target = index + direction;
  if (index < 0 || target < 0 || target >= list.length) return state;
  [list[index], list[target]] = [list[target], list[index]];
  return { ...state, items: list.map((p, order) => ({ ...p, order })) };
}

/** Gives a person an item, or none (null). Only an active item can be newly given. */
export function assign(config: OrgKindConfig, state: OrgCatalogState, personId: string, itemId: string | null): OrgCatalogState {
  const assignments = { ...state.assignments };
  if (itemId === null) delete assignments[personId];
  else {
    const item = state.items.find((p) => p.id === itemId);
    if (!item) throw new OrgCatalogError(`${config.label} tidak ditemukan.`);
    if (!item.active && state.assignments[personId] !== itemId) throw new OrgCatalogError(`${config.label} "${item.name}" sedang nonaktif.`);
    assignments[personId] = itemId;
  }
  return { ...state, assignments };
}

export function itemOf(state: OrgCatalogState, personId: string | undefined): OrgItem | undefined {
  const id = personId ? state.assignments[personId] : undefined;
  return id ? state.items.find((p) => p.id === id) : undefined;
}

/** Reads stored data; anything unreadable falls back to the seed (the raw text is never overwritten until the next write). */
export function parseCatalog(config: OrgKindConfig, raw: string | null, now: string): OrgCatalogState {
  if (!raw) return seedCatalog(config, now);
  try {
    const value = JSON.parse(raw) as Partial<OrgCatalogState>;
    if (value?.version !== 1 || !Array.isArray(value.items) || typeof value.assignments !== "object" || value.assignments === null) return seedCatalog(config, now);
    const items = value.items.filter((p): p is OrgItem => !!p && typeof p.id === "string" && typeof p.name === "string").map((p, i) => ({ ...p, description: p.description || "", active: p.active !== false, order: Number.isFinite(p.order) ? p.order : i }));
    const assignments = Object.fromEntries(Object.entries(value.assignments).filter(([, id]) => typeof id === "string" && items.some((p) => p.id === id))) as Record<string, string>;
    return { version: 1, items, assignments };
  } catch {
    return seedCatalog(config, now);
  }
}

// ── The stores: localStorage + listeners, for useSyncExternalStore ──

export interface OrgCatalogStore {
  config: OrgKindConfig;
  snapshot(): OrgCatalogState;
  serverSnapshot(): OrgCatalogState;
  subscribe(listener: () => void): () => void;
  create(input: OrgItemInput): OrgItem;
  update(id: string, input: OrgItemInput): OrgItem;
  remove(id: string): void;
  move(id: string, direction: -1 | 1): void;
  assign(personId: string, itemId: string | null): void;
}

const storage = () => { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } };
const now = () => new Date().toISOString();

function createStore(config: OrgKindConfig): OrgCatalogStore {
  let cache: OrgCatalogState | null = null;
  const listeners = new Set<() => void>();
  const server = seedCatalog(config, "2026-10-30T00:00:00.000Z");
  const notify = () => listeners.forEach((l) => l());
  const onStorage = (event: StorageEvent) => { if (event.key === config.storageKey) { cache = null; notify(); } };
  const snapshot = () => (cache ??= parseCatalog(config, storage()?.getItem(config.storageKey) ?? null, now()));
  const commit = (next: OrgCatalogState) => {
    cache = next;
    try { storage()?.setItem(config.storageKey, JSON.stringify(next)); } catch { /* storage blocked: the change lasts for this page only */ }
    notify();
  };
  return {
    config,
    snapshot,
    serverSnapshot: () => server,
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => { listeners.delete(listener); if (!listeners.size && typeof window !== "undefined") window.removeEventListener("storage", onStorage); };
    },
    create(input) { const result = addItem(config, snapshot(), input, now()); commit(result.state); return result.item; },
    update(id, input) { const result = editItem(config, snapshot(), id, input, now()); commit(result.state); return result.item; },
    remove(id) { commit(removeItem(config, snapshot(), id)); },
    move(id, direction) { commit(moveItem(snapshot(), id, direction)); },
    assign(personId, itemId) { commit(assign(config, snapshot(), personId, itemId)); },
  };
}

export const ORG_STORES: Record<OrgKind, OrgCatalogStore> = { position: createStore(ORG_KINDS.position), department: createStore(ORG_KINDS.department) };
