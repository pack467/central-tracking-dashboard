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

export function getTaskStateConfig(state: string) {
  const norm = (state || "").toLowerCase().replace(/_/g, "-");

  if (norm === "repeat" || norm === "routine") {
    return {
      label: "Routine",
      toneClass: "status-routine",
      icon: <RotateCw size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "waiting" || norm === "pending") {
    return {
      label: "Pending",
      toneClass: "status-pending",
      icon: <Clock size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "in-progress" || norm === "progress") {
    return {
      label: "In Progress",
      toneClass: "status-in-progress",
      icon: <Loader2 size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "done" || norm === "completed" || norm === "selesai") {
    return {
      label: "Selesai",
      toneClass: "status-done",
      icon: <CheckCircle2 size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "escalated" || norm === "eskalasi") {
    return {
      label: "Escalated",
      toneClass: "status-escalated",
      icon: <AlertTriangle size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "blocked" || norm === "terhambat") {
    return {
      label: "Blocked",
      toneClass: "status-blocked",
      icon: <AlertOctagon size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "waiting-vendor" || norm === "vendor") {
    return {
      label: "Menunggu Vendor",
      toneClass: "status-waiting-vendor",
      icon: <Building2 size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (norm === "activity" || norm === "active") {
    return {
      label: "Activity",
      toneClass: "status-activity",
      icon: <Activity size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }

  return {
    label: state || "Routine",
    toneClass: "status-routine",
    icon: <RotateCw size={11} strokeWidth={2.4} aria-hidden="true" />,
  };
}

export function TaskStatusBadge({ state, className = "" }: TaskStatusBadgeProps) {
  const config = getTaskStateConfig(state);
  return (
    <span className={`handover-task-state-badge ${config.toneClass} ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
