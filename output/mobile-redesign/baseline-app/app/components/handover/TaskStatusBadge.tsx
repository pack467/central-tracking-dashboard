"use client";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCw,
} from "lucide-react";
import type { HandoverState } from "@/app/lib/types";

export interface TaskStatusBadgeProps {
  state: HandoverState | string;
  className?: string;
}

const TASK_STATUS_BADGE_CLASS =
  "[display:inline-flex] [align-items:center] [gap:5.5px] [padding:4px_10px] [border-radius:6px] [font-size:11px] [font-weight:700] [letter-spacing:0.2px] [line-height:1] [white-space:nowrap] [flex-shrink:0] [margin-top:1px] [border:1px_solid_transparent] [box-shadow:0_1px_2px_rgba(0,_0,_0,_0.18)] [transition:all_0.15s_ease]";

export function getTaskStateConfig(state: string) {
  const norm = (state || "").toLowerCase().replace(/_/g, "-");

  if (norm === "repeat" || norm === "routine") {
    return {
      label: "Routine",
      toneClass: "status-routine",
      tailwindClass:
        "[background:rgba(56,_189,_248,_0.12)] [color:#38bdf8] [border-color:rgba(56,_189,_248,_0.32)]",
      icon: <RotateCw className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "waiting" || norm === "pending") {
    return {
      label: "Pending",
      toneClass: "status-pending",
      tailwindClass:
        "[background:rgba(251,_191,_36,_0.12)] [color:#fbbf24] [border-color:rgba(251,_191,_36,_0.32)]",
      icon: <Clock className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "in-progress" || norm === "progress") {
    return {
      label: "In Progress",
      toneClass: "status-in-progress",
      tailwindClass:
        "[background:rgba(192,_132,_252,_0.12)] [color:#c084fc] [border-color:rgba(192,_132,_252,_0.32)]",
      icon: <Loader2 className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "done" || norm === "completed" || norm === "selesai") {
    return {
      label: "Selesai",
      toneClass: "status-done",
      tailwindClass:
        "[background:rgba(34,_197,_94,_0.12)] [color:#4ade80] [border-color:rgba(34,_197,_94,_0.32)]",
      icon: <CheckCircle2 className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "escalated" || norm === "eskalasi") {
    return {
      label: "Escalated",
      toneClass: "status-escalated",
      tailwindClass:
        "[background:rgba(248,_113,_113,_0.12)] [color:#f87171] [border-color:rgba(248,_113,_113,_0.32)]",
      icon: <AlertTriangle className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "blocked" || norm === "terhambat") {
    return {
      label: "Blocked",
      toneClass: "status-blocked",
      tailwindClass:
        "[background:rgba(239,_68,_68,_0.14)] [color:#f87171] [border-color:rgba(248,_113,_113,_0.35)]",
      icon: <AlertOctagon className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "waiting-vendor" || norm === "vendor") {
    return {
      label: "Menunggu Vendor",
      toneClass: "status-waiting-vendor",
      tailwindClass:
        "[background:rgba(249,_115,_22,_0.12)] [color:#fb923c] [border-color:rgba(249,_115,_22,_0.32)]",
      icon: <Building2 className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "activity" || norm === "active") {
    return {
      label: "Activity",
      toneClass: "status-activity",
      tailwindClass:
        "[background:rgba(45,_212,_191,_0.12)] [color:#2dd4bf] [border-color:rgba(45,_212,_191,_0.32)]",
      icon: <Activity className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }

  return {
    label: state || "Routine",
    toneClass: "status-routine",
    tailwindClass:
      "[background:rgba(56,_189,_248,_0.12)] [color:#38bdf8] [border-color:rgba(56,_189,_248,_0.32)]",
    icon: <RotateCw className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
  };
}

export function TaskStatusBadge({ state, className = "" }: TaskStatusBadgeProps) {
  const config = getTaskStateConfig(state);
  return (
    <span className={`${TASK_STATUS_BADGE_CLASS} ${config.tailwindClass} handover-task-state-badge ${config.toneClass} ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
