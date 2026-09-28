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
const PROJECT_SELECT_CONTAINER_CLASS = "[display:block] [width:100%]";
const PROJECT_SELECT_INPUT_CLASS =
  "[width:100%] [min-height:42px] [border-radius:7px] [padding:10px_12px] [font-size:13px] [background:var(--input-bg)] [border:1px_solid_var(--panel-border)] [color:var(--ink-primary)] [outline:none] [transition:border-color_0.15s_ease,_box-shadow_0.15s_ease] focus:[border-color:var(--accent-blue)] focus:[box-shadow:0_0_0_3px_var(--accent-blue-soft)]";

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
    <div className={`${PROJECT_SELECT_CONTAINER_CLASS} project-select-container ${className}`}>
      <input
        id={selectId}
        type="text"
        list={`${selectId}-options`}
        className={`${PROJECT_SELECT_INPUT_CLASS} project-select-input`}
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
