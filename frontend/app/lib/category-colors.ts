/**
 * The one place that knows what colour a ticket category has. A category stores a palette key ("sky"), never a hex; every screen asks
 * `resolveCategoryColor` for the classes and the chart hex. Class strings are written out in full so Tailwind can see them.
 * The first eight entries keep the hex values the app has always drawn categories with, so seed data looks the same as before.
 */

export interface CategoryPaletteEntry {
  key: string;
  /** Indonesian name shown in the form, the history and tooltips. */
  name: string;
  /** Chart colour (donut, bars, legend). */
  hex: string;
  /** Solid dot or swatch. */
  dot: string;
  /** Chip: tinted fill, light text, thin border. */
  chip: string;
  /** Selection ring of a swatch. */
  ring: string;
}

export const CATEGORY_PALETTE = [
  { key: "sky", name: "Biru muda", hex: "#38bdf8", dot: "bg-[#38bdf8]", chip: "border-[#38bdf8]/35 bg-[#38bdf8]/12 text-sky-200", ring: "ring-[#38bdf8]" },
  { key: "blue", name: "Biru", hex: "#3b82f6", dot: "bg-[#3b82f6]", chip: "border-[#3b82f6]/40 bg-[#3b82f6]/14 text-blue-200", ring: "ring-[#3b82f6]" },
  { key: "cyan", name: "Cyan", hex: "#06b6d4", dot: "bg-[#06b6d4]", chip: "border-[#06b6d4]/35 bg-[#06b6d4]/12 text-cyan-200", ring: "ring-[#06b6d4]" },
  { key: "emerald", name: "Hijau", hex: "#10b981", dot: "bg-[#10b981]", chip: "border-[#10b981]/35 bg-[#10b981]/12 text-emerald-200", ring: "ring-[#10b981]" },
  { key: "lime", name: "Lime", hex: "#84cc16", dot: "bg-[#84cc16]", chip: "border-[#84cc16]/35 bg-[#84cc16]/12 text-lime-200", ring: "ring-[#84cc16]" },
  { key: "amber", name: "Kuning", hex: "#f59e0b", dot: "bg-[#f59e0b]", chip: "border-[#f59e0b]/35 bg-[#f59e0b]/12 text-amber-200", ring: "ring-[#f59e0b]" },
  { key: "orange", name: "Oranye", hex: "#f97316", dot: "bg-[#f97316]", chip: "border-[#f97316]/35 bg-[#f97316]/12 text-orange-200", ring: "ring-[#f97316]" },
  { key: "red", name: "Merah", hex: "#ef4444", dot: "bg-[#ef4444]", chip: "border-[#ef4444]/40 bg-[#ef4444]/14 text-red-200", ring: "ring-[#ef4444]" },
  { key: "rose", name: "Merah muda", hex: "#f43f5e", dot: "bg-[#f43f5e]", chip: "border-[#f43f5e]/40 bg-[#f43f5e]/14 text-rose-200", ring: "ring-[#f43f5e]" },
  { key: "purple", name: "Ungu", hex: "#a855f7", dot: "bg-[#a855f7]", chip: "border-[#a855f7]/40 bg-[#a855f7]/14 text-purple-200", ring: "ring-[#a855f7]" },
  { key: "indigo", name: "Indigo", hex: "#6366f1", dot: "bg-[#6366f1]", chip: "border-[#6366f1]/40 bg-[#6366f1]/14 text-indigo-200", ring: "ring-[#6366f1]" },
  { key: "slate", name: "Abu", hex: "#94a3b8", dot: "bg-[#94a3b8]", chip: "border-[#94a3b8]/35 bg-[#94a3b8]/12 text-slate-200", ring: "ring-[#94a3b8]" },
] as const satisfies readonly CategoryPaletteEntry[];

export type CategoryColorKey = (typeof CATEGORY_PALETTE)[number]["key"];
const BY_KEY = new Map<string, CategoryPaletteEntry>(CATEGORY_PALETTE.map(entry => [entry.key, entry]));
export const isCategoryColor = (value: unknown): value is CategoryColorKey => typeof value === "string" && BY_KEY.has(value);

/** A tag with no known category: neutral grey, never a guess. */
export const NEUTRAL_CATEGORY_COLOR: CategoryPaletteEntry = BY_KEY.get("slate")!;

/** The colours the first eight categories have always been drawn with, in their order. Used to give existing data a colour that does not change what is on screen. */
const BASELINE_ORDER: readonly CategoryColorKey[] = ["sky", "emerald", "purple", "amber", "cyan", "rose", "lime", "slate"];
export const baselineColorFor = (index: number): CategoryColorKey => BASELINE_ORDER[((index % BASELINE_ORDER.length) + BASELINE_ORDER.length) % BASELINE_ORDER.length];

/** Data from before colours existed (old storage, old backups): each category without one gets the colour it was drawn with, by its order. */
export function withBaselineColors<T extends { id: string; sortOrder: number; color?: string }>(categories: readonly T[]): (T & { color: CategoryColorKey })[] {
  const order = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
  return categories.map(category => isCategoryColor(category.color) ? category as T & { color: CategoryColorKey } : { ...category, color: baselineColorFor(order.findIndex(item => item.id === category.id)) });
}

export const categoryPaletteEntry =(key: string | undefined): CategoryPaletteEntry => (key ? BY_KEY.get(key) : undefined) ?? NEUTRAL_CATEGORY_COLOR;

interface CategoryRef { id: string; key: string; name: string; color?: string }

/**
 * Colour of a category named by whatever a screen has: an id, a key, or the name an old ticket stored.
 * Found by id, then key, then name (ignoring case); anything else is neutral grey. Renaming never changes the colour of old tickets,
 * because the match on the stored key still lands on the same category.
 */
export function resolveCategoryColor(ref: string | undefined | null, categories: readonly CategoryRef[]): CategoryPaletteEntry {
  const needle = (ref ?? "").trim();
  if (!needle) return NEUTRAL_CATEGORY_COLOR;
  const lower = needle.toLowerCase();
  const found = categories.find(category => category.id === needle) ?? categories.find(category => category.key === needle)
    ?? categories.find(category => category.key.toLowerCase() === lower) ?? categories.find(category => category.name.toLowerCase() === lower);
  return found ? categoryPaletteEntry(found.color) : NEUTRAL_CATEGORY_COLOR;
}

/** Default for a new category: the first palette colour no other category uses yet, else the least used one. */
export function nextFreeColor(categories: readonly { color?: string }[]): CategoryColorKey {
  const used = new Map<string, number>();
  for (const category of categories) if (category.color) used.set(category.color, (used.get(category.color) ?? 0) + 1);
  const free = CATEGORY_PALETTE.filter(entry => entry.key !== "slate").find(entry => !used.has(entry.key));
  if (free) return free.key;
  return [...CATEGORY_PALETTE].sort((a, b) => (used.get(a.key) ?? 0) - (used.get(b.key) ?? 0))[0].key;
}
