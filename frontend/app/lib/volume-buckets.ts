import { addDaysToDateString, weekdayOfDateString } from "./wib.ts";

/**
 * The ticket volume chart draws one bar per day, per week or per month, whichever is the finest that still fits the width.
 * A week runs Monday to Sunday. Days without tickets inside the range are real zeros and get a bar of their own.
 */
export type VolumeGranularity = "day" | "week" | "month";

export interface VolumeDay {
  date: string;
  created: number;
  projectCounts: Record<string, number>;
  closed?: number;
  /** Sum and count of the resolution times of that day's closed tickets that have one. */
  resolutionSum?: number;
  resolvedCount?: number;
}

export interface BucketRange {
  /** The first day of the bucket that is inside the range (YYYY-MM-DD); also its key. */
  date: string;
  /** The last day of the bucket that is inside the range. */
  to: string;
}

export interface VolumeBucket extends BucketRange {
  created: number;
  projectCounts: Record<string, number>;
  closed: number;
  resolutionSum: number;
  resolvedCount: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86_400_000);
const weekStart = (ymd: string) => addDaysToDateString(ymd, -((weekdayOfDateString(ymd) + 6) % 7));
const monthStart = (ymd: string) => ymd.slice(0, 8) + "01";
const monthIndex = (ymd: string) => Number(ymd.slice(0, 4)) * 12 + Number(ymd.slice(5, 7)) - 1;
const nextMonth = (ymd: string) => {
  const index = monthIndex(ymd) + 1;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}-01`;
};
const startOf = (ymd: string, granularity: VolumeGranularity) => (granularity === "day" ? ymd : granularity === "week" ? weekStart(ymd) : monthStart(ymd));
const after = (ymd: string, granularity: VolumeGranularity) => (granularity === "day" ? addDaysToDateString(ymd, 1) : granularity === "week" ? addDaysToDateString(ymd, 7) : nextMonth(ymd));

/** How many bars each granularity needs for the range first..last. */
export function barCounts(first: string, last: string): Record<VolumeGranularity, number> {
  return {
    day: dayDiff(first, last) + 1,
    week: dayDiff(weekStart(first), weekStart(last)) / 7 + 1,
    month: monthIndex(last) - monthIndex(first) + 1,
  };
}

/** The finest granularity whose bar count fits in maxBars, or null when even months do not fit. */
export function chooseGranularity(first: string, last: string, maxBars: number): VolumeGranularity | null {
  const counts = barCounts(first, last);
  for (const granularity of ["day", "week", "month"] as const) if (counts[granularity] <= maxBars) return granularity;
  return null;
}

/** The buckets covering first..last, each cut to the range. */
export function bucketRanges(first: string, last: string, granularity: VolumeGranularity): BucketRange[] {
  const ranges: BucketRange[] = [];
  for (let start = startOf(first, granularity); start <= last; start = after(start, granularity)) {
    const end = addDaysToDateString(after(start, granularity), -1);
    ranges.push({ date: start < first ? first : start, to: end > last ? last : end });
  }
  return ranges;
}

/** The key (first day inside the range) of the bucket a day falls in. */
export function bucketKeyOf(ymd: string, granularity: VolumeGranularity, first: string): string {
  const start = startOf(ymd, granularity);
  return start < first ? first : start;
}

/** Sums the days (sorted by date) into bars, with empty bars for the gaps. */
export function bucketVolume(days: readonly VolumeDay[], granularity: VolumeGranularity): VolumeBucket[] {
  if (!days.length) return [];
  const first = days[0].date;
  const buckets: VolumeBucket[] = bucketRanges(first, days[days.length - 1].date, granularity).map(range => ({ ...range, created: 0, projectCounts: {}, closed: 0, resolutionSum: 0, resolvedCount: 0 }));
  const byKey = new Map(buckets.map(bucket => [bucket.date, bucket]));
  for (const day of days) {
    const bucket = byKey.get(bucketKeyOf(day.date, granularity, first));
    if (!bucket) continue;
    bucket.created += day.created;
    bucket.closed += day.closed ?? 0;
    bucket.resolutionSum += day.resolutionSum ?? 0;
    bucket.resolvedCount += day.resolvedCount ?? 0;
    for (const [project, count] of Object.entries(day.projectCounts)) bucket.projectCounts[project] = (bucket.projectCounts[project] || 0) + count;
  }
  return buckets;
}

const dayMonth = (ymd: string) => `${Number(ymd.slice(8, 10))} ${MONTHS[Number(ymd.slice(5, 7)) - 1]}`;
/** "13 Sep 2026": a day as people read it (tooltips). */
export const formatDay = (ymd: string) => `${dayMonth(ymd)} ${ymd.slice(0, 4)}`;

/** The short label under a bar. */
export function bucketAxisLabel(bucket: BucketRange, granularity: VolumeGranularity): string {
  if (granularity === "day") return bucket.date.slice(5);
  if (granularity === "week") return dayMonth(bucket.date);
  return `${MONTHS[Number(bucket.date.slice(5, 7)) - 1]} ${bucket.date.slice(2, 4)}`;
}

/** The full name of a bar, for its tooltip and the detail card. */
export function bucketTitle(bucket: BucketRange, granularity: VolumeGranularity): string {
  if (granularity === "day" || bucket.date === bucket.to) return bucket.date;
  const year = bucket.to.slice(0, 4);
  if (granularity === "month") {
    const name = `${MONTHS_LONG[Number(bucket.date.slice(5, 7)) - 1]} ${bucket.date.slice(0, 4)}`;
    const whole = bucket.date.endsWith("-01") && after(bucket.date, "month") === addDaysToDateString(bucket.to, 1);
    return whole ? name : `${name} (${dayMonth(bucket.date)} – ${dayMonth(bucket.to)})`;
  }
  return `${dayMonth(bucket.date)}${bucket.date.slice(0, 4) === year ? "" : " " + bucket.date.slice(0, 4)} – ${dayMonth(bucket.to)} ${year}`;
}

/** The pill of the note above a chart: "Per hari", "Per minggu", "Per bulan". */
export function granularityBadge(granularity: VolumeGranularity): string {
  return granularity === "day" ? "Per hari" : granularity === "week" ? "Per minggu" : "Per bulan";
}

/** The sentence of the note above a chart when the points are not days. */
export function granularityNote(first: string, last: string, granularity: VolumeGranularity): string {
  const days = dayDiff(first, last) + 1;
  if (granularity === "day") return `${days} hari, satu titik per hari.`;
  return `${days} hari dikelompokkan per ${granularity === "week" ? "minggu (Senin–Minggu)" : "bulan"} agar grafik tetap terbaca.`;
}

/** How many points of a chart fit: one per `spacing` pixels of the plot, at least 7. */
export function maxPointsFor(plotWidth: number, spacing: number): number {
  return Math.max(7, Math.floor(plotWidth / spacing));
}

/** Label every n-th point so the labels ("09-01", "28 Sep", "Sep 26") never touch, given the pixels between two points. */
export function axisLabelStride(spacing: number, granularity: VolumeGranularity): number {
  return Math.max(1, Math.ceil((granularity === "day" ? 46 : 56) / Math.max(1, spacing)));
}

/** Whether point idx of n gets a label: every stride-th one, and always the last (the regular one just before it steps aside). */
export function showAxisLabel(idx: number, n: number, stride: number): boolean {
  return idx === n - 1 || (idx % stride === 0 && n - 1 - idx >= stride);
}
