import type { Tone } from "@/app/lib/types";

const BADGE_BASE_CLASS =
  "inline-flex items-center whitespace-nowrap px-[8px] py-[3px] rounded-[5px] text-[10px] font-bold leading-none font-mono";

const BADGE_TONE_CLASS: Record<Tone, string> = {
  success: "text-[var(--green)] bg-[var(--green-soft)] border border-[var(--green-border)]",
  warning:
    "text-[var(--priority-medium,var(--orange))] bg-[var(--priority-medium-soft,var(--orange-soft))] border border-[var(--priority-medium-border,var(--orange-border))]",
  critical:
    "text-[var(--priority-critical,var(--red))] bg-[var(--priority-critical-soft,var(--red-soft))] border border-[var(--priority-critical-border,var(--red-border))]",
  high:
    "text-[var(--priority-high,#fb923c)] bg-[var(--priority-high-soft,rgba(249,115,22,0.14))] border border-[var(--priority-high-border,rgba(249,115,22,0.35))]",
  orange:
    "text-[var(--priority-high,#fb923c)] bg-[var(--priority-high-soft,rgba(249,115,22,0.14))] border border-[var(--priority-high-border,rgba(249,115,22,0.35))]",
  low:
    "text-[var(--priority-low,#2dd4bf)] bg-[var(--priority-low-soft,rgba(45,212,191,0.14))] border border-[var(--priority-low-border,rgba(45,212,191,0.35))]",
  teal:
    "text-[var(--priority-low,#2dd4bf)] bg-[var(--priority-low-soft,rgba(45,212,191,0.14))] border border-[var(--priority-low-border,rgba(45,212,191,0.35))]",
  info: "text-[var(--accent-blue)] bg-[var(--accent-blue-soft)] border border-[var(--accent-blue-border)]",
  neutral: "text-[var(--ink-secondary)] bg-[var(--bg)] border border-[var(--line)]",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`${BADGE_BASE_CLASS} ${BADGE_TONE_CLASS[tone] || BADGE_TONE_CLASS.neutral}`}>{children}</span>;
}
