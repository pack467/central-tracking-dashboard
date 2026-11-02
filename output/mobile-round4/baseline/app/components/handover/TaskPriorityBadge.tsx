"use client";

import { AlertCircle, ArrowDown, ArrowUp, Minus } from "lucide-react";

export interface TaskPriorityBadgeProps {
  priority?: string;
  className?: string;
}

const TASK_PRIORITY_BADGE_CLASS =
  "[display:inline-flex] [align-items:center] [gap:4px] [padding:3px_8px] [border-radius:6px] [font-size:10.5px] [font-weight:700] [letter-spacing:0.25px] [line-height:1] [white-space:nowrap] [flex-shrink:0] [margin-top:1px] [border:1px_solid_transparent] [box-shadow:0_1px_2px_rgba(0,_0,_0,_0.18)] [transition:all_0.15s_ease]";

export function getTaskPriorityConfig(priority?: string) {
  const p = (priority || "").toLowerCase();

  if (p.includes("crit") || p === "urgent" || p === "kritis" || p === "p1") {
    return {
      label: "Critical",
      toneClass: "priority-critical",
      tailwindClass:
        "[background:rgba(239,_68,_68,_0.14)] [color:#f87171] [border-color:rgba(239,_68,_68,_0.35)]",
      icon: <AlertCircle className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (p.includes("high") || p === "tinggi" || p === "p2") {
    return {
      label: "High",
      toneClass: "priority-high",
      tailwindClass:
        "[background:rgba(249,_115,_22,_0.14)] [color:#fb923c] [border-color:rgba(249,_115,_22,_0.35)]",
      icon: <ArrowUp className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }
  if (p.includes("low") || p === "rendah" || p === "p4") {
    return {
      label: "Low",
      toneClass: "priority-low",
      tailwindClass:
        "[background:rgba(45,_212,_191,_0.14)] [color:#2dd4bf] [border-color:rgba(45,_212,_191,_0.35)]",
      icon: <ArrowDown className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
    };
  }

  return {
    label: "Medium",
    toneClass: "priority-medium",
    tailwindClass:
      "[background:rgba(234,_179,_8,_0.14)] [color:#facc15] [border-color:rgba(234,_179,_8,_0.35)]",
    icon: <Minus className="[flex-shrink:0]" size={11} strokeWidth={2.4} aria-hidden="true" />,
  };
}

export function TaskPriorityBadge({ priority, className = "" }: TaskPriorityBadgeProps) {
  if (!priority) return null;
  const config = getTaskPriorityConfig(priority);

  return (
    <span className={`${TASK_PRIORITY_BADGE_CLASS} ${config.tailwindClass} handover-task-priority-badge ${config.toneClass} ${className}`}>
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
