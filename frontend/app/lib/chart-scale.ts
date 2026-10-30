/**
 * The vertical scale of the resolution-time charts (minutes).
 *
 * Two things went wrong with a straight 0..max scale once there was real data:
 *  - ticks were drawn every 20 minutes up to the largest value, so a 1,220-minute outlier gave about 60 axis labels on top of each other;
 *  - that one outlier set the scale for everything, which pushed the lines that matter (the two SLA targets: 60m for High, 120m for Medium/Low) into the bottom few pixels
 *    where their tags overlapped.
 *
 * So the number of ticks is bounded and uses round steps, and when the largest value is far above the SLA lines the part of the axis above
 * 120 minutes is compressed ("broken" scale): the lower part keeps more than half the height and stays readable, and the chart says so.
 */
import { SLA_MINUTES } from "./ticket-metrics.ts";

export interface DurationScale {
  /** Top of the axis, in minutes. */
  yMax: number;
  /** Values above `breakAt` are drawn in a compressed band. False for ordinary data. */
  broken: boolean;
  breakAt: number;
  /** Axis labels, in minutes, from 0 up. */
  ticks: number[];
  /** Where a value sits: 0 is the baseline, 1 the top of the plot. */
  ratio: (minutes: number) => number;
}

/** The two SLA targets (lib/ticket-metrics.ts): 60 minutes for High and 120 for Medium/Low. */
export const SLA_TARGET_MINUTES: number = SLA_MINUTES.strict;
export const SLA_BREACH_MINUTES: number = SLA_MINUTES.standard;
/** The band that holds the SLA lines. Above it the axis is compressed when the data reaches far beyond it. */
const LOW_ZONE = 120;
/** Share of the plot height given to 0..LOW_ZONE once the axis is broken. */
const LOW_SHARE = 0.55;
const NICE = [1, 2, 2.5, 5, 10];

/** The smallest "round" step (1, 2, 2.5, 5 times a power of ten) that is at least `raw`. */
export function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  return (NICE.find(candidate => fraction <= candidate + 1e-9) ?? 10) * magnitude;
}

/** A round whole-number step (1, 2, 5 times a power of ten) that is at least `raw`: for counts of tickets, where 2.5 is not a tick. */
export function wholeStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / magnitude;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * magnitude;
}

export function durationScale(maxMinutes: number): DurationScale {
  const max = Number.isFinite(maxMinutes) ? Math.max(0, maxMinutes) : 0;

  if (max <= LOW_ZONE * 2) {
    const step = Math.max(20, niceStep(max / 5));
    const yMax = Math.max(100, Math.ceil(max / step) * step);
    const ticks: number[] = [];
    for (let value = 0; value <= yMax + 1e-9; value += step) ticks.push(value);
    return { yMax, broken: false, breakAt: LOW_ZONE, ticks, ratio: minutes => clamp01(minutes / yMax) };
  }

  const step = niceStep((max - LOW_ZONE) / 3);
  const yMax = Math.ceil(max / step) * step;
  const ticks = [0, 30, SLA_TARGET_MINUTES, LOW_ZONE];
  // upper labels only where they do not crowd the 120 label
  for (let value = step; value <= yMax + 1e-9; value += step) if (value - LOW_ZONE >= step * 0.5) ticks.push(value);
  return {
    yMax,
    broken: true,
    breakAt: LOW_ZONE,
    ticks,
    ratio: minutes => clamp01(minutes <= LOW_ZONE
      ? LOW_SHARE * (minutes / LOW_ZONE)
      : LOW_SHARE + (1 - LOW_SHARE) * ((minutes - LOW_ZONE) / (yMax - LOW_ZONE))),
  };
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}
