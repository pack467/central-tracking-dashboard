import type { Tone } from "@/app/lib/types";

const BADGE_BASE_CLASS =
  "[display:inline-flex] [align-items:center] [white-space:nowrap] [padding:3px_8px] [border-radius:5px] [font-size:10px] [font-weight:700] [line-height:1] [font-family:var(--font-mono)]";

const BADGE_TONE_CLASS: Record<Tone, string> = {
  success: "[color:var(--green)] [background:var(--green-soft)] [border:1px_solid_var(--green-border)]",
  warning:
    "[color:var(--priority-medium,_var(--orange))] [background:var(--priority-medium-soft,_var(--orange-soft))] [border:1px_solid_var(--priority-medium-border,_var(--orange-border))]",
  critical:
    "[color:var(--priority-critical,_var(--red))] [background:var(--priority-critical-soft,_var(--red-soft))] [border:1px_solid_var(--priority-critical-border,_var(--red-border))]",
  high:
    "[color:var(--priority-high,_#fb923c)] [background:var(--priority-high-soft,_rgba(249,_115,_22,_0.14))] [border:1px_solid_var(--priority-high-border,_rgba(249,_115,_22,_0.35))]",
  orange:
    "[color:var(--priority-high,_#fb923c)] [background:var(--priority-high-soft,_rgba(249,_115,_22,_0.14))] [border:1px_solid_var(--priority-high-border,_rgba(249,_115,_22,_0.35))]",
  low:
    "[color:var(--priority-low,_#2dd4bf)] [background:var(--priority-low-soft,_rgba(45,_212,_191,_0.14))] [border:1px_solid_var(--priority-low-border,_rgba(45,_212,_191,_0.35))]",
  teal:
    "[color:var(--priority-low,_#2dd4bf)] [background:var(--priority-low-soft,_rgba(45,_212,_191,_0.14))] [border:1px_solid_var(--priority-low-border,_rgba(45,_212,_191,_0.35))]",
  info: "[color:var(--accent-blue)] [background:var(--accent-blue-soft)] [border:1px_solid_var(--accent-blue-border)]",
  neutral: "[color:var(--ink-secondary)] [background:var(--bg)] [border:1px_solid_var(--line)]",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`${BADGE_BASE_CLASS} ${BADGE_TONE_CLASS[tone]} badge badge-${tone}`}>{children}</span>;
}
