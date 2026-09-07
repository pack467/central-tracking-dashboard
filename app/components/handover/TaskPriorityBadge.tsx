"use client";

import { AlertCircle, ArrowDown, ArrowUp, Minus } from "lucide-react";

export interface TaskPriorityBadgeProps {
  priority?: string;
  className?: string;
}

export function getTaskPriorityConfig(priority?: string) {
  const p = (priority || "").toLowerCase();

  if (p.includes("crit") || p === "urgent" || p === "kritis" || p === "p1") {
    return {
      label: "Critical",
      toneClass: "priority-critical",
      icon: <AlertCircle size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (p.includes("high") || p === "tinggi" || p === "p2") {
    return {
      label: "High",
      toneClass: "priority-high",
      icon: <ArrowUp size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (p.includes("low") || p === "rendah" || p === "p4") {
    return {
      label: "Low",
      toneClass: "priority-low",
      icon: <ArrowDown size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }

  return {
    label: "Medium",
    toneClass: "priority-medium",
    icon: <Minus size={11} strokeWidth={2.4} aria-hidden="true" />,
  };
}

export function TaskPriorityBadge({ priority, className = "" }: TaskPriorityBadgeProps) {
  if (!priority) return null;
  const config = getTaskPriorityConfig(priority);

  return (
    <span className={`handover-task-priority-badge ${config.toneClass} ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
