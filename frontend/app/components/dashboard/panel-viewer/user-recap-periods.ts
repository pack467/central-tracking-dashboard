/** The periods and the person summary shared by the user recap panel (UserRecapView) and its phone layout (UserRecapMobile). */
export interface UserSummaryItem {
  name: string;
  role: string;
  initials: string;
  todayCount: number;
  weekCount?: number;
  monthCount: number;
  yearCount: number;
  totalCount?: number;
  todayBreakdown: Record<string, number>;
  monthBreakdown?: Record<string, number>;
  yearBreakdown?: Record<string, number>;
  recentTickets?: unknown[];
  tickets?: unknown[];
}

/**
 * The five periods every person is counted over, from today out to all time. One colour per period, the same in the summary cards,
 * the columns, the bars and the mobile list.
 */
export const RECAP_PERIODS = [
  { key: "today", label: "Hari Ini", short: "Hari ini", hint: "Tiket yang dibuka hari ini (WIB)", text: "text-sky-400", fill: "#38bdf8", card: "border-sky-400/30 bg-sky-400/[0.07]" },
  { key: "week", label: "Minggu Ini", short: "Minggu", hint: "Senin sampai hari ini", text: "text-amber-400", fill: "#fbbf24", card: "border-amber-400/25 bg-amber-400/[0.06]" },
  { key: "month", label: "Bulan Ini", short: "Bulan", hint: "Sejak tanggal 1 bulan ini", text: "text-emerald-400", fill: "#34d399", card: "border-emerald-400/25 bg-emerald-400/[0.06]" },
  { key: "year", label: "Tahun Ini", short: "Tahun", hint: "Sejak 1 Januari", text: "text-violet-400", fill: "#a78bfa", card: "border-violet-400/25 bg-violet-400/[0.06]" },
  { key: "total", label: "Total", short: "Total", hint: "Semua tiket, tanpa batas tanggal", text: "text-slate-100", fill: "#94a3b8", card: "border-slate-500/30 bg-slate-400/[0.06]" },
] as const;
export type RecapPeriod = (typeof RECAP_PERIODS)[number]["key"];
export type SortField = "name" | RecapPeriod;
export type SortDirection = "asc" | "desc";

export function recapCount(user: UserSummaryItem, period: RecapPeriod): number {
  switch (period) {
    case "today": return user.todayCount;
    case "week": return user.weekCount ?? 0;
    case "month": return user.monthCount;
    case "year": return user.yearCount;
    case "total": return user.totalCount ?? user.yearCount;
  }
}
