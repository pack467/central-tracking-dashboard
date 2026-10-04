"use client";

import { useId } from "react";
import { STANDARD_MONITORED_PROJECTS } from "@/app/lib/data";

export interface ProjectSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const PROJECT_OPTIONS = ["NOC", ...STANDARD_MONITORED_PROJECTS, "EPC Tools"];
const PROJECT_SELECT_CONTAINER_CLASS = "block w-full";
const PROJECT_SELECT_INPUT_CLASS =
  "w-full min-h-[42px] rounded-[7px] p-[10px_12px] text-[13px] bg-[var(--input-bg)] border border-[var(--panel-border)] text-[var(--ink-primary)] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--accent-blue)] focus:shadow-[0_0_0_3px_var(--accent-blue-soft)]";

export function ProjectSelect({
  value,
  onChange,
  placeholder = "Pilih atau ketik proyek",
  className = "",
  id,
}: ProjectSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={`${PROJECT_SELECT_CONTAINER_CLASS} ${className}`}>
      <input
        id={selectId}
        type="text"
        list={`${selectId}-options`}
        className={PROJECT_SELECT_INPUT_CLASS}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={`${selectId}-options`}>
        {PROJECT_OPTIONS.map((project) => (
          <option key={project} value={project} />
        ))}
      </datalist>
    </div>
  );
}
